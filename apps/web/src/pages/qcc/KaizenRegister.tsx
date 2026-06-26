import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ThumbsUp, Loader2, Check, X, Lightbulb, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { kaizenService } from '@/services/qcc.service';
import { divisionsService } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency } from '@/lib/utils';

const STATUS: Record<string, { label: string; variant: 'default' | 'success' | 'destructive' }> = {
  OPEN: { label: 'Terbuka', variant: 'default' },
  ADOPTED: { label: 'Diadopsi → QCC', variant: 'success' },
  REJECTED: { label: 'Ditolak', variant: 'destructive' },
};

export default function KaizenRegister() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canCurate = ['SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI'].includes(user?.role || '');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', divisionId: '', estimatedSaving: '' });

  const { data: ideas, isLoading } = useQuery({ queryKey: ['kaizen'], queryFn: () => kaizenService.list() });
  const { data: divisions } = useQuery({ queryKey: ['divisions', user?.companyId], queryFn: () => divisionsService.listByCompany(user!.companyId), enabled: open && !!user?.companyId });

  const inval = () => queryClient.invalidateQueries({ queryKey: ['kaizen'] });
  const createM = useMutation({
    mutationFn: () => kaizenService.create({ title: form.title, description: form.description, divisionId: form.divisionId, ...(form.estimatedSaving && { estimatedSaving: parseFloat(form.estimatedSaving) }) }),
    onSuccess: () => { inval(); toast({ title: 'Ide terkirim', variant: 'success' }); setOpen(false); setForm({ title: '', description: '', divisionId: '', estimatedSaving: '' }); },
    onError: (e: unknown) => toast({ title: 'Gagal', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });
  const voteM = useMutation({ mutationFn: (id: string) => kaizenService.vote(id), onSuccess: () => inval() });
  const adoptM = useMutation({ mutationFn: (id: string) => kaizenService.adopt(id), onSuccess: () => { inval(); queryClient.invalidateQueries({ queryKey: ['qcc'] }); toast({ title: 'Ide diadopsi jadi proyek QCC', variant: 'success' }); } });
  const rejectM = useMutation({ mutationFn: (id: string) => kaizenService.reject(id), onSuccess: () => { inval(); toast({ title: 'Ide ditolak', variant: 'success' }); } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-1"><Lightbulb className="w-4 h-4 text-amber-500" /> Bank ide perbaikan — vote ide terbaik untuk diadopsi</p>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Kirim Ide</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : ideas?.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Belum ada ide. Jadilah yang pertama!</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ideas?.map((idea) => (
            <Card key={idea.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{idea.title}</p>
                  <Badge variant={STATUS[idea.status].variant} className="flex-shrink-0 text-[10px]">{STATUS[idea.status].label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{idea.description}</p>
                <p className="text-xs text-muted-foreground mt-2">{idea.division?.name} · {idea.submittedBy?.name}{idea.estimatedSaving ? ` · est. ${formatCurrency(idea.estimatedSaving)}` : ''}</p>
                <div className="flex items-center justify-between mt-3">
                  <button onClick={() => voteM.mutate(idea.id)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors', idea.hasVoted ? 'bg-primary text-white border-primary' : 'hover:bg-muted')}>
                    <ThumbsUp className="w-4 h-4" /> {idea.voteCount}
                  </button>
                  {canCurate && idea.status === 'OPEN' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => adoptM.mutate(idea.id)} title="Adopsi jadi QCC"><Rocket className="w-4 h-4 text-green-600" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => rejectM.mutate(idea.id)}><X className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  )}
                  {idea.status === 'ADOPTED' && <Check className="w-5 h-5 text-green-600" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kirim Ide Kaizen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Judul</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Divisi</Label>
                <Select value={form.divisionId} onValueChange={(v) => setForm((f) => ({ ...f, divisionId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>{divisions?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Est. Saving (opsional)</Label><Input type="number" value={form.estimatedSaving} onChange={(e) => setForm((f) => ({ ...f, estimatedSaving: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => createM.mutate()} disabled={createM.isPending || !form.title || !form.description || !form.divisionId}>Kirim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
