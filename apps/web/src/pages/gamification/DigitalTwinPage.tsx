import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Map, Upload, Trash2, Loader2, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { gamificationService } from '@/services/gamification.service';
import { useAuthStore } from '@/stores/authStore';
import type { FloorPin } from '@/types';

const PIN_COLOR: Record<string, string> = { risk: 'bg-red-500', finding: 'bg-amber-500', info: 'bg-blue-500' };

export default function DigitalTwinPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_5S';
  const canPin = ['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC'].includes(user?.role || '');

  const [selectedId, setSelectedId] = useState<string>('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [upName, setUpName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [pinLabel, setPinLabel] = useState('');
  const [pinType, setPinType] = useState('risk');

  const { data: plans } = useQuery({ queryKey: ['floorplans'], queryFn: () => gamificationService.listFloorPlans() });
  const current = plans?.find((p) => p.id === selectedId) || plans?.[0];

  const uploadM = useMutation({
    mutationFn: () => gamificationService.createFloorPlan(upName, fileRef.current!.files![0]),
    onSuccess: (fp) => { queryClient.invalidateQueries({ queryKey: ['floorplans'] }); setSelectedId(fp.id); setUploadOpen(false); setUpName(''); toast({ title: 'Denah ditambahkan', variant: 'success' }); },
    onError: (e: unknown) => toast({ title: 'Gagal', description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message, variant: 'destructive' }),
  });
  const pinsM = useMutation({
    mutationFn: (pins: FloorPin[]) => gamificationService.updatePins(current!.id, pins),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['floorplans'] }); toast({ title: 'Pin tersimpan', variant: 'success' }); },
  });
  const delM = useMutation({ mutationFn: (id: string) => gamificationService.deleteFloorPlan(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['floorplans'] }); setSelectedId(''); toast({ title: 'Denah dihapus', variant: 'success' }); } });

  const onImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canPin || !current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPendingPin({ x: Math.round(((e.clientX - rect.left) / rect.width) * 100), y: Math.round(((e.clientY - rect.top) / rect.height) * 100) });
    setPinLabel(''); setPinType('risk');
  };
  const savePin = () => {
    if (!pendingPin || !current) return;
    pinsM.mutate([...(current.pins || []), { ...pendingPin, label: pinLabel || 'Temuan', type: pinType }]);
    setPendingPin(null);
  };
  const removePin = (idx: number) => { if (current) pinsM.mutate((current.pins || []).filter((_, i) => i !== idx)); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Map className="w-6 h-6" /> Digital Twin — Peta Area</h1>
          <p className="text-muted-foreground mt-1">Pin temuan & risiko ke denah area</p>
        </div>
        <div className="flex gap-2">
          {plans && plans.length > 0 && (
            <Select value={current?.id || ''} onValueChange={setSelectedId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Pilih denah" /></SelectTrigger>
              <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {isAdmin && <Button onClick={() => setUploadOpen(true)}><Upload className="w-4 h-4 mr-2" /> Upload Denah</Button>}
        </div>
      </div>

      {!current ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Map className="w-10 h-10 mx-auto mb-2 opacity-50" />
          Belum ada denah. {isAdmin ? 'Upload denah area untuk mulai.' : 'Hubungi admin untuk upload denah.'}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{current.name}</p>
                {isAdmin && <Button variant="ghost" size="sm" onClick={() => delM.mutate(current.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>}
              </div>
              {canPin && <p className="text-xs text-muted-foreground mb-2">💡 Klik pada denah untuk menambah pin temuan</p>}
              <div className="relative border rounded-lg overflow-hidden cursor-crosshair" onClick={onImageClick}>
                <img src={current.imageUrl} alt={current.name} className="w-full" />
                {(current.pins || []).map((pin, i) => (
                  <div key={i} className="absolute -translate-x-1/2 -translate-y-full group" style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    onClick={(e) => { e.stopPropagation(); if (canPin && confirm(`Hapus pin "${pin.label}"?`)) removePin(i); }}>
                    <MapPin className={`w-6 h-6 text-white drop-shadow ${PIN_COLOR[pin.type || 'risk'].replace('bg-', 'fill-')}`} fill="currentColor" />
                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-[10px] bg-black/70 text-white px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100">{pin.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="font-medium mb-2">Daftar Pin ({current.pins?.length || 0})</p>
              <div className="space-y-1">
                {(current.pins || []).map((pin, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${PIN_COLOR[pin.type || 'risk']}`} /> {pin.label}</span>
                    {canPin && <button onClick={() => removePin(i)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
                  </div>
                ))}
                {(!current.pins || current.pins.length === 0) && <p className="text-xs text-muted-foreground">Belum ada pin.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload denah */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Denah Area</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nama Denah</Label><Input value={upName} onChange={(e) => setUpName(e.target.value)} placeholder="mis. Denah Plant Bekasi Lt.1" /></div>
            <div className="space-y-1"><Label>Gambar Denah</Label><input ref={fileRef} type="file" accept="image/*" className="text-sm" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Batal</Button>
            <Button onClick={() => uploadM.mutate()} disabled={uploadM.isPending || !upName}>{uploadM.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tambah pin */}
      <Dialog open={!!pendingPin} onOpenChange={(o) => !o && setPendingPin(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Pin Temuan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Keterangan</Label><Input value={pinLabel} onChange={(e) => setPinLabel(e.target.value)} placeholder="mis. Tumpahan oli" /></div>
            <div className="space-y-1">
              <Label>Jenis</Label>
              <Select value={pinType} onValueChange={setPinType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="risk">Risiko</SelectItem><SelectItem value="finding">Temuan</SelectItem><SelectItem value="info">Info</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingPin(null)}>Batal</Button>
            <Button onClick={savePin}><Plus className="w-4 h-4 mr-2" /> Tambah Pin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
