import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useListInventory,
  useUpdateInventory,
  useDeleteInventory,
  getListInventoryQueryKey
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Search, Edit2, Trash2, Package } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  status: z.enum(["in_stock", "low_stock", "out_of_stock"]),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function InventoryAdmin() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  
  const { data: inventory, isLoading } = useListInventory({});
  const updateInventory = useUpdateInventory();
  const deleteInventory = useDeleteInventory();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 0,
      status: "in_stock",
      notes: "",
    },
  });

  const handleEdit = (item: any) => {
    form.reset({
      quantity: item.quantity,
      status: item.status,
      notes: item.notes || "",
    });
    setEditingId(item.id);
    setOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    if (editingId) {
      updateInventory.mutate({ id: editingId, data: values }, {
        onSuccess: () => {
          toast.success("Inventory updated successfully");
          queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          setOpen(false);
        },
        onError: () => toast.error("Failed to update inventory")
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteInventory.mutate(id, {
      onSuccess: () => {
        toast.success("Inventory item deleted");
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
      },
      onError: () => toast.error("Failed to delete inventory item")
    });
  };

  const filteredInventory = inventory?.filter((item: any) => {
    if (search.length < 2) return true;
    const q = search.toLowerCase();
    return (
      item.productName?.toLowerCase().includes(q) ||
      item.vendorName?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-sidebar-foreground tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage stock levels and track vendor supplies.</p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Internal only)</FormLabel>
                  <FormControl><Textarea className="resize-none" placeholder="e.g. Batch received damaged..." {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4 border-t">
                <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
                <Button type="submit" disabled={updateInventory.isPending} className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by product or vendor..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-accent/30 h-10 rounded-xl"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-accent/30 text-muted-foreground font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Supplied By</th>
                <th className="px-6 py-4 font-medium">Quantity</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium">Last Updated</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Loading inventory...</td></tr>
              ) : filteredInventory && filteredInventory.length > 0 ? (
                filteredInventory.map((item: any) => (
                  <tr key={item.id} className="hover:bg-accent/30 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-foreground">{item.productName || `Product #${item.productId}`}</td>
                    <td className="px-6 py-4 font-medium">{item.vendorName || `Vendor #${item.vendorId}`}</td>
                    <td className="px-6 py-4 font-bold text-lg">{item.quantity}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="secondary" className={cn(
                        "font-medium",
                        item.status === 'in_stock' ? "bg-green-100 text-green-700 border-green-200" :
                        item.status === 'low_stock' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                        "bg-red-100 text-red-700 border-red-200"
                      )}>
                        {item.status.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{format(new Date(item.updatedAt), 'MMM d, yyyy HH:mm')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-sidebar-primary hover:bg-sidebar-primary/10" 
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Inventory Record?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this stock record for <strong>{item.productName}</strong>?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Package className="w-8 h-8 text-muted-foreground/50" />
                    <p>No inventory items found.</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
