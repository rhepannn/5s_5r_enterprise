import api from '@/lib/api';
import type { ApiResponse, DashboardSummary, HeatmapArea, GapArea, IndividualStat } from '@/types';

export const dashboardService = {
  async getSummary(periodId?: string): Promise<DashboardSummary> {
    const res = await api.get<ApiResponse<DashboardSummary>>('/dashboard/summary', { params: periodId ? { periodId } : {} });
    return res.data.data;
  },
  async getHeatmap(): Promise<HeatmapArea[]> {
    const res = await api.get<ApiResponse<HeatmapArea[]>>('/dashboard/heatmap');
    return res.data.data;
  },
  async getGapAnalysis(): Promise<GapArea[]> {
    const res = await api.get<ApiResponse<GapArea[]>>('/dashboard/gap-analysis');
    return res.data.data;
  },
  async getIndividualStats(): Promise<IndividualStat[]> {
    const res = await api.get<ApiResponse<IndividualStat[]>>('/dashboard/individual-stats');
    return res.data.data;
  },
  /** Unduh file Excel laporan. */
  async downloadXlsx(path: string, filename: string): Promise<void> {
    const res = await api.get(path, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  },
};
