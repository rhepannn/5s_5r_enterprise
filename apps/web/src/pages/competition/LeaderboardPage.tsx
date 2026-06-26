import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, RefreshCw, Clock, Loader2, Zap, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { competitionService } from '@/services/competition.service';
import { auditService } from '@/services/audit.service';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import { cn, CATEGORY_LABELS } from '@/lib/utils';
import type { DivisionScoreEntry, DivisionCategory } from '@/types';

const CATEGORIES: DivisionCategory[] = ['PRODUKSI', 'KANTOR', 'GUDANG'];
const MEDALS = ['🥇', '🥈', '🥉'];

function Podium({ entries }: { entries: DivisionScoreEntry[] }) {
  const top3 = entries.slice(0, 3);
  if (top3.length === 0) return null;
  // urutan tampil: 2 - 1 - 3
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = (rank: number) => (rank === 1 ? 'h-28' : rank === 2 ? 'h-20' : 'h-16');
  return (
    <div className="flex items-end justify-center gap-3 py-6">
      {order.map((e) => (
        <div key={e.id} className="flex flex-col items-center w-28">
          <div className="text-2xl mb-1">{MEDALS[(e.rank ?? 1) - 1]}</div>
          <div className="text-sm font-semibold text-center truncate w-full" title={e.division?.name}>{e.division?.name}</div>
          <div className="text-2xl font-bold text-primary my-1">{e.totalScore.toFixed(1)}</div>
          <div className="text-[10px] text-muted-foreground mb-1" title="Proyeksi skor akhir periode">📈 proy. {e.projectedScore.toFixed(1)}</div>
          <div className={cn('w-full rounded-t-lg flex items-start justify-center pt-2 text-white font-bold',
            heights(e.rank ?? 1), e.rank === 1 ? 'bg-amber-400' : e.rank === 2 ? 'bg-slate-300' : 'bg-orange-300')}>
            #{e.rank}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_5S';
  const [periodId, setPeriodId] = useState<string>('');

  const { data: periods } = useQuery({ queryKey: ['periods'], queryFn: () => auditService.listPeriods() });
  const periodName = periods?.find((p) => p.id === periodId)?.name ?? '';

  const openCertificate = (e: DivisionScoreEntry) =>
    navigate('/certificate', {
      state: {
        divisionName: e.division?.name, category: e.rankCategory, rank: e.rank,
        periodName, totalScore: e.totalScore,
      },
    });

  // default ke periode pertama
  useEffect(() => {
    if (!periodId && periods && periods.length > 0) setPeriodId(periods[0].id);
  }, [periods, periodId]);

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', periodId],
    queryFn: () => competitionService.getLeaderboard(periodId),
    enabled: !!periodId,
  });

  const { data: countdown } = useQuery({
    queryKey: ['countdown', periodId],
    queryFn: () => competitionService.getCountdown(periodId),
    enabled: !!periodId,
  });

  // Realtime: dengarkan update leaderboard
  useEffect(() => {
    const socket = getSocket();
    const handler = (payload: { periodId: string }) => {
      if (payload.periodId === periodId) {
        queryClient.invalidateQueries({ queryKey: ['leaderboard', periodId] });
        toast({ title: 'Leaderboard diperbarui (realtime)', variant: 'default' });
      }
    };
    socket.on('leaderboard:update', handler);
    return () => { socket.off('leaderboard:update', handler); };
  }, [periodId, queryClient, toast]);

  const recomputeM = useMutation({
    mutationFn: () => competitionService.recompute(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', periodId] });
      toast({ title: 'Skor dihitung ulang', variant: 'success' });
    },
    onError: () => toast({ title: 'Gagal menghitung ulang', variant: 'destructive' }),
  });

  const byCategory = useMemo(() => {
    const map: Record<string, DivisionScoreEntry[]> = { PRODUKSI: [], KANTOR: [], GUDANG: [] };
    (leaderboard || []).forEach((e) => { (map[e.rankCategory] ||= []).push(e); });
    Object.values(map).forEach((arr) => arr.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)));
    return map;
  }, [leaderboard]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-500" /> Leaderboard Kompetisi</h1>
          <p className="text-muted-foreground mt-1">Peringkat divisi berdasarkan skor 5S (realtime)</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Pilih periode" /></SelectTrigger>
            <SelectContent>
              {periods?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button variant="outline" onClick={() => recomputeM.mutate()} disabled={recomputeM.isPending || !periodId}>
              {recomputeM.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Hitung Ulang
            </Button>
          )}
        </div>
      </div>

      {countdown && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-medium">{countdown.periodName}</span>
                <Badge variant={countdown.isEnded ? 'secondary' : 'warning'}>
                  {countdown.isEnded ? 'Periode berakhir' : `Sisa ${countdown.daysRemaining} hari`}
                </Badge>
              </div>
              <div className="flex-1 max-w-md">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${countdown.progressPercent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">{countdown.progressPercent}% periode berjalan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="PRODUKSI">
          <TabsList>
            {CATEGORIES.map((c) => <TabsTrigger key={c} value={c}>{CATEGORY_LABELS[c]}</TabsTrigger>)}
          </TabsList>
          {CATEGORIES.map((cat) => {
            const entries = byCategory[cat] || [];
            return (
              <TabsContent key={cat} value={cat}>
                <Card>
                  <CardHeader className="pb-0"><CardTitle className="text-base">🏆 Juara Kategori {CATEGORY_LABELS[cat]}</CardTitle></CardHeader>
                  <CardContent>
                    {entries.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Belum ada skor untuk kategori ini</p>
                    ) : (
                      <>
                        <Podium entries={entries} />
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Divisi</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Audit</TableHead>
                              <TableHead className="text-right">B/A</TableHead>
                              <TableHead className="text-right">Inovasi</TableHead>
                              <TableHead className="text-right">Konsist.</TableHead>
                              <TableHead className="text-right">Surprise</TableHead>
                              <TableHead className="text-right">Lingk.</TableHead>
                              <TableHead className="text-right">Bonus</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entries.map((e) => (
                              <TableRow key={e.id} className={e.rank === 1 ? 'bg-amber-50' : ''}>
                                <TableCell className="font-bold">{e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}</TableCell>
                                <TableCell className="font-medium">{e.division?.name}</TableCell>
                                <TableCell className="text-right font-bold text-primary whitespace-nowrap">
                                  {e.totalScore.toFixed(1)}
                                  {e.delta != null && e.delta !== 0 && (
                                    <span className={cn('ml-1 text-xs', e.delta > 0 ? 'text-green-600' : 'text-red-600')}>
                                      {e.delta > 0 ? '▲' : '▼'}{Math.abs(e.delta).toFixed(1)}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">{e.auditScore.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{e.beforeAfterScore.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{e.innovationBonus.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{e.consistencyScore.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  <span className="inline-flex items-center gap-0.5">{e.surpriseScore.toFixed(0)}</span>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">{e.environmentScore.toFixed(0)}</TableCell>
                                <TableCell className="text-right font-medium text-purple-600">{e.bonusPoints > 0 ? `+${e.bonusPoints.toFixed(0)}` : '—'}</TableCell>
                                <TableCell className="text-right">
                                  {(e.rank ?? 99) <= 3 && (
                                    <Button variant="ghost" size="sm" title="Sertifikat juara" onClick={() => openCertificate(e)}>
                                      <Award className="w-4 h-4 text-amber-500" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <p className="text-xs text-muted-foreground mt-3">
                          <Zap className="w-3 h-3 inline" /> Bobot: Audit 45% · B/A 18% · Inovasi 9% · Konsistensi 8% · Surprise 10% · Lingkungan 10%
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
