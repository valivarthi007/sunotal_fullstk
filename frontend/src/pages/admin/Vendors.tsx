import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useListVendors, 
  useUpdateVendor, 
  useDeleteVendor,
  getListVendorsQueryKey,
  VendorStatus,
  VendorUpdateStatus
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Search, Edit2, Trash2, CheckCircle2, XCircle, FileText, Store } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone is required"),
  location: z.string().min(1, "Location is required"),
  produce: z.string().min(1, "Produce is required"),
  email: z.string().email().optional().or(z.literal("")),
  farmSize: z.string().optional().nullable(),
  status: z.nativeEnum(VendorUpdateStatus),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function VendorsAdmin() {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  
  const { data: vendors, isLoading } = useListVendors({
    status: activeTab !== "All" ? activeTab.toLowerCase() : undefined,
    search: search.length > 2 ? search : undefined,
  });
  
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      location: "",
      produce: "",
      email: "",
      farmSize: "",
      status: VendorUpdateStatus.pending,
      notes: "",
    },
  });

  const handleEdit = (vendor: any) => {
    form.reset({
      firstName: vendor.firstName,
      lastName: vendor.lastName,
      phone: vendor.phone,
      location: vendor.location,
      produce: vendor.produce,
      email: vendor.email || "",
      farmSize: vendor.farmSize || "",
      status: vendor.status as VendorUpdateStatus,
      notes: vendor.notes || "",
    });
    setEditingId(vendor.id);
    setOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    if (editingId) {
      updateVendor.mutate({ id: editingId, data: values }, {
        onSuccess: () => {
          toast.success("Vendor updated successfully");
          queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
          setOpen(false);
        },
        onError: () => toast.error("Failed to update vendor")
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteVendor.mutate({ id }, {
      onSuccess: () => {
        toast.success("Vendor deleted");
        queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
      },
      onError: () => toast.error("Failed to delete vendor")
    });
  };

  const handleQuickStatus = (id: number, status: VendorUpdateStatus) => {
    updateVendor.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast.success(`Vendor marked as ${status}`);
        queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
      },
      onError: () => toast.error("Failed to update status")
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-sidebar-foreground tracking-tight">Vendors</h1>
          <p className="text-muted-foreground mt-1">Manage farmer applications and approved suppliers.</p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor Profile</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="farmSize" render={({ field }) => (
                  <FormItem><FormLabel>Farm Size</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="produce" render={({ field }) => (
                <FormItem><FormLabel>Primary Produce</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Approval Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={VendorUpdateStatus.pending}>Pending Review</SelectItem>
                      <SelectItem value={VendorUpdateStatus.approved}>Approved</SelectItem>
                      <SelectItem value={VendorUpdateStatus.rejected}>Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Notes (Internal only)</FormLabel>
                  <FormControl><Textarea className="resize-none" placeholder="Add inspection notes here..." {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4 border-t">
                <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
                <Button type="submit" disabled={updateVendor.isPending} className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-accent/50 p-1 rounded-xl w-fit">
            {["All", "Pending", "Approved", "Rejected"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, location, produce..." 
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
                <th className="px-6 py-4 font-medium">Vendor Details</th>
                <th className="px-6 py-4 font-medium">Location & Farm</th>
                <th className="px-6 py-4 font-medium">Primary Produce</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading vendors...</td></tr>
              ) : vendors && vendors.length > 0 ? (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-accent/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-foreground text-base">{vendor.firstName} {vendor.lastName}</p>
                        <p className="text-muted-foreground mt-0.5 font-medium">{vendor.phone}</p>
                        {vendor.email && <p className="text-xs text-muted-foreground">{vendor.email}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{vendor.location}</p>
                        {vendor.farmSize && <p className="text-xs text-muted-foreground mt-1">Size: {vendor.farmSize}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px] truncate" title={vendor.produce}>
                        {vendor.produce}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="secondary" className={cn(
                        "font-medium",
                        vendor.status === VendorStatus.approved ? "bg-green-100 text-green-700 border-green-200" :
                        vendor.status === VendorStatus.rejected ? "bg-red-100 text-red-700 border-red-200" :
                        "bg-yellow-100 text-yellow-700 border-yellow-200"
                      )}>
                        {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Applied: {format(new Date(vendor.createdAt), 'MMM d')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {vendor.status === VendorStatus.pending && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Approve"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100" 
                              onClick={() => handleQuickStatus(vendor.id, VendorUpdateStatus.approved)}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Reject"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100" 
                              onClick={() => handleQuickStatus(vendor.id, VendorUpdateStatus.rejected)}
                            >
                              <XCircle className="w-5 h-5" />
                            </Button>
                          </>
                        )}
                        
                        <div className="w-px h-6 bg-border mx-2"></div>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-sidebar-primary hover:bg-sidebar-primary/10" 
                          onClick={() => handleEdit(vendor)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{vendor.firstName} {vendor.lastName}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(vendor.id)} className="bg-destructive text-destructive-foreground">
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
                <tr><td colSpan={5} className="px-6 py-20 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Store className="w-8 h-8 text-muted-foreground/50" />
                    <p>No vendors found matching your criteria.</p>
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
