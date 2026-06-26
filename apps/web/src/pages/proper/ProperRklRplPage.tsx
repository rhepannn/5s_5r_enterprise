import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, Loader2, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { properService } from '@/services/proper.service';
import { formatDate } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = { COMPLIANT: 'Taat', PARTIAL: 'Sebagian', NON_COMPLIANT: 'Tidak Taat', NA: 'N/A' };

export default function ProperRklRplPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['rkl-rpl'], queryFn: () => properService.getRklRpl() });

  if (isLoading || !data) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="no-print max-w-4xl mx-auto mb-4 flex justify-between">
        <Button variant="outline" onClick={() => navigate('/proper')}><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button>
        <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Cetak / Simpan PDF</Button>
      </div>

      <div className="max-w-4xl mx-auto bg-white shadow p-8 print:shadow-none">
        <div className="text-center border-b pb-4 mb-6">
          <Leaf className="w-10 h-10 text-green-600 mx-auto" />
          <h1 className="text-2xl font-bold mt-2">Laporan RKL-RPL</h1>
          <p className="text-muted-foreground text-sm">{data.company} · Periode {data.period} · Dibuat {formatDate(data.generatedAt)}</p>
        </div>

        <section className="mb-6">
          <h2 className="font-bold text-lg mb-2">1. Status Ketaatan Lingkungan</h2>
          <table className="w-full text-sm border">
            <thead><tr className="bg-muted text-left"><th className="p-2 border">Kriteria</th><th className="p-2 border w-32">Status</th></tr></thead>
            <tbody>
              {data.compliance.map((c) => (
                <tr key={c.code}><td className="p-2 border">{c.name}</td><td className="p-2 border">{STATUS_LABEL[c.status] || c.status}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-lg mb-2">2. Neraca Lingkungan</h2>
          {data.balances.length === 0 ? <p className="text-sm text-muted-foreground italic">Belum ada data neraca.</p> : (
            <table className="w-full text-sm border">
              <thead><tr className="bg-muted text-left"><th className="p-2 border">Periode</th><th className="p-2 border">Jenis</th><th className="p-2 border">Data</th></tr></thead>
              <tbody>
                {data.balances.map((b) => (
                  <tr key={b.id}><td className="p-2 border">{b.period}</td><td className="p-2 border">{b.type}</td>
                    <td className="p-2 border">{Object.entries(b.data).filter(([k]) => k !== 'unit').map(([k, v]) => `${k}: ${v}`).join(', ')} {String(b.data.unit || '')}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">3. Izin Lingkungan</h2>
          <table className="w-full text-sm border">
            <thead><tr className="bg-muted text-left"><th className="p-2 border">Nama</th><th className="p-2 border">Nomor</th><th className="p-2 border">Kadaluarsa</th><th className="p-2 border">Status</th></tr></thead>
            <tbody>
              {data.permits.map((p) => (
                <tr key={p.id}><td className="p-2 border">{p.name}</td><td className="p-2 border">{p.number}</td><td className="p-2 border">{formatDate(p.expiryDate)}</td><td className="p-2 border">{p.status}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
