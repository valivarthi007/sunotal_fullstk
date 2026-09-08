import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { toast } from "sonner";
import { Store, Lock, Mail, ArrowRight } from "lucide-react";

export default function VendorLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.user?.role !== "vendor" && data.user?.role !== "admin") {
        toast.error("Account does not have vendor access");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("sunotal_vendor_token", data.token);
      localStorage.setItem("sunotal_token", data.token);
      toast.success("Vendor login successful!");
      setLocation("/vendor");
    } catch (err: any) {
      toast.error(err.message || "Failed to log in as vendor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="py-16 bg-accent/20 flex flex-col justify-center min-h-[75vh]">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-card border border-border shadow-xl rounded-3xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-600/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Store className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-secondary">Vendor Portal Login</h1>
              <p className="text-xs text-muted-foreground">Access your farm produce quotations, inventory & payout invoices</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" /> Vendor Registered Email
                </label>
                <Input
                  type="email"
                  required
                  placeholder="vendor@sunotal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" /> Password
                </label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl text-xs bg-background"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20"
              >
                {isLoading ? "Signing in..." : "Log In to Vendor Portal"}
              </Button>
            </form>

            <div className="pt-4 border-t text-center text-xs space-y-2">
              <p className="text-muted-foreground">Not a registered vendor yet?</p>
              <Link href="/vendor/register" className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1">
                Apply for Vendor Onboarding <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
