// Uji sekali: buktikan tangga eskalasi menembak tier yang benar. Membuat data sementara lalu menghapusnya.
import { prisma } from './src/config/prisma';
import { escalateOverdueImprovements } from './src/modules/before-after/escalation.service';

const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(12, 0, 0, 0); return d; };

async function main() {
  // Salin nilai valid dari satu improvement yang ada
  const base = await prisma.improvement.findFirst({ select: { divisionId: true, picId: true, problemCategory: true, pilarTags: true } });
  if (!base) { console.log('Tidak ada improvement acuan.'); return; }

  const temp = await prisma.improvement.create({
    data: {
      code: 'BA-TEST-ESC-0001',
      divisionId: base.divisionId,
      problemCategory: base.problemCategory,
      pilarTags: base.pilarTags,
      description: 'TEMP uji eskalasi — akan dihapus',
      rootCause: '-',
      actions: '-',
      picId: base.picId,
      targetDate: daysAgo(3),
      status: 'OPEN',
    },
    select: { id: true },
  });

  try {
    for (const days of [3, 7, 14]) {
      await prisma.improvement.update({ where: { id: temp.id }, data: { targetDate: daysAgo(days) } });
      const res = await escalateOverdueImprovements();
      console.log(`H+${days}: scanned=${res.scanned} escalated=${res.escalated} | PIC=${res.byTier.PIC} KEPALA=${res.byTier.KEPALA} ADMIN=${res.byTier.ADMIN}`);
    }
    await prisma.improvement.update({ where: { id: temp.id }, data: { targetDate: daysAgo(5) } });
    const none = await escalateOverdueImprovements();
    console.log(`H+5 (bukan ambang): escalated=${none.escalated} (harus 0)`);
  } finally {
    await prisma.improvement.delete({ where: { id: temp.id } });
    console.log('Data uji dihapus.');
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
