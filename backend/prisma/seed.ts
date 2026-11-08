import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting SIMORAWA database seeder...');

  const hashedPassword = await bcrypt.hash('Simorawa2026!', 10);

  const users: Array<{ email: string; name: string; role: Role }> = [
    {
      email: 'admin@uisi.ac.id',
      name: 'Administrator SIMORAWA',
      role: Role.ADMIN,
    },
    {
      email: 'bph@uisi.ac.id',
      name: 'Badan Pengurus Harian (BPH)',
      role: Role.BPH,
    },
    {
      email: 'kadiv@uisi.ac.id',
      name: 'Kepala Divisi (Kadiv)',
      role: Role.KADIV,
    },
    {
      email: 'pic@uisi.ac.id',
      name: 'PIC Program Kerja',
      role: Role.PIC,
    },
    {
      email: 'bendahara@uisi.ac.id',
      name: 'Bendahara HIMA IF',
      role: Role.BENDAHARA,
    },
    {
      email: 'sekretaris@uisi.ac.id',
      name: 'Sekretaris HIMA IF',
      role: Role.SEKRETARIS,
    },
  ];

  for (const user of users) {
    const seededUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: hashedPassword,
        role: user.role,
        isActive: true,
      },
      create: {
        email: user.email,
        name: user.name,
        password: hashedPassword,
        role: user.role,
        isActive: true,
      },
    });
    console.log(`Seeded user: ${seededUser.email} (${seededUser.role})`);
  }

  const existingKas = await prisma.kas.findFirst();
  if (!existingKas) {
    const kas = await prisma.kas.create({
      data: {
        balance: 15000000,
      },
    });
    console.log(`Created initial Kas balance: Rp ${kas.balance.toString()}`);
  } else {
    console.log(`Kas record already exists with balance: Rp ${existingKas.balance.toString()}`);
  }

  console.log('SIMORAWA database seeding completed successfully.');
}

main()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
