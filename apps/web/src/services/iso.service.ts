import api from '@/lib/api';
import type { ApiResponse, IsoClause, ComplianceStatus, IsoReadiness, PotentialNC, EvidencePackage, Improvement } from '@/types';

export const isoService = {
  async listClauses(standard?: string): Promise<IsoClause[]> {
    const res = await api.get<ApiResponse<IsoClause[]>>('/iso/clauses', { params: standard ? { standard } : {} });
    return res.data.data;
  },
  async getCompliance(standard: string): Promise<ComplianceStatus> {
    const res = await api.get<ApiResponse<ComplianceStatus>>(`/iso/compliance/${standard}`);
    return res.data.data;
  },
  async getReadiness(): Promise<IsoReadiness> {
    const res = await api.get<ApiResponse<IsoReadiness>>('/iso/readiness');
    return res.data.data;
  },
  async getPotentialNC(): Promise<PotentialNC> {
    const res = await api.get<ApiResponse<PotentialNC>>('/iso/potential-nc');
    return res.data.data;
  },
  async getEvidence(standard: string): Promise<EvidencePackage> {
    const res = await api.get<ApiResponse<EvidencePackage>>(`/iso/evidence/${standard}`);
    return res.data.data;
  },
  async tagImprovement(improvementId: string, clauses: string[]): Promise<Improvement> {
    const res = await api.patch<ApiResponse<Improvement>>(`/iso/improvements/${improvementId}/tag`, { clauses });
    return res.data.data;
  },
};
