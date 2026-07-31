import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useListProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  useListCategories,
  useCreateCategory,
  useDeleteCategory,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { uploadImageToS3 } from "@/lib/api-client";
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
import { Plus, Search, Edit2, Trash2, Package, FolderPlus, Tag, Upload, ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  category: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required (e.g., 1 kg, 500g, 1 Dozen)"),
  price: z.coerce.number().min(1, "Selling price must be greater than 0"),
  originalPrice: z.coerce.number().min(0, "MRP cannot be negative"),
  image: z.string().url("Must be a valid URL (e.g. https://...)"),
  badge: z.string().optional().nullable(),
  organic: z.boolean().default(false),
  active: z.boolean().default(true),
  description: z.string().optional().nullable(),
}).superRefine((val, ctx) => {
  if (val.originalPrice > 0 && val.originalPrice < val.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["originalPrice"],
      message: "MRP (Original Price) should be greater than or equal to Selling Price",
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

export default function ProductsAdmin() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  
  const { data: products, isLoading } = useListProducts( 
    search.length > 2 ? { search } : undefined 
  );

  const { data: categories = [] } = useListCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Category management modal states
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");

  const [deletingProduct, setDeletingProduct] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "Vegetables",
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
    setSelectedFile(null);
    setImagePreview(null);
    setOpen(true);
  };

  const handleCreateNew = () => {
    const defaultCat = categories.length > 0 ? categories[0].name : "Vegetables";
    form.reset({
      name: "",
      category: defaultCat,
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
    setSelectedFile(null);
    setImagePreview(null);
    setOpen(true);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    createCategory.mutate(
      { name: newCatName.trim(), icon: newCatIcon.trim() || "📦" },
      {
        onSuccess: (added) => {
          toast.success(`Category "${added.name}" added successfully!`);
          form.setValue("category", added.name);
          setNewCatName("");
          setNewCatIcon("📦");
          setCatModalOpen(false);
        },
        onError: (err: any) => {
          toast.error(err?.data?.error || err.message || "Failed to create category");
        },
      }
    );
  };

  const handleDeleteCategory = (id: number, name: string) => {
    deleteCategory.mutate(id, {
      onSuccess: () => {
        toast.success(`Category "${name}" deleted`);
      },
      onError: () => toast.error("Failed to delete category"),
    });
  };

  const onSubmit = async (values: FormValues) => {
    let finalValues = { ...values };

    if (selectedFile) {
      try {
        setUploading(true);
        toast.info("Uploading image to S3...");
        
        // Generate object name based on sanitized product name
        const productSlug = values.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
        const ext = selectedFile.name.split(".").pop() || "jpg";
        const sanitizedFilename = `${productSlug || "product"}-${Date.now()}.${ext}`;

        // Create renamed file object
        const renamedFile = new File([selectedFile], sanitizedFilename, { type: selectedFile.type });

        const s3Url = await uploadImageToS3(renamedFile, "images");
        finalValues.image = s3Url;
        
        setSelectedFile(null);
        setImagePreview(null);
        toast.success("Image uploaded successfully!");
      } catch (err) {
        toast.error("Image upload failed. Please try again.");
        setUploading(false);
        return; // Abort submit
      } finally {
        setUploading(false);
      }
    }

    if (editingId) {
      updateProduct.mutate({ id: editingId, data: finalValues as any }, {
        onSuccess: () => {
          toast.success("Product updated successfully");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setOpen(false);
        },
        onError: () => toast.error("Failed to update product")
      });
    } else {
      createProduct.mutate({ data: finalValues as any }, {
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
          <p className="text-muted-foreground mt-1">Manage your catalog, categories, pricing, and inventory.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setCatModalOpen(true)}
            className="gap-2 border-sidebar-border rounded-xl"
          >
            <FolderPlus className="w-4 h-4 text-primary" /> Manage Categories
          </Button>
          <Button onClick={handleCreateNew} className="gap-2 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white rounded-xl shadow-sm">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* MODAL 1: Manage Categories Dialog */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" /> Manage Product Categories
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Add New Category Form */}
            <form onSubmit={handleAddCategorySubmit} className="p-4 rounded-2xl bg-accent/30 border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Category</h3>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  placeholder="Icon (Emoji)"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="col-span-1 text-center"
                />
                <Input
                  placeholder="Category Name (e.g. Spices)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <Button type="submit" size="sm" className="w-full font-bold rounded-xl" disabled={createCategory.isPending}>
                {createCategory.isPending ? "Adding..." : "+ Create Category"}
              </Button>
            </form>

            {/* List Existing Categories */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Categories ({categories.length})
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {categories.map((cat) => (
                  <div key={cat.id || cat.name} className="flex items-center justify-between p-3 rounded-xl bg-card border text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <span>{cat.icon || "📦"}</span>
                      <span>{cat.name}</span>
                    </div>
                    {cat.id && cat.id > 5 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Main Creation / Modification Dialog */}
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Category</FormLabel>
                      <button
                        type="button"
                        onClick={() => setCatModalOpen(true)}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        + New Category
                      </button>
                    </div>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.name} value={cat.name}>
                            {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                          </SelectItem>
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
                <FormItem>
                  <FormLabel>Product Image</FormLabel>
                  <div className="space-y-3">
                    {/* File Upload Area */}
                    <div 
                      className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {(imagePreview || field.value) ? (
                        <div className="flex items-center gap-4">
                          <img 
                            src={imagePreview || field.value} 
                            alt="Product preview" 
                            className="w-16 h-16 rounded-lg object-cover border" 
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-foreground">Image uploaded</p>
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{field.value}</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="shrink-0">
                            <Upload className="w-3.5 h-3.5 mr-1" /> Replace
                          </Button>
                        </div>
                      ) : (
                        <div className="py-2">
                          <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm font-medium text-muted-foreground">Click to upload product image</p>
                          <p className="text-xs text-muted-foreground/70">PNG, JPG, or WebP (uploaded to S3)</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setSelectedFile(file);
                          const localPreview = URL.createObjectURL(file);
                          setImagePreview(localPreview);
                          field.onChange("PENDING_UPLOAD");
                        }}
                      />
                    </div>
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Uploading to S3...
                      </div>
                    )}
                    {/* Manual URL Fallback */}
                    <FormControl>
                      <Input placeholder="Or paste image URL directly..." {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
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