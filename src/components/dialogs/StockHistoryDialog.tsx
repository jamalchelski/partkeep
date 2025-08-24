"use client";

import * as React from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, Edit, Download } from 'lucide-react';

import type { Part, StockLog } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type StockHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: Part;
};

const getLogIcon = (type: StockLog['type']) => {
  switch (type) {
    case 'in':
      return <ArrowUp className="h-4 w-4 text-green-500" />;
    case 'out':
      return <ArrowDown className="h-4 w-4 text-red-500" />;
    case 'adjustment':
      return <Edit className="h-4 w-4 text-blue-500" />;
    default:
      return null;
  }
};

const getLogDescription = (log: StockLog) => {
    switch (log.type) {
      case 'in':
        return `Ditambahkan ${log.quantityChange} unit`;
      case 'out':
        return `Diambil ${Math.abs(log.quantityChange)} unit`;
      case 'adjustment':
        return `Penyesuaian stok ${log.quantityChange > 0 ? '+' : ''}${log.quantityChange} unit`;
      default:
        return "Aktivitas tidak diketahui";
    }
}

export function StockHistoryDialog({ open, onOpenChange, part }: StockHistoryDialogProps) {
  const sortedHistory = React.useMemo(() => {
    return [...(part.stockHistory || [])].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [part.stockHistory]);

  const handleExport = () => {
    if (!part || sortedHistory.length === 0) {
        return;
    }

    const exportData = sortedHistory.map(log => ({
        "Date": format(log.date, "yyyy-MM-dd HH:mm:ss"),
        "Type": log.type,
        "Change": log.quantityChange
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const filename = `stock-history-${part.partNumber}-${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>Riwayat Stok: {part.name}</DialogTitle>
              <DialogDescription>
                Menampilkan semua riwayat keluar masuk untuk {part.partNumber}.
              </DialogDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm" disabled={sortedHistory.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Tanggal & Waktu</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHistory.length > 0 ? (
                  sortedHistory.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {format(log.date, "d MMMM yyyy, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          {getLogIcon(log.type)}
                          <span className='capitalize'>{log.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className={cn("text-right font-mono", {
                        'text-green-600': log.quantityChange > 0,
                        'text-red-600': log.quantityChange < 0,
                      })}>
                        {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      Belum ada riwayat stok untuk part ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
