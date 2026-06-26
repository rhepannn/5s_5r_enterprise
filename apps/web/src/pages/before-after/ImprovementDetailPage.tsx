import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Loader2, Play, Send, CheckCircle2, XCircle, RotateCcw, Camera,
  Leaf, MapPin, Award, History, FlaskConical, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { improvementService } from '@/services';
import { isoService } from '@/services/iso.service';
import { gamificationService } from '@/services/gamification.service';
import { useAuthStore } from '@/stores/authStore';
import {
  cn, IMPROVEMENT_STATUS_LABELS, IMPROVEMENT_STATUS_VARIANT, PROBLEM_CATEGORY_LABELS, PILAR_COLORS,
  formatDate, ROLE_LABELS,
} from '@/lib/utils';

export default function ImprovementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [reasonDialog, setReasonDialog] = useState<null | 'revision' | 'reject'>(null);
  const [reason, setReason] = useState('');

  const { data: imp, isLoading } = useQuery({ queryKey: ['improvement', id], queryFn: () => improvementService.getById(id!), enabled: !!id });
  const { data: trail } = useQuery({ queryKey: ['improvement-trail', id], queryFn: () => improvementService.getTrail(id!), enabled: !!id });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['improvement', id] });
    queryClient.invalidateQueries({ queryKey: ['improvement-trail', id] });
    queryClient.invalidateQueries({ queryKey: ['improvements'] });
  };
  const onErr = (err: unknown) => {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal';
    toast({ title: 'Gagal', description: msg, variant: 'destructive' });
  };

  const startM = useMutation({ mutationFn: () => improvementService.start(id!), onSuccess: () => { invalidate(); toast({ title: 'Perbaikan dikerjakan', variant: 'success' }); }, onError: onErr });
  const submitM = useMutation({ mutationFn: () => improvementService.submit(id!), onSuccess: () => { invalidate(); toast({ title: 'Diajukan untuk verifikasi', variant: 'success' }); }, onError: onErr });
  const verifyM = useMutation({ mutationFn: () => improvementService.verify(id!), onSuccess: () => { invalidate(); toast({ title: 'Terverifikasi & ditutup 🎉', variant: 'success' }); }, onError: onErr });
  const escalateM = useMutation({ mutationFn: () => improvementService.escalateToQCC(id!), onSuccess: () => { invalidate(); toast({ title: 'Di-escalate ke proyek QCC', variant: 'success' }); }, onError: onErr });
  const photoM = useMutation({
    mutationFn: ({ type, files }: { type: 'before' | 'after'; files: File[] }) => improvementService.uploadPhotos(id!, type, files),
    onSuccess: () => { invalidate(); toast({ title: 'Foto terupload', variant: 'success' }); }, onError: onErr,
  });
  const reasonM = useMutation({
    mutationFn: () => reasonDialog === 'revision' ? improvementService.requestRevision(id!, reason) : improvementService.reject(id!, reason),
    onSuccess: () => { invalidate(); setReasonDialog(null); setReason(''); toast({ title: 'Berhasil', variant: 'success' }); }, onError: onErr,
  });

  // ISO multi-tag
  const [isoTags, setIsoTags] = useState<string[]>([]);
  useEffect(() => { if (imp) setIsoTags(imp.isoClauses || []); }, [imp?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: isoClauses } = useQuery({ queryKey: ['iso-clauses'], queryFn: () => isoService.listClauses() });
  const tagM = useMutation({ mutationFn: () => isoService.tagImprovement(id!, isoTags), onSuccess: () => { invalidate(); toast({ title: 'Tag klausul ISO disimpan', variant: 'success' }); }, onError: onErr });
  const bpM = useMutation({ mutationFn: () => gamificationService.markBestPractice(id!, !imp!.isBestPractice), onSuccess: () => { invalidate(); toast({ title: 'Best Practice diperbarui', variant: 'success' }); }, onError: onErr });

  if (isLoading || !imp) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  const canInput = ['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC'].includes(user?.role || '');
  const canVerify = ['SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI'].includes(user?.role || '');
  const canEscalate = ['SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI', 'PIC'].includes(user?.role || '');
  const canUpload = canInput && (imp.status === 'OPEN' || imp.status === 'IN_PROGRESS');

  const PhotoSection = ({ type, label, urls, color }: { type: 'before' | 'after'; label: string; urls: string[]; color: string }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className={cn('text-sm font-semibold', color)}>{label}</p>
        {canUpload && (
          <label className="text-xs flex items-center gap-1 cursor-pointer text-primary hover:underline">
            <Camera className="w-3.5 h-3.5" /> Tambah
            <input type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={(e) => { if (e.target.files?.length) photoM.mutate({ type, files: Array.from(e.target.files) }); e.target.value = ''; }} />
          </label>
        )}
      </div>
      {urls.length === 0 ? (
        <div className="h-32 rounded border border-dashed bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">Belum ada foto</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt={label} className="w-full h-24 object-cover rounded border" /></a>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/before-after')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{imp.code}</p>
              <h1 className="text-xl font-bold mt-0.5">{imp.description}</h1>
              <p className="text-muted-foreground text-sm mt-1">{imp.division?.name} · {PROBLEM_CATEGORY_LABELS[imp.problemCategory]} · PIC: {imp.pic?.name}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {imp.pilarTags.map((p) => <span key={p} className={cn('px-2 py-0.5 rounded text-[10px] border', PILAR_COLORS[p])}>{p}</span>)}
                {imp.isProperEvidence && <Badge variant="success" className="gap-1 text-[10px]"><Leaf className="w-3 h-3" /> PROPER</Badge>}
                {imp.isoClause && <Badge variant="secondary" className="gap-1 text-[10px]"><ShieldCheck className="w-3 h-3" /> ISO {imp.isoClause}</Badge>}
              </div>
            </div>
            <div className="text-right">
              <Badge variant={IMPROVEMENT_STATUS_VARIANT[imp.status]} className="mb-2">{IMPROVEMENT_STATUS_LABELS[imp.status]}</Badge>
              {imp.status === 'CLOSED' && (
                <p className="text-sm flex items-center gap-1 justify-end text-purple-600 font-semibold"><Award className="w-4 h-4" /> +{imp.bonusPoints} poin</p>
              )}
            </div>
          </div>

          {imp.rejectionReason && (imp.status === 'IN_PROGRESS' || imp.status === 'REJECTED') && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <span className="font-medium text-amber-900">Catatan revisi/penolakan:</span> <span className="text-amber-800">{imp.rejectionReason}</span>
            </div>
          )}

          {/* Action bar */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {imp.status === 'OPEN' && canInput && <Button onClick={() => startM.mutate()} disabled={startM.isPending}><Play className="w-4 h-4 mr-2" /> Mulai Kerjakan</Button>}
            {imp.status === 'IN_PROGRESS' && canInput && (
              <Button onClick={() => submitM.mutate()} disabled={submitM.isPending}>
                {submitM.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Ajukan Verifikasi
              </Button>
            )}
            {imp.status === 'VERIFICATION_NEEDED' && canVerify && (
              <>
                <Button onClick={() => verifyM.mutate()} disabled={verifyM.isPending}><CheckCircle2 className="w-4 h-4 mr-2" /> Verifikasi & Tutup</Button>
                <Button variant="outline" onClick={() => { setReason(''); setReasonDialog('revision'); }}><RotateCcw className="w-4 h-4 mr-2" /> Minta Revisi</Button>
                <Button variant="destructive" onClick={() => { setReason(''); setReasonDialog('reject'); }}><XCircle className="w-4 h-4 mr-2" /> Tolak</Button>
              </>
            )}
            {imp.status === 'CLOSED' && canVerify && (
              <Button variant="outline" onClick={() => bpM.mutate()} disabled={bpM.isPending} className={imp.isBestPractice ? 'border-amber-400 text-amber-600' : ''}>
                <Award className="w-4 h-4 mr-2" /> {imp.isBestPractice ? 'Best Practice ✓' : 'Tandai Best Practice'}
              </Button>
            )}
            {imp.status === 'CLOSED' && canEscalate && !imp.qccProjectId && (
              <Button variant="outline" onClick={() => escalateM.mutate()} disabled={escalateM.isPending}><FlaskConical className="w-4 h-4 mr-2" /> Escalate ke QCC</Button>
            )}
            {imp.qccProject && <Badge variant="secondary" className="self-center gap-1"><FlaskConical className="w-3 h-3" /> QCC: {imp.qccProject.title}</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Dokumentasi Foto</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PhotoSection type="before" label="SEBELUM" urls={imp.photoBefore} color="text-red-600" />
          <PhotoSection type="after" label="SESUDAH" urls={imp.photoAfter} color="text-green-600" />
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Detail</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div><p className="text-muted-foreground text-xs">Akar Masalah</p><p>{imp.rootCause}</p></div>
          <div><p className="text-muted-foreground text-xs">Tindakan Perbaikan</p><p>{imp.actions}</p></div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-muted-foreground text-xs">Target Selesai</p><p>{formatDate(imp.targetDate)}</p></div>
            <div><p className="text-muted-foreground text-xs">Tanggal Selesai</p><p>{imp.actualDate ? formatDate(imp.actualDate) : '—'}</p></div>
          </div>
          {imp.estimatedCost != null && <div><p className="text-muted-foreground text-xs">Estimasi Biaya</p><p>Rp {imp.estimatedCost.toLocaleString('id-ID')}</p></div>}
          {imp.latitude != null && (
            <div><p className="text-muted-foreground text-xs">Lokasi GPS</p>
              <a className="text-primary flex items-center gap-1 hover:underline" href={`https://maps.google.com/?q=${imp.latitude},${imp.longitude}`} target="_blank" rel="noreferrer">
                <MapPin className="w-3.5 h-3.5" /> {imp.latitude?.toFixed(5)}, {imp.longitude?.toFixed(5)}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tag ISO multi-klausul */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Tag Klausul ISO</CardTitle>
          {canInput && <Button size="sm" variant="outline" onClick={() => tagM.mutate()} disabled={tagM.isPending}>{tagM.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Simpan Tag</Button>}
        </CardHeader>
        <CardContent>
          {!isoClauses ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
            <div className="flex flex-wrap gap-2">
              {isoClauses.map((c) => {
                const sel = isoTags.includes(c.code);
                return (
                  <button key={c.id} disabled={!canInput}
                    onClick={() => setIsoTags((t) => sel ? t.filter((x) => x !== c.code) : [...t, c.code])}
                    className={cn('text-xs px-2 py-1 rounded border transition-colors', sel ? 'bg-primary text-white border-primary' : 'hover:bg-muted', !canInput && 'cursor-default')}
                    title={`${c.standard.replace('_', ' ')} — ${c.title}`}>
                    {c.standard.replace('ISO_', '')} · {c.code}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trail */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Riwayat</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {trail?.map((t) => (
              <li key={t.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div>
                  <p><span className="font-medium">{t.action}</span>{t.fromStatus && t.toStatus && <span className="text-muted-foreground"> · {t.fromStatus} → {t.toStatus}</span>}</p>
                  <p className="text-xs text-muted-foreground">{t.userName} ({ROLE_LABELS[t.userRole]}) · {formatDate(t.createdAt)}{t.notes && ` · ${t.notes}`}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Reason dialog */}
      <Dialog open={reasonDialog !== null} onOpenChange={(o) => !o && setReasonDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonDialog === 'revision' ? 'Minta Revisi' : 'Tolak Temuan'}</DialogTitle>
            <DialogDescription>{reasonDialog === 'revision' ? 'PIC akan diminta memperbaiki & upload ulang foto After' : 'Temuan ditandai ditolak'}</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Alasan..." value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialog(null)}>Batal</Button>
            <Button variant={reasonDialog === 'reject' ? 'destructive' : 'default'} onClick={() => reasonM.mutate()} disabled={reason.length < 3 || reasonM.isPending}>
              {reasonM.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
