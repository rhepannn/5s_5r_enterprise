import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '@/app';
import { prisma } from '@/config/prisma';

const TEST_COMPANY_ID = 'test-company-auth';
const TEST_EMAIL = 'authtest@example.com';
const TEST_PASSWORD = 'TestPass1';

beforeAll(async () => {
  await prisma.company.upsert({
    where: { code: 'TEST-AUTH' },
    update: {},
    create: { id: TEST_COMPANY_ID, name: 'Test Company', code: 'TEST-AUTH' },
  });

  await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: {},
    create: {
      name: 'Auth Test User',
      email: TEST_EMAIL,
      passwordHash: await bcrypt.hash(TEST_PASSWORD, 10),
      role: 'ADMIN_5S',
      companyId: TEST_COMPANY_ID,
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.company.deleteMany({ where: { id: TEST_COMPANY_ID } });
  await prisma.$disconnect();
});

describe('POST /api/auth/login', () => {
  it('harus berhasil login dengan kredensial valid', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
  });

  it('harus gagal dengan password salah', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('harus gagal dengan email tidak valid', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bukan-email', password: TEST_PASSWORD });

    expect(res.status).toBe(422);
  });

  it('harus gagal dengan email tidak terdaftar', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tidakada@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    accessToken = res.body.data.accessToken;
  });

  it('harus mengembalikan data user saat token valid', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(TEST_EMAIL);
  });

  it('harus menolak akses tanpa token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('harus menolak token tidak valid', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-palsu');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('harus berhasil logout', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
