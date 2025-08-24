"use client";

import * as React from 'react';
import * as XLSX from 'xlsx';
import { Download, ChevronsLeftRight } from 'lucide-react';

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
import { Button } from '@/components/ui/button';

export type StockReportData = {
  id: string;
  name: string;
  partNumber: string;
  stockIn: number;
  stockOut: number;
  adjustment: number;
  currentStock: number;
};

type StockReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: StockReportData[];
};

export function StockReportDialog({ open, onOpenChange, reportData }: StockReportDialogProps) {

  const handleExport = () => {
    const worksheetData = reportData.map(item => ({
      "Part Name": item.name,
      "Part Number": item.partNumber,
      "Stock In": item.stockIn,
      "Stock Out": item.stockOut,
      "Adjustment": item.adjustment,
      "Current Stock": item.currentStock,
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `stock-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
            <div className='flex justify-between items-start'>
                <div>
                    <DialogTitle>Stock Movement Report</DialogTitle>
                    <DialogDescription>
                        This report shows stock changes within the selected period.
                    </DialogDescription>
                </div>
                <Button onClick={handleExport} variant="outline" size="sm" disabled={reportData.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export to CSV
                </Button>
            </div>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Part</TableHead>
                  <TableHead className="text-center">Stock In</TableHead>
                  <TableHead className="text-center">Stock Out</TableHead>
                  <TableHead className="text-center">Adjustment</TableHead>
                  <TableHead className="text-center">Current Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length > 0 ? (
                  reportData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.partNumber}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className='text-green-600'>{item.stockIn > 0 ? `+${item.stockIn}` : item.stockIn}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className='text-red-600'>{item.stockOut > 0 ? `-${item.stockOut}`: item.stockOut}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={item.adjustment > 0 ? 'text-blue-600' : 'text-orange-600'}>
                            {item.adjustment > 0 ? `+${item.adjustment}` : (item.adjustment < 0 ? item.adjustment : "0")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.currentStock <= 10 ? "destructive" : "default"}>
                            {item.currentStock}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No stock movement in the selected period.
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
