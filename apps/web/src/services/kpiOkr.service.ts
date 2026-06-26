import api from '@/lib/api';
import type { ApiResponse, Okr, OkrKeyResult, KpiTarget } from '@/types';

export interface CreateOkrPayload {
  level: 'COMPANY' | 'DIVISION';
  divisionId?: string;
  objective: string;
  quarter: string;
  keyResults: { title: string; target: number; unit: string }[];
}

export interface CreateKpiPayload {
  divisionId?: string;
  pilar: string;
  indicator: string;
  target: number;
  unit: string;
  period: string;
}

export const kpiOkrService = {
  // OKR
  async listOkrs(params?: Record<string, string>): Promise<Okr[]> {
    const res = await api.get<ApiResponse<Okr[]>>('/kpi-okr/okr', { params });
    return res.data.data;
  },
  async createOkr(payload: CreateOkrPayload): Promise<Okr> {
    const res = await api.post<ApiResponse<Okr>>('/kpi-okr/okr', payload);
    return res.data.data;
  },
  async updateKeyResult(krId: string, actual: number): Promise<OkrKeyResult> {
    const res = await api.patch<ApiResponse<OkrKeyResult>>(`/kpi-okr/okr/key-results/${krId}`, { actual });
    return res.data.data;
  },
  async deleteOkr(id: string): Promise<void> {
    await api.delete(`/kpi-okr/okr/${id}`);
  },
  // KPI
  async listKpis(params?: Record<string, string>): Promise<KpiTarget[]> {
    const res = await api.get<ApiResponse<KpiTarget[]>>('/kpi-okr/kpi', { params });
    return res.data.data;
  },
  async createKpi(payload: CreateKpiPayload): Promise<KpiTarget> {
    const res = await api.post<ApiResponse<KpiTarget>>('/kpi-okr/kpi', payload);
    return res.data.data;
  },
  async recomputeKpi(): Promise<KpiTarget[]> {
    const res = await api.post<ApiResponse<KpiTarget[]>>('/kpi-okr/kpi/recompute');
    return res.data.data;
  },
  async deleteKpi(id: string): Promise<void> {
    await api.delete(`/kpi-okr/kpi/${id}`);
  },
};
