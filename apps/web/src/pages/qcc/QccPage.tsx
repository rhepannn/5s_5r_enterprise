import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Plus, Loader2, FlaskConical, CheckCircle2, PiggyBank, Award, Users, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { qccService } from '@/services/qcc.service';
import { auditService } from '@/services/audit.service';
import { divisionsService } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency } from '@/lib/utils';
import KaizenRegister from './KaizenRegister';
import type { QccProject } from '@/types';

const STAGES: { key: string; label: string; color: string }[] = [
  { key: 'PLAN', label: 'Plan', color: 'border-t-gray-400' },
  { key: 'DO', label: 'Do', color: 'border-t-blue-400' },
  { key: 'CHECK', label: 'Check', color: 'border-t-amber-400' },
  { key: 'ACT', label: 'Act', color: 'border-t-purple-400' },
  { key: 'COMPLETED', label: 'Selesai', color: 'border-t-green-500' },
];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const WD = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function QccPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = ['SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI', 'PIC'].includes(user?.role || '');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', divisionId: '', problemDesc: '', members: '', startDate: '', targetDate: '', savingCost: '' });
  const [cursor, setCursor] = useState(() => new Date());

  const { data: projects, isLoading } = useQuery({ queryKey: ['qcc'], queryFn: () => qccService.list() });
  const { data: stats } = useQuery({ queryKey: ['qcc-stats'], queryFn: () => qccService.stats() });
  const { data: sessions } = useQuery({ queryKey: ['audit-sessions', 'all'], queryFn: () => auditService.listSessions() });
  const { data: divisions } = useQuery({ queryKey: ['divisions', user?.companyId], queryFn: () => divisionsService.listByCompany(user!.companyId), enabled: open && !!user?.companyId });

  const createM = useMutation({
    mutationFn: () => qccService.create({
      title: form.title, divisionId: form.divisionId, problemDesc: form.problemDesc,
      members: form.members.split(',').map((m) => m.trim()).filter(Boolean),
      startDate: new Date(form.startDate).toISOString(), targetDate: new Date(form.targetDate).toISOString(),
      ...(form.savingCost && { savingCost: parseFloat(form.savingCost) }),
    }),
    onSuccess: (qcc) => { queryClient.invalidateQueries({ queryKey: ['qcc'] }); toast({ title: 'Proyek QCC dibuat', variant: 'success' }); setOpen(false); navigate(`/qcc/${qcc.id}`); },
    onError: (e: unknown) => toast({ title: 'Gagal', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });

  const board = useMemo(() => {
    const map: Record<string, QccProject[]> = { PLAN: [], DO: [], CHECK: [], ACT: [], COMPLETED: [] };
    (projects || []).forEach((p) => map[p.status]?.push(p));
    return map;
  }, [projects]);

  const statusChart = stats ? Object.entries(stats.byStatus).map(([k, v]) => ({ status: k, jumlah: v })) : [];

  // Kalender terintegrasi (QCC target + audit jadwal)
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const firstWd = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array.from({ length: firstWd }, () => null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const eventsOn = (d: number) => {
    const qcc = (projects || []).filter((p) => { const t = new Date(p.targetDate); return t.getFullYear() === year && t.getMonth() === month && t.getDate() === d; });
    const aud = (sessions || []).filter((s) => { const t = new Date(s.scheduledAt); return t.getFullYear() === year && t.getMonth() === month && t.getDate() === d; });
    return { qcc, aud };
  };

  const canSubmit = form.title && form.divisionId && form.problemDesc && form.members && form.startDate && form.targetDate;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="w-6 h-6" /> Quality Control Circle</h1>
          <p className="text-muted-foreground mt-1">Proyek perbaikan terstruktur (PDCA) & bank ide Kaizen</p>
        </div>
        {canManage && <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Proyek QCC</Button>}
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Proyek (PDCA)</TabsTrigger>
          <TabsTrigger value="kaizen">Kaizen</TabsTrigger>
          <TabsTrigger value="stats">Statistik</TabsTrigger>
          <TabsTrigger value="calendar">Kalender</TabsTrigger>
        </TabsList>

        {/* Board PDCA */}
        <TabsContent value="board">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {STAGES.map((st) => (
                <div key={st.key}>
                  <div className={cn('text-sm font-semibold mb-2 pb-1 border-t-4 pt-2 text-center', st.color)}>{st.label} <span className="text-muted-foreground">({board[st.key].length})</span></div>
                  <div className="space-y-2">
                    {board[st.key].map((p) => (
                      <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/qcc/${p.id}`)}>
                        <CardContent className="p-3">
                          <p className="font-medium text-sm line-clamp-2">{p.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{p.division?.name}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {p.members.length}</span>
                            {p.savingCost ? <span className="flex items-center gap-0.5"><PiggyBank className="w-3 h-3" /> {formatCurrency(p.savingCost)}</span> : null}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {board[st.key].length === 0 && <p className="text-xs text-muted-foreground text-center py-2">—</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="kaizen"><KaizenRegister /></TabsContent>

        {/* Statistik */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6 flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center"><FlaskConical className="w-5 h-5 text-white" /></div><div><p className="text-2xl font-bold">{stats?.active ?? 0}</p><p className="text-xs text-muted-foreground">Proyek Aktif</p></div></CardContent></Card>
            <Card><CardContent className="pt-6 flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-green-500 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white" /></div><div><p className="text-2xl font-bold">{stats?.completed ?? 0}</p><p className="text-xs text-muted-foreground">Selesai</p></div></CardContent></Card>
            <Card><CardContent className="pt-6 flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center"><PiggyBank className="w-5 h-5 text-white" /></div><div><p className="text-lg font-bold">{formatCurrency(stats?.totalSaving ?? 0)}</p><p className="text-xs text-muted-foreground">Total Saving</p></div></CardContent></Card>
            <Card><CardContent className="pt-6 flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-purple-500 flex items-center justify-center"><Award className="w-5 h-5 text-white" /></div><div><p className="text-2xl font-bold">+{stats?.totalBonus ?? 0}</p><p className="text-xs text-muted-foreground">Poin Bonus</p></div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Proyek per Tahap PDCA</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="status" className="text-xs" /><YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="jumlah" fill="hsl(221.2 83.2% 53.3%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kalender terintegrasi */}
        <TabsContent value="calendar">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{MONTHS[month]} {year}</h3>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hari ini</Button>
                  <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Target QCC</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Jadwal Audit</span>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">{WD.map((d) => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}</div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (day === null) return <div key={`b${i}`} className="min-h-[72px]" />;
                  const ev = eventsOn(day);
                  return (
                    <div key={day} className="min-h-[72px] border rounded-md p-1.5">
                      <div className="text-xs text-muted-foreground mb-1">{day}</div>
                      {ev.qcc.map((p) => <button key={p.id} onClick={() => navigate(`/qcc/${p.id}`)} className="w-full flex items-center gap-1 text-[10px] truncate hover:bg-muted rounded px-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" /><span className="truncate">{p.title}</span></button>)}
                      {ev.aud.map((s) => <button key={s.id} onClick={() => navigate(`/audit/${s.id}`)} className="w-full flex items-center gap-1 text-[10px] truncate hover:bg-muted rounded px-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" /><span className="truncate">{s.area?.name}</span></button>)}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Proyek QCC Baru</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Judul</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Divisi</Label>
              <Select value={form.divisionId} onValueChange={(v) => setForm((f) => ({ ...f, divisionId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>{divisions?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Deskripsi Masalah</Label><Textarea value={form.problemDesc} onChange={(e) => setForm((f) => ({ ...f, problemDesc: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Anggota (pisahkan koma)</Label><Input placeholder="Budi, Sari, Andi" value={form.members} onChange={(e) => setForm((f) => ({ ...f, members: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Mulai</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Target</Label><Input type="date" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Saving (Rp)</Label><Input type="number" value={form.savingCost} onChange={(e) => setForm((f) => ({ ...f, savingCost: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => createM.mutate()} disabled={!canSubmit || createM.isPending}>{createM.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Buat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
