import { useQuery } from '@tanstack/react-query';
import {
  Trophy, Target, ListChecks, AlertTriangle, TrendingUp, TrendingDown,
  ClipboardX, Clock, Loader2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { dashboardService } from '@/services/dashboard.service';
import { cn, ROLE_LABELS } from '@/lib/utils';

const BAND_CLASS: Record<string, string> = {
  green: 'bg-green-100 border-green-300 text-green-800',
  yellow: 'bg-amber-100 border-amber-300 text-amber-800',
  red: 'bg-red-100 border-red-300 text-red-800',
  none: 'bg-gray-100 border-gray-200 text-gray-400',
};

function StatCard({ title, value, suffix, icon: Icon, color, delta }: {
  title: string; value: string | number; suffix?: string; icon: React.ElementType; color: string; delta?: number | null;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}<span className="text-base text-muted-foreground">{suffix}</span></p>
            {delta != null && delta !== 0 && (
              <p className={cn('text-xs flex items-center gap-1 mt-1', delta > 0 ? 'text-green-600' : 'text-red-600')}>
                {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(delta).toFixed(1)} vs periode lalu
              </p>
            )}
          </div>
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}><Icon className="w-6 h-6 text-white" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_5S';

  const { data: summary, isLoading } = useQuery({ queryKey: ['dash-summary'], queryFn: () => dashboardService.getSummary() });
  const { data: heatmap } = useQuery({ queryKey: ['dash-heatmap'], queryFn: () => dashboardService.getHeatmap() });
  const { data: gaps } = useQuery({ queryKey: ['dash-gap'], queryFn: () => dashboardService.getGapAnalysis(), enabled: isAdmin });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Selamat datang, {user?.name} 👋</h1>
        <p className="text-muted-foreground mt-1">
          Dashboard eksekutif {user?.company?.name || ''} · Periode {summary?.period?.name || '—'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Skor Perusahaan" value={summary?.companyAvg ?? 0} icon={Trophy} color="bg-blue-500" delta={summary?.delta} />
        <StatCard title="Pencapaian KPI" value={summary?.kpiAchievement ?? 0} suffix="%" icon={Target} color="bg-green-500" />
        <StatCard title="Progress OKR" value={summary?.okrProgress ?? 0} suffix="%" icon={ListChecks} color="bg-purple-500" />
        <StatCard title="Perlu Perhatian" value={(summary?.overdueAudits ?? 0) + (summary?.lateImprovements ?? 0)} icon={AlertTriangle} color="bg-amber-500" />
      </div>

      {/* Notifikasi + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Tren Skor Perusahaan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={summary?.trend || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="avgScore" name="Skor" stroke="hsl(221.2 83.2% 53.3%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Perlu Tindak Lanjut</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
              <ClipboardX className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{summary?.overdueAudits ?? 0}</p>
                <p className="text-sm text-red-700">Audit terlambat</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
              <Clock className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{summary?.lateImprovements ?? 0}</p>
                <p className="text-sm text-amber-700">Perbaikan lewat target</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">Heatmap Skor Area</CardTitle>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300" /> &lt;70</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300" /> 70–84</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-300" /> ≥85</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {heatmap && heatmap.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {heatmap.map((a) => (
                <div key={a.id} className={cn('rounded-lg border p-3 text-center', BAND_CLASS[a.band])} title={`${a.division} · ${a.auditCount} audit`}>
                  <p className="text-xs font-medium truncate">{a.name}</p>
                  <p className="text-xl font-bold mt-1">{a.score != null ? a.score.toFixed(0) : '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">Belum ada data audit untuk heatmap</p>
          )}
        </CardContent>
      </Card>

      {/* Gap analysis (admin) */}
      {isAdmin && gaps && gaps.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Gap Analysis — Area Perlu Perbaikan</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gaps.map((g) => (
                <div key={g.id} className="flex items-center justify-between p-3 rounded-lg border bg-red-50/50">
                  <div>
                    <p className="font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.division}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-red-600">Rata-rata {g.avgScore ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{g.lowCount}× skor &lt;70 dari {g.totalAudits} audit</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isAdmin && user?.role === 'PIC' && (
        <p className="text-sm text-muted-foreground text-center">Login sebagai {ROLE_LABELS[user.role]} — sebagian data eksekutif dibatasi.</p>
      )}
    </div>
  );
}
