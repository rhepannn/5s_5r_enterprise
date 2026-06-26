import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '@/app';
import { prisma } from '@/config/prisma';

const TEST_COMPANY_CODE = 'TEST-ORG';
let companyId: string;
let accessToken: string;
let plantId: string;
let departmentId: string;
let divisionId: string;

beforeAll(async () => {
  const company = await prisma.company.upsert({
    where: { code: TEST_COMPANY_CODE },
    update: {},
    create: { name: 'Test Org Company', code: TEST_COMPANY_CODE },
  });
  companyId = company.id;

  await prisma.user.upsert({
    where: { email: 'orgtest@example.com' },
    update: {},
    create: {
      name: 'Org Test Admin',
      email: 'orgtest@example.com',
      passwordHash: await bcrypt.hash('TestPass1', 10),
      role: 'ADMIN_5S',
      companyId,
    },
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'orgtest@example.com', password: 'TestPass1' });
  accessToken = res.body.data.accessToken;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'orgtest@example.com' } });
  await prisma.company.deleteMany({ where: { code: TEST_COMPANY_CODE } });
  await prisma.$disconnect();
});

describe('Company CRUD', () => {
  it('harus mengembalikan daftar perusahaan', async () => {
    const res = await request(app)
      .get('/api/companies')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('harus membuat perusahaan baru', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'PT Test Baru', code: 'PT-NEW-TEST' });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('PT-NEW-TEST');

    await prisma.company.delete({ where: { code: 'PT-NEW-TEST' } });
  });
});

describe('Plant CRUD', () => {
  it('harus membuat plant baru', async () => {
    const res = await request(app)
      .post(`/api/companies/${companyId}/plants`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Plant Test', code: 'PLT-TST' });
    expect(res.status).toBe(201);
    plantId = res.body.data.id;
  });

  it('harus mendapatkan daftar plant', async () => {
    const res = await request(app)
      .get(`/api/companies/${companyId}/plants`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('Department CRUD', () => {
  it('harus membuat departemen baru', async () => {
    const res = await request(app)
      .post(`/api/plants/${plantId}/departments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Dept Test', code: 'DPT-TST' });
    expect(res.status).toBe(201);
    departmentId = res.body.data.id;
  });
});

describe('Division CRUD', () => {
  it('harus membuat divisi baru', async () => {
    const res = await request(app)
      .post(`/api/departments/${departmentId}/divisions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Divisi Test', code: 'DIV-TST', category: 'PRODUKSI' });
    expect(res.status).toBe(201);
    divisionId = res.body.data.id;
  });

  it('harus menolak kategori divisi tidak valid', async () => {
    const res = await request(app)
      .post(`/api/departments/${departmentId}/divisions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Invalid', code: 'INV', category: 'INVALID_CAT' });
    expect(res.status).toBe(422);
  });
});

describe('WorkArea CRUD', () => {
  it('harus membuat area kerja baru', async () => {
    const res = await request(app)
      .post(`/api/divisions/${divisionId}/areas`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Area Test', code: 'AREA-TST', category: 'PRODUKSI' });
    expect(res.status).toBe(201);
  });

  it('harus mendapatkan daftar area kerja', async () => {
    const res = await request(app)
      .get(`/api/divisions/${divisionId}/areas`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('RBAC', () => {
  let anonToken: string;

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { email: 'anggota@example.com' },
      update: {},
      create: {
        name: 'Anggota Test',
        email: 'anggota@example.com',
        passwordHash: await bcrypt.hash('TestPass1', 10),
        role: 'ANGGOTA',
        companyId,
      },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'anggota@example.com', password: 'TestPass1' });
    anonToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'anggota@example.com' } });
  });

  it('ANGGOTA tidak boleh membuat company', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${anonToken}`)
      .send({ name: 'Tidak Boleh', code: 'NO-ACC' });
    expect(res.status).toBe(403);
  });
});
