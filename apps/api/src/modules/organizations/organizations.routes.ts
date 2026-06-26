import { Router, Request, Response, NextFunction } from 'express';
import * as svc from './organizations.service';
import {
  createCompanySchema, updateCompanySchema,
  createPlantSchema, updatePlantSchema,
  createDepartmentSchema, updateDepartmentSchema,
  createDivisionSchema, updateDivisionSchema,
  createWorkAreaSchema, updateWorkAreaSchema,
} from './organizations.schema';
import { authenticate, onlyAdminAndAbove, authorize } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';

const router = Router();

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// ============ Company ============
router.get('/companies', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.getCompanies();
  successResponse(res, data, 'Daftar perusahaan');
}));

router.get('/companies/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.getCompanyById(req.params.id);
  successResponse(res, data);
}));

router.post('/companies', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = createCompanySchema.parse(req.body);
  const data = await svc.createCompany(input);
  successResponse(res, data, 'Perusahaan berhasil dibuat', 201);
}));

router.put('/companies/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = updateCompanySchema.parse(req.body);
  const data = await svc.updateCompany(req.params.id, input);
  successResponse(res, data, 'Perusahaan berhasil diperbarui');
}));

router.delete('/companies/:id', authenticate, authorize('SUPERADMIN'), wrap(async (req, res) => {
  await svc.deleteCompany(req.params.id);
  successResponse(res, null, 'Perusahaan berhasil dihapus');
}));

// ============ Plant ============
router.get('/companies/:companyId/plants', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.getPlantsByCompany(req.params.companyId);
  successResponse(res, data, 'Daftar plant');
}));

router.get('/plants/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.getPlantById(req.params.id);
  successResponse(res, data);
}));

router.post('/companies/:companyId/plants', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = createPlantSchema.parse(req.body);
  const data = await svc.createPlant(req.params.companyId, input);
  successResponse(res, data, 'Plant berhasil dibuat', 201);
}));

router.put('/plants/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = updatePlantSchema.parse(req.body);
  const data = await svc.updatePlant(req.params.id, input);
  successResponse(res, data, 'Plant berhasil diperbarui');
}));

router.delete('/plants/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deletePlant(req.params.id);
  successResponse(res, null, 'Plant berhasil dihapus');
}));

// ============ Department ============
router.get('/plants/:plantId/departments', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.getDepartmentsByPlant(req.params.plantId);
  successResponse(res, data, 'Daftar departemen');
}));

router.post('/plants/:plantId/departments', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = createDepartmentSchema.parse(req.body);
  const data = await svc.createDepartment(req.params.plantId, input);
  successResponse(res, data, 'Departemen berhasil dibuat', 201);
}));

router.put('/departments/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = updateDepartmentSchema.parse(req.body);
  const data = await svc.updateDepartment(req.params.id, input);
  successResponse(res, data, 'Departemen berhasil diperbarui');
}));

router.delete('/departments/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deleteDepartment(req.params.id);
  successResponse(res, null, 'Departemen berhasil dihapus');
}));

// ============ Division ============
router.get('/companies/:companyId/divisions', authenticate, wrap(async (req, res) => {
  const data = await svc.getDivisionsByCompany(req.params.companyId);
  successResponse(res, data, 'Daftar divisi');
}));

router.get('/departments/:departmentId/divisions', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.getDivisionsByDepartment(req.params.departmentId);
  successResponse(res, data, 'Daftar divisi');
}));

router.get('/divisions/:id', authenticate, wrap(async (req, res) => {
  const data = await svc.getDivisionById(req.params.id);
  successResponse(res, data);
}));

router.post('/departments/:departmentId/divisions', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = createDivisionSchema.parse(req.body);
  const data = await svc.createDivision(req.params.departmentId, input);
  successResponse(res, data, 'Divisi berhasil dibuat', 201);
}));

router.put('/divisions/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = updateDivisionSchema.parse(req.body);
  const data = await svc.updateDivision(req.params.id, input);
  successResponse(res, data, 'Divisi berhasil diperbarui');
}));

router.delete('/divisions/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deleteDivision(req.params.id);
  successResponse(res, null, 'Divisi berhasil dihapus');
}));

// ============ WorkArea ============
router.get('/divisions/:divisionId/areas', authenticate, wrap(async (req, res) => {
  const data = await svc.getWorkAreasByDivision(req.params.divisionId);
  successResponse(res, data, 'Daftar area kerja');
}));

router.get('/areas/:id', authenticate, wrap(async (req, res) => {
  const data = await svc.getWorkAreaById(req.params.id);
  successResponse(res, data);
}));

router.post('/divisions/:divisionId/areas', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = createWorkAreaSchema.parse(req.body);
  const data = await svc.createWorkArea(req.params.divisionId, input);
  successResponse(res, data, 'Area kerja berhasil dibuat', 201);
}));

router.put('/areas/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = updateWorkAreaSchema.parse(req.body);
  const data = await svc.updateWorkArea(req.params.id, input);
  successResponse(res, data, 'Area kerja berhasil diperbarui');
}));

router.delete('/areas/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deleteWorkArea(req.params.id);
  successResponse(res, null, 'Area kerja berhasil dinonaktifkan');
}));

export default router;
