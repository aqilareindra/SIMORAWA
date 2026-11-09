export interface PdfEvaluationRow {
  no: number;
  prokerName: string;
  picName: string;
  evaluatorName: string;
  status: string;
  indicatorCount: number;
  avgScore: string;
  indicatorsSummary: string;
  kesimpulan: string;
  rekomendasi: string;
  updatedAt: string;
}

export interface PdfEvaluationReportInput {
  generatedAt: string;
  totalEvaluations: number;
  submittedCount: number;
  draftCount: number;
  averageScore: string;
  rows: PdfEvaluationRow[];
}

function escapePdfText(text: string): string {
  return String(text ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(text: string, maxChars: number): string[] {
  const clean = String(text ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return ['-'];
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : ['-'];
}

/**
 * Menghasilkan dokumen PDF A4 Landscape resmi (PDF 1.4 standar) untuk
 * Laporan Rekapitulasi Evaluasi KPI/KPA Program Kerja HIMA IF UISI.
 */
export function buildEvaluationReportPdf(
  report: PdfEvaluationReportInput,
): Buffer {
  // Ukuran A4 Landscape: 842 x 595 pt
  const pageW = 842;
  const pageH = 595;
  const marginX = 36;
  const contentW = pageW - marginX * 2; // 770 pt

  const pagesCommands: string[][] = [];
  let cmds: string[] = [];
  let cursorY = pageH - 40;

  const startNewPage = (isFirstPage: boolean) => {
    if (cmds.length > 0) {
      pagesCommands.push(cmds);
    }
    cmds = [];
    cursorY = pageH - 40;

    // Kop Banner Navy #112D4E
    cmds.push('0.067 0.176 0.306 rg');
    cmds.push(`${marginX} ${cursorY - 46} ${contentW} 46 re f`);

    cmds.push('1 1 1 RG 1 1 1 rg');
    cmds.push(
      `BT /F2 14 Tf ${marginX + 14} ${cursorY - 20} Td (${escapePdfText(
        'LAPORAN REKAPITULASI EVALUASI KPI/KPA PROGRAM KERJA',
      )}) Tj ET`,
    );
    cmds.push(
      `BT /F1 9.5 Tf ${marginX + 14} ${cursorY - 36} Td (${escapePdfText(
        'SIMORAWA - Himpunan Mahasiswa Informatika (HIMA IF) Universitas Internasional Semen Indonesia',
      )}) Tj ET`,
    );
    cmds.push(
      `BT /F1 8.5 Tf ${pageW - marginX - 185} ${cursorY - 28} Td (${escapePdfText(
        `Dicetak: ${report.generatedAt}`,
      )}) Tj ET`,
    );

    cursorY -= 60;

    if (isFirstPage) {
      // Kotak Ringkasan Statistik Evaluasi
      cmds.push('0.976 0.969 0.969 rg 0.859 0.886 0.937 RG 1 w');
      cmds.push(`${marginX} ${cursorY - 34} ${contentW} 34 re B`);

      cmds.push('0.067 0.176 0.306 rg');
      const summaryLine =
        `Total Evaluasi: ${report.totalEvaluations}   |   ` +
        `Submitted: ${report.submittedCount}   |   ` +
        `Draft: ${report.draftCount}   |   ` +
        `Rata-rata Skor KPI/KPA Organisasi: ${report.averageScore} / 5.00`;
      cmds.push(
        `BT /F2 10 Tf ${marginX + 14} ${cursorY - 21} Td (${escapePdfText(
          summaryLine,
        )}) Tj ET`,
      );
      cursorY -= 46;
    }

    // Header Tabel
    drawTableHeader();
  };

  const cols = [
    { title: 'No', width: 28, maxChars: 4 },
    { title: 'Program Kerja & PIC', width: 145, maxChars: 26 },
    { title: 'Status & Skor', width: 92, maxChars: 16 },
    { title: 'Indikator KPI/KPA (Target / Realisasi / Skor)', width: 225, maxChars: 42 },
    { title: 'Kesimpulan Evaluasi', width: 140, maxChars: 25 },
    { title: 'Rekomendasi Tindak Lanjut', width: 140, maxChars: 25 },
  ];

  const drawTableHeader = () => {
    const headerH = 22;
    cmds.push('0.067 0.176 0.306 rg');
    cmds.push(`${marginX} ${cursorY - headerH} ${contentW} ${headerH} re f`);
    cmds.push('1 1 1 rg');

    let x = marginX;
    for (const col of cols) {
      cmds.push(
        `BT /F2 8.5 Tf ${x + 5} ${cursorY - 14} Td (${escapePdfText(
          col.title,
        )}) Tj ET`,
      );
      x += col.width;
    }
    cursorY -= headerH;
  };

  startNewPage(true);

  if (report.rows.length === 0) {
    cmds.push('0.32 0.38 0.42 rg');
    cmds.push(
      `BT /F1 10 Tf ${marginX + 14} ${cursorY - 24} Td (Belum ada data evaluasi KPI/KPA yang tercatat.) Tj ET`,
    );
  } else {
    report.rows.forEach((row, idx) => {
      const colCellsLines = [
        [String(row.no)],
        [
          ...wrapText(row.prokerName, cols[1].maxChars),
          ...wrapText(`PIC: ${row.picName}`, cols[1].maxChars),
        ],
        [
          `${row.status}`,
          `Skor: ${row.avgScore} / 5`,
          `(${row.indicatorCount} indikator)`,
        ],
        wrapText(row.indicatorsSummary, cols[3].maxChars),
        wrapText(row.kesimpulan, cols[4].maxChars),
        wrapText(row.rekomendasi, cols[5].maxChars),
      ];

      const maxLines = Math.min(
        8,
        Math.max(...colCellsLines.map((l) => l.length), 2),
      );
      const rowH = maxLines * 11 + 10;

      if (cursorY - rowH < 50) {
        startNewPage(false);
      }

      // Zebra stripe background
      if (idx % 2 === 1) {
        cmds.push('0.976 0.969 0.969 rg');
        cmds.push(`${marginX} ${cursorY - rowH} ${contentW} ${rowH} re f`);
      }

      // Row border
      cmds.push('0.859 0.886 0.937 RG 0.6 w');
      cmds.push(`${marginX} ${cursorY - rowH} ${contentW} ${rowH} re S`);

      // Teks sel
      cmds.push('0.067 0.176 0.306 rg');
      let x = marginX;
      colCellsLines.forEach((lines, cIdx) => {
        const sliced = lines.slice(0, maxLines);
        sliced.forEach((line, lIdx) => {
          const fontRef = cIdx === 1 && lIdx === 0 ? '/F2' : '/F1';
          const textY = cursorY - 12 - lIdx * 11;
          cmds.push(
            `BT ${fontRef} 8 Tf ${x + 5} ${textY} Td (${escapePdfText(
              line,
            )}) Tj ET`,
          );
        });
        x += cols[cIdx].width;
      });

      cursorY -= rowH;
    });
  }

  // Footer halaman
  pagesCommands.push(cmds);
  const totalPages = pagesCommands.length;
  pagesCommands.forEach((pageCmds, idx) => {
    pageCmds.push('0.55 0.60 0.64 rg');
    pageCmds.push(
      `BT /F1 8 Tf ${marginX} 22 Td (${escapePdfText(
        `Dokumen Resmi SIMORAWA HIMA IF UISI - Halaman ${idx + 1} dari ${totalPages}`,
      )}) Tj ET`,
    );
  });

  // Rakit struktur objek PDF 1.4
  const objects: string[] = [];
  // Obj 1: Catalog, Obj 2: Pages, Obj 3: Font Regular, Obj 4: Font Bold
  const firstPageObjNum = 5;
  const pageObjNums: number[] = [];

  pagesCommands.forEach((_, idx) => {
    pageObjNums.push(firstPageObjNum + idx * 2);
  });

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums
      .map((n) => `${n} 0 R`)
      .join(' ')}] /Count ${pageObjNums.length} >>\nendobj\n`,
  );
  objects.push(
    `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  );
  objects.push(
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`,
  );

  pagesCommands.forEach((pageCmds, idx) => {
    const pageObjId = firstPageObjNum + idx * 2;
    const contentObjId = pageObjId + 1;
    const streamData = pageCmds.join('\n');

    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${Buffer.byteLength(
        streamData,
        'utf8',
      )} >>\nstream\n${streamData}\nendstream\nendobj\n`,
    );
  });

  let pdfBody = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdfBody, 'utf8'));
    pdfBody += obj;
  }

  const xrefOffset = Buffer.byteLength(pdfBody, 'utf8');
  pdfBody += `xref\n0 ${objects.length + 1}\n`;
  pdfBody += `0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdfBody += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdfBody += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdfBody, 'utf8');
}
