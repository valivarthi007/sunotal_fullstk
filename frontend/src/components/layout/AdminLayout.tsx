import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Store, 
  LogOut,
  Menu,
  X,
  ClipboardList
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = localStorage.getItem("sunotal_admin_token");

  useEffect(() => {
    if (!token && location !== "/admin/login") {
      setLocation("/admin/login");
    }
  }, [token, location, setLocation]);

  const navLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Products", path: "/admin/products", icon: Package },
    { name: "Inventory", path: "/admin/inventory", icon: ClipboardList },
    { name: "Vendors", path: "/admin/vendors", icon: Store },
    { name: "Users", path: "/admin/users", icon: Users },
  ];

  if (!token) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    localStorage.removeItem("sunotal_admin_token");
    setLocation("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-background selection:bg-sidebar-primary/20 selection:text-sidebar-primary">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sidebar-primary text-sidebar-primary-foreground rounded-xl flex items-center justify-center font-bold text-xl shadow-sm">
              SF
            </div>
            <div>
              <h1 className="font-bold text-xl leading-none text-sidebar-foreground tracking-tight">Admin</h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sunotal Farms</p>
            </div>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.path || location.startsWith(link.path + '/');
              return (
                <li key={link.name}>
                  <Link 
                    href={link.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-start gap-3 text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 px-4"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-sidebar border-b border-sidebar-border p-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sidebar-primary text-sidebar-primary-foreground rounded-lg flex items-center justify-center font-bold shadow-sm">
              SF
            </div>
            <h1 className="font-bold text-lg text-sidebar-foreground">Admin</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-sidebar-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="w-5 h-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-50 pb-safe">
        <ul className="flex items-center justify-around p-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.path || location.startsWith(link.path + '/');
            return (
              <li key={link.name} className="flex-1">
                <Link 
                  href={link.path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl transition-colors",
                    isActive 
                      ? "text-sidebar-primary" 
                      : "text-muted-foreground hover:text-sidebar-foreground"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-full transition-all duration-300",
                    isActive ? "bg-sidebar-primary/10" : "bg-transparent"
                  )}>
                    <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "")} />
                  </div>
                  <span className="text-[10px] font-medium">{link.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
