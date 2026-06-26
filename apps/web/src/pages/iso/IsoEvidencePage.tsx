import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isoService } from '@/services/iso.service';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/lib/utils';

export default function IsoEvidencePage() {
  const { standard } = useParams<{ standard: string }>();
  const navigate = useNavigate();
  const company = useAuthStore((s) => s.user?.company);
  const { data, isLoading } = useQuery({ queryKey: ['iso-evidence', standard], queryFn: () => isoService.getEvidence(standard!), enabled: !!standard });

  if (isLoading || !data) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="no-print max-w-4xl mx-auto mb-4 flex justify-between">
        <Button variant="outline" onClick={() => navigate('/iso')}><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button>
        <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Cetak / Simpan PDF</Button>
      </div>

      <div className="max-w-4xl mx-auto bg-white shadow p-8 print:shadow-none">
        <div className="text-center border-b pb-4 mb-6">
          <ShieldCheck className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold mt-2">Evidence Package — {String(standard).replace('_', ' ')}</h1>
          <p className="text-muted-foreground text-sm">{company?.name} · Dibuat {formatDate(data.generatedAt)}</p>
        </div>

        <div className="space-y-6">
          {data.clauses.map((c) => (
            <div key={c.clause} className="break-inside-avoid">
              <h2 className="font-bold text-lg bg-primary/10 px-3 py-1.5 rounded">Klausul {c.clause} — {c.title}</h2>
              {c.improvements.length === 0 && c.auditItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic px-3 py-2">Belum ada bukti untuk klausul ini.</p>
              ) : (
                <div className="px-3 py-2 space-y-3">
                  {c.improvements.map((im, i) => (
                    <div key={i} className="text-sm border-l-2 border-green-400 pl-3">
                      <p className="font-medium">{im.code} · {im.division.name} <span className="text-xs text-muted-foreground">({im.status})</span></p>
                      <p className="text-muted-foreground">{im.description}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {im.photoBefore.map((u, j) => <img key={`b${j}`} src={u} alt="before" className="w-16 h-16 object-cover rounded border" />)}
                        {im.photoAfter.map((u, j) => <img key={`a${j}`} src={u} alt="after" className="w-16 h-16 object-cover rounded border" />)}
                      </div>
                    </div>
                  ))}
                  {c.auditItems.map((it, i) => (
                    <div key={`it${i}`} className="text-sm border-l-2 border-blue-400 pl-3">
                      <p>{it.question} — <strong>skor {it.score ?? '-'}</strong> <span className="text-xs text-muted-foreground">({it.session.area.name})</span></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
