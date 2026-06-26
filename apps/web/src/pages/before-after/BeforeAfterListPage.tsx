import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ImagePlus, Loader2, MapPin, Leaf, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { improvementService, divisionsService, usersService } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import {
  cn, IMPROVEMENT_STATUS_LABELS, IMPROVEMENT_STATUS_VARIANT, PROBLEM_CATEGORY_LABELS, PILAR_COLORS, formatDateShort,
} from '@/lib/utils';
import BeforeAfterGallery from './BeforeAfterGallery';
import BeforeAfterReport from './BeforeAfterReport';
import type { PilarType } from '@/types';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'VERIFICATION_NEEDED', 'CLOSED', 'REJECTED'];
const PILARS: PilarType[] = ['RINGKAS', 'RAPI', 'RESIK', 'RAWAT', 'RAJIN'];
const CATEGORIES = ['KEBERSIHAN', 'PENATAAN', 'PELABELAN', 'KESELAMATAN', 'EFISIENSI'];

export default function BeforeAfterListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canVerify = ['SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI'].includes(user?.role || '');
  const canInput = ['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC'].includes(user?.role || '');

  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const emptyForm = {
    divisionId: '', picId: '', problemCategory: 'KEBERSIHAN', pilarTags: [] as string[],
    description: '', rootCause: '', actions: '', targetDate: '', estimatedCost: '',
    latitude: null as number | null, longitude: null as number | null,
  };
  const [form, setForm] = useState(emptyForm);

  const { data: improvements, isLoading } = useQuery({
    queryKey: ['improvements', statusFilter],
    queryFn: () => improvementService.list(statusFilter !== 'all' ? { status: statusFilter } : undefined),
  });
  const { data: divisions } = useQuery({
    queryKey: ['divisions', user?.companyId], queryFn: () => divisionsService.listByCompany(user!.companyId),
    enabled: dialogOpen && !!user?.companyId,
  });
  const { data: users } = useQuery({
    queryKey: ['users-all'], queryFn: () => usersService.list({ limit: '100' }), enabled: dialogOpen,
  });

  const createM = useMutation({
    mutationFn: () => improvementService.create({
      divisionId: form.divisionId,
      problemCategory: form.problemCategory,
      pilarTags: form.pilarTags,
      description: form.description,
      rootCause: form.rootCause,
      actions: form.actions,
      picId: form.picId,
      targetDate: new Date(form.targetDate).toISOString(),
      ...(form.estimatedCost && { estimatedCost: Number(form.estimatedCost) }),
      ...(form.latitude != null && form.longitude != null && { latitude: form.latitude, longitude: form.longitude }),
    }),
    onSuccess: (imp) => {
      queryClient.invalidateQueries({ queryKey: ['improvements'] });
      toast({ title: `Perbaikan ${imp.code} dibuat`, variant: 'success' });
      setDialogOpen(false); navigate(`/before-after/${imp.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal';
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
    },
  });

  const captureGPS = () => {
    if (!navigator.geolocation) { toast({ title: 'GPS tidak didukung browser', variant: 'destructive' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude })); toast({ title: 'Lokasi GPS ditandai', variant: 'success' }); },
      () => toast({ title: 'Gagal ambil lokasi', variant: 'destructive' })
    );
  };

  const togglePilar = (p: string) =>
    setForm((f) => ({ ...f, pilarTags: f.pilarTags.includes(p) ? f.pilarTags.filter((x) => x !== p) : [...f.pilarTags, p] }));

  const canSubmit = form.divisionId && form.picId && form.pilarTags.length > 0 && form.description && form.rootCause && form.actions && form.targetDate;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Before / After</h1>
          <p className="text-muted-foreground mt-1">Dokumentasi perbaikan 5S dengan foto sebelum & sesudah</p>
        </div>
        {canInput && (
          <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Perbaikan Baru
          </Button>
        )}
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Daftar</TabsTrigger>
          <TabsTrigger value="gallery">Galeri</TabsTrigger>
          {canVerify && <TabsTrigger value="report">Rekap</TabsTrigger>}
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3 mb-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{IMPROVEMENT_STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {improvements?.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        <ImagePlus className="w-8 h-8 mx-auto mb-2 opacity-50" /> Belum ada perbaikan
                      </TableCell></TableRow>
                    ) : (
                      improvements?.map((imp) => (
                        <TableRow key={imp.id} className="cursor-pointer" onClick={() => navigate(`/before-after/${imp.id}`)}>
                          <TableCell className="font-mono text-xs">{imp.code}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {imp.isProperEvidence && <Leaf className="w-3 h-3 inline mr-1 text-green-600" />}
                            {imp.description}
                          </TableCell>
                          <TableCell>{imp.division?.name}</TableCell>
                          <TableCell>{PROBLEM_CATEGORY_LABELS[imp.problemCategory]}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDateShort(imp.targetDate)}</TableCell>
                          <TableCell><Badge variant={IMPROVEMENT_STATUS_VARIANT[imp.status]}>{IMPROVEMENT_STATUS_LABELS[imp.status]}</Badge></TableCell>
                          <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery"><BeforeAfterGallery /></TabsContent>
        {canVerify && <TabsContent value="report"><BeforeAfterReport /></TabsContent>}
      </Tabs>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Perbaikan Baru</DialogTitle>
            <DialogDescription>Kode unik (BA-...) dibuat otomatis. Foto before/after diunggah di halaman detail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Divisi</Label>
                <Select value={form.divisionId} onValueChange={(v) => setForm((f) => ({ ...f, divisionId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih divisi" /></SelectTrigger>
                  <SelectContent>{divisions?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PIC (penanggung jawab)</Label>
                <Select value={form.picId} onValueChange={(v) => setForm((f) => ({ ...f, picId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih PIC" /></SelectTrigger>
                  <SelectContent>{users?.data.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kategori Masalah</Label>
              <Select value={form.problemCategory} onValueChange={(v) => setForm((f) => ({ ...f, problemCategory: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{PROBLEM_CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
              </Select>
              {form.problemCategory === 'KEBERSIHAN' && <p className="text-xs text-green-600">🌿 Akan otomatis ditandai sebagai bukti PROPER (lingkungan)</p>}
            </div>

            <div className="space-y-2">
              <Label>Tag Pilar 5S (pilih ≥1)</Label>
              <div className="flex flex-wrap gap-2">
                {PILARS.map((p) => (
                  <button key={p} type="button" onClick={() => togglePilar(p)}
                    className={cn('px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-1', form.pilarTags.includes(p) ? PILAR_COLORS[p] : 'bg-background text-muted-foreground')}>
                    {form.pilarTags.includes(p) && <Check className="w-3 h-3" />} {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deskripsi Masalah</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Akar Masalah</Label>
                <Textarea value={form.rootCause} onChange={(e) => setForm((f) => ({ ...f, rootCause: e.target.value }))} className="min-h-[60px]" />
              </div>
              <div className="space-y-2">
                <Label>Tindakan Perbaikan</Label>
                <Textarea value={form.actions} onChange={(e) => setForm((f) => ({ ...f, actions: e.target.value }))} className="min-h-[60px]" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Target Selesai</Label>
                <Input type="date" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Estimasi Biaya (Rp)</Label>
                <Input type="number" value={form.estimatedCost} onChange={(e) => setForm((f) => ({ ...f, estimatedCost: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Lokasi</Label>
                <Button type="button" variant="outline" className="w-full" onClick={captureGPS}>
                  <MapPin className="w-4 h-4 mr-1" /> {form.latitude != null ? 'Ditandai ✓' : 'GPS'}
                </Button>
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
