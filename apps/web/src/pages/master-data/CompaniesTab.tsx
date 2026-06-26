import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { companiesService } from '@/services/organizations.service';
import type { Company } from '@/types';

const companySchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  code: z.string().min(2, 'Kode minimal 2 karakter'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
});

type CompanyForm = z.infer<typeof companySchema>;

export default function CompaniesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: companiesService.list,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
  });

  const saveMutation = useMutation({
    mutationFn: (input: CompanyForm) =>
      editing
        ? companiesService.update(editing.id, input)
        : companiesService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({ title: `Perusahaan berhasil ${editing ? 'diperbarui' : 'dibuat'}`, variant: 'success' });
      setDialogOpen(false);
      setEditing(null);
      reset();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan';
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
    },
  });

  const openCreate = () => { setEditing(null); reset({ name: '', code: '', address: '', phone: '', email: '' }); setDialogOpen(true); };
  const openEdit = (c: Company) => {
    setEditing(c);
    reset({ name: c.name, code: c.code, address: c.address, phone: c.phone, email: c.email });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Perusahaan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Perusahaan</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Plant</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Belum ada perusahaan
                </TableCell>
              </TableRow>
            ) : (
              companies?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-sm">{c.code}</TableCell>
                  <TableCell>{c._count?.plants ?? 0}</TableCell>
                  <TableCell>{c._count?.users ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Perusahaan' : 'Tambah Perusahaan'}</DialogTitle>
            <DialogDescription>Data perusahaan induk dalam hierarki organisasi</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Perusahaan</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Kode Perusahaan</Label>
              <Input id="code" placeholder="PT-MAJU" {...register('code')} />
              {errors.code && <p className="text-destructive text-xs">{errors.code.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Input id="address" {...register('address')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
