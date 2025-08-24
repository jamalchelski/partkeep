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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const formSchema = z.object({
  countedQuantity: z.coerce.number().int().min(0, { message: 'Quantity cannot be negative.' }),
});

type StockOpnameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: Part;
  onConfirm: (part: Part, countedQuantity: number) => void;
};

export function StockOpnameDialog({ open, onOpenChange, part, onConfirm }: StockOpnameDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      countedQuantity: part.quantity,
    },
  });

  const countedQuantity = form.watch('countedQuantity');
  const adjustment = countedQuantity - part.quantity;

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onConfirm(part, values.countedQuantity);
  };
  
  React.useEffect(() => {
    form.reset({ countedQuantity: part.quantity });
  }, [part, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Stock Opname: {part.name}</DialogTitle>
          <DialogDescription>
            Update the stock quantity based on a physical count.
          </DialogDescription>
        </DialogHeader>
        <div className='py-4'>
            <div className='text-sm'>
                System Quantity: <span className='font-bold'>{part.quantity}</span>
            </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="countedQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Counted Physical Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {adjustment !== 0 && (
                 <Alert variant={adjustment > 0 ? "default" : "destructive"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Stock Adjustment</AlertTitle>
                    <AlertDescription>
                        This will adjust the stock by <span className='font-bold'>{adjustment > 0 ? `+${adjustment}`: adjustment}</span> units.
                    </AlertDescription>
                 </Alert>
            )}

            <DialogFooter>
              <Button type="submit">Confirm & Adjust Stock</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
