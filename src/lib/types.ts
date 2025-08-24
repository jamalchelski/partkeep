export interface StockLog {
  date: Date;
  quantityChange: number;
  type: 'in' | 'out' | 'adjustment';
}

export interface Part {
  id: string;
  name: string;
  partNumber: string;
  description: string;
  supplier: string;
  location: string;
  category: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  stockHistory: StockLog[];
}
