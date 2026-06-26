import api from '@/lib/api';
import type { ApiResponse, QccProject, QccStats, KaizenIdea } from '@/types';

export interface CreateQccPayload {
  title: string;
  divisionId: string;
  problemDesc: string;
  members: string[];
  startDate: string;
  targetDate: string;
  rootCause?: string;
  savingCost?: number;
}

export const qccService = {
  async list(params?: Record<string, string>): Promise<QccProject[]> {
    const res = await api.get<ApiResponse<QccProject[]>>('/qcc', { params });
    return res.data.data;
  },
  async getById(id: string): Promise<QccProject> {
    const res = await api.get<ApiResponse<QccProject>>(`/qcc/${id}`);
    return res.data.data;
  },
  async stats(): Promise<QccStats> {
    const res = await api.get<ApiResponse<QccStats>>('/qcc/stats');
    return res.data.data;
  },
  async create(payload: CreateQccPayload): Promise<QccProject> {
    const res = await api.post<ApiResponse<QccProject>>('/qcc', payload);
    return res.data.data;
  },
  async update(id: string, payload: Partial<CreateQccPayload> & { solution?: string }): Promise<QccProject> {
    const res = await api.put<ApiResponse<QccProject>>(`/qcc/${id}`, payload);
    return res.data.data;
  },
  async advance(id: string): Promise<QccProject> {
    const res = await api.post<ApiResponse<QccProject>>(`/qcc/${id}/advance`);
    return res.data.data;
  },
  async saveTools(id: string, toolsData: Record<string, unknown>): Promise<QccProject> {
    const res = await api.put<ApiResponse<QccProject>>(`/qcc/${id}/tools`, { toolsData });
    return res.data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/qcc/${id}`);
  },
};

export const kaizenService = {
  async list(params?: Record<string, string>): Promise<KaizenIdea[]> {
    const res = await api.get<ApiResponse<KaizenIdea[]>>('/kaizen', { params });
    return res.data.data;
  },
  async create(payload: { title: string; description: string; divisionId: string; estimatedSaving?: number }): Promise<KaizenIdea> {
    const res = await api.post<ApiResponse<KaizenIdea>>('/kaizen', payload);
    return res.data.data;
  },
  async vote(id: string): Promise<{ voted: boolean; voteCount: number }> {
    const res = await api.post<ApiResponse<{ voted: boolean; voteCount: number }>>(`/kaizen/${id}/vote`);
    return res.data.data;
  },
  async adopt(id: string): Promise<unknown> {
    const res = await api.post<ApiResponse<unknown>>(`/kaizen/${id}/adopt`);
    return res.data.data;
  },
  async reject(id: string): Promise<unknown> {
    const res = await api.post<ApiResponse<unknown>>(`/kaizen/${id}/reject`);
    return res.data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/kaizen/${id}`);
  },
};
