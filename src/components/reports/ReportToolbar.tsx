import { Button } from '@/components/ui/button';
import { exportToCSV } from '@/utils/whatsappReportExport';
import { Download } from 'lucide-react';
import { ReactNode } from 'react';

interface ReportToolbarProps {
  filename: string;
  rowsForExport: any[];
  extra?: ReactNode;
}

export function ReportToolbar({ filename, rowsForExport, extra }: ReportToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">{extra}</div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToCSV(rowsForExport, filename)}
        disabled={!rowsForExport.length}
      >
        <Download className="mr-2 h-4 w-4" />
        Exportar CSV
      </Button>
    </div>
  );
}
