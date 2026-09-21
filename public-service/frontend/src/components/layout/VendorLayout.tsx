import React from "react";
import { Link, useLocation } from "wouter";
import { LogOut, Store, FileText, DollarSign, PlusCircle, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";

interface VendorLayoutProps {
  children: React.ReactNode;
  user?: any;
}

export function VendorLayout({ children, user }: VendorLayoutProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    localStorage.removeItem("sunotal_vendor_token");
    localStorage.removeItem("sunotal_token");
    queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    queryClient.clear();
    setLocation("/vendor/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-emerald-500/20">
      {/* Top Dedicated Vendor Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-xs py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Portal Identifier */}
          <div className="flex items-center gap-3">
            <Link href="/vendor" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-700 text-white rounded-xl flex items-center justify-center font-extrabold text-xl shadow-md">
                🌾
              </div>
              <div>
                <h1 className="font-bold text-base sm:text-lg leading-none text-secondary flex items-center gap-2">
                  <span>Sunotal</span>
                  <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Vendor Portal
                  </span>
                </h1>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                  Direct Farm Sourcing & Harvest Engine
                </p>
              </div>
            </Link>
          </div>

          {/* User Profile Info & Logout */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden md:flex items-center gap-2 text-xs bg-accent/50 px-3 py-1.5 rounded-full border border-border">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-secondary">{user?.name || "Vendor"}</span>
                <span className="text-muted-foreground">({user.email})</span>
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

      {/* Minimal Vendor Footer */}
      <footer className="border-t bg-card py-6 text-center text-xs text-muted-foreground space-y-2">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Sunotal Direct Farm Sourcing & Partner Network &copy; {new Date().getFullYear()}</p>
          <div className="flex gap-4">
            <Link href="/vendor/register" className="hover:text-emerald-600 transition-colors">Onboarding Form</Link>
            <Link href="/vendor/login" className="hover:text-emerald-600 transition-colors">Vendor Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
