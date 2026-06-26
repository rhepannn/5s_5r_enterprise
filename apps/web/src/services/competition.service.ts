import api from '@/lib/api';
import type { ApiResponse, DivisionScoreEntry, PeriodCountdown } from '@/types';

export const competitionService = {
  async getLeaderboard(periodId: string, category?: string): Promise<DivisionScoreEntry[]> {
    const res = await api.get<ApiResponse<DivisionScoreEntry[]>>('/competition/leaderboard', {
      params: { periodId, ...(category && { category }) },
    });
    return res.data.data;
  },
  async recompute(periodId: string): Promise<DivisionScoreEntry[]> {
    const res = await api.post<ApiResponse<DivisionScoreEntry[]>>('/competition/recompute', { periodId });
    return res.data.data;
  },
  async getCountdown(periodId: string): Promise<PeriodCountdown> {
    const res = await api.get<ApiResponse<PeriodCountdown>>(`/competition/periods/${periodId}/countdown`);
    return res.data.data;
  },
};
