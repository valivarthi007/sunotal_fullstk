import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-emerald-500/20">
      {/* Dedicated Delivery Portal Header */}
      <header className="border-b bg-card py-4 px-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-xs">
              SF
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-secondary">Sunotal Express Rider Portal</h1>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">10-15 Min Hyperlocal Delivery Fleet</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <div className="py-12 px-4 flex-1 flex flex-col justify-center items-center">
        <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-3xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-600/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Bike className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-secondary">Rider Partner Sign In</h2>
            <p className="text-xs text-muted-foreground">Access delivery tasks, turn-by-turn routes & day-out payouts</p>
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
            <p className="text-muted-foreground">Want to join our express delivery fleet?</p>
            <Link href="/delivery/register" className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1">
              Register as Delivery Partner <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card py-4 text-center text-xs text-muted-foreground">
        Sunotal Express Delivery Partner Portal &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
