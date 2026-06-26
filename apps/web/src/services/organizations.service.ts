import api from '@/lib/api';
import type { ApiResponse, Company, Plant, Department, Division, WorkArea } from '@/types';

export const companiesService = {
  async list(): Promise<Company[]> {
    const res = await api.get<ApiResponse<Company[]>>('/companies');
    return res.data.data;
  },
  async getById(id: string): Promise<Company> {
    const res = await api.get<ApiResponse<Company>>(`/companies/${id}`);
    return res.data.data;
  },
  async create(data: Partial<Company>): Promise<Company> {
    const res = await api.post<ApiResponse<Company>>('/companies', data);
    return res.data.data;
  },
  async update(id: string, data: Partial<Company>): Promise<Company> {
    const res = await api.put<ApiResponse<Company>>(`/companies/${id}`, data);
    return res.data.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/companies/${id}`);
  },
};

export const plantsService = {
  async listByCompany(companyId: string): Promise<Plant[]> {
    const res = await api.get<ApiResponse<Plant[]>>(`/companies/${companyId}/plants`);
    return res.data.data;
  },
  async create(companyId: string, data: Partial<Plant>): Promise<Plant> {
    const res = await api.post<ApiResponse<Plant>>(`/companies/${companyId}/plants`, data);
    return res.data.data;
  },
  async update(id: string, data: Partial<Plant>): Promise<Plant> {
    const res = await api.put<ApiResponse<Plant>>(`/plants/${id}`, data);
    return res.data.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/plants/${id}`);
  },
};

export const departmentsService = {
  async listByPlant(plantId: string): Promise<Department[]> {
    const res = await api.get<ApiResponse<Department[]>>(`/plants/${plantId}/departments`);
    return res.data.data;
  },
  async create(plantId: string, data: Partial<Department>): Promise<Department> {
    const res = await api.post<ApiResponse<Department>>(`/plants/${plantId}/departments`, data);
    return res.data.data;
  },
  async update(id: string, data: Partial<Department>): Promise<Department> {
    const res = await api.put<ApiResponse<Department>>(`/departments/${id}`, data);
    return res.data.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/departments/${id}`);
  },
};

export const divisionsService = {
  async listByCompany(companyId: string): Promise<Division[]> {
    const res = await api.get<ApiResponse<Division[]>>(`/companies/${companyId}/divisions`);
    return res.data.data;
  },
  async listByDepartment(departmentId: string): Promise<Division[]> {
    const res = await api.get<ApiResponse<Division[]>>(`/departments/${departmentId}/divisions`);
    return res.data.data;
  },
  async getById(id: string): Promise<Division> {
    const res = await api.get<ApiResponse<Division>>(`/divisions/${id}`);
    return res.data.data;
  },
  async create(departmentId: string, data: Partial<Division>): Promise<Division> {
    const res = await api.post<ApiResponse<Division>>(`/departments/${departmentId}/divisions`, data);
    return res.data.data;
  },
  async update(id: string, data: Partial<Division>): Promise<Division> {
    const res = await api.put<ApiResponse<Division>>(`/divisions/${id}`, data);
    return res.data.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/divisions/${id}`);
  },
};

export const workAreasService = {
  async listByDivision(divisionId: string): Promise<WorkArea[]> {
    const res = await api.get<ApiResponse<WorkArea[]>>(`/divisions/${divisionId}/areas`);
    return res.data.data;
  },
  async create(divisionId: string, data: Partial<WorkArea>): Promise<WorkArea> {
    const res = await api.post<ApiResponse<WorkArea>>(`/divisions/${divisionId}/areas`, data);
    return res.data.data;
  },
  async update(id: string, data: Partial<WorkArea>): Promise<WorkArea> {
    const res = await api.put<ApiResponse<WorkArea>>(`/areas/${id}`, data);
    return res.data.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/areas/${id}`);
  },
};
