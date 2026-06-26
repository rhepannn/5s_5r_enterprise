import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase?: string;
}

export default function PlaceholderPage({ title, description, phase = 'Fase 2' }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-2xl mb-4">
            <Construction className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Modul Dalam Pengembangan</h3>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            Modul <strong>{title}</strong> dijadwalkan untuk <strong>{phase}</strong>.
            Fondasi sistem (auth, RBAC, master data) sudah siap untuk mendukung fitur ini.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
