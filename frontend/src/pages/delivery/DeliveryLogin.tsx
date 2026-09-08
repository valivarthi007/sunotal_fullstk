import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { toast } from "sonner";
import { Bike, Lock, Mail, ArrowRight } from "lucide-react";

export default function DeliveryLogin() {
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
      const response = await fetch("/api/delivery/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("sunotal_delivery_token", data.token);
      localStorage.setItem("sunotal_token", data.token);
      toast.success("Delivery partner login successful!");
      setLocation("/delivery");
    } catch (err: any) {
      toast.error(err.message || "Failed to log in as delivery partner");
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
                <Bike className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-secondary">Delivery Partner Login</h1>
              <p className="text-xs text-muted-foreground">Access express order tasks, live routes, earnings & day-out payouts</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" /> Registered Email or Phone
                </label>
                <Input
                  type="email"
                  required
                  placeholder="rider@sunotal.com"
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
                {isLoading ? "Signing in..." : "Log In to Rider Portal"}
              </Button>
            </form>

            <div className="pt-4 border-t text-center text-xs space-y-2">
              <p className="text-muted-foreground">Want to join our delivery fleet?</p>
              <Link href="/delivery/register" className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1">
                Register as Delivery Partner <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
