import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useListUsers, 
  useUpdateUser, 
  useDeleteUser,
  useToggleUserStatus,
  getListUsersQueryKey,
  UserUpdateRole
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Search, Edit2, Trash2, Shield, User, ShieldAlert, Power, PowerOff } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, "Name required"),
  phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  role: z.nativeEnum(UserUpdateRole),
});

type FormValues = z.infer<typeof formSchema>;

export default function UsersAdmin() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  
  const { data: users, isLoading } = useListUsers( 
    search.length > 2 ? { search } : undefined 
  );
  
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const toggleStatus = useToggleUserStatus();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      city: "",
      role: UserUpdateRole.user,
    },
  });

  const handleEdit = (user: any) => {
    form.reset({
      name: user.name,
      phone: user.phone || "",
      city: user.city || "",
      role: user.role as UserUpdateRole,
    });
    setEditingId(user.id);
    setOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    if (editingId) {
      updateUser.mutate({ id: editingId, data: values }, {
        onSuccess: () => {
          toast.success("User updated successfully");
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setOpen(false);
        },
        onError: () => toast.error("Failed to update user")
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteUser.mutate({ id }, {
      onSuccess: () => {
        toast.success("User deleted");
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: () => toast.error("Failed to delete user")
    });
  };

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    toggleStatus.mutate({ id, data: { active: !currentStatus } }, {
      onSuccess: () => {
        toast.success(`User ${!currentStatus ? 'activated' : 'suspended'}`);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: () => toast.error("Failed to update status")
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-sidebar-foreground tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage customers, admins, and account access.</p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>System Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={UserUpdateRole.user}>
                        <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground"/> Customer</div>
                      </SelectItem>
                      <SelectItem value={UserUpdateRole.admin}>
                        <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-purple-500"/> Administrator</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4 mt-2 border-t">
                <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
                <Button type="submit" disabled={updateUser.isPending} className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-4 border-b flex items-center justify-between bg-accent/20">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email, phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background h-10 rounded-xl"
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium hidden sm:block">
            {users?.length || 0} Registered Users
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-accent/40 text-muted-foreground font-medium sticky top-0 z-10 shadow-sm backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 font-medium">User Details</th>
                <th className="px-6 py-4 font-medium">Contact & Location</th>
                <th className="px-6 py-4 font-medium text-center">Role</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading users...</td></tr>
              ) : users && users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-accent/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-base leading-tight">{user.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {user.phone ? <p className="font-medium text-foreground">{user.phone}</p> : <p className="text-xs italic">No phone</p>}
                      {user.city ? <p className="text-xs mt-0.5">{user.city}</p> : null}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className={cn(
                        "font-medium border-transparent shadow-sm",
                        user.role === 'admin' 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-blue-100 text-blue-700"
                      )}>
                        {user.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : null}
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="secondary" className={cn(
                        "font-medium bg-transparent border",
                        user.active ? "text-green-600 border-green-200 bg-green-50" : "text-red-600 border-red-200 bg-red-50"
                      )}>
                        {user.active ? "Active" : "Suspended"}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Since {format(new Date(user.createdAt), 'MMM yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title={user.active ? "Suspend User" : "Activate User"}
                          className={cn("h-8 w-8", user.active ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-green-500 hover:text-green-600 hover:bg-green-50")} 
                          onClick={() => handleToggleStatus(user.id, user.active)}
                        >
                          {user.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </Button>
                        
                        <div className="w-px h-6 bg-border mx-1"></div>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-sidebar-primary hover:bg-sidebar-primary/10" 
                          onClick={() => handleEdit(user)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        
                        {user.role !== 'admin' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{user.name}</strong>? This will permanently remove their account and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-destructive text-destructive-foreground">
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <User className="w-8 h-8 text-muted-foreground/50" />
                    <p>No users found matching your search.</p>
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
