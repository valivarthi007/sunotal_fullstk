import React, { Component, ReactNode } from "react";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "sonner";
import { CartProvider } from "@/lib/cart-context";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import Home from "@/pages/public/Home";
import ProductsPage from "@/pages/public/Products";
import FarmerRegistration from "@/pages/public/FarmerRegistration";
import Login from "@/pages/public/Login";
import Register from "@/pages/public/Register";
import Profile from "@/pages/public/Profile";
import Checkout from "@/pages/public/Checkout";
import Orders from "@/pages/public/Orders";

import AdminLogin from "@/pages/admin/AdminLogin";
import Dashboard from "@/pages/admin/Dashboard";
import ProductsAdmin from "@/pages/admin/Products";
import VendorsAdmin from "@/pages/admin/Vendors";
import UsersAdmin from "@/pages/admin/Users";
import InventoryAdmin from "@/pages/admin/Inventory";
import BannersAdmin from "@/pages/admin/Banners";
import QuotationsAdmin from "@/pages/admin/Quotations";
import { WarehouseManager } from "@/pages/admin/WarehouseManager";
import { ObservabilityDashboard } from "@/pages/admin/ObservabilityDashboard";
import { AdminLedger } from "@/pages/admin/Ledger";

import VendorDashboard from "@/pages/vendor/VendorDashboard";
import VendorLogin from "@/pages/vendor/VendorLogin";
import DeliveryDashboard from "@/pages/delivery/DeliveryDashboard";
import DeliveryRegistration from "@/pages/delivery/DeliveryRegistration";
import DeliveryLogin from "@/pages/delivery/DeliveryLogin";

import NotFound from "@/pages/not-found";
import Redirect from "@/lib/redirect";
import { LocationProvider } from "@/lib/location-context";
import { ApiStatusProvider } from "@/lib/api-status";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
          <div className="max-w-md bg-card border rounded-3xl p-8 shadow-xl space-y-4">
            <h2 className="text-2xl font-bold text-destructive">Application Error</h2>
            <p className="text-xs text-muted-foreground">
              An unexpected error occurred. Please reload the page to restore your session.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 60, // 1 minute
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
});

export { queryClient };

// Subdomain Portal Auto-Detection
function getSubdomain(): "main" | "admin" | "vendor" | "delivery" {
  if (typeof window === "undefined") return "main";
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.startsWith("admin-") || hostname.startsWith("admin.")) return "admin";
  if (hostname.startsWith("vendor-") || hostname.startsWith("vendor.") || hostname.startsWith("farmer-")) return "vendor";
  if (hostname.startsWith("delivery-") || hostname.startsWith("delivery.") || hostname.startsWith("rider-")) return "delivery";
  return "main";
}

// Domain Restriction Notice component for Strict Portal Isolation
function DomainRestrictionNotice({ portalName, targetDomain }: { portalName: string; targetDomain: string }) {
  const targetUrl = typeof window !== "undefined" ? `http://${targetDomain}` : "#";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-secondary">{portalName} Access Restriction</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The {portalName} is strictly isolated and can only be accessed from the dedicated portal domain:
          </p>
          <div className="p-3 bg-muted rounded-xl font-mono text-xs font-bold text-foreground break-all">
            {targetDomain}
          </div>
        </div>
        <Button
          onClick={() => { window.location.href = targetUrl; }}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-11 gap-2 shadow-md"
        >
          <span>Go to {portalName} Domain</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function VendorRouteGuard() {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("sunotal_vendor_token") || localStorage.getItem("sunotal_token")
    : null;

  if (!token) {
    return <VendorLogin />;
  }

  return <VendorDashboard />;
}

function DeliveryRouteGuard() {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("sunotal_delivery_token") || localStorage.getItem("sunotal_token")
    : null;

  if (!token) {
    return <DeliveryLogin />;
  }

  return <DeliveryDashboard />;
}

function SubdomainRouter() {
  const subdomain = getSubdomain();
  const isLocalhost = typeof window !== "undefined" && window.location.hostname.includes("localhost");

  if (subdomain === "admin") {
    return (
      <Switch>
        <Route path="/" component={AdminLogin} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={Dashboard} />
        <Route path="/admin/products" component={ProductsAdmin} />
        <Route path="/admin/warehouses" component={WarehouseManager} />
        <Route path="/admin/warehouse" component={WarehouseManager} />
        <Route path="/admin/ledger" component={AdminLedger} />
        <Route path="/admin/observability" component={ObservabilityDashboard} />
        <Route path="/admin/banners" component={BannersAdmin} />
        <Route path="/admin/inventory" component={InventoryAdmin} />
        <Route path="/admin/vendors" component={VendorsAdmin} />
        <Route path="/admin/quotations" component={QuotationsAdmin} />
        <Route path="/admin/users" component={UsersAdmin} />
        <Route component={AdminLogin} />
      </Switch>
    );
  }

  if (subdomain === "vendor") {
    return (
      <Switch>
        <Route path="/" component={VendorRouteGuard} />
        <Route path="/login" component={VendorLogin} />
        <Route path="/vendor/login" component={VendorLogin} />
        <Route path="/register" component={FarmerRegistration} />
        <Route path="/vendor/register" component={FarmerRegistration} />
        <Route path="/farmer" component={FarmerRegistration} />
        <Route path="/vendor" component={VendorRouteGuard} />
        <Route component={VendorRouteGuard} />
      </Switch>
    );
  }

  if (subdomain === "delivery") {
    return (
      <Switch>
        <Route path="/" component={DeliveryRouteGuard} />
        <Route path="/login" component={DeliveryLogin} />
        <Route path="/delivery/login" component={DeliveryLogin} />
        <Route path="/register" component={DeliveryRegistration} />
        <Route path="/delivery/register" component={DeliveryRegistration} />
        <Route path="/delivery" component={DeliveryRouteGuard} />
        <Route component={DeliveryRouteGuard} />
      </Switch>
    );
  }

  // Primary Domain (Customer Grocery Storefront)
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products"><ProductsPage initialCategory="All" /></Route>
      <Route path="/vegetables"><ProductsPage initialCategory="Vegetables" /></Route>
      <Route path="/fruits"><ProductsPage initialCategory="Fruits" /></Route>
      <Route path="/dairy"><ProductsPage initialCategory="Dairy" /></Route>
      <Route path="/dry-fruits"><ProductsPage initialCategory="Dry Fruits" /></Route>
      <Route path="/grains"><ProductsPage initialCategory="Grains" /></Route>
      <Route path="/profile" component={Profile} />
      <Route path="/orders" component={Orders} />
      <Route path="/orders/:rest+"><Redirect to="/orders" /></Route>
      <Route path="/oders"><Redirect to="/orders" /></Route>
      <Route path="/checkout" component={Checkout} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Strict Subdomain Protection: In Production, restrict portal paths to dedicated subdomains */}
      <Route path="/admin/:rest*">
        {isLocalhost ? <AdminLogin /> : <DomainRestrictionNotice portalName="Admin Portal" targetDomain="admin-sunotal.automateuniverse.space" />}
      </Route>
      <Route path="/vendor/:rest*">
        {isLocalhost ? <VendorRouteGuard /> : <DomainRestrictionNotice portalName="Vendor Portal" targetDomain="vendor-sunotal.automateuniverse.space" />}
      </Route>
      <Route path="/farmer">
        {isLocalhost ? <FarmerRegistration /> : <DomainRestrictionNotice portalName="Vendor Portal" targetDomain="vendor-sunotal.automateuniverse.space" />}
      </Route>
      <Route path="/delivery/:rest*">
        {isLocalhost ? <DeliveryRouteGuard /> : <DomainRestrictionNotice portalName="Delivery Partner Portal" targetDomain="delivery-sunotal.automateuniverse.space" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LocationProvider>
            <CartProvider>
              <ApiStatusProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <SubdomainRouter />
                </WouterRouter>
              </ApiStatusProvider>
              <Toaster />
              <Sonner richColors position="top-right" />
            </CartProvider>
          </LocationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
