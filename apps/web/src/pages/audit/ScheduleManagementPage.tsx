import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowLeft, Trash2, Power, Play, CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { auditService } from '@/services/audit.service';
import { divisionsService, workAreasService, usersService } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import {
  AUDIT_TYPE_LABELS, FREQUENCY_LABELS, DAY_OF_WEEK_LABELS, formatDateShort,
} from '@/lib/utils';
import type { AuditSchedule } from '@/types';

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1);

export default function ScheduleManagementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'INTERNAL', frequency: 'MONTHLY',
    dayOfMonth: '1', dayOfWeek: '1', hour: '8',
    divisionId: '', areaId: '', auditorId: '', periodId: '',
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['audit-schedules'],
    queryFn: () => auditService.listSchedules(),
  });

  const { data: divisions } = useQuery({
    queryKey: ['divisions', user?.companyId],
    queryFn: () => divisionsService.listByCompany(user!.companyId),
    enabled: dialogOpen && !!user?.companyId,
  });
  const { data: areas } = useQuery({
    queryKey: ['areas', form.divisionId],
    queryFn: () => workAreasService.listByDivision(form.divisionId),
    enabled: !!form.divisionId,
  });
  const { data: auditors } = useQuery({
    queryKey: ['auditors'], queryFn: () => usersService.list({ role: 'AUDITOR' }), enabled: dialogOpen,
  });
  const { data: periods } = useQuery({
    queryKey: ['periods'], queryFn: () => auditService.listPeriods(), enabled: dialogOpen,
  });

  const createM = useMutation({
    mutationFn: () => auditService.createSchedule({
      name: form.name,
      type: form.type,
      frequency: form.frequency,
      hour: parseInt(form.hour, 10),
      ...(form.frequency === 'WEEKLY'
        ? { dayOfWeek: parseInt(form.dayOfWeek, 10) }
        : { dayOfMonth: parseInt(form.dayOfMonth, 10) }),
      areaId: form.areaId,
      auditorId: form.auditorId,
      ...(form.periodId && { periodId: form.periodId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-schedules'] });
      toast({ title: 'Jadwal otomatis dibuat', variant: 'success' });
      setDialogOpen(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal';
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
    },
  });

  const toggleM = useMutation({
    mutationFn: (s: AuditSchedule) => auditService.updateSchedule(s.id, { isActive: !s.isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['audit-schedules'] }); toast({ title: 'Status jadwal diperbarui', variant: 'success' }); },
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => auditService.deleteSchedule(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['audit-schedules'] }); toast({ title: 'Jadwal dihapus', variant: 'success' }); },
  });
  const runM = useMutation({
    mutationFn: () => auditService.runSchedulesNow(),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['audit-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['audit-sessions'] });
      toast({ title: `${r.created} sesi audit dibuat dari jadwal jatuh tempo`, variant: 'success' });
    },
  });

  const canSubmit = form.name && form.areaId && form.auditorId;

  const scheduleDesc = (s: AuditSchedule) =>
    s.frequency === 'WEEKLY'
      ? `Tiap ${DAY_OF_WEEK_LABELS[s.dayOfWeek ?? 1]}, jam ${s.hour}:00`
      : `${FREQUENCY_LABELS[s.frequency]} tgl ${s.dayOfMonth}, jam ${s.hour}:00`;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/audit')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Kembali ke daftar audit
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jadwal Audit Otomatis</h1>
          <p className="text-muted-foreground mt-1">Sistem membuat sesi audit otomatis sesuai frekuensi (mingguan/bulanan/kuartalan)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => runM.mutate()} disabled={runM.isPending}>
            {runM.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />} Jalankan Sekarang
          </Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Tambah Jadwal</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Frekuensi</TableHead>
                  <TableHead>Berikutnya</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Belum ada jadwal otomatis
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.area?.name}</TableCell>
                      <TableCell>{AUDIT_TYPE_LABELS[s.type]}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{scheduleDesc(s)}</TableCell>
                      <TableCell className="text-sm">{s.nextRunAt ? formatDateShort(s.nextRunAt) : '—'}</TableCell>
                      <TableCell><Badge variant={s.isActive ? 'success' : 'secondary'}>{s.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title={s.isActive ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggleM.mutate(s)}>
                            <Power className={`w-4 h-4 ${s.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                          </Button>
                          <Button variant="ghost" size="icon" title="Hapus" onClick={() => deleteM.mutate(s.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Jadwal Otomatis</DialogTitle>
            <DialogDescription>Sesi audit akan dibuat otomatis sesuai frekuensi yang dipilih</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Jadwal</Label>
              <Input placeholder="mis. Audit Bulanan Produksi A" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipe</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(AUDIT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frekuensi</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(FREQUENCY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {form.frequency === 'WEEKLY' ? (
                <div className="space-y-2">
                  <Label>Hari</Label>
                  <Select value={form.dayOfWeek} onValueChange={(v) => setForm((f) => ({ ...f, dayOfWeek: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAY_OF_WEEK_LABELS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Select value={form.dayOfMonth} onValueChange={(v) => setForm((f) => ({ ...f, dayOfMonth: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS_OF_MONTH.map((d) => <SelectItem key={d} value={String(d)}>Tanggal {d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Jam (0-23)</Label>
                <Input type="number" min={0} max={23} value={form.hour} onChange={(e) => setForm((f) => ({ ...f, hour: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Divisi</Label>
                <Select value={form.divisionId} onValueChange={(v) => setForm((f) => ({ ...f, divisionId: v, areaId: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih divisi" /></SelectTrigger>
                  <SelectContent>{divisions?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Select value={form.areaId} onValueChange={(v) => setForm((f) => ({ ...f, areaId: v }))} disabled={!form.divisionId}>
                  <SelectTrigger><SelectValue placeholder="Pilih area" /></SelectTrigger>
                  <SelectContent>{areas?.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Auditor</Label>
                <Select value={form.auditorId} onValueChange={(v) => setForm((f) => ({ ...f, auditorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih auditor" /></SelectTrigger>
                  <SelectContent>{auditors?.data.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Periode (opsional)</Label>
                <Select value={form.periodId} onValueChange={(v) => setForm((f) => ({ ...f, periodId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Otomatis" /></SelectTrigger>
                  <SelectContent>{periods?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => createM.mutate()} disabled={!canSubmit || createM.isPending}>
              {createM.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
