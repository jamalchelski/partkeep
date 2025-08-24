"use client";

import * as React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Wrench, Plus, Search, Filter, MoreHorizontal, Pencil, ArrowLeftRight, FileText, Upload, Download, AlertTriangle, Layers, BarChart2, Tag, LogOut, ArrowUp, ArrowDown, History } from "lucide-react";
import * as XLSX from 'xlsx';
import { onSnapshot, collection } from "firebase/firestore";
import type { User } from "firebase/auth";
import { format } from 'date-fns';

import type { Part, StockLog } from "@/lib/types";
import { addPart, updatePart, updatePartStock } from "@/lib/firestore";
import { db } from "@/lib/firebase";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


import { AddEditPartDialog } from "@/components/dialogs/AddEditPartDialog";
import { UpdateStockDialog } from "@/components/dialogs/UpdateStockDialog";
import { StockReportDialog, StockReportData } from "@/components/dialogs/StockReportDialog";
import { DateRangePickerDialog } from "@/components/dialogs/DateRangePickerDialog";
import { StockOpnameDialog } from "@/components/dialogs/StockOpnameDialog";
import { StockHistoryDialog } from "@/components/dialogs/StockHistoryDialog";
import { Timestamp } from "firebase/firestore";

type DialogState = {
  type: 'add' | 'edit' | 'stockIn' | 'stockOut' | 'report' | 'viewReport' | 'opname' | 'history' | null;
  part: Part | null;
  reportData?: StockReportData[];
};

type PartKeepProps = {
  user: User;
  onLogout: () => void;
};

const convertTimestamps = (data: any) => {
    const convertedData = { ...data };
    for (const key in convertedData) {
      if (convertedData[key] instanceof Timestamp) {
        convertedData[key] = convertedData[key].toDate();
      }
      if (key === 'stockHistory' && Array.isArray(convertedData[key])) {
         convertedData[key] = convertedData[key].map(log => {
            const date = log.date instanceof Timestamp ? log.date.toDate() : new Date(log.date);
            return {...log, date };
         })
      }
    }
    return convertedData;
};


export function PartKeep({ user, onLogout }: PartKeepProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ supplier: "all", location: "all", category: "all" });
  const [dialog, setDialog] = useState<DialogState>({ type: null, part: null });
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "parts"), (snapshot) => {
        const partsData = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Part);
        setParts(partsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching parts: ", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not fetch parts from the database." });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);


  const suppliers = useMemo(() => ["all", ...new Set(parts.map((p) => p.supplier).filter(Boolean))], [parts]);
  const locations = useMemo(() => ["all", ...new Set(parts.map((p) => p.location).filter(Boolean))], [parts]);
  const categories = useMemo(() => ["all", ...new Set(parts.map((p) => p.category).filter(Boolean))], [parts]);


  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const searchMatch =
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (part.description && part.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const supplierMatch = filters.supplier === "all" || part.supplier === filters.supplier;
      const locationMatch = filters.location === "all" || part.location === filters.location;
      const categoryMatch = filters.category === "all" || part.category === filters.category;
      return searchMatch && supplierMatch && locationMatch && categoryMatch;
    });
  }, [parts, searchTerm, filters]);

  const handleSavePart = async (partData: Omit<Part, 'id' | 'stockHistory'> & { id?: string }) => {
    try {
        if (partData.id) {
            const { id, ...dataToUpdate } = partData;
            await updatePart(id, dataToUpdate);
            toast({ title: "Part Updated", description: `Details for ${partData.name} have been updated.` });
        } else {
            const { id, ...dataToAdd } = partData;
            await addPart(dataToAdd);
            toast({ title: "Part Added", description: `${partData.name} has been added to inventory.` });
        }
    } catch (error) {
        console.error("Error saving part: ", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not save part details." });
    }
    setDialog({ type: null, part: null });
  };
  
  const handleUpdateStock = async (part: Part, quantityChange: number, type: 'in' | 'out' | 'adjustment') => {
    const newQuantity = part.quantity + quantityChange;
    if (newQuantity < 0) {
      toast({ variant: 'destructive', title: "Error", description: `Not enough stock for ${part.name}.` });
      return;
    }
    const newHistoryEntry: StockLog = {
      date: new Date(),
      quantityChange,
      type,
    };
    
    const updatedHistory = [...(part.stockHistory || []), newHistoryEntry];
    
    try {
        await updatePartStock(part.id, newQuantity, updatedHistory);
        toast({ title: "Stock Updated", description: `Stock for ${part.name} is now ${newQuantity}.` });
    } catch (error) {
        console.error("Error updating stock: ", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not update stock." });
    }

    setDialog({ type: null, part: null });
  }

  const handleStockOpname = (part: Part, countedQuantity: number) => {
    const quantityChange = countedQuantity - part.quantity;

    if (quantityChange !== 0) {
      handleUpdateStock(part, quantityChange, 'adjustment');
    } else {
      toast({ title: "Stock Opname", description: `No change in stock for ${part.name}.` });
    }
    setDialog({ type: null, part: null });
  }

  const handleGenerateReport = (startDate: Date, endDate: Date) => {
    const reportData = parts.map(part => {
      const relevantHistory = (part.stockHistory || []).filter(log => {
        const logDate = log.date; // Already a Date object
        return logDate >= startDate && logDate <= endDate;
      });

      const stockIn = relevantHistory.filter(log => log.type === 'in').reduce((sum, log) => sum + log.quantityChange, 0);
      const stockOut = relevantHistory.filter(log => log.type === 'out').reduce((sum, log) => sum + Math.abs(log.quantityChange), 0);
      const adjustment = relevantHistory.filter(log => log.type === 'adjustment').reduce((sum, log) => sum + log.quantityChange, 0);


      return {
        id: part.id,
        name: part.name,
        partNumber: part.partNumber,
        stockIn,
        stockOut,
        adjustment,
        currentStock: part.quantity
      };
    }).filter(data => data.stockIn > 0 || data.stockOut > 0 || data.adjustment !== 0);

    setDialog({ type: 'viewReport', part: null, reportData });
  };

  const downloadCSV = (data: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  const handleExportCSV = () => {
    const csvData = parts.map(part => ({
      "name": part.name,
      "partNumber": part.partNumber,
      "description": part.description,
      "category": part.category,
      "supplier": part.supplier,
      "location": part.location,
      "quantity": part.quantity,
      "minStock": part.minStock,
      "maxStock": part.maxStock
    }));
    downloadCSV(csvData, `parts-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "Data Exported", description: "Part data has been exported to CSV." });
  };

  const handleExportStatusCSV = () => {
    const statusData = parts.map(part => {
      let status = "OK";
      let quantityToOrder = 0;
      if (part.quantity <= part.minStock) {
        status = "Low Stock";
        quantityToOrder = (part.maxStock || part.quantity) - part.quantity;
      } else if (part.quantity > (part.maxStock || Infinity)) {
        status = "Overstock";
      }
      
      const totalAdjustment = (part.stockHistory || [])
        .filter(log => log.type === 'adjustment')
        .reduce((sum, log) => sum + log.quantityChange, 0);

      return {
        "Part Name": part.name,
        "Part Number": part.partNumber,
        "Category": part.category,
        "Current Quantity": part.quantity,
        "Status": status,
        "Quantity to Order": quantityToOrder > 0 ? quantityToOrder : 0,
        "Total Stock Opname Adjustment": totalAdjustment,
      };
    });

    downloadCSV(statusData, `part-status-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "Status Report Exported", description: "Part status and opname data has been exported to CSV." });
  }

  const handleExportAllHistoryCSV = () => {
    const allHistory: any[] = [];
    parts.forEach(part => {
        (part.stockHistory || []).forEach(log => {
            allHistory.push({
                "Part Name": part.name,
                "Part Number": part.partNumber,
                "Date": format(log.date, "yyyy-MM-dd HH:mm:ss"),
                "Type": log.type,
                "Quantity Change": log.quantityChange
            });
        });
    });

    if (allHistory.length === 0) {
        toast({ title: "No History Found", description: "There is no stock history to export." });
        return;
    }
    
    // Sort by date descending
    allHistory.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

    downloadCSV(allHistory, `all-stock-history-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "All History Exported", description: "Complete stock history has been exported to CSV." });
  };


  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet);
          
          let successCount = 0;
          for (const row of json) {
             const newPart: Omit<Part, 'id' | 'stockHistory'> = {
                name: row.name || "",
                partNumber: row.partNumber || "",
                description: row.description || "",
                category: row.category || "Uncategorized",
                supplier: row.supplier || "",
                location: row.location || "",
                quantity: parseInt(row.quantity, 10) || 0,
                minStock: parseInt(row.minStock, 10) || 0,
                maxStock: parseInt(row.maxStock, 10) || 0,
             };
             await addPart(newPart);
             successCount++;
          }
          
          toast({ title: "Import Successful", description: `${successCount} parts have been added.` });
        } catch (error) {
          console.error("Import error: ", error)
          toast({ variant: 'destructive', title: "Import Failed", description: "Could not parse or save the CSV file. Please check the format." });
        }
      };
      reader.readAsBinaryString(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <Wrench className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl font-bold">Gudang Material BM</CardTitle>
                <CardDescription>Manajemen Inventaris Gudang Material</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <Avatar>
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                  <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
               </Avatar>
               <div>
                  <div className="text-sm font-medium">{user.displayName}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
               </div>
               <Button variant="ghost" size="icon" onClick={onLogout}>
                  <LogOut className="h-5 w-5" />
               </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, part number..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
               <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <Select value={filters.supplier} onValueChange={(value) => setFilters({ ...filters, supplier: value })}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Suppliers' : s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <Select value={filters.location} onValueChange={(value) => setFilters({ ...filters, location: value })}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l} value={l}>{l === 'all' ? 'All Locations' : l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
             <div className="flex gap-2">
                <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                  <Upload className="mr-2 h-4 w-4" /> Import
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportCSV}
                  className="hidden"
                  accept=".csv"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Export
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={handleExportCSV}>
                          <FileText className="mr-2 h-4 w-4" /> Export Data Part
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleExportStatusCSV}>
                           <BarChart2 className="mr-2 h-4 w-4" /> Export Status Part
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleExportAllHistoryCSV}>
                            <History className="mr-2 h-4 w-4" /> Export Riwayat
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={() => setDialog({ type: 'report', part: null })}>
                  <FileText className="mr-2 h-4 w-4" /> Report
                </Button>
                <Button onClick={() => setDialog({ type: 'add', part: null })}>
                  <Plus className="mr-2 h-4 w-4" /> Add Part
                </Button>
             </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Part</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            Loading parts from database...
                        </TableCell>
                    </TableRow>
                ) : filteredParts.length > 0 ? (
                  filteredParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>
                        <div className="font-medium">{part.name}</div>
                        <div className="text-sm text-muted-foreground">{part.partNumber}</div>
                        <div className="text-xs text-muted-foreground flex items-center pt-1">
                          <Tag className="h-3 w-3 mr-1" /> {part.category}
                        </div>
                      </TableCell>
                      <TableCell>{part.supplier}</TableCell>
                      <TableCell>{part.location}</TableCell>
                      <TableCell>
                        {part.quantity <= part.minStock ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="destructive">
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Low Stock
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Re-order needed. Min stock: {part.minStock}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : part.quantity > (part.maxStock || Infinity) ? (
                          <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">Overstock</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge variant={part.quantity <= part.minStock ? 'destructive' : 'secondary'}>{part.quantity}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setDialog({ type: 'edit', part })}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setDialog({ type: 'history', part })}>
                              <History className="mr-2 h-4 w-4" /> Lihat Riwayat
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setDialog({ type: 'stockIn', part })}>
                              <ArrowUp className="mr-2 h-4 w-4 text-green-500" /> Tambah Stok
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => setDialog({ type: 'stockOut', part })}>
                              <ArrowDown className="mr-2 h-4 w-4 text-red-500" /> Ambil Part
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setDialog({ type: 'opname', part })}>
                               <Layers className="mr-2 h-4 w-4" /> Stock Opname
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No parts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {(dialog.type === 'add' || dialog.type === 'edit') && (
        <AddEditPartDialog
          open={dialog.type === 'add' || dialog.type === 'edit'}
          onOpenChange={() => setDialog({ type: null, part: null })}
          part={dialog.part}
          onSave={handleSavePart}
        />
      )}
      
      {(dialog.type === 'stockIn' || dialog.type === 'stockOut') && dialog.part && (
         <UpdateStockDialog
            open={dialog.type === 'stockIn' || dialog.type === 'stockOut'}
            onOpenChange={() => setDialog({ type: null, part: null })}
            part={dialog.part}
            logType={dialog.type === 'stockIn' ? 'in' : 'out'}
            onUpdateStock={(part, quantity) => handleUpdateStock(part, quantity, quantity > 0 ? 'in' : 'out')}
        />
      )}

      {dialog.type === 'history' && dialog.part && (
        <StockHistoryDialog
          open={dialog.type === 'history'}
          onOpenChange={() => setDialog({ type: null, part: null })}
          part={dialog.part}
        />
      )}
      
      {dialog.type === 'report' && (
        <DateRangePickerDialog
          open={dialog.type === 'report'}
          onOpenChange={() => setDialog({ type: null, part: null })}
          onGenerate={handleGenerateReport}
        />
      )}

      {dialog.type === 'viewReport' && dialog.reportData && (
        <StockReportDialog
          open={dialog.type === 'viewReport'}
          onOpenChange={() => setDialog({ type: null, part: null })}
          reportData={dialog.reportData}
        />
      )}

      {dialog.type === 'opname' && dialog.part && (
        <StockOpnameDialog
          open={dialog.type === 'opname'}
          onOpenChange={() => setDialog({ type: null, part: null })}
          part={dialog.part}
          onConfirm={handleStockOpname}
        />
      )}
    </TooltipProvider>
  );
}
