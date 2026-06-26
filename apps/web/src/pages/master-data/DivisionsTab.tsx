import { useQuery } from '@tanstack/react-query';
import { Loader2, Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { divisionsService } from '@/services/organizations.service';
import { useAuthStore } from '@/stores/authStore';
import { CATEGORY_LABELS } from '@/lib/utils';

const CATEGORY_VARIANT: Record<string, 'default' | 'secondary' | 'warning'> = {
  PRODUKSI: 'default',
  KANTOR: 'secondary',
  GUDANG: 'warning',
};

export default function DivisionsTab() {
  const user = useAuthStore((s) => s.user);

  const { data: divisions, isLoading } = useQuery({
    queryKey: ['divisions', user?.companyId],
    queryFn: () => divisionsService.listByCompany(user!.companyId),
    enabled: !!user?.companyId,
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama Divisi</TableHead>
          <TableHead>Kode</TableHead>
          <TableHead>Kategori</TableHead>
          <TableHead>Departemen</TableHead>
          <TableHead>Plant</TableHead>
          <TableHead>Area Kerja</TableHead>
          <TableHead>Anggota</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {divisions?.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Belum ada divisi. Import via Excel atau tambah manual.
            </TableCell>
          </TableRow>
        ) : (
          divisions?.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell className="font-mono text-sm">{d.code}</TableCell>
              <TableCell>
                <Badge variant={CATEGORY_VARIANT[d.category] || 'secondary'}>
                  {CATEGORY_LABELS[d.category]}
                </Badge>
              </TableCell>
              <TableCell>{d.department?.name || '—'}</TableCell>
              <TableCell className="text-muted-foreground">{d.department?.plant?.name || '—'}</TableCell>
              <TableCell>{d._count?.areas ?? 0}</TableCell>
              <TableCell>{d._count?.users ?? 0}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
