import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useListProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  getListProductsQueryKey,
  ProductCategory
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, Package } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(2, "Name required"),
  category: z.nativeEnum(ProductCategory),
  unit: z.string().min(1, "Unit required (e.g. kg, dozen)"),
  price: z.coerce.number().min(1, "Price must be > 0"),
  originalPrice: z.coerce.number().min(0),
  image: z.string().url("Must be a valid URL"),
  badge: z.string().optional().nullable(),
  organic: z.boolean().default(false),
  active: z.boolean().default(true),
  description: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProductsAdmin() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  
  const { data: products, isLoading } = useListProducts( 
    search.length > 2 ? { search } : undefined 
  );
  
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Fixed: State controller added to move delete prompts cleanly out of row bounds
  const [deletingProduct, setDeletingProduct] = useState<any | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: ProductCategory.Vegetables,
      unit: "1 kg",
      price: 0,
      originalPrice: 0,
      image: "",
      badge: "",
      organic: false,
      active: true,
      description: "",
    },
  });

  const handleEdit = (product: any) => {
    form.reset({
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      badge: product.badge || "",
      organic: product.organic,
      active: product.active,
      description: product.description || "",
    });
    setEditingId(product.id);
    setOpen(true);
  };

  const handleCreateNew = () => {
    form.reset({
      name: "",
      category: ProductCategory.Vegetables,
      unit: "1 kg",
      price: 0,
      originalPrice: 0,
      image: "",
      badge: "",
      organic: false,
      active: true,
      description: "",
    });
    setEditingId(null);
    setOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    if (editingId) {
      updateProduct.mutate({ id: editingId, data: values }, {
        onSuccess: () => {
          toast.success("Product updated successfully");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setOpen(false);
        },
        onError: () => toast.error("Failed to update product")
      });
    } else {
      createProduct.mutate({ data: values }, {
        onSuccess: () => {
          toast.success("Product created successfully");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setOpen(false);
        },
        onError: () => toast.error("Failed to create product")
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteProduct.mutate({ id }, {
      onSuccess: () => {
        toast.success("Product deleted");
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDeletingProduct(null);
      },
      onError: () => toast.error("Failed to delete product")
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-sidebar-foreground tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your catalog, pricing, and inventory.</p>
        </div>
        
        {/* Fixed: Simplified button declaration, avoiding conflicting DialogTrigger event signals */}
        <Button onClick={handleCreateNew} className="gap-2 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white rounded-xl shadow-sm">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Main Creation / Modification Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.values(ProductCategory).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem><FormLabel>Unit (e.g. 1 kg)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>Selling Price (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="originalPrice" render={({ field }) => (
                  <FormItem><FormLabel>MRP (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="image" render={({ field }) => (
                <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="badge" render={({ field }) => (
                <FormItem><FormLabel>Badge Label (Optional)</FormLabel><FormControl><Input placeholder="e.g. Bestseller, New Arrival" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="resize-none" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="flex gap-8 py-2">
                <FormField control={form.control} name="organic" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none"><FormLabel>Organic Certified</FormLabel></div>
                  </FormItem>
                )} />
                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none"><FormLabel>Active (Visible to users)</FormLabel></div>
                  </FormItem>
                )} />
              </div>

              <DialogFooter className="pt-4 border-t">
                <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                  {editingId ? "Save Changes" : "Create Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Fixed: Relocated Alert overlay completely out of the mapped rows tree */}
      <AlertDialog open={!!deletingProduct} onOpenChange={(isOpen) => !isOpen && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingProduct?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingProduct && handleDelete(deletingProduct.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-4 border-b bg-accent/30 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background h-9 rounded-lg"
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {products?.length || 0} items
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-accent/50 text-muted-foreground font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium text-right">Price</th>
                <th className="px-6 py-3 font-medium text-center">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading products...</td></tr>
              ) : products && products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-accent/30 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border/50 shrink-0">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-full h-full p-2 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className="font-normal">{product.category}</Badge>
                      {product.organic && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 font-normal border-transparent text-[10px] uppercase">Organic</Badge>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="font-medium">₹{product.price}</div>
                      {product.originalPrice > product.price && (
                        <div className="text-xs text-muted-foreground line-through">₹{product.originalPrice}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <Badge variant={product.active ? "default" : "secondary"} className={product.active ? "bg-primary/20 text-primary hover:bg-primary/30" : ""}>
                        {product.active ? "Active" : "Draft"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      {/* Fixed: Set fallback display configurations so touch actions display correctly */}
                      <div className="flex items-center justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(product)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive" 
                          onClick={() => setDeletingProduct(product)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}