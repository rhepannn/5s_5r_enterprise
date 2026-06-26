import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, FileDown, AlertTriangle, Gauge, Loader2, CheckCircle2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { isoService } from '@/services/iso.service';
import { cn } from '@/lib/utils';
import type { IsoStandard } from '@/types';

const STANDARDS: { key: IsoStandard; label: string }[] = [
  { key: 'ISO_9001', label: 'ISO 9001 · Mutu' },
  { key: 'ISO_14001', label: 'ISO 14001 · Lingkungan' },
  { key: 'ISO_45001', label: 'ISO 45001 · K3' },
];

const LEVEL_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  'Siap': 'success', 'Cukup Siap': 'warning', 'Belum Siap': 'destructive',
};

function CoverageBar({ value }: { value: number }) {
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden w-full">
      <div className={cn('h-full rounded-full', value >= 85 ? 'bg-green-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${value}%` }} />
    </div>
  );
}

function ComplianceTab({ standard }: { standard: IsoStandard }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['iso-compliance', standard], queryFn: () => isoService.getCompliance(standard) });
  if (isLoading || !data) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between mb-1 text-sm">
            <span className="font-medium">Coverage klausul</span>
            <span className="font-bold">{data.coverage}% ({data.covered}/{data.total})</span>
          </div>
          <CoverageBar value={data.coverage} />
        </div>
        <Button variant="outline" onClick={() => navigate(`/iso/evidence/${standard}`)}>
          <FileDown className="w-4 h-4 mr-2" /> Export Evidence Package
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Klausul</TableHead>
            <TableHead>Judul</TableHead>
            <TableHead className="text-center">Perbaikan</TableHead>
            <TableHead className="text-center">Item Audit</TableHead>
            <TableHead className="text-center">Bukti</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.clauses.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-sm">{c.code}</TableCell>
              <TableCell><p className="font-medium">{c.title}</p><p className="text-xs text-muted-foreground">{c.description}</p></TableCell>
              <TableCell className="text-center">{c.improvements}</TableCell>
              <TableCell className="text-center">{c.auditItems}</TableCell>
              <TableCell className="text-center font-semibold">{c.evidenceCount}</TableCell>
              <TableCell className="text-center">
                {c.covered ? <CheckCircle2 className="w-5 h-5 text-green-600 inline" /> : <XCircle className="w-5 h-5 text-red-400 inline" />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function IsoPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<IsoStandard>('ISO_9001');
  const { data: readiness } = useQuery({ queryKey: ['iso-readiness'], queryFn: () => isoService.getReadiness() });
  const { data: nc } = useQuery({ queryKey: ['iso-nc'], queryFn: () => isoService.getPotentialNC() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> Integrasi ISO</h1>
        <p className="text-muted-foreground mt-1">Compliance, kesiapan audit, & evidence ISO 9001 / 14001 / 45001</p>
      </div>

      {/* Readiness + NC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Gauge className="w-5 h-5" /> Kesiapan Audit ISO</CardTitle></CardHeader>
          <CardContent>
            {readiness ? (
              <div className="flex items-center gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">{readiness.readinessScore}</p>
                  <Badge variant={LEVEL_VARIANT[readiness.level] || 'warning'} className="mt-1">{readiness.level}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">Skor 5S {readiness.companyAvg} · Coverage {readiness.avgCoverage}%</p>
                </div>
                <div className="flex-1 min-w-[200px] space-y-2">
                  {readiness.coverages.map((c) => (
                    <div key={c.standard}>
                      <div className="flex justify-between text-xs mb-0.5"><span>{c.standard.replace('_', ' ')}</span><span>{c.coverage}%</span></div>
                      <CoverageBar value={c.coverage} />
                    </div>
                  ))}
                </div>
              </div>
            ) : <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Potensi Non-Conformance</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-amber-600">{nc?.count ?? 0}</p>
            <p className="text-sm text-muted-foreground mb-2">item perlu perhatian</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {nc?.lowScoreItems.slice(0, 3).map((i) => (
                <p key={i.id} className="text-xs text-red-700">⚠️ {i.clause}: {i.area} (skor {i.score})</p>
              ))}
              {nc?.problematicImprovements.slice(0, 3).map((i) => (
                <p key={i.id} className="text-xs text-red-700">⚠️ {i.code}: {i.status}</p>
              ))}
              {nc && nc.count === 0 && <p className="text-xs text-green-600">✓ Tidak ada potensi NC</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance per standar */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Status Compliance per Standar</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as IsoStandard)}>
            <TabsList>{STANDARDS.map((s) => <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>)}</TabsList>
            {STANDARDS.map((s) => <TabsContent key={s.key} value={s.key}><ComplianceTab standard={s.key} /></TabsContent>)}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
