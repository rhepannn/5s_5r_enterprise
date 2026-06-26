import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface CertState {
  divisionName: string;
  category: string;
  rank: number;
  periodName: string;
  totalScore: number;
}

const RANK_LABEL: Record<number, string> = { 1: 'JUARA I', 2: 'JUARA II', 3: 'JUARA III' };

export default function CertificatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const company = useAuthStore((s) => s.user?.company);
  const state = location.state as CertState | null;

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Data sertifikat tidak ditemukan.</p>
        <Button onClick={() => navigate('/competition')}>Kembali ke Leaderboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } @page { size: landscape; margin: 0; } }`}</style>

      {/* Toolbar (tidak ikut tercetak) */}
      <div className="no-print max-w-4xl mx-auto mb-4 flex justify-between">
        <Button variant="outline" onClick={() => navigate('/competition')}><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button>
        <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Cetak / Simpan PDF</Button>
      </div>

      {/* Sertifikat */}
      <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none" style={{ aspectRatio: '1.414/1' }}>
        <div className="h-full m-3 border-4 border-double border-amber-500 flex flex-col items-center justify-center text-center px-12 py-8">
          <Award className="w-16 h-16 text-amber-500" />
          <p className="mt-3 text-sm tracking-[0.3em] text-gray-500">{company?.name || 'PERUSAHAAN'}</p>
          <h1 className="mt-2 text-4xl font-serif font-bold text-gray-800">SERTIFIKAT PENGHARGAAN</h1>
          <div className="w-24 h-1 bg-amber-500 my-4" />
          <p className="text-gray-600">Diberikan kepada</p>
          <h2 className="mt-2 text-3xl font-bold text-primary">{state.divisionName}</h2>
          <p className="mt-4 text-gray-600 max-w-lg">
            atas pencapaian sebagai <strong className="text-amber-600">{RANK_LABEL[state.rank] || `Peringkat ${state.rank}`}</strong> dalam
            Kompetisi 5S/5R Kategori <strong>{CATEGORY_LABELS[state.category] || state.category}</strong> periode <strong>{state.periodName}</strong>
          </p>
          <div className="mt-5 flex items-center gap-2">
            <span className="text-gray-500">dengan skor</span>
            <span className="text-4xl font-bold text-primary">{state.totalScore.toFixed(1)}</span>
            <span className="text-gray-500">/ 100</span>
          </div>

          <div className="mt-auto pt-8 flex justify-between w-full max-w-md text-sm text-gray-600">
            <div className="text-center">
              <div className="border-t border-gray-400 w-40 pt-1">Ketua Komite 5S</div>
            </div>
            <div className="text-center">
              <p className="mb-6">{formatDate(new Date())}</p>
              <div className="border-t border-gray-400 w-40 pt-1">Manajemen</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
