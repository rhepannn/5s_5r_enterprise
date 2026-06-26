import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import type { UserRole, DivisionCategory, AreaCategory } from '@prisma/client';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

export async function importUsers(buffer: Buffer, companyId: string): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.getWorksheet('Users') || workbook.worksheets[0];

  if (!sheet) throw new AppError('Sheet tidak ditemukan dalam file Excel', 400);

  const result: ImportResult = { success: 0, failed: 0, errors: [] };
  const validRoles: UserRole[] = ['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC', 'ANGGOTA'];

  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    const name = String(row.getCell(1).value || '').trim();
    const email = String(row.getCell(2).value || '').trim().toLowerCase();
    const password = String(row.getCell(3).value || '').trim();
    const role = String(row.getCell(4).value || '').trim().toUpperCase() as UserRole;
    const divisionCode = String(row.getCell(5).value || '').trim();

    if (!name && !email) continue;

    try {
      if (!name) throw new Error('Nama wajib diisi');
      if (!email || !email.includes('@')) throw new Error('Email tidak valid');
      if (!password || password.length < 8) throw new Error('Password minimal 8 karakter');
      if (!validRoles.includes(role)) throw new Error(`Role tidak valid. Pilihan: ${validRoles.join(', ')}`);

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) throw new Error('Email sudah terdaftar');

      let divisionId: string | null = null;
      if (divisionCode) {
        const division = await prisma.division.findFirst({
          where: { code: divisionCode, department: { plant: { companyId } } },
        });
        if (!division) throw new Error(`Divisi dengan kode '${divisionCode}' tidak ditemukan`);
        divisionId = division.id;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: { name, email, passwordHash, role, companyId, divisionId },
      });
      result.success++;
    } catch (err) {
      result.failed++;
      result.errors.push({ row: rowNum, message: err instanceof Error ? err.message : 'Error tidak diketahui' });
    }
  }

  return result;
}

export async function importDivisions(buffer: Buffer, companyId: string): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.getWorksheet('Divisions') || workbook.worksheets[0];

  if (!sheet) throw new AppError('Sheet tidak ditemukan dalam file Excel', 400);

  const result: ImportResult = { success: 0, failed: 0, errors: [] };
  const validCategories: DivisionCategory[] = ['PRODUKSI', 'KANTOR', 'GUDANG'];

  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    const departmentCode = String(row.getCell(1).value || '').trim();
    const name = String(row.getCell(2).value || '').trim();
    const code = String(row.getCell(3).value || '').trim().toUpperCase();
    const category = String(row.getCell(4).value || '').trim().toUpperCase() as DivisionCategory;

    if (!name && !code) continue;

    try {
      if (!departmentCode) throw new Error('Kode departemen wajib diisi');
      if (!name) throw new Error('Nama divisi wajib diisi');
      if (!code) throw new Error('Kode divisi wajib diisi');
      if (!validCategories.includes(category)) throw new Error(`Kategori tidak valid: ${validCategories.join(', ')}`);

      const dept = await prisma.department.findFirst({
        where: { code: departmentCode, plant: { companyId } },
      });
      if (!dept) throw new Error(`Departemen dengan kode '${departmentCode}' tidak ditemukan`);

      await prisma.division.create({
        data: { name, code, category, departmentId: dept.id },
      });
      result.success++;
    } catch (err) {
      result.failed++;
      result.errors.push({ row: rowNum, message: err instanceof Error ? err.message : 'Error tidak diketahui' });
    }
  }

  return result;
}

export async function importWorkAreas(buffer: Buffer, companyId: string): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.getWorksheet('WorkAreas') || workbook.worksheets[0];

  if (!sheet) throw new AppError('Sheet tidak ditemukan dalam file Excel', 400);

  const result: ImportResult = { success: 0, failed: 0, errors: [] };
  const validCategories: AreaCategory[] = ['PRODUKSI', 'KANTOR', 'GUDANG', 'LABORATORIUM', 'OUTDOOR'];

  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    const divisionCode = String(row.getCell(1).value || '').trim();
    const name = String(row.getCell(2).value || '').trim();
    const code = String(row.getCell(3).value || '').trim().toUpperCase();
    const category = String(row.getCell(4).value || '').trim().toUpperCase() as AreaCategory;

    if (!name && !code) continue;

    try {
      if (!divisionCode) throw new Error('Kode divisi wajib diisi');
      if (!name) throw new Error('Nama area wajib diisi');
      if (!code) throw new Error('Kode area wajib diisi');
      if (!validCategories.includes(category)) throw new Error(`Kategori tidak valid: ${validCategories.join(', ')}`);

      const division = await prisma.division.findFirst({
        where: { code: divisionCode, department: { plant: { companyId } } },
      });
      if (!division) throw new Error(`Divisi dengan kode '${divisionCode}' tidak ditemukan`);

      await prisma.workArea.create({
        data: { name, code, category, divisionId: division.id },
      });
      result.success++;
    } catch (err) {
      result.failed++;
      result.errors.push({ row: rowNum, message: err instanceof Error ? err.message : 'Error tidak diketahui' });
    }
  }

  return result;
}

export async function generateImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Sheet Users
  const usersSheet = workbook.addWorksheet('Users');
  usersSheet.columns = [
    { header: 'Nama*', key: 'name', width: 25 },
    { header: 'Email*', key: 'email', width: 30 },
    { header: 'Password* (min 8 char, ada huruf kapital & angka)', key: 'password', width: 40 },
    { header: 'Role* (SUPERADMIN/ADMIN_5S/AUDITOR/KEPALA_DIVISI/PIC/ANGGOTA)', key: 'role', width: 50 },
    { header: 'Kode Divisi (opsional)', key: 'divisionCode', width: 20 },
  ];
  usersSheet.addRow(['Budi Santoso', 'budi@example.com', 'Password1', 'AUDITOR', 'PRD-01']);

  // Sheet Divisions
  const divSheet = workbook.addWorksheet('Divisions');
  divSheet.columns = [
    { header: 'Kode Departemen*', key: 'deptCode', width: 20 },
    { header: 'Nama Divisi*', key: 'name', width: 25 },
    { header: 'Kode Divisi*', key: 'code', width: 15 },
    { header: 'Kategori* (PRODUKSI/KANTOR/GUDANG)', key: 'category', width: 35 },
  ];
  divSheet.addRow(['DEPT-01', 'Divisi Produksi A', 'PRD-01', 'PRODUKSI']);

  // Sheet WorkAreas
  const areaSheet = workbook.addWorksheet('WorkAreas');
  areaSheet.columns = [
    { header: 'Kode Divisi*', key: 'divCode', width: 15 },
    { header: 'Nama Area*', key: 'name', width: 25 },
    { header: 'Kode Area*', key: 'code', width: 15 },
    { header: 'Kategori* (PRODUKSI/KANTOR/GUDANG/LABORATORIUM/OUTDOOR)', key: 'category', width: 50 },
  ];
  areaSheet.addRow(['PRD-01', 'Area Mesin CNC', 'CNC-01', 'PRODUKSI']);

  // Style headers
  [usersSheet, divSheet, areaSheet].forEach((sheet) => {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFE8F4FD' },
    };
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
