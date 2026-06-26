import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, ChevronRight, Printer, Save, Users, PiggyBank, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { qccService } from '@/services/qcc.service';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import Fishbone from './tools/Fishbone';
import ParetoChart from './tools/ParetoChart';
import ControlChart from './tools/ControlChart';

const PDCA = [
  { key: 'PLAN', label: 'Plan' }, { key: 'DO', label: 'Do' }, { key: 'CHECK', label: 'Check' },
  { key: 'ACT', label: 'Act' }, { key: 'COMPLETED', label: 'Selesai' },
];

export default function QccDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = ['SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI', 'PIC'].includes(user?.role || '');

  const [tools, setTools] = useState<Record<string, unknown>>({});
  const [solution, setSolution] = useState('');

  const { data: qcc, isLoading } = useQuery({ queryKey: ['qcc', id], queryFn: () => qccService.getById(id!), enabled: !!id });

  useEffect(() => {
    if (qcc) { setTools((qcc.toolsData as Record<string, unknown>) || {}); setSolution(qcc.solution || ''); }
  }, [qcc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['qcc', id] });
  const advanceM = useMutation({ mutationFn: () => qccService.advance(id!), onSuccess: () => { invalidate(); toast({ title: 'Tahap PDCA dimajukan', variant: 'success' }); }, onError: (e: unknown) => toast({ title: 'Gagal', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }) });
  const saveToolsM = useMutation({ mutationFn: () => qccService.saveTools(id!, tools), onSuccess: () => { invalidate(); toast({ title: 'QCC tools tersimpan', variant: 'success' }); } });
  const saveSolutionM = useMutation({ mutationFn: () => qccService.update(id!, { solution }), onSuccess: () => { invalidate(); toast({ title: 'Solusi tersimpan', variant: 'success' }); } });

  if (isLoading || !qcc) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  const curIdx = PDCA.findIndex((p) => p.key === qcc.status);
  const setTool = (k: string, d: unknown) => setTools((t) => ({ ...t, [k]: d }));

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/qcc')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground no-print">
        <ArrowLeft className="w-4 h-4" /> Kembali ke QCC
      </button>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold">{qcc.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">{qcc.division?.name}</p>
            </div>
            <div className="flex gap-2 no-print">
              <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Cetak Presentasi</Button>
              {canManage && qcc.status !== 'COMPLETED' && (
                <Button onClick={() => advanceM.mutate()} disabled={advanceM.isPending}>
                  Lanjut: {PDCA[curIdx + 1]?.label} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* PDCA stepper */}
          <div className="flex items-center gap-1 mt-5">
            {PDCA.map((p, i) => (
              <div key={p.key} className="flex-1 flex items-center">
                <div className={cn('flex-1 text-center py-2 rounded text-xs font-medium', i <= curIdx ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>{p.label}</div>
                {i < PDCA.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-sm">
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /> {qcc.members.join(', ')}</div>
            <div className="flex items-center gap-2"><PiggyBank className="w-4 h-4 text-muted-foreground" /> {qcc.savingCost ? formatCurrency(qcc.savingCost) : '—'}</div>
            <div className="flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> +{qcc.bonusPoints} poin</div>
            <div className="text-muted-foreground">Target: {formatDate(qcc.targetDate)}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Masalah</CardTitle></CardHeader><CardContent className="text-sm">{qcc.problemDesc}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Akar Masalah</CardTitle></CardHeader><CardContent className="text-sm">{qcc.rootCause || '—'}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Solusi / Hasil</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={solution} onChange={(e) => setSolution(e.target.value)} disabled={!canManage} placeholder="Tuliskan solusi & hasil..." />
          {canManage && <Button size="sm" className="mt-2 no-print" onClick={() => saveSolutionM.mutate()} disabled={saveSolutionM.isPending}><Save className="w-4 h-4 mr-2" /> Simpan Solusi</Button>}
        </CardContent>
      </Card>

      {/* QCC Tools */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">QCC Tools</CardTitle>
          {canManage && <Button size="sm" variant="outline" className="no-print" onClick={() => saveToolsM.mutate()} disabled={saveToolsM.isPending}>{saveToolsM.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan Tools</Button>}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fishbone">
            <TabsList>
              <TabsTrigger value="fishbone">Fishbone</TabsTrigger>
              <TabsTrigger value="pareto">Pareto</TabsTrigger>
              <TabsTrigger value="control">Control Chart</TabsTrigger>
            </TabsList>
            <TabsContent value="fishbone"><Fishbone value={tools.fishbone as never} onChange={(d) => setTool('fishbone', d)} editable={canManage} /></TabsContent>
            <TabsContent value="pareto"><ParetoChart value={tools.pareto as never} onChange={(d) => setTool('pareto', d)} editable={canManage} /></TabsContent>
            <TabsContent value="control"><ControlChart value={tools.control as never} onChange={(d) => setTool('control', d)} editable={canManage} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {qcc.improvements && qcc.improvements.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Perbaikan Terkait</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {qcc.improvements.map((im) => <Badge key={im.id} variant="secondary">{im.code} · {im.status}</Badge>)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
