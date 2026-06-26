import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ControlData { values: number[] }

export default function ControlChart({ value, onChange, editable }: { value?: ControlData; onChange: (d: ControlData) => void; editable: boolean }) {
  const [values, setValues] = useState<number[]>(() => value?.values ?? []);
  const [input, setInput] = useState('');
  useEffect(() => { setValues(value?.values ?? []); }, [value]);

  const update = (next: number[]) => { setValues(next); onChange({ values: next }); };

  const { data, mean, ucl, lcl } = useMemo(() => {
    if (values.length === 0) return { data: [], mean: 0, ucl: 0, lcl: 0 };
    const m = values.reduce((a, b) => a + b, 0) / values.length;
    const sd = Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
    return {
      data: values.map((v, i) => ({ n: i + 1, value: v })),
      mean: Math.round(m * 10) / 10,
      ucl: Math.round((m + 3 * sd) * 10) / 10,
      lcl: Math.round((m - 3 * sd) * 10) / 10,
    };
  }, [values]);

  return (
    <div className="space-y-3">
      <div className="border rounded-lg p-2 bg-white">
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">Tambah sampel untuk menampilkan Control Chart</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="n" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <ReferenceLine y={ucl} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `UCL ${ucl}`, fontSize: 10, fill: '#ef4444' }} />
              <ReferenceLine y={mean} stroke="#16a34a" label={{ value: `x̄ ${mean}`, fontSize: 10, fill: '#16a34a' }} />
              <ReferenceLine y={lcl} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `LCL ${lcl}`, fontSize: 10, fill: '#ef4444' }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {editable && (
        <>
          <div className="flex gap-2">
            <Input type="number" placeholder="Nilai sampel" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && input) { update([...values, parseFloat(input)]); setInput(''); } }} />
            <button className="px-3 rounded bg-primary text-white" onClick={() => { if (input) { update([...values, parseFloat(input)]); setInput(''); } }}><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1">
            {values.map((v, i) => (
              <span key={i} className="text-xs bg-muted rounded px-2 py-1 flex items-center gap-1">{v}
                <button onClick={() => update(values.filter((_, j) => j !== i))}><X className="w-3 h-3 text-red-500" /></button>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
