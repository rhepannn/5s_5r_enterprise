import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ClipboardCheck, Loader2, Zap, ChevronRight, List, CalendarDays, CalendarClock } from 'lucide-react';
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
import AuditCalendar from './AuditCalendar';
import { auditService } from '@/services/audit.service';
import { divisionsService, workAreasService, usersService } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import {
  cn, AUDIT_STATUS_LABELS, AUDIT_STATUS_VARIANT, AUDIT_TYPE_LABELS, CATEGORY_LABELS, formatDateShort,
} from '@/lib/utils';

const STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'APPROVED', 'REJECTED'];

export default function AuditListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_5S';

  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state for create
  const [form, setForm] = useState({ type: 'INTERNAL', divisionId: '', areaId: '', auditorId: '', periodId: '', scheduledAt: '' });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['audit-sessions', statusFilter],
    queryFn: () => auditService.listSessions(statusFilter !== 'all' ? { status: statusFilter } : undefined),
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
    queryKey: ['auditors'],
    queryFn: () => usersService.list({ role: 'AUDITOR' }),
    enabled: dialogOpen,
  });

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: () => auditService.listPeriods(),
    enabled: dialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      auditService.createSession({
        type: form.type,
        areaId: form.areaId,
        auditorId: form.auditorId,
        periodId: form.periodId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['audit-sessions'] });
      toast({ title: 'Audit berhasil dijadwalkan', variant: 'success' });
      setDialogOpen(false);
      navigate(`/audit/${session.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menjadwalkan';
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
    },
  });

  const canSubmit = form.areaId && form.auditorId && form.periodId && form.scheduledAt;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit 5S</h1>
          <p className="text-muted-foreground mt-1">Jadwal & pelaksanaan audit digital</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/audit/schedules')}>
              <CalendarClock className="w-4 h-4 mr-2" /> Jadwal Otomatis
            </Button>
            <Button onClick={() => { setForm({ type: 'INTERNAL', divisionId: '', areaId: '', auditorId: '', periodId: '', scheduledAt: '' }); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Jadwalkan Audit
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{AUDIT_STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex rounded-md border p-0.5">
              <button onClick={() => setView('list')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded text-sm', view === 'list' ? 'bg-primary text-white' : 'text-muted-foreground')}>
                <List className="w-4 h-4" /> Daftar
              </button>
              <button onClick={() => setView('calendar')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded text-sm', view === 'calendar' ? 'bg-primary text-white' : 'text-muted-foreground')}>
                <CalendarDays className="w-4 h-4" /> Kalender
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : view === 'calendar' ? (
            <AuditCalendar sessions={sessions || []} onSelect={(sid) => navigate(`/audit/${sid}`)} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Jadwal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Skor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Belum ada sesi audit
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions?.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/audit/${s.id}`)}>
                      <TableCell className="font-medium">{s.area?.name}</TableCell>
                      <TableCell>{s.division?.name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          {s.type === 'SURPRISE' && <Zap className="w-3 h-3 text-amber-500" />}
                          {AUDIT_TYPE_LABELS[s.type]}
                        </span>
                      </TableCell>
                      <TableCell>{s.auditor?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateShort(s.scheduledAt)}</TableCell>
                      <TableCell><Badge variant={AUDIT_STATUS_VARIANT[s.status]}>{AUDIT_STATUS_LABELS[s.status]}</Badge></TableCell>
                      <TableCell className="font-semibold">{s.totalScore != null ? s.totalScore.toFixed(1) : '—'}</TableCell>
                      <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jadwalkan Audit Baru</DialogTitle>
            <DialogDescription>Checklist akan dibuat otomatis sesuai kategori area</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipe Audit</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDIT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.type === 'SURPRISE' && <p className="text-xs text-amber-600">⚡ Audit mendadak dapat pengali skor 1.2x</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Divisi</Label>
                <Select value={form.divisionId} onValueChange={(v) => setForm((f) => ({ ...f, divisionId: v, areaId: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih divisi" /></SelectTrigger>
                  <SelectContent>
                    {divisions?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Area Kerja</Label>
                <Select value={form.areaId} onValueChange={(v) => setForm((f) => ({ ...f, areaId: v }))} disabled={!form.divisionId}>
                  <SelectTrigger><SelectValue placeholder="Pilih area" /></SelectTrigger>
                  <SelectContent>
                    {areas?.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({CATEGORY_LABELS[a.category]})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Auditor</Label>
                <Select value={form.auditorId} onValueChange={(v) => setForm((f) => ({ ...f, auditorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih auditor" /></SelectTrigger>
                  <SelectContent>
                    {auditors?.data.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Periode</Label>
                <Select value={form.periodId} onValueChange={(v) => setForm((f) => ({ ...f, periodId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih periode" /></SelectTrigger>
                  <SelectContent>
                    {periods?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tanggal & Waktu</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Jadwalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
