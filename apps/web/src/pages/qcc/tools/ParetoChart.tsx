import { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Item { label: string; value: number }
interface ParetoData { items: Item[] }

export default function ParetoChart({ value, onChange, editable }: { value?: ParetoData; onChange: (d: ParetoData) => void; editable: boolean }) {
  const [items, setItems] = useState<Item[]>(() => value?.items ?? []);
  const [form, setForm] = useState({ label: '', value: '' });
  useEffect(() => { setItems(value?.items ?? []); }, [value]);

  const update = (next: Item[]) => { setItems(next); onChange({ items: next }); };

  const chartData = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((a, i) => a + i.value, 0) || 1;
    let cum = 0;
    return sorted.map((i) => { cum += i.value; return { label: i.label, value: i.value, cumPct: Math.round((cum / total) * 100) }; });
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="border rounded-lg p-2 bg-white">
        {chartData.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">Tambah data untuk menampilkan Pareto</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="l" className="text-xs" />
              <YAxis yAxisId="r" orientation="right" domain={[0, 100]} className="text-xs" unit="%" />
              <Tooltip />
              <Bar yAxisId="l" dataKey="value" name="Jumlah" fill="#3b82f6" />
              <Line yAxisId="r" type="monotone" dataKey="cumPct" name="Kumulatif %" stroke="#ef4444" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      {editable && (
        <>
          <div className="flex gap-2">
            <Input placeholder="Kategori/penyebab" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            <Input type="number" placeholder="Frekuensi" className="w-32" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
            <button className="px-3 rounded bg-primary text-white" onClick={() => { if (form.label && form.value) { update([...items, { label: form.label, value: parseFloat(form.value) }]); setForm({ label: '', value: '' }); } }}><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1">
            {items.map((it, i) => (
              <span key={i} className="text-xs bg-muted rounded px-2 py-1 flex items-center gap-1">{it.label}: {it.value}
                <button onClick={() => update(items.filter((_, j) => j !== i))}><X className="w-3 h-3 text-red-500" /></button>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
