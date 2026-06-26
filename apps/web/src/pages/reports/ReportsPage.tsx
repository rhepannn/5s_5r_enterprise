import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet, Printer, ClipboardCheck, ImagePlus, Target, Trophy, Loader2, Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { dashboardService } from '@/services/dashboard.service';
import { auditService } from '@/services/audit.service';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_LABELS } from '@/lib/utils';

export default function ReportsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_5S';
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: periods } = useQuery({ queryKey: ['periods'], queryFn: () => auditService.listPeriods() });
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['individual-stats'], queryFn: () => dashboardService.getIndividualStats(), enabled: isAdmin,
  });

  const periodId = periods?.[0]?.id;

  const download = async (key: string, path: string, filename: string) => {
    setDownloading(key);
    try {
      await dashboardService.downloadXlsx(path, filename);
      toast({ title: 'Excel berhasil diunduh', variant: 'success' });
    } catch {
      toast({ title: 'Gagal mengunduh', variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  const EXPORTS = [
    { key: 'audit', label: 'Audit', icon: ClipboardCheck, path: '/reports/export/audits.xlsx', file: 'laporan-audit.xlsx', enabled: true },
    { key: 'ba', label: 'Before / After', icon: ImagePlus, path: '/reports/export/improvements.xlsx', file: 'laporan-before-after.xlsx', enabled: true },
    { key: 'kpi', label: 'KPI', icon: Target, path: '/reports/export/kpi.xlsx', file: 'laporan-kpi.xlsx', enabled: true },
    { key: 'comp', label: 'Kompetisi', icon: Trophy, path: `/reports/export/leaderboard.xlsx?periodId=${periodId}`, file: 'laporan-kompetisi.xlsx', enabled: !!periodId },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Laporan</h1>
          <p className="text-muted-foreground mt-1">Ekspor data ke Excel atau cetak PDF</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Cetak / PDF</Button>
      </div>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      {/* Export Excel */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> Ekspor Excel</CardTitle>
          <CardDescription>Unduh data lengkap dalam format .xlsx</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {EXPORTS.map((e) => {
              const Icon = e.icon;
              return (
                <Button key={e.key} variant="secondary" className="h-auto py-4 flex-col gap-2" disabled={!e.enabled || downloading === e.key} onClick={() => download(e.key, e.path, e.file)}>
                  {downloading === e.key ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className="w-6 h-6" />}
                  <span>{e.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Statistik individu (admin) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Award className="w-5 h-5" /> Statistik Individu</CardTitle>
            <CardDescription>Kontribusi tiap pengguna</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Audit Dilakukan</TableHead>
                    <TableHead className="text-right">Perbaikan Diajukan</TableHead>
                    <TableHead className="text-right">Badge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><Badge variant="secondary">{ROLE_LABELS[s.role]}</Badge></TableCell>
                      <TableCell className="text-right">{s.auditsConducted}</TableCell>
                      <TableCell className="text-right">{s.improvementsSubmitted}</TableCell>
                      <TableCell className="text-right">{s.badges}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
