import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAdminLogin } from "@workspace/api-client-react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const adminLogin = useAdminLogin();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    adminLogin.mutate({ data: values }, {
      onSuccess: (data) => {
        localStorage.setItem("sunotal_admin_token", data.token);
        toast.success("Welcome, Admin");
        setLocation("/admin/dashboard");
      },
      onError: (error: any) => {
        toast.error(error.message || "Invalid admin credentials");
      }
    });
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-background border border-sidebar-border shadow-xl rounded-3xl p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-sidebar-primary text-sidebar-primary-foreground rounded-2xl flex items-center justify-center font-bold text-3xl mb-4 shadow-lg shadow-sidebar-primary/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight">Sunotal Admin</h1>
            <p className="text-muted-foreground mt-1">Sign in to the control panel</p>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@sunotal.com" type="email" className="h-12 bg-accent/30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" className="h-12 bg-accent/30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-bold shadow-md bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
                disabled={adminLogin.isPending}
              >
                {adminLogin.isPending ? "Authenticating..." : "Access Control Panel"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 p-4 rounded-xl bg-accent/50 text-xs text-muted-foreground text-center">
            <strong>Demo Credentials:</strong><br/>
            admin@sunotal.com / admin123
          </div>
          
          <div className="mt-8 pt-6 border-t text-center">
            <Link href="/" className="text-sm font-medium text-sidebar-primary hover:underline">
              Return to Public Store
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
