import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Target, RefreshCw, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { kpiOkrService } from '@/services/kpiOkr.service';
import { divisionsService } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { cn, PILAR_LABELS } from '@/lib/utils';
import type { OkrKeyResult } from '@/types';

const OKR_STATUS: Record<string, { label: string; variant: 'success' | 'default' | 'warning' | 'destructive' }> = {
  COMPLETED: { label: 'Tercapai', variant: 'success' },
  ON_TRACK: { label: 'On Track', variant: 'default' },
  AT_RISK: { label: 'Berisiko', variant: 'warning' },
  BEHIND: { label: 'Tertinggal', variant: 'destructive' },
};
const PILARS = ['RINGKAS', 'RAPI', 'RESIK', 'RAWAT', 'RAJIN'];

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden w-full">
      <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${pct}%` }} />
    </div>
  );
}

function KeyResultRow({ kr }: { kr: OkrKeyResult }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(kr.actual));
  const m = useMutation({
    mutationFn: () => kpiOkrService.updateKeyResult(kr.id, parseFloat(val) || 0),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['okrs'] }); setEditing(false); toast({ title: 'Progress diperbarui', variant: 'success' }); },
  });
  const st = OKR_STATUS[kr.status] || OKR_STATUS.ON_TRACK;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm">{kr.title}</span>
        <Badge variant={st.variant} className="flex-shrink-0">{st.label}</Badge>
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={kr.actual} max={kr.target} />
        {editing ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="h-7 w-20" />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => m.mutate()}><Check className="w-4 h-4 text-green-600" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <button onClick={() => { setVal(String(kr.actual)); setEditing(true); }} className="text-sm font-medium whitespace-nowrap flex-shrink-0 hover:underline">
            {kr.actual}/{kr.target} {kr.unit}
          </button>
        )}
      </div>
    </div>
  );
}

export default function KpiOkrPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_5S';

  const [okrOpen, setOkrOpen] = useState(false);
  const [kpiOpen, setKpiOpen] = useState(false);
  const [okrForm, setOkrForm] = useState({ level: 'DIVISION', divisionId: '', objective: '', quarter: '2026-Q2' });
  const [krs, setKrs] = useState([{ title: '', target: '', unit: 'poin' }]);
  const [kpiForm, setKpiForm] = useState({ divisionId: '', pilar: 'RINGKAS', indicator: '', target: '', unit: '%', period: '2026-Q2' });

  const { data: okrs, isLoading: okrLoading } = useQuery({ queryKey: ['okrs'], queryFn: () => kpiOkrService.listOkrs() });
  const { data: kpis, isLoading: kpiLoading } = useQuery({ queryKey: ['kpis'], queryFn: () => kpiOkrService.listKpis() });
  const { data: divisions } = useQuery({ queryKey: ['divisions', user?.companyId], queryFn: () => divisionsService.listByCompany(user!.companyId), enabled: (okrOpen || kpiOpen) && !!user?.companyId });

  const createOkrM = useMutation({
    mutationFn: () => kpiOkrService.createOkr({
      level: okrForm.level as 'COMPANY' | 'DIVISION',
      ...(okrForm.level === 'DIVISION' && { divisionId: okrForm.divisionId }),
      objective: okrForm.objective,
      quarter: okrForm.quarter,
      keyResults: krs.filter((k) => k.title && k.target).map((k) => ({ title: k.title, target: parseFloat(k.target), unit: k.unit })),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['okrs'] }); toast({ title: 'OKR dibuat', variant: 'success' }); setOkrOpen(false); setKrs([{ title: '', target: '', unit: 'poin' }]); },
    onError: (e: unknown) => toast({ title: 'Gagal', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });
  const deleteOkrM = useMutation({ mutationFn: (id: string) => kpiOkrService.deleteOkr(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['okrs'] }); toast({ title: 'OKR dihapus', variant: 'success' }); } });

  const createKpiM = useMutation({
    mutationFn: () => kpiOkrService.createKpi({ ...(kpiForm.divisionId && { divisionId: kpiForm.divisionId }), pilar: kpiForm.pilar, indicator: kpiForm.indicator, target: parseFloat(kpiForm.target), unit: kpiForm.unit, period: kpiForm.period }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kpis'] }); toast({ title: 'KPI dibuat', variant: 'success' }); setKpiOpen(false); },
    onError: (e: unknown) => toast({ title: 'Gagal', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });
  const recomputeKpiM = useMutation({ mutationFn: () => kpiOkrService.recomputeKpi(), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kpis'] }); toast({ title: 'KPI dihitung ulang dari audit', variant: 'success' }); } });
  const deleteKpiM = useMutation({ mutationFn: (id: string) => kpiOkrService.deleteKpi(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kpis'] }); toast({ title: 'KPI dihapus', variant: 'success' }); } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="w-6 h-6" /> KPI & OKR</h1>
        <p className="text-muted-foreground mt-1">Target & objektif terukur per perusahaan dan divisi</p>
      </div>

      <Tabs defaultValue="okr">
        <TabsList>
          <TabsTrigger value="okr">OKR</TabsTrigger>
          <TabsTrigger value="kpi">KPI per Pilar</TabsTrigger>
        </TabsList>

        {/* ===== OKR ===== */}
        <TabsContent value="okr" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setOkrOpen(true)}><Plus className="w-4 h-4 mr-2" /> Tambah OKR</Button>
          </div>
          {okrLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : okrs?.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Belum ada OKR</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {okrs?.map((okr) => (
                <Card key={okr.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{okr.objective}</CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => deleteOkrM.mutate(okr.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="secondary">{okr.level === 'COMPANY' ? 'Perusahaan' : okr.division?.name || 'Divisi'}</Badge>
                      <Badge variant="outline">{okr.quarter}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="divide-y">
                    {okr.keyResults.map((kr) => <KeyResultRow key={kr.id} kr={kr} />)}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== KPI ===== */}
        <TabsContent value="kpi" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => recomputeKpiM.mutate()} disabled={recomputeKpiM.isPending}>
              {recomputeKpiM.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Hitung dari Audit
            </Button>
            {isAdmin && <Button onClick={() => setKpiOpen(true)}><Plus className="w-4 h-4 mr-2" /> Tambah KPI</Button>}
          </div>
          <Card>
            <CardContent className="pt-6">
              {kpiLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Pilar</TableHead><TableHead>Indikator</TableHead><TableHead>Divisi</TableHead>
                    <TableHead className="w-48">Pencapaian</TableHead><TableHead className="text-right">Target</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {kpis?.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada KPI</TableCell></TableRow>
                    ) : kpis?.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell><Badge variant="outline">{k.pilar}</Badge></TableCell>
                        <TableCell className="font-medium">{k.indicator}</TableCell>
                        <TableCell className="text-muted-foreground">{k.division?.name || 'Perusahaan'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ProgressBar value={k.actual ?? 0} max={k.target} />
                            <span className="text-sm whitespace-nowrap">{k.actual ?? 0}{k.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{k.target}{k.unit}</TableCell>
                        <TableCell>{isAdmin && <Button variant="ghost" size="icon" onClick={() => deleteKpiM.mutate(k.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog OKR */}
      <Dialog open={okrOpen} onOpenChange={setOkrOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah OKR</DialogTitle><DialogDescription>Objective + Key Results terukur</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Level</Label>
                <Select value={okrForm.level} onValueChange={(v) => setOkrForm((f) => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {isAdmin && <SelectItem value="COMPANY">Perusahaan</SelectItem>}
                    <SelectItem value="DIVISION">Divisi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Kuartal</Label>
                <Input value={okrForm.quarter} onChange={(e) => setOkrForm((f) => ({ ...f, quarter: e.target.value }))} placeholder="2026-Q2" />
              </div>
            </div>
            {okrForm.level === 'DIVISION' && (
              <div className="space-y-1">
                <Label>Divisi</Label>
                <Select value={okrForm.divisionId} onValueChange={(v) => setOkrForm((f) => ({ ...f, divisionId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih divisi" /></SelectTrigger>
                  <SelectContent>{divisions?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Objective</Label>
              <Input value={okrForm.objective} onChange={(e) => setOkrForm((f) => ({ ...f, objective: e.target.value }))} placeholder="mis. Tingkatkan kepatuhan 5S" />
            </div>
            <div className="space-y-2">
              <Label>Key Results</Label>
              {krs.map((kr, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Judul KR" value={kr.title} onChange={(e) => setKrs((p) => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                  <Input type="number" placeholder="Target" className="w-24" value={kr.target} onChange={(e) => setKrs((p) => p.map((x, j) => j === i ? { ...x, target: e.target.value } : x))} />
                  <Input placeholder="unit" className="w-20" value={kr.unit} onChange={(e) => setKrs((p) => p.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} />
                  {krs.length > 1 && <Button variant="ghost" size="icon" onClick={() => setKrs((p) => p.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setKrs((p) => [...p, { title: '', target: '', unit: 'poin' }])}><Plus className="w-3 h-3 mr-1" /> Tambah KR</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOkrOpen(false)}>Batal</Button>
            <Button onClick={() => createOkrM.mutate()} disabled={createOkrM.isPending || !okrForm.objective}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog KPI */}
      <Dialog open={kpiOpen} onOpenChange={setKpiOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah KPI</DialogTitle><DialogDescription>Target indikator per pilar 5S</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Pilar</Label>
                <Select value={kpiForm.pilar} onValueChange={(v) => setKpiForm((f) => ({ ...f, pilar: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PILARS.map((p) => <SelectItem key={p} value={p}>{PILAR_LABELS[p]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Divisi (opsional)</Label>
                <Select value={kpiForm.divisionId} onValueChange={(v) => setKpiForm((f) => ({ ...f, divisionId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Perusahaan" /></SelectTrigger>
                  <SelectContent>{divisions?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Indikator</Label>
              <Input value={kpiForm.indicator} onChange={(e) => setKpiForm((f) => ({ ...f, indicator: e.target.value }))} placeholder="mis. Skor pilar Resik" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Target</Label><Input type="number" value={kpiForm.target} onChange={(e) => setKpiForm((f) => ({ ...f, target: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Unit</Label><Input value={kpiForm.unit} onChange={(e) => setKpiForm((f) => ({ ...f, unit: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Periode</Label><Input value={kpiForm.period} onChange={(e) => setKpiForm((f) => ({ ...f, period: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKpiOpen(false)}>Batal</Button>
            <Button onClick={() => createKpiM.mutate()} disabled={createKpiM.isPending || !kpiForm.indicator || !kpiForm.target}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
