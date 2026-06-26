import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import CompaniesTab from './CompaniesTab';
import DivisionsTab from './DivisionsTab';
import ImportTab from './ImportTab';

export default function MasterDataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Master Data</h1>
        <p className="text-muted-foreground mt-1">
          Kelola hierarki organisasi: Perusahaan → Plant → Departemen → Divisi → Area Kerja
        </p>
      </div>

      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">Perusahaan</TabsTrigger>
          <TabsTrigger value="divisions">Divisi</TabsTrigger>
          <TabsTrigger value="import">Import Excel</TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <Card>
            <CardContent className="pt-6">
              <CompaniesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="divisions">
          <Card>
            <CardContent className="pt-6">
              <DivisionsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <ImportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
