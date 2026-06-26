import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Loader2, Play, Save, Send, CheckCircle2, XCircle, RotateCcw,
  Zap, Camera, History, ShieldCheck, Leaf,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { auditService } from '@/services/audit.service';
import { enqueue } from '@/lib/offlineDb';
import { useAuthStore } from '@/stores/authStore';
import {
  cn, AUDIT_STATUS_LABELS, AUDIT_STATUS_VARIANT, AUDIT_TYPE_LABELS, PILAR_LABELS, PILAR_COLORS,
  formatDate, ROLE_LABELS,
} from '@/lib/utils';
import type { AuditChecklistItem, PilarType } from '@/types';

const PILAR_ORDER: PilarType[] = ['RINGKAS', 'RAPI', 'RESIK', 'RAWAT', 'RAJIN'];

export default function AuditFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [localItems, setLocalItems] = useState<Record<string, { score: number | null; notes: string }>>({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: session, isLoading } = useQuery({
    queryKey: ['audit-session', id],
    queryFn: () => auditService.getSession(id!),
    enabled: !!id,
  });

  const { data: trail } = useQuery({
    queryKey: ['audit-trail', id],
    queryFn: () => auditService.getTrail(id!),
    enabled: !!id,
  });

  // Init local editable state from server
  useEffect(() => {
    if (session?.checklistItems) {
      const map: Record<string, { score: number | null; notes: string }> = {};
      session.checklistItems.forEach((it) => { map[it.id] = { score: it.score, notes: it.notes || '' }; });
      setLocalItems(map);
    }
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['audit-session', id] });
    queryClient.invalidateQueries({ queryKey: ['audit-trail', id] });
    queryClient.invalidateQueries({ queryKey: ['audit-sessions'] });
  };

  const mkMutation = (fn: () => Promise<unknown>, successMsg: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: () => { invalidate(); toast({ title: successMsg, variant: 'success' }); },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal';
        toast({ title: 'Gagal', description: msg, variant: 'destructive' });
      },
    });

  const startM = mkMutation(() => auditService.start(id!), 'Audit dimulai');

  // Save offline-aware: kalau offline, antrikan ke IndexedDB
  const saveM = useMutation({
    mutationFn: async () => {
      const items = Object.entries(localItems).map(([itemId, v]) => ({ id: itemId, score: v.score, notes: v.notes }));
      if (!navigator.onLine) {
        await enqueue({ type: 'SAVE_ITEMS', payload: { sessionId: id!, items }, label: session?.area?.name || 'Audit', createdAt: Date.now() });
        return 'queued' as const;
      }
      await auditService.saveItems(id!, items);
      return 'saved' as const;
    },
    onSuccess: (r) => {
      invalidate();
      toast({ title: r === 'queued' ? 'Disimpan offline — akan disinkron saat online' : 'Penilaian tersimpan', variant: 'success' });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal';
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
    },
  });

  const photoM = useMutation({
    mutationFn: ({ itemId, files }: { itemId: string; files: File[] }) => auditService.uploadItemPhotos(id!, itemId, files),
    onSuccess: () => { invalidate(); toast({ title: 'Foto terupload', variant: 'success' }); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal upload foto';
      toast({ title: 'Gagal upload foto', description: msg, variant: 'destructive' });
    },
  });

  const reviewM = mkMutation(() => auditService.review(id!), 'Audit direview');
  const approveM = mkMutation(() => auditService.approve(id!), 'Audit disetujui');
  const reviseM = mkMutation(() => auditService.revise(id!), 'Dibuka untuk revisi');
  const rejectM = useMutation({
    mutationFn: () => auditService.reject(id!, rejectReason),
    onSuccess: () => { invalidate(); setRejectOpen(false); setRejectReason(''); toast({ title: 'Audit ditolak', variant: 'success' }); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal';
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
    },
  });
  const submitM = useMutation({
    mutationFn: async () => {
      await auditService.saveItems(id!, Object.entries(localItems).map(([itemId, v]) => ({ id: itemId, score: v.score, notes: v.notes })));
      return auditService.submit(id!);
    },
    onSuccess: () => { invalidate(); toast({ title: 'Audit disubmit untuk review', variant: 'success' }); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal';
      toast({ title: 'Gagal submit', description: msg, variant: 'destructive' });
    },
  });

  if (isLoading || !session) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_5S';
  const isAssignedAuditor = user?.role === 'AUDITOR' && session.auditor?.id === user?.id;
  const canFill = (isAdmin || isAssignedAuditor) && session.status === 'IN_PROGRESS';
  const canStart = (isAdmin || isAssignedAuditor) && session.status === 'SCHEDULED';
  const canRevise = (isAdmin || isAssignedAuditor) && session.status === 'REJECTED';
  const canReview = session.status === 'PENDING_REVIEW' && (isAdmin || (user?.role === 'KEPALA_DIVISI' && user?.divisionId === session.division?.id));
  const canApprove = session.status === 'COMPLETED' && isAdmin;
  const canReject = (session.status === 'PENDING_REVIEW' && canReview) || (session.status === 'COMPLETED' && isAdmin);

  const allScored = Object.values(localItems).every((v) => v.score != null);
  const itemsByPilar = (pilar: PilarType) => (session.checklistItems || []).filter((i) => i.pilar === pilar);

  const setScore = (itemId: string, score: number) =>
    setLocalItems((p) => ({ ...p, [itemId]: { ...p[itemId], score } }));
  const setNotes = (itemId: string, notes: string) =>
    setLocalItems((p) => ({ ...p, [itemId]: { ...p[itemId], notes } }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/audit')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Kembali ke daftar audit
      </button>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{session.area?.name}</h1>
                {session.type === 'SURPRISE' && <Badge variant="warning" className="gap-1"><Zap className="w-3 h-3" /> Mendadak 1.2x</Badge>}
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {session.division?.name} · {AUDIT_TYPE_LABELS[session.type]} · Auditor: {session.auditor?.name}
              </p>
              <p className="text-muted-foreground text-xs mt-1">Dijadwalkan: {formatDate(session.scheduledAt)} · Periode: {session.period?.name}</p>
            </div>
            <div className="text-right">
              <Badge variant={AUDIT_STATUS_VARIANT[session.status]} className="mb-2">{AUDIT_STATUS_LABELS[session.status]}</Badge>
              {session.totalScore != null && (
                <p className="text-3xl font-bold">{session.totalScore.toFixed(1)}<span className="text-sm text-muted-foreground">/100</span></p>
              )}
            </div>
          </div>

          {session.status === 'REJECTED' && session.rejectionReason && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-900">Ditolak:</p>
              <p className="text-sm text-red-700">{session.rejectionReason}</p>
            </div>
          )}

          {/* Action bar */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {canStart && <Button onClick={() => startM.mutate()} disabled={startM.isPending}><Play className="w-4 h-4 mr-2" /> Mulai Audit</Button>}
            {canFill && (
              <>
                <Button variant="outline" onClick={() => saveM.mutate()} disabled={saveM.isPending}>
                  {saveM.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan Penilaian
                </Button>
                <Button onClick={() => submitM.mutate()} disabled={!allScored || submitM.isPending}>
                  {submitM.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Submit untuk Review
                </Button>
                {!allScored && <span className="text-xs text-muted-foreground self-center">Lengkapi semua skor untuk submit</span>}
              </>
            )}
            {canReview && <Button onClick={() => reviewM.mutate()} disabled={reviewM.isPending}><CheckCircle2 className="w-4 h-4 mr-2" /> Setujui (Review)</Button>}
            {canApprove && <Button onClick={() => approveM.mutate()} disabled={approveM.isPending}><CheckCircle2 className="w-4 h-4 mr-2" /> Approve Final</Button>}
            {canReject && <Button variant="destructive" onClick={() => setRejectOpen(true)}><XCircle className="w-4 h-4 mr-2" /> Tolak</Button>}
            {canRevise && <Button variant="outline" onClick={() => reviseM.mutate()} disabled={reviseM.isPending}><RotateCcw className="w-4 h-4 mr-2" /> Revisi</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Checklist per pilar */}
      {PILAR_ORDER.map((pilar) => {
        const items = itemsByPilar(pilar);
        if (items.length === 0) return null;
        return (
          <Card key={pilar}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className={cn('px-2 py-0.5 rounded text-xs border', PILAR_COLORS[pilar])}>{PILAR_LABELS[pilar]}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item: AuditChecklistItem) => {
                const local = localItems[item.id] || { score: item.score, notes: item.notes || '' };
                return (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium flex-1">{item.question}</p>
                      <div className="flex gap-1 flex-shrink-0">
                        {item.isProperTag && <Badge variant="success" className="gap-1 text-[10px]"><Leaf className="w-3 h-3" /> PROPER</Badge>}
                        {item.isoClause && <Badge variant="secondary" className="gap-1 text-[10px]"><ShieldCheck className="w-3 h-3" /> ISO {item.isoClause}</Badge>}
                      </div>
                    </div>

                    {/* Score 1-5 */}
                    <div className="flex items-center gap-2 mt-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          disabled={!canFill}
                          onClick={() => setScore(item.id, n)}
                          className={cn(
                            'w-9 h-9 rounded-md border text-sm font-semibold transition-colors',
                            local.score === n ? 'bg-primary text-white border-primary' : 'bg-background hover:bg-muted',
                            !canFill && 'cursor-default opacity-80'
                          )}
                        >
                          {n}
                        </button>
                      ))}
                      {canFill && (
                        <label
                          className="ml-2 w-9 h-9 rounded-md border flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
                          title="Ambil/upload foto"
                        >
                          <Camera className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.length) photoM.mutate({ itemId: item.id, files: Array.from(e.target.files) });
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* Foto thumbnails */}
                    {item.photos && item.photos.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {item.photos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt={`Foto ${i + 1}`} className="w-16 h-16 object-cover rounded border" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Notes */}
                    {(canFill || local.notes) && (
                      <Textarea
                        placeholder="Catatan temuan (opsional)..."
                        value={local.notes}
                        disabled={!canFill}
                        onChange={(e) => setNotes(item.id, e.target.value)}
                        className="mt-3 min-h-[60px]"
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Audit trail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Riwayat (Audit Trail)</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {trail?.map((t) => (
              <li key={t.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div>
                  <p>
                    <span className="font-medium">{t.action}</span>
                    {t.fromStatus && t.toStatus && <span className="text-muted-foreground"> · {t.fromStatus} → {t.toStatus}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.userName} ({ROLE_LABELS[t.userRole]}) · {formatDate(t.createdAt)}
                    {t.notes && ` · ${t.notes}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Audit</DialogTitle>
            <DialogDescription>Berikan alasan penolakan agar auditor dapat merevisi</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Alasan penolakan..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={() => rejectM.mutate()} disabled={rejectReason.length < 3 || rejectM.isPending}>
              {rejectM.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Tolak Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
