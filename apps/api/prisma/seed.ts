import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================================
  // Company
  // ============================================================
  const company = await prisma.company.upsert({
    where: { code: 'PT-MAJU' },
    update: {},
    create: {
      name: 'PT Maju Bersama Sejahtera',
      code: 'PT-MAJU',
      address: 'Jl. Industri Raya No. 1, Bekasi, Jawa Barat',
      phone: '021-88001234',
      email: 'info@majubersama.co.id',
    },
  });
  console.log(`  ✓ Company: ${company.name}`);

  // ============================================================
  // Plant
  // ============================================================
  const plant = await prisma.plant.upsert({
    where: { companyId_code: { companyId: company.id, code: 'PLT-01' } },
    update: {},
    create: {
      name: 'Plant Bekasi',
      code: 'PLT-01',
      address: 'Jl. Industri Raya No. 1, Bekasi',
      companyId: company.id,
    },
  });

  // ============================================================
  // Departments
  // ============================================================
  const deptProduksi = await prisma.department.upsert({
    where: { plantId_code: { plantId: plant.id, code: 'DEPT-PRD' } },
    update: {},
    create: { name: 'Departemen Produksi', code: 'DEPT-PRD', plantId: plant.id },
  });

  const deptKantor = await prisma.department.upsert({
    where: { plantId_code: { plantId: plant.id, code: 'DEPT-KNT' } },
    update: {},
    create: { name: 'Departemen Kantor', code: 'DEPT-KNT', plantId: plant.id },
  });

  const deptGudang = await prisma.department.upsert({
    where: { plantId_code: { plantId: plant.id, code: 'DEPT-GDG' } },
    update: {},
    create: { name: 'Departemen Gudang', code: 'DEPT-GDG', plantId: plant.id },
  });

  // ============================================================
  // Divisions
  // ============================================================
  const divProdA = await prisma.division.upsert({
    where: { departmentId_code: { departmentId: deptProduksi.id, code: 'PRD-A' } },
    update: {},
    create: { name: 'Divisi Produksi A', code: 'PRD-A', category: 'PRODUKSI', departmentId: deptProduksi.id },
  });

  const divProdB = await prisma.division.upsert({
    where: { departmentId_code: { departmentId: deptProduksi.id, code: 'PRD-B' } },
    update: {},
    create: { name: 'Divisi Produksi B', code: 'PRD-B', category: 'PRODUKSI', departmentId: deptProduksi.id },
  });

  const divHR = await prisma.division.upsert({
    where: { departmentId_code: { departmentId: deptKantor.id, code: 'HR' } },
    update: {},
    create: { name: 'Divisi HR & GA', code: 'HR', category: 'KANTOR', departmentId: deptKantor.id },
  });

  const divGudang = await prisma.division.upsert({
    where: { departmentId_code: { departmentId: deptGudang.id, code: 'GDG-01' } },
    update: {},
    create: { name: 'Divisi Gudang Bahan Baku', code: 'GDG-01', category: 'GUDANG', departmentId: deptGudang.id },
  });

  console.log('  ✓ Divisions seeded (4 divisions)');

  // ============================================================
  // Work Areas
  // ============================================================
  await prisma.workArea.upsert({
    where: { divisionId_code: { divisionId: divProdA.id, code: 'CNC-01' } },
    update: {},
    create: { name: 'Area Mesin CNC', code: 'CNC-01', category: 'PRODUKSI', divisionId: divProdA.id },
  });
  await prisma.workArea.upsert({
    where: { divisionId_code: { divisionId: divProdA.id, code: 'ASS-01' } },
    update: {},
    create: { name: 'Area Perakitan', code: 'ASS-01', category: 'PRODUKSI', divisionId: divProdA.id },
  });
  await prisma.workArea.upsert({
    where: { divisionId_code: { divisionId: divHR.id, code: 'KNT-HR' } },
    update: {},
    create: { name: 'Ruang HR', code: 'KNT-HR', category: 'KANTOR', divisionId: divHR.id },
  });
  await prisma.workArea.upsert({
    where: { divisionId_code: { divisionId: divGudang.id, code: 'GDG-BB' } },
    update: {},
    create: { name: 'Gudang Bahan Baku', code: 'GDG-BB', category: 'GUDANG', divisionId: divGudang.id },
  });

  console.log('  ✓ Work areas seeded (4 areas)');

  // ============================================================
  // Users
  // ============================================================
  const passwordHash = await bcrypt.hash('Admin1234', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@5s-enterprise.com' },
    update: {},
    create: {
      name: 'Super Administrator',
      email: 'superadmin@5s-enterprise.com',
      passwordHash,
      role: 'SUPERADMIN',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin5s@5s-enterprise.com' },
    update: {},
    create: {
      name: 'Admin 5S',
      email: 'admin5s@5s-enterprise.com',
      passwordHash,
      role: 'ADMIN_5S',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'auditor@5s-enterprise.com' },
    update: {},
    create: {
      name: 'Auditor Lapangan',
      email: 'auditor@5s-enterprise.com',
      passwordHash,
      role: 'AUDITOR',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'kepala.produksi@5s-enterprise.com' },
    update: {},
    create: {
      name: 'Kepala Divisi Produksi A',
      email: 'kepala.produksi@5s-enterprise.com',
      passwordHash,
      role: 'KEPALA_DIVISI',
      companyId: company.id,
      divisionId: divProdA.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'pic@5s-enterprise.com' },
    update: {},
    create: {
      name: 'PIC Produksi A',
      email: 'pic@5s-enterprise.com',
      passwordHash,
      role: 'PIC',
      companyId: company.id,
      divisionId: divProdA.id,
    },
  });

  console.log('  ✓ Users seeded (5 users, password: Admin1234)');

  // ============================================================
  // Audit Period
  // ============================================================
  await prisma.auditPeriod.upsert({
    where: { id: 'seed-period-2026-q2' },
    update: {},
    create: {
      id: 'seed-period-2026-q2',
      name: 'Q2 2026',
      type: 'QUARTERLY',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
      companyId: company.id,
      isActive: true,
    },
  });

  console.log('  ✓ Audit period seeded (Q2 2026)');

  // ============================================================
  // Checklist Templates (5S per Pilar)
  // ============================================================
  const checklistData = [
    // RINGKAS
    { pilar: 'RINGKAS' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah barang yang tidak diperlukan sudah disingkirkan dari area kerja?', sortOrder: 1 },
    { pilar: 'RINGKAS' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah peralatan yang rusak sudah diidentifikasi dan dipisahkan?', sortOrder: 2 },
    { pilar: 'RINGKAS' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah bahan baku berlebih sudah dikembalikan ke gudang?', sortOrder: 3 },
    { pilar: 'RINGKAS' as const, areaCategory: 'KANTOR' as const, question: 'Apakah dokumen/berkas yang tidak diperlukan sudah dibuang atau diarsipkan?', sortOrder: 1 },
    { pilar: 'RINGKAS' as const, areaCategory: 'KANTOR' as const, question: 'Apakah peralatan ATK yang tidak terpakai sudah dikembalikan?', sortOrder: 2 },
    { pilar: 'RINGKAS' as const, areaCategory: 'GUDANG' as const, question: 'Apakah barang expired/rusak sudah dipisahkan dan ditandai?', sortOrder: 1 },

    // RAPI
    { pilar: 'RAPI' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah semua peralatan memiliki tempat penyimpanan yang ditandai dengan jelas?', sortOrder: 1 },
    { pilar: 'RAPI' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah jalur evakuasi dan area mesin bebas dari hambatan?', sortOrder: 2 },
    { pilar: 'RAPI' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah pelabelan pada rak/laci/loker sudah terpasang dan terbaca?', sortOrder: 3 },
    { pilar: 'RAPI' as const, areaCategory: 'KANTOR' as const, question: 'Apakah semua dokumen tersimpan di folder/rak sesuai kategori?', sortOrder: 1 },
    { pilar: 'RAPI' as const, areaCategory: 'GUDANG' as const, question: 'Apakah barang tersimpan sesuai kategori dan FIFO diterapkan?', sortOrder: 1 },

    // RESIK
    { pilar: 'RESIK' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah lantai area kerja bersih dari oli, debu, dan sisa material?', sortOrder: 1 },
    { pilar: 'RESIK' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah mesin dan peralatan bersih dan bebas karat?', sortOrder: 2 },
    { pilar: 'RESIK' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah saluran pembuangan tidak tersumbat?', sortOrder: 3, isProperTag: true },
    { pilar: 'RESIK' as const, areaCategory: 'KANTOR' as const, question: 'Apakah meja kerja bersih dan bebas dari tumpukan tidak perlu?', sortOrder: 1 },
    { pilar: 'RESIK' as const, areaCategory: 'GUDANG' as const, question: 'Apakah area gudang bersih dari debu dan kontaminan?', sortOrder: 1 },

    // RAWAT
    { pilar: 'RAWAT' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah standar 3S (Ringkas, Rapi, Resik) terdokumentasi dan dipampang?', sortOrder: 1 },
    { pilar: 'RAWAT' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah jadwal pembersihan terpasang dan diisi secara konsisten?', sortOrder: 2 },
    { pilar: 'RAWAT' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah penanggung jawab area teridentifikasi dengan jelas?', sortOrder: 3 },
    { pilar: 'RAWAT' as const, areaCategory: 'KANTOR' as const, question: 'Apakah prosedur pengelolaan dokumen terpampang di area?', sortOrder: 1 },

    // RAJIN
    { pilar: 'RAJIN' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah seluruh karyawan mengikuti briefing 5S harian/mingguan?', sortOrder: 1 },
    { pilar: 'RAJIN' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah APD digunakan dengan benar oleh seluruh karyawan?', sortOrder: 2, isoClause: '8.1' },
    { pilar: 'RAJIN' as const, areaCategory: 'PRODUKSI' as const, question: 'Apakah karyawan menjalankan 5S secara mandiri tanpa diingatkan?', sortOrder: 3 },
    { pilar: 'RAJIN' as const, areaCategory: 'KANTOR' as const, question: 'Apakah seluruh karyawan mematuhi jam kerja dan prosedur yang berlaku?', sortOrder: 1 },
  ];

  const existing = await prisma.checklistTemplate.count();
  if (existing === 0) {
    await prisma.checklistTemplate.createMany({
      data: checklistData.map(d => ({
        name: d.question.substring(0, 50),
        pilar: d.pilar,
        areaCategory: d.areaCategory,
        question: d.question,
        sortOrder: d.sortOrder,
        isProperTag: (d as { isProperTag?: boolean }).isProperTag || false,
        isoClause: (d as { isoClause?: string }).isoClause,
      })),
    });
    console.log(`  ✓ Checklist templates seeded (${checklistData.length} items)`);
  } else {
    console.log(`  - Checklist templates already exist (${existing} items), skipping`);
  }

  console.log('\n✅ Seeding complete!');
  console.log('\n📋 Default login credentials:');
  console.log('   Email    : superadmin@5s-enterprise.com');
  console.log('   Password : Admin1234');
  console.log('   Role     : SUPERADMIN\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
