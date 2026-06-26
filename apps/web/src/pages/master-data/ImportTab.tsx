import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import api from '@/lib/api';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

type ImportType = 'divisions' | 'work-areas' | 'users';

const IMPORT_OPTIONS: { type: ImportType; label: string; description: string }[] = [
  { type: 'divisions', label: 'Divisi', description: 'Import data divisi (butuh departemen sudah ada)' },
  { type: 'work-areas', label: 'Area Kerja', description: 'Import area kerja (butuh divisi sudah ada)' },
  { type: 'users', label: 'Pengguna', description: 'Import akun pengguna massal' },
];

export default function ImportTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<ImportType | null>(null);
  const [result, setResult] = useState<{ type: ImportType; data: ImportResult } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingType = useRef<ImportType | null>(null);

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template-import-5s.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Gagal mengunduh template', variant: 'destructive' });
    }
  };

  const triggerUpload = (type: ImportType) => {
    pendingType.current = type;
    fileInputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = pendingType.current;
    if (!file || !type) return;

    setUploading(type);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/import/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data: ImportResult = res.data.data;
      setResult({ type, data });
      toast({
        title: 'Import selesai',
        description: `${data.success} berhasil, ${data.failed} gagal`,
        variant: data.failed > 0 ? 'default' : 'success',
      });
      queryClient.invalidateQueries();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Import gagal';
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        className="hidden"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" /> Template Excel
          </CardTitle>
          <CardDescription>
            Unduh template, isi data sesuai format, lalu upload kembali. Satu file berisi 3 sheet: Users, Divisions, WorkAreas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" /> Unduh Template
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {IMPORT_OPTIONS.map((opt) => (
          <Card key={opt.type}>
            <CardHeader>
              <CardTitle className="text-base">{opt.label}</CardTitle>
              <CardDescription className="text-xs">{opt.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => triggerUpload(opt.type)}
                disabled={uploading !== null}
              >
                {uploading === opt.type ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengupload...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Upload Excel</>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hasil Import: {result.type}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm"><strong>{result.data.success}</strong> berhasil</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm"><strong>{result.data.failed}</strong> gagal</span>
              </div>
            </div>

            {result.data.errors.length > 0 && (
              <div className="border rounded-lg p-3 bg-red-50 max-h-48 overflow-y-auto">
                <p className="text-sm font-medium text-red-900 mb-2">Detail Error:</p>
                <ul className="space-y-1 text-xs text-red-700">
                  {result.data.errors.map((e, i) => (
                    <li key={i}>Baris {e.row}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
