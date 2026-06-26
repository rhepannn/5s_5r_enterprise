import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle2, Clock, Award, FileStack } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { improvementService } from '@/services';
import { IMPROVEMENT_STATUS_LABELS } from '@/lib/utils';

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5 text-white" /></div>
      </CardContent>
    </Card>
  );
}

export default function BeforeAfterReport() {
  const { data: report, isLoading } = useQuery({
    queryKey: ['improvement-report'],
    queryFn: () => improvementService.getReport(),
  });

  if (isLoading || !report) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const statusData = Object.entries(report.byStatus).map(([k, v]) => ({ status: IMPROVEMENT_STATUS_LABELS[k] || k, jumlah: v }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={FileStack} label="Total Perbaikan" value={report.total} color="bg-blue-500" />
        <Stat icon={CheckCircle2} label="Selesai" value={report.closedCount} color="bg-green-500" />
        <Stat icon={Clock} label="% Tepat Waktu" value={`${report.onTimePercentage}%`} color="bg-amber-500" />
        <Stat icon={Award} label="Total Poin Bonus" value={report.totalBonus} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Tren 6 Bulan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={report.trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" /><YAxis allowDecimals={false} className="text-xs" />
                <Tooltip /><Legend />
                <Bar dataKey="total" name="Dibuat" fill="hsl(221.2 83.2% 53.3%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="closed" name="Selesai" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Distribusi Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" allowDecimals={false} className="text-xs" />
                <YAxis type="category" dataKey="status" width={110} className="text-xs" />
                <Tooltip />
                <Bar dataKey="jumlah" fill="hsl(221.2 83.2% 53.3%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Rekap per Divisi</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3">Divisi</th><th className="py-2 px-3">Total</th>
                  <th className="py-2 px-3">Selesai</th><th className="py-2 px-3">Tepat Waktu</th><th className="py-2 px-3">Poin Bonus</th>
                </tr>
              </thead>
              <tbody>
                {report.perDivision.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-6">Belum ada data</td></tr>
                ) : report.perDivision.map((d) => (
                  <tr key={d.name} className="border-b">
                    <td className="py-2 px-3 font-medium">{d.name}</td>
                    <td className="py-2 px-3">{d.total}</td>
                    <td className="py-2 px-3">{d.closed}</td>
                    <td className="py-2 px-3">{d.closed > 0 ? `${Math.round((d.onTime / d.closed) * 100)}%` : '—'}</td>
                    <td className="py-2 px-3 font-semibold text-purple-600">+{d.bonus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
