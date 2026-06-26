import api from '@/lib/api';
import type { ApiResponse, Improvement, ImprovementReport, AuditTrailEntry } from '@/types';

export interface CreateImprovementPayload {
  divisionId: string;
  problemCategory: string;
  pilarTags: string[];
  description: string;
  rootCause: string;
  actions: string;
  picId: string;
  targetDate: string;
  estimatedCost?: number;
  isoClause?: string;
  isProperEvidence?: boolean;
  latitude?: number;
  longitude?: number;
}

export const improvementService = {
  async list(params?: Record<string, string>): Promise<Improvement[]> {
    const res = await api.get<ApiResponse<Improvement[]>>('/improvements', { params });
    return res.data.data;
  },
  async getById(id: string): Promise<Improvement> {
    const res = await api.get<ApiResponse<Improvement>>(`/improvements/${id}`);
    return res.data.data;
  },
  async getTrail(id: string): Promise<AuditTrailEntry[]> {
    const res = await api.get<ApiResponse<AuditTrailEntry[]>>(`/improvements/${id}/trail`);
    return res.data.data;
  },
  async getReport(): Promise<ImprovementReport> {
    const res = await api.get<ApiResponse<ImprovementReport>>('/improvements/report');
    return res.data.data;
  },
  async create(payload: CreateImprovementPayload): Promise<Improvement> {
    const res = await api.post<ApiResponse<Improvement>>('/improvements', payload);
    return res.data.data;
  },
  async start(id: string): Promise<Improvement> {
    const res = await api.post<ApiResponse<Improvement>>(`/improvements/${id}/start`);
    return res.data.data;
  },
  async submit(id: string): Promise<Improvement> {
    const res = await api.post<ApiResponse<Improvement>>(`/improvements/${id}/submit`);
    return res.data.data;
  },
  async verify(id: string): Promise<Improvement> {
    const res = await api.post<ApiResponse<Improvement>>(`/improvements/${id}/verify`);
    return res.data.data;
  },
  async requestRevision(id: string, reason: string): Promise<Improvement> {
    const res = await api.post<ApiResponse<Improvement>>(`/improvements/${id}/request-revision`, { reason });
    return res.data.data;
  },
  async reject(id: string, reason: string): Promise<Improvement> {
    const res = await api.post<ApiResponse<Improvement>>(`/improvements/${id}/reject`, { reason });
    return res.data.data;
  },
  async escalateToQCC(id: string): Promise<{ improvement: Improvement; qccProject: { id: string; title: string } }> {
    const res = await api.post<ApiResponse<{ improvement: Improvement; qccProject: { id: string; title: string } }>>(`/improvements/${id}/escalate-qcc`);
    return res.data.data;
  },
  async uploadPhotos(id: string, type: 'before' | 'after', files: File[]): Promise<Improvement> {
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    const res = await api.post<ApiResponse<Improvement>>(`/improvements/${id}/photos/${type}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
};
