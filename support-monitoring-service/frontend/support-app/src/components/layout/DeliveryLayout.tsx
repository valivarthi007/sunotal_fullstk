import React from "react";
import { Link, useLocation } from "wouter";
import { LogOut, Bike, Power, Navigation, DollarSign, Bell, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";

interface DeliveryLayoutProps {
  children: React.ReactNode;
  user?: any;
}

export function DeliveryLayout({ children, user }: DeliveryLayoutProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    localStorage.removeItem("sunotal_delivery_token");
    localStorage.removeItem("sunotal_token");
    queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    queryClient.clear();
    setLocation("/delivery/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-emerald-500/20">
      {/* Top Dedicated Delivery Rider Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-xs py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Rider Portal Branding */}
          <div className="flex items-center gap-3">
            <Link href="/delivery" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-md">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-base sm:text-lg leading-none text-secondary flex items-center gap-2">
                  <span>Sunotal</span>
                  <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Rider Portal
                  </span>
                </h1>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                  Hyperlocal Express Delivery Fleet
                </p>
              </div>
            </Link>
          </div>

          {/* User Profile Info & Logout */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden md:flex items-center gap-2 text-xs bg-accent/50 px-3 py-1.5 rounded-full border border-border">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-secondary">{user.name}</span>
                <span className="text-muted-foreground">({user.email || user.phone})</span>
              </div>
            )}

            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5 h-9"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </Button>
          </div>

        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1">{children}</main>

      {/* Minimal Rider Portal Footer */}
      <footer className="border-t bg-card py-6 text-center text-xs text-muted-foreground space-y-2">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Sunotal Hyperlocal Delivery Partner Network &copy; {new Date().getFullYear()}</p>
          <div className="flex gap-4">
            <Link href="/delivery/register" className="hover:text-emerald-600 transition-colors">Rider Registration</Link>
            <Link href="/delivery/login" className="hover:text-emerald-600 transition-colors">Rider Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
