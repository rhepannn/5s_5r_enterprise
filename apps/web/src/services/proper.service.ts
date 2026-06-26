import api from '@/lib/api';
import type { ApiResponse, ProperDashboard, EnvBalance, EnvPermit, ProperEvidence, CritStatus, ProperRank } from '@/types';

export const properService = {
  async getDashboard(period?: string): Promise<ProperDashboard> {
    const res = await api.get<ApiResponse<ProperDashboard>>('/proper/dashboard', { params: period ? { period } : {} });
    return res.data.data;
  },
  async updateCriteria(period: string, scores: Record<string, CritStatus>, targetRank?: ProperRank): Promise<unknown> {
    const res = await api.put<ApiResponse<unknown>>('/proper/criteria', { period, scores, ...(targetRank && { targetRank }) });
    return res.data.data;
  },
  async listBalances(params?: Record<string, string>): Promise<EnvBalance[]> {
    const res = await api.get<ApiResponse<EnvBalance[]>>('/proper/balances', { params });
    return res.data.data;
  },
  async upsertBalance(payload: { period: string; type: string; data: Record<string, unknown> }): Promise<EnvBalance> {
    const res = await api.post<ApiResponse<EnvBalance>>('/proper/balances', payload);
    return res.data.data;
  },
  async listPermits(): Promise<EnvPermit[]> {
    const res = await api.get<ApiResponse<EnvPermit[]>>('/proper/permits');
    return res.data.data;
  },
  async createPermit(payload: Record<string, unknown>): Promise<EnvPermit> {
    const res = await api.post<ApiResponse<EnvPermit>>('/proper/permits', payload);
    return res.data.data;
  },
  async deletePermit(id: string): Promise<void> {
    await api.delete(`/proper/permits/${id}`);
  },
  async getEvidence(): Promise<ProperEvidence> {
    const res = await api.get<ApiResponse<ProperEvidence>>('/proper/evidence');
    return res.data.data;
  },
  async getRklRpl(period?: string): Promise<{
    company: string; period: string; generatedAt: string;
    balances: EnvBalance[]; permits: EnvPermit[];
    compliance: { code: string; name: string; status: string; category: string }[];
  }> {
    const res = await api.get<ApiResponse<{ company: string; period: string; generatedAt: string; balances: EnvBalance[]; permits: EnvPermit[]; compliance: { code: string; name: string; status: string; category: string }[] }>>('/proper/rkl-rpl', { params: period ? { period } : {} });
    return res.data.data;
  },
  async downloadSimpel(period?: string): Promise<void> {
    const res = await api.get('/proper/export/simpel.xlsx', { params: period ? { period } : {}, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'neraca-lingkungan-simpel.xlsx'; a.click(); window.URL.revokeObjectURL(url);
  },
};
