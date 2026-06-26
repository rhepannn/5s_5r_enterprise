import api from '@/lib/api';
import type { ApiResponse, PaginatedResponse, User } from '@/types';

export const usersService = {
  async list(params?: Record<string, string>): Promise<PaginatedResponse<User>> {
    const res = await api.get<PaginatedResponse<User>>('/users', { params });
    return res.data;
  },
  async getById(id: string): Promise<User> {
    const res = await api.get<ApiResponse<User>>(`/users/${id}`);
    return res.data.data;
  },
  async create(data: Partial<User> & { password: string }): Promise<User> {
    const res = await api.post<ApiResponse<User>>('/users', data);
    return res.data.data;
  },
  async update(id: string, data: Partial<User>): Promise<User> {
    const res = await api.put<ApiResponse<User>>(`/users/${id}`, data);
    return res.data.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
  async resetPassword(id: string, newPassword: string): Promise<void> {
    await api.post(`/users/${id}/reset-password`, { newPassword });
  },
};
