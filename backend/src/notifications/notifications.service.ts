import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Role, WorkProgramStatus } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}

export interface NotifyRolesPayload {
  roles: Role[];
  title: string;
  message: string;
  type: string;
  link?: string;
  excludeUserId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.initMailTransporter();
  }

  private initMailTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  /**
   * Kirim email secara asynchronous non-blocking.
   * Jika SMTP belum dikonfigurasi atau gagal, hanya dicatat di log server
   * agar tidak pernah menggagalkan transaksi utama.
   */
  private async sendEmailNonBlocking(
    toEmail: string,
    toName: string,
    subject: string,
    bodyText: string,
  ): Promise<void> {
    try {
      if (!this.transporter) {
        this.logger.debug(
          `[SMTP Non-Configured Log] To: ${toName} <${toEmail}> | Subject: ${subject}`,
        );
        return;
      }

      const from =
        this.configService.get<string>('SMTP_FROM') ||
        '"SIMORAWA HIMA IF UISI" <no-reply@uisi.ac.id>';

      await this.transporter.sendMail({
        from,
        to: toEmail,
        subject: `[SIMORAWA] ${subject}`,
        text: `Halo ${toName},\n\n${bodyText}\n\nSalam,\nSistem Informasi Monitoring Program Kerja (SIMORAWA)`,
      });
    } catch (err: any) {
      this.logger.warn(
        `Gagal mengirim email notifikasi ke ${toEmail}: ${err?.message || err}`,
      );
    }
  }

  /**
   * Helper utama untuk membuat notifikasi In-App + non-blocking Email.
   * Dibungkus try/catch agar tidak pernah membatalkan request utama.
   */
  async createNotification(payload: CreateNotificationPayload) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return null;
      }

      const notification = await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          link: payload.link || null,
          isRead: false,
        },
      });

      // Jalankan pengiriman email secara asynchronous (fire-and-forget)
      void this.sendEmailNonBlocking(
        user.email,
        user.name,
        payload.title,
        payload.message,
      );

      return notification;
    } catch (err: any) {
      this.logger.warn(
        `Gagal menyimpan notifikasi untuk user ${payload.userId}: ${err?.message || err}`,
      );
      return null;
    }
  }

  /**
   * Kirim notifikasi ke seluruh user aktif dengan role tertentu
   * (misal BENDAHARA & BPH saat ada anggaran baru yang diajukan).
   */
  async notifyUsersByRoles(payload: NotifyRolesPayload) {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          role: { in: payload.roles },
          isActive: true,
          ...(payload.excludeUserId
            ? { id: { not: payload.excludeUserId } }
            : {}),
        },
        select: { id: true },
      });

      await Promise.all(
        users.map((u) =>
          this.createNotification({
            userId: u.id,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            link: payload.link,
          }),
        ),
      );
    } catch (err: any) {
      this.logger.warn(
        `Gagal mengirim notifikasi ke grup role ${payload.roles.join(',')}: ${err?.message || err}`,
      );
    }
  }

  /** Ambil 30 notifikasi terbaru milik user + jumlah unread */
  async findMyNotifications(userId: string) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      unreadCount,
      notifications,
    };
  }

  /** Tandai 1 notifikasi sebagai sudah dibaca */
  async markAsRead(id: string, userId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Notifikasi tidak ditemukan.');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      notification: updated,
      unreadCount,
    };
  }

  /** Tandai seluruh notifikasi milik user sebagai sudah dibaca */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return {
      message: 'Seluruh notifikasi telah ditandai sudah dibaca.',
      updatedCount: result.count,
      unreadCount: 0,
    };
  }

  /**
   * Cron Job Harian (FR-13, FR-14, FR-15):
   * Mengecek proker aktif yang mendekati deadline H-30, H-14, dan H-7
   * atau <= 30 hari untuk pengiriman pengingat otomatis.
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async handleDailyDeadlineCheck() {
    await this.triggerDeadlineCheck();
  }

  async triggerDeadlineCheck() {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const activePrograms = await this.prisma.workProgram.findMany({
      where: {
        status: {
          in: [
            WorkProgramStatus.NOT_STARTED,
            WorkProgramStatus.IN_PROGRESS,
            WorkProgramStatus.ON_HOLD,
          ],
        },
      },
      include: {
        pic: {
          select: { id: true, name: true, email: true, isActive: true },
        },
      },
    });

    let createdCount = 0;

    for (const wp of activePrograms) {
      const deadlineDate = new Date(wp.deadline);
      const targetDay = new Date(
        deadlineDate.getFullYear(),
        deadlineDate.getMonth(),
        deadlineDate.getDate(),
      );
      const diffDays = Math.ceil(
        (targetDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
      );

      if ([30, 14, 7, 3, 1].includes(diffDays)) {
        const notifType = `DEADLINE_H_${diffDays}`;
        const alreadySentToday = await this.prisma.notification.findFirst({
          where: {
            userId: wp.picId,
            type: notifType,
            link: `/work-programs/${wp.id}`,
            createdAt: { gte: startOfToday },
          },
        });

        if (!alreadySentToday) {
          await this.createNotification({
            userId: wp.picId,
            type: notifType,
            title: `Pengingat H-${diffDays} Tenggat Proker: ${wp.name}`,
            message: `Program kerja "${wp.name}" memiliki tenggat waktu ${diffDays} hari lagi. Pastikan laporan progres dan dokumen kegiatan segera dilengkapi.`,
            link: `/work-programs/${wp.id}`,
          });
          createdCount += 1;
        }
      }
    }

    return {
      message: 'Pemeriksaan tenggat waktu program kerja selesai dijalankan.',
      checkedPrograms: activePrograms.length,
      notificationsCreated: createdCount,
    };
  }
}
