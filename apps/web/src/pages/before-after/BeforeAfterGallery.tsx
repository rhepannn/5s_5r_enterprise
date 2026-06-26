import { useQuery } from '@tanstack/react-query';
import { Loader2, ImageOff, Leaf } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { improvementService } from '@/services';
import { IMPROVEMENT_STATUS_LABELS, IMPROVEMENT_STATUS_VARIANT } from '@/lib/utils';

export default function BeforeAfterGallery() {
  const { data: improvements, isLoading } = useQuery({
    queryKey: ['improvements', 'all'],
    queryFn: () => improvementService.list(),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const withPhotos = (improvements || []).filter((i) => i.photoBefore.length > 0 || i.photoAfter.length > 0);

  if (withPhotos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center text-muted-foreground">
          <ImageOff className="w-10 h-10 mx-auto mb-3 opacity-50" />
          Belum ada perbaikan dengan foto. Upload foto Before/After di halaman detail perbaikan.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {withPhotos.map((imp) => (
        <Card key={imp.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{imp.code}</p>
                <p className="font-medium text-sm">{imp.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{imp.division?.name}</p>
              </div>
              <Badge variant={IMPROVEMENT_STATUS_VARIANT[imp.status]}>{IMPROVEMENT_STATUS_LABELS[imp.status]}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium text-red-600 mb-1">SEBELUM</p>
                {imp.photoBefore[0] ? (
                  <a href={imp.photoBefore[0]} target="_blank" rel="noreferrer">
                    <img src={imp.photoBefore[0]} alt="Before" className="w-full h-36 object-cover rounded border" />
                  </a>
                ) : <div className="w-full h-36 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">Belum ada</div>}
              </div>
              <div>
                <p className="text-xs font-medium text-green-600 mb-1">SESUDAH</p>
                {imp.photoAfter[0] ? (
                  <a href={imp.photoAfter[0]} target="_blank" rel="noreferrer">
                    <img src={imp.photoAfter[0]} alt="After" className="w-full h-36 object-cover rounded border" />
                  </a>
                ) : <div className="w-full h-36 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">Belum ada</div>}
              </div>
            </div>
            {imp.isProperEvidence && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><Leaf className="w-3 h-3" /> Bukti PROPER (lingkungan)</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
