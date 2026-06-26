import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount);
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export const PILAR_COLORS: Record<string, string> = {
  RINGKAS: 'bg-red-100 text-red-700 border-red-200',
  RAPI:    'bg-orange-100 text-orange-700 border-orange-200',
  RESIK:   'bg-green-100 text-green-700 border-green-200',
  RAWAT:   'bg-blue-100 text-blue-700 border-blue-200',
  RAJIN:   'bg-purple-100 text-purple-700 border-purple-200',
};

export const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN:    'Super Admin',
  ADMIN_5S:      'Admin 5S',
  AUDITOR:       'Auditor',
  KEPALA_DIVISI: 'Kepala Divisi',
  PIC:           'PIC',
  ANGGOTA:       'Anggota',
};

export const CATEGORY_LABELS: Record<string, string> = {
  PRODUKSI:     'Produksi',
  KANTOR:       'Kantor',
  GUDANG:       'Gudang',
  LABORATORIUM: 'Laboratorium',
  OUTDOOR:      'Outdoor',
};

export const AUDIT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED:      'Dijadwalkan',
  IN_PROGRESS:    'Berlangsung',
  PENDING_REVIEW: 'Menunggu Review',
  COMPLETED:      'Direview',
  APPROVED:       'Disetujui',
  REJECTED:       'Ditolak',
};

export const AUDIT_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  SCHEDULED:      'outline',
  IN_PROGRESS:    'default',
  PENDING_REVIEW: 'warning',
  COMPLETED:      'secondary',
  APPROVED:       'success',
  REJECTED:       'destructive',
};

export const AUDIT_TYPE_LABELS: Record<string, string> = {
  MANDIRI:  'Mandiri (Self)',
  INTERNAL: 'Internal',
  CROSS:    'Cross-Audit',
  SURPRISE: 'Mendadak',
};

export const PILAR_LABELS: Record<string, string> = {
  RINGKAS: '1S — Ringkas (Seiri)',
  RAPI:    '2S — Rapi (Seiton)',
  RESIK:   '3S — Resik (Seiso)',
  RAWAT:   '4S — Rawat (Seiketsu)',
  RAJIN:   '5S — Rajin (Shitsuke)',
};

export const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY:    'Mingguan',
  MONTHLY:   'Bulanan',
  QUARTERLY: 'Kuartalan',
};

export const IMPROVEMENT_STATUS_LABELS: Record<string, string> = {
  OPEN:                'Terbuka',
  IN_PROGRESS:         'Dikerjakan',
  VERIFICATION_NEEDED: 'Perlu Verifikasi',
  CLOSED:              'Selesai',
  REJECTED:            'Ditolak',
};

export const IMPROVEMENT_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  OPEN:                'outline',
  IN_PROGRESS:         'default',
  VERIFICATION_NEEDED: 'warning',
  CLOSED:              'success',
  REJECTED:            'destructive',
};

export const PROBLEM_CATEGORY_LABELS: Record<string, string> = {
  KEBERSIHAN:  'Kebersihan',
  PENATAAN:    'Penataan',
  PELABELAN:   'Pelabelan',
  KESELAMATAN: 'Keselamatan',
  EFISIENSI:   'Efisiensi',
};

export const DAY_OF_WEEK_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
