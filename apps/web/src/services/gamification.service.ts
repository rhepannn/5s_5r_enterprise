import api from '@/lib/api';
import type {
  ApiResponse, BadgeDef, UserBadgeEntry, WallOfFame, BestPractice, AnnualAward, Suggestion, FloorPlan, FloorPin,
} from '@/types';

export const gamificationService = {
  async computeBadges(): Promise<{ awarded: number }> {
    const res = await api.post<ApiResponse<{ awarded: number }>>('/gamification/badges/compute');
    return res.data.data;
  },
  async listBadges(): Promise<UserBadgeEntry[]> {
    const res = await api.get<ApiResponse<UserBadgeEntry[]>>('/gamification/badges');
    return res.data.data;
  },
  async getMyBadges(): Promise<BadgeDef[]> {
    const res = await api.get<ApiResponse<BadgeDef[]>>('/gamification/badges/me');
    return res.data.data;
  },
  async getWallOfFame(): Promise<WallOfFame> {
    const res = await api.get<ApiResponse<WallOfFame>>('/gamification/wall-of-fame');
    return res.data.data;
  },
  async listBestPractices(params?: Record<string, string>): Promise<BestPractice[]> {
    const res = await api.get<ApiResponse<BestPractice[]>>('/gamification/best-practices', { params });
    return res.data.data;
  },
  async markBestPractice(id: string, value: boolean): Promise<unknown> {
    const res = await api.patch<ApiResponse<unknown>>(`/gamification/best-practices/${id}`, { value });
    return res.data.data;
  },
  async getAnnualAward(year?: string): Promise<AnnualAward> {
    const res = await api.get<ApiResponse<AnnualAward>>('/gamification/annual-award', { params: year ? { year } : {} });
    return res.data.data;
  },
  async getSuggestions(): Promise<Suggestion[]> {
    const res = await api.get<ApiResponse<Suggestion[]>>('/gamification/suggestions');
    return res.data.data;
  },
  // Digital Twin
  async listFloorPlans(): Promise<FloorPlan[]> {
    const res = await api.get<ApiResponse<FloorPlan[]>>('/gamification/floorplans');
    return res.data.data;
  },
  async createFloorPlan(name: string, image: File): Promise<FloorPlan> {
    const fd = new FormData(); fd.append('name', name); fd.append('image', image);
    const res = await api.post<ApiResponse<FloorPlan>>('/gamification/floorplans', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data;
  },
  async updatePins(id: string, pins: FloorPin[]): Promise<FloorPlan> {
    const res = await api.put<ApiResponse<FloorPlan>>(`/gamification/floorplans/${id}/pins`, { pins });
    return res.data.data;
  },
  async deleteFloorPlan(id: string): Promise<void> {
    await api.delete(`/gamification/floorplans/${id}`);
  },
};
