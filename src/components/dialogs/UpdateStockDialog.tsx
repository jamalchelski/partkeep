"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import type { Part } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  quantity: z.coerce.number().int().min(1, { message: 'Must be at least 1.' }),
});

type UpdateStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: Part;
  logType: 'in' | 'out';
  onUpdateStock: (part: Part, quantityChange: number) => void;
};

export function UpdateStockDialog({ open, onOpenChange, part, logType, onUpdateStock }: UpdateStockDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const change = logType === 'in' ? values.quantity : -values.quantity;
    onUpdateStock(part, change);
  };
  
  React.useEffect(() => {
    form.reset({ quantity: 1 });
  }, [open, form]);
  
  const isTaking = logType === 'out';
  const title = isTaking ? `Ambil Part: ${part.name}` : `Tambah Stok: ${part.name}`;
  const description = `Stok saat ini: ${part.quantity}. Masukkan jumlah yang ingin Anda ${isTaking ? 'ambil' : 'tambahkan'}.`;
  const label = `Jumlah yang di${isTaking ? 'ambil' : 'tambah'}`;
  const buttonText = isTaking ? 'Konfirmasi Pengambilan' : 'Konfirmasi Penambahan';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" variant={isTaking ? "destructive" : "default"}>
                {buttonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
