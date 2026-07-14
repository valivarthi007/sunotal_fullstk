import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLoginUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { queryClient } from "@/App";

const formSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const loginUser = useLoginUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    loginUser.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          localStorage.setItem("sunotal_token", data.token);
          // Force re-fetch of current user so header shows the name immediately
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          toast.success(`Welcome back, ${data.user.name.split(" ")[0]}!`);
          setLocation("/");
        },
        onError: (error: any) => {
          toast.error(error?.data?.error || error.message || "Login failed. Check your credentials.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-accent/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to store
        </Link>

        <div className="bg-card border border-border shadow-sm rounded-3xl p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-bold text-3xl mb-4 shadow-lg shadow-primary/20">
              SF
            </div>
            <h1 className="text-2xl font-bold text-secondary tracking-tight">Welcome Back</h1>
            <p className="text-muted-foreground mt-1">Sign in to your Sunotal account</p>
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
                      <Input placeholder="you@example.com" type="email" className="h-12" {...field} />
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link href="/forgot" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
                    </div>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" className="h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-12 text-base font-bold shadow-md"
                disabled={loginUser.isPending}
              >
                {loginUser.isPending ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="mt-8 pt-6 border-t text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="font-bold text-primary hover:underline">Sign up</Link>
            </p>
            <p className="text-xs text-muted-foreground/60">
              <Link href="/admin/login" className="hover:underline">Admin? Login here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
