import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Category { name: string; causes: string[] }
interface FishboneData { problem: string; categories: Category[] }

const DEFAULT_CATS = ['Manusia', 'Mesin', 'Metode', 'Material', 'Pengukuran', 'Lingkungan'];

function initData(value?: FishboneData): FishboneData {
  if (value?.categories?.length) return value;
  return { problem: '', categories: DEFAULT_CATS.map((name) => ({ name, causes: [] })) };
}

export default function Fishbone({ value, onChange, editable }: { value?: FishboneData; onChange: (d: FishboneData) => void; editable: boolean }) {
  const [data, setData] = useState<FishboneData>(() => initData(value));
  useEffect(() => { setData(initData(value)); }, [value]);

  const update = (d: FishboneData) => { setData(d); onChange(d); };
  const addCause = (ci: number, text: string) => {
    if (!text.trim()) return;
    const cats = data.categories.map((c, i) => i === ci ? { ...c, causes: [...c.causes, text.trim()] } : c);
    update({ ...data, categories: cats });
  };
  const removeCause = (ci: number, xi: number) => {
    const cats = data.categories.map((c, i) => i === ci ? { ...c, causes: c.causes.filter((_, j) => j !== xi) } : c);
    update({ ...data, categories: cats });
  };

  return (
    <div className="space-y-4">
      {/* Diagram SVG */}
      <div className="border rounded-lg p-2 overflow-x-auto bg-white">
        <svg viewBox="0 0 760 320" className="w-full min-w-[700px]" style={{ height: 300 }}>
          <line x1="20" y1="160" x2="620" y2="160" stroke="#334155" strokeWidth="3" />
          <polygon points="620,150 645,160 620,170" fill="#334155" />
          <rect x="645" y="135" width="105" height="50" rx="6" fill="#1e40af" />
          <text x="697" y="158" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">MASALAH</text>
          <text x="697" y="174" textAnchor="middle" fill="#fff" fontSize="9">{(data.problem || '—').slice(0, 16)}</text>
          {data.categories.map((cat, i) => {
            const top = i < 3;
            const x = 120 + (i % 3) * 165;
            const y1 = top ? 160 : 160;
            const y2 = top ? 60 : 260;
            const lx = top ? x + 70 : x + 70;
            const ly = top ? 52 : 276;
            return (
              <g key={i}>
                <line x1={x} y1={y1} x2={x + 70} y2={y2} stroke="#64748b" strokeWidth="2" />
                <rect x={lx - 38} y={ly - 14} width="76" height="18" rx="4" fill="#e0e7ff" />
                <text x={lx} y={ly - 1} textAnchor="middle" fontSize="10" fontWeight="600" fill="#3730a3">{cat.name}</text>
                {cat.causes.slice(0, 3).map((c, j) => (
                  <text key={j} x={x + 76} y={(top ? 80 : 200) + j * 16 * (top ? 1 : 1) + (top ? 0 : 0)} fontSize="8" fill="#475569">• {c.slice(0, 18)}</text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {editable && (
        <Input placeholder="Pernyataan masalah utama..." value={data.problem} onChange={(e) => update({ ...data, problem: e.target.value })} />
      )}

      {/* Editor kategori */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {data.categories.map((cat, ci) => (
          <div key={ci} className="border rounded-lg p-3">
            <p className="font-medium text-sm mb-2">{cat.name}</p>
            <ul className="space-y-1 mb-2">
              {cat.causes.map((c, xi) => (
                <li key={xi} className="text-xs flex items-center justify-between gap-1 bg-muted rounded px-2 py-1">
                  <span>{c}</span>
                  {editable && <button onClick={() => removeCause(ci, xi)}><X className="w-3 h-3 text-red-500" /></button>}
                </li>
              ))}
            </ul>
            {editable && (
              <CauseInput onAdd={(t) => addCause(ci, t)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CauseInput({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div className="flex gap-1">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="Tambah penyebab..." className="h-7 text-xs"
        onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(v); setV(''); } }} />
      <button onClick={() => { onAdd(v); setV(''); }} className="px-2 rounded bg-primary text-white"><Plus className="w-3 h-3" /></button>
    </div>
  );
}
