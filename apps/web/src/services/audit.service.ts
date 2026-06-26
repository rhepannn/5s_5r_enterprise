import api from '@/lib/api';
import type { ApiResponse, AuditSession, AuditPeriod, AuditTrailEntry, ChecklistTemplate, AuditSchedule } from '@/types';

export interface CreateSchedulePayload {
  name: string;
  type: string;
  frequency: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  hour: number;
  areaId: string;
  auditorId: string;
  periodId?: string;
}

export interface CreateSessionPayload {
  type: string;
  areaId: string;
  auditorId: string;
  periodId: string;
  scheduledAt: string;
  notes?: string;
}

export interface ItemUpdate {
  id: string;
  score?: number | null;
  notes?: string;
}

export const auditService = {
  // ===== Sessions =====
  async listSessions(params?: Record<string, string>): Promise<AuditSession[]> {
    const res = await api.get<ApiResponse<AuditSession[]>>('/audit/sessions', { params });
    return res.data.data;
  },
  async getSession(id: string): Promise<AuditSession> {
    const res = await api.get<ApiResponse<AuditSession>>(`/audit/sessions/${id}`);
    return res.data.data;
  },
  async createSession(payload: CreateSessionPayload): Promise<AuditSession> {
    const res = await api.post<ApiResponse<AuditSession>>('/audit/sessions', payload);
    return res.data.data;
  },
  async start(id: string): Promise<AuditSession> {
    const res = await api.post<ApiResponse<AuditSession>>(`/audit/sessions/${id}/start`);
    return res.data.data;
  },
  async saveItems(id: string, items: ItemUpdate[]): Promise<AuditSession> {
    const res = await api.patch<ApiResponse<AuditSession>>(`/audit/sessions/${id}/items`, { items });
    return res.data.data;
  },
  async uploadItemPhotos(sessionId: string, itemId: string, files: File[]): Promise<unknown> {
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    const res = await api.post<ApiResponse<unknown>>(
      `/audit/sessions/${sessionId}/items/${itemId}/photos`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.data;
  },
  async submit(id: string): Promise<AuditSession> {
    const res = await api.post<ApiResponse<AuditSession>>(`/audit/sessions/${id}/submit`);
    return res.data.data;
  },
  async review(id: string): Promise<AuditSession> {
    const res = await api.post<ApiResponse<AuditSession>>(`/audit/sessions/${id}/review`);
    return res.data.data;
  },
  async approve(id: string): Promise<AuditSession> {
    const res = await api.post<ApiResponse<AuditSession>>(`/audit/sessions/${id}/approve`);
    return res.data.data;
  },
  async reject(id: string, reason: string): Promise<AuditSession> {
    const res = await api.post<ApiResponse<AuditSession>>(`/audit/sessions/${id}/reject`, { reason });
    return res.data.data;
  },
  async revise(id: string): Promise<AuditSession> {
    const res = await api.post<ApiResponse<AuditSession>>(`/audit/sessions/${id}/revise`);
    return res.data.data;
  },
  async deleteSession(id: string): Promise<void> {
    await api.delete(`/audit/sessions/${id}`);
  },
  async getTrail(id: string): Promise<AuditTrailEntry[]> {
    const res = await api.get<ApiResponse<AuditTrailEntry[]>>(`/audit/sessions/${id}/trail`);
    return res.data.data;
  },

  // ===== Recurring schedules =====
  async listSchedules(): Promise<AuditSchedule[]> {
    const res = await api.get<ApiResponse<AuditSchedule[]>>('/audit/schedules');
    return res.data.data;
  },
  async createSchedule(payload: CreateSchedulePayload): Promise<AuditSchedule> {
    const res = await api.post<ApiResponse<AuditSchedule>>('/audit/schedules', payload);
    return res.data.data;
  },
  async updateSchedule(id: string, payload: Partial<CreateSchedulePayload> & { isActive?: boolean }): Promise<AuditSchedule> {
    const res = await api.put<ApiResponse<AuditSchedule>>(`/audit/schedules/${id}`, payload);
    return res.data.data;
  },
  async deleteSchedule(id: string): Promise<void> {
    await api.delete(`/audit/schedules/${id}`);
  },
  async runSchedulesNow(): Promise<{ created: number }> {
    const res = await api.post<ApiResponse<{ created: number }>>('/audit/schedules/run-now');
    return res.data.data;
  },

  // ===== Periods & templates (reuse from audit module) =====
  async listPeriods(): Promise<AuditPeriod[]> {
    const res = await api.get<ApiResponse<AuditPeriod[]>>('/audit/periods');
    return res.data.data;
  },
  async listChecklistTemplates(params?: Record<string, string>): Promise<ChecklistTemplate[]> {
    const res = await api.get<ApiResponse<ChecklistTemplate[]>>('/audit/checklist-templates', { params });
    return res.data.data;
  },
};
