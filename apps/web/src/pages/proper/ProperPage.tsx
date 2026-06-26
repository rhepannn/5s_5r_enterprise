import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Leaf, FileDown, FileText, Plus, Trash2, Loader2, Save, ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { properService } from '@/services/proper.service';
import { cn, formatDate } from '@/lib/utils';
import type { CritStatus, ProperRank } from '@/types';

const RANK_CLASS: Record<ProperRank, string> = {
  EMAS: 'bg-amber-400 text-white', HIJAU: 'bg-green-500 text-white', BIRU: 'bg-blue-500 text-white',
  MERAH: 'bg-red-500 text-white', HITAM: 'bg-gray-800 text-white',
};
const LIGHT: Record<string, string> = { green: 'bg-green-500', yellow: 'bg-amber-400', red: 'bg-red-500', gray: 'bg-gray-300' };
const STATUS_OPTS: CritStatus[] = ['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'NA'];
const STATUS_LABEL: Record<CritStatus, string> = { COMPLIANT: 'Taat', PARTIAL: 'Sebagian', NON_COMPLIANT: 'Tidak Taat', NA: 'N/A' };

const BALANCE_CFG: Record<string, { label: string; unit: string; fields: string[] }> = {
  LIMBAH_B3: { label: 'Limbah B3', unit: 'kg', fields: ['dihasilkan', 'dikelola', 'disimpan'] },
  LIMBAH_NON_B3: { label: 'Limbah Non-B3', unit: 'kg', fields: ['dihasilkan', 'dimanfaatkan'] },
  AIR: { label: 'Air', unit: 'm³', fields: ['penggunaan', 'daurUlang'] },
  ENERGI: { label: 'Energi', unit: 'kWh', fields: ['konsumsi', 'terbarukan'] },
};

function RankBadge({ rank, label }: { rank: ProperRank; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <span className={cn('inline-block px-4 py-2 rounded-lg font-bold text-lg', RANK_CLASS[rank])}>{rank}</span>
    </div>
  );
}

export default function ProperPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [period] = useState(String(new Date().getFullYear()));
  const [scores, setScores] = useState<Record<string, CritStatus>>({});
  const [balPeriod, setBalPeriod] = useState(`${new Date().getFullYear()}-06`);
  const [balForms, setBalForms] = useState<Record<string, Record<string, string>>>({});
  const [permitOpen, setPermitOpen] = useState(false);
  const [permitForm, setPermitForm] = useState({ type: '', name: '', number: '', issueDate: '', expiryDate: '' });

  const { data: dash } = useQuery({ queryKey: ['proper-dash', period], queryFn: () => properService.getDashboard(period) });
  const { data: balances } = useQuery({ queryKey: ['proper-balances'], queryFn: () => properService.listBalances() });
  const { data: permits } = useQuery({ queryKey: ['proper-permits'], queryFn: () => properService.listPermits() });
  const { data: evidence } = useQuery({ queryKey: ['proper-evidence'], queryFn: () => properService.getEvidence() });

  useEffect(() => {
    if (dash) { const s: Record<string, CritStatus> = {}; dash.criteria.forEach((c) => { s[c.code] = c.status; }); setScores(s); }
  }, [dash]);

  const saveCriteriaM = useMutation({ mutationFn: () => properService.updateCriteria(period, scores), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['proper-dash'] }); toast({ title: 'Kriteria PROPER tersimpan', variant: 'success' }); } });
  const saveBalM = useMutation({ mutationFn: (type: string) => properService.upsertBalance({ period: balPeriod, type, data: { ...Object.fromEntries(Object.entries(balForms[type] || {}).map(([k, v]) => [k, parseFloat(v) || 0])), unit: BALANCE_CFG[type].unit } }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['proper-balances'] }); toast({ title: 'Neraca tersimpan', variant: 'success' }); } });
  const createPermitM = useMutation({ mutationFn: () => properService.createPermit({ ...permitForm, issueDate: new Date(permitForm.issueDate).toISOString(), expiryDate: new Date(permitForm.expiryDate).toISOString() }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['proper-permits'] }); toast({ title: 'Izin ditambahkan', variant: 'success' }); setPermitOpen(false); }, onError: (e: unknown) => toast({ title: 'Gagal', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }) });
  const delPermitM = useMutation({ mutationFn: (id: string) => properService.deletePermit(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['proper-permits'] }); toast({ title: 'Izin dihapus', variant: 'success' }); } });

  const ketaatan = dash?.criteria.filter((c) => c.category === 'KETAATAN') || [];
  const beyond = dash?.criteria.filter((c) => c.category === 'BEYOND') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Leaf className="w-6 h-6 text-green-600" /> PROPER KLHK</h1>
          <p className="text-muted-foreground mt-1">Kinerja lingkungan & kesiapan PROPER</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => properService.downloadSimpel(balPeriod)}><FileDown className="w-4 h-4 mr-2" /> Export SIMPEL</Button>
          <Button variant="outline" onClick={() => navigate('/proper/rkl-rpl')}><FileText className="w-4 h-4 mr-2" /> RKL-RPL</Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="neraca">Neraca Lingkungan</TabsTrigger>
          <TabsTrigger value="izin">Izin</TabsTrigger>
          <TabsTrigger value="evidence">Evidence Bank</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          {dash && (
            <>
              <Card><CardContent className="pt-6 flex items-center justify-around flex-wrap gap-4">
                <RankBadge rank={dash.currentRank} label="Peringkat Saat Ini" />
                <RankBadge rank={dash.targetRank} label="Target" />
                <RankBadge rank={dash.projectedRank} label="Proyeksi (rule-based)" />
                <div className="text-center"><p className="text-xs text-muted-foreground mb-1">Kriteria Taat</p><p className="text-2xl font-bold">{dash.compliantCount}/{dash.totalCriteria}</p></div>
              </CardContent></Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[{ title: 'Ketaatan (Wajib)', list: ketaatan }, { title: 'Beyond Compliance (Hijau/Emas)', list: beyond }].map((grp) => (
                  <Card key={grp.title}>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{grp.title}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {grp.list.map((c) => (
                        <div key={c.code} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm"><span className={cn('w-3 h-3 rounded-full', LIGHT[scores[c.code] === 'COMPLIANT' ? 'green' : scores[c.code] === 'PARTIAL' ? 'yellow' : scores[c.code] === 'NON_COMPLIANT' ? 'red' : 'gray'])} /> {c.name}</span>
                          <Select value={scores[c.code] || 'NA'} onValueChange={(v) => setScores((s) => ({ ...s, [c.code]: v as CritStatus }))}>
                            <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUS_OPTS.map((o) => <SelectItem key={o} value={o}>{STATUS_LABEL[o]}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button onClick={() => saveCriteriaM.mutate()} disabled={saveCriteriaM.isPending}><Save className="w-4 h-4 mr-2" /> Simpan Penilaian Kriteria</Button>
            </>
          )}
        </TabsContent>

        {/* Neraca */}
        <TabsContent value="neraca" className="space-y-4">
          <div className="flex items-center gap-2">
            <Label>Periode</Label>
            <Input value={balPeriod} onChange={(e) => setBalPeriod(e.target.value)} className="w-40" placeholder="2026-06" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(BALANCE_CFG).map(([type, cfg]) => (
              <Card key={type}>
                <CardHeader className="pb-2"><CardTitle className="text-base">{cfg.label} <span className="text-xs text-muted-foreground">({cfg.unit})</span></CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {cfg.fields.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Label className="w-28 capitalize text-sm">{f}</Label>
                      <Input type="number" value={balForms[type]?.[f] || ''} onChange={(e) => setBalForms((b) => ({ ...b, [type]: { ...b[type], [f]: e.target.value } }))} />
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => saveBalM.mutate(type)}><Save className="w-4 h-4 mr-2" /> Simpan</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {balances && balances.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">Data Tersimpan</CardTitle></CardHeader><CardContent>
              <Table><TableHeader><TableRow><TableHead>Periode</TableHead><TableHead>Jenis</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                <TableBody>{balances.map((b) => <TableRow key={b.id}><TableCell>{b.period}</TableCell><TableCell>{BALANCE_CFG[b.type]?.label || b.type}</TableCell><TableCell className="text-xs text-muted-foreground">{Object.entries(b.data).filter(([k]) => k !== 'unit').map(([k, v]) => `${k}: ${v}`).join(', ')} {String(b.data.unit || '')}</TableCell></TableRow>)}</TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Izin */}
        <TabsContent value="izin" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => { setPermitForm({ type: '', name: '', number: '', issueDate: '', expiryDate: '' }); setPermitOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Tambah Izin</Button></div>
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Jenis</TableHead><TableHead>Nomor</TableHead><TableHead>Kadaluarsa</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {permits?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada izin</TableCell></TableRow> :
                  permits?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.type}</TableCell><TableCell className="font-mono text-xs">{p.number}</TableCell>
                      <TableCell>{formatDate(p.expiryDate)}</TableCell>
                      <TableCell><Badge variant={p.status === 'ACTIVE' ? 'success' : p.status === 'EXPIRING_SOON' ? 'warning' : 'destructive'}>{p.status === 'ACTIVE' ? 'Aktif' : p.status === 'EXPIRING_SOON' ? 'Segera Habis' : 'Kadaluarsa'}</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => delPermitM.mutate(p.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Evidence */}
        <TabsContent value="evidence">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Bank Bukti PROPER ({evidence?.total ?? 0})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {evidence?.improvements.map((im) => (
                <div key={im.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div><p className="text-sm font-medium">{im.code} · {im.division.name}</p><p className="text-xs text-muted-foreground">{im.description}</p></div>
                  <div className="flex gap-1">{im.photoAfter.slice(0, 2).map((u, i) => <img key={i} src={u} alt="" className="w-10 h-10 object-cover rounded" />)}</div>
                </div>
              ))}
              {evidence?.permitDocs.map((d) => <div key={d.id} className="p-2 border rounded-lg text-sm">📄 {d.name} ({d.number})</div>)}
              {evidence && evidence.total === 0 && <p className="text-center text-muted-foreground py-6">Belum ada bukti. Tandai perbaikan sebagai "PROPER evidence" di modul Before/After.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={permitOpen} onOpenChange={setPermitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Izin Lingkungan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Jenis (AMDAL/IPLC/TPS_B3/SLO/dll)</Label><Input value={permitForm.type} onChange={(e) => setPermitForm((f) => ({ ...f, type: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Nama Izin</Label><Input value={permitForm.name} onChange={(e) => setPermitForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Nomor</Label><Input value={permitForm.number} onChange={(e) => setPermitForm((f) => ({ ...f, number: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Tanggal Terbit</Label><Input type="date" value={permitForm.issueDate} onChange={(e) => setPermitForm((f) => ({ ...f, issueDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Kadaluarsa</Label><Input type="date" value={permitForm.expiryDate} onChange={(e) => setPermitForm((f) => ({ ...f, expiryDate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermitOpen(false)}>Batal</Button>
            <Button onClick={() => createPermitM.mutate()} disabled={createPermitM.isPending || !permitForm.name || !permitForm.expiryDate}>{createPermitM.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
