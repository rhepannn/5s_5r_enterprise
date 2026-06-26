import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Star, Sparkles, BookOpen, Award, Lightbulb, RefreshCw, Loader2, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { gamificationService } from '@/services/gamification.service';
import { useAuthStore } from '@/stores/authStore';
import { cn, CATEGORY_LABELS, PROBLEM_CATEGORY_LABELS, ROLE_LABELS } from '@/lib/utils';

const PRIO: Record<string, 'destructive' | 'warning' | 'secondary'> = { tinggi: 'destructive', sedang: 'warning', rendah: 'secondary' };

export default function GamificationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_5S';
  const canViewSuggest = isAdmin || user?.role === 'KEPALA_DIVISI';

  const { data: myBadges } = useQuery({ queryKey: ['my-badges'], queryFn: () => gamificationService.getMyBadges() });
  const { data: allBadges } = useQuery({ queryKey: ['all-badges'], queryFn: () => gamificationService.listBadges() });
  const { data: wof } = useQuery({ queryKey: ['wall-of-fame'], queryFn: () => gamificationService.getWallOfFame() });
  const { data: bestPractices } = useQuery({ queryKey: ['best-practices'], queryFn: () => gamificationService.listBestPractices() });
  const { data: award } = useQuery({ queryKey: ['annual-award'], queryFn: () => gamificationService.getAnnualAward() });
  const { data: suggestions } = useQuery({ queryKey: ['suggestions'], queryFn: () => gamificationService.getSuggestions(), enabled: canViewSuggest });

  const computeM = useMutation({ mutationFn: () => gamificationService.computeBadges(), onSuccess: (r) => { queryClient.invalidateQueries({ queryKey: ['my-badges'] }); queryClient.invalidateQueries({ queryKey: ['all-badges'] }); toast({ title: `${r.awarded} badge baru diberikan`, variant: 'success' }); } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-amber-500" /> Gamifikasi</h1>
          <p className="text-muted-foreground mt-1">Badge, Wall of Fame, best practice & penghargaan</p>
        </div>
        {isAdmin && <Button variant="outline" onClick={() => computeM.mutate()} disabled={computeM.isPending}>{computeM.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Hitung Badge</Button>}
      </div>

      <Tabs defaultValue="badge">
        <TabsList>
          <TabsTrigger value="badge">Badge</TabsTrigger>
          <TabsTrigger value="wof">Wall of Fame</TabsTrigger>
          <TabsTrigger value="bp">Best Practice</TabsTrigger>
          <TabsTrigger value="award">Annual Award</TabsTrigger>
          {canViewSuggest && <TabsTrigger value="sug">Saran</TabsTrigger>}
        </TabsList>

        {/* Badge */}
        <TabsContent value="badge" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Koleksi Badge Saya</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {myBadges?.map((b) => (
                  <div key={b.code} className={cn('text-center p-3 rounded-lg border', b.earned ? 'bg-amber-50 border-amber-200' : 'opacity-40 grayscale')}>
                    <div className="text-3xl">{b.icon}</div>
                    <p className="text-xs font-semibold mt-1">{b.name}</p>
                    <p className="text-[10px] text-muted-foreground">{b.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Badge Diraih Tim ({allBadges?.length ?? 0})</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {allBadges?.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Belum ada badge. Klik "Hitung Badge".</p> :
                allBadges?.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
                    <span className="text-xl">{b.badge.icon}</span>
                    <span className="font-medium">{b.userName}</span>
                    <span className="text-muted-foreground">({ROLE_LABELS[b.role]})</span>
                    <Badge variant="secondary" className="ml-auto">{b.badge.name}</Badge>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wall of Fame */}
        <TabsContent value="wof" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Divisi Juara {wof?.period && `· ${wof.period}`}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {wof?.champions.map((c, i) => (
                  <div key={i} className="text-center p-4 rounded-lg bg-gradient-to-b from-amber-50 to-white border border-amber-200">
                    <Medal className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="font-bold mt-1">{c.division}</p>
                    <p className="text-xs text-muted-foreground">Kategori {CATEGORY_LABELS[c.category] || c.category}</p>
                    <p className="text-2xl font-bold text-primary mt-1">{c.score.toFixed(1)}</p>
                  </div>
                ))}
                {wof?.champions.length === 0 && <p className="text-sm text-muted-foreground col-span-3 text-center py-4">Belum ada juara.</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /> Galeri Foto Perbaikan Terbaik</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wof?.bestPhotos.map((p) => (
                  <div key={p.id} className="border rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">{p.code} · {p.division.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><p className="text-xs text-red-600 mb-1">Before</p>{p.photoBefore[0] ? <img src={p.photoBefore[0]} alt="" className="w-full h-28 object-cover rounded" /> : <div className="h-28 bg-muted rounded" />}</div>
                      <div><p className="text-xs text-green-600 mb-1">After</p>{p.photoAfter[0] ? <img src={p.photoAfter[0]} alt="" className="w-full h-28 object-cover rounded" /> : <div className="h-28 bg-muted rounded" />}</div>
                    </div>
                  </div>
                ))}
                {wof?.bestPhotos.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-4">Belum ada foto.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Best Practice */}
        <TabsContent value="bp">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-5 h-5" /> Best Practice Library</CardTitle></CardHeader>
            <CardContent>
              {bestPractices?.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Belum ada best practice. Tandai perbaikan terbaik di modul Before/After.</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bestPractices?.map((bp) => (
                    <div key={bp.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between"><p className="font-medium text-sm">{bp.code}</p><Badge variant="secondary">{PROBLEM_CATEGORY_LABELS[bp.problemCategory]}</Badge></div>
                      <p className="text-sm mt-1">{bp.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Solusi: {bp.actions}</p>
                      <p className="text-xs text-muted-foreground">{bp.division.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Annual Award */}
        <TabsContent value="award">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" /> Annual 5S Award {award?.year} {award?.period && `(${award.period})`}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {award?.winners.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Belum ada pemenang.</p> :
                award?.winners.map((w, i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉'}</span>
                      <span className="font-medium">{w.division}</span>
                      <Badge variant="outline">{CATEGORY_LABELS[w.category] || w.category}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">{w.score.toFixed(1)}</span>
                      <Button size="sm" variant="ghost" onClick={() => navigate('/certificate', { state: { divisionName: w.division, category: w.category, rank: w.rank, periodName: award.period, totalScore: w.score } })}><Award className="w-4 h-4 text-amber-500" /></Button>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suggestions */}
        {canViewSuggest && (
          <TabsContent value="sug">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-500" /> Smart Suggestions <span className="text-xs font-normal text-muted-foreground">(rule-based)</span></CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {suggestions?.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Badge variant={PRIO[s.priority]} className="mt-0.5 capitalize">{s.priority}</Badge>
                    <div><p className="font-medium text-sm">{s.title}</p><p className="text-xs text-muted-foreground">{s.detail}</p></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
