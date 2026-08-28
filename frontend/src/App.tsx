import { Route, Switch, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "sonner";
import { CartProvider } from "@/lib/cart-context";

import Home from "@/pages/public/Home";
import ProductsPage from "@/pages/public/Products";
import FarmerRegistration from "@/pages/public/FarmerRegistration";
import Login from "@/pages/public/Login";
import Register from "@/pages/public/Register";
import Profile from "@/pages/public/Profile";
import Checkout from "@/pages/public/Checkout";

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
import NotFound from "@/pages/not-found";
import Redirect from "@/lib/redirect";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 60, // 1 minute
      throwOnError: false,  // Never crash the component tree on API errors (401, 500, etc.)
    },
    mutations: {
      throwOnError: false,
    },
  },
});

// Export queryClient so login/register pages can invalidate the user query
export { queryClient };

import Orders from "@/pages/public/Orders";

function Router() {
  return (
    <Switch>
      {/* Redirect legacy /admin/product -> /admin/products */}
      <Route path="/admin/product">
        <Redirect to="/admin/products" />
      </Route>
      <Route path="/admin/product/:rest+">
        <Redirect to="/admin/products" />
      </Route>
      <Route path="/" component={Home} />
      <Route path="/products"><ProductsPage initialCategory="All" /></Route>
      <Route path="/vegetables"><ProductsPage initialCategory="Vegetables" /></Route>
      <Route path="/fruits"><ProductsPage initialCategory="Fruits" /></Route>
      <Route path="/dairy"><ProductsPage initialCategory="Dairy" /></Route>
      <Route path="/dry-fruits"><ProductsPage initialCategory="Dry Fruits" /></Route>
      <Route path="/grains"><ProductsPage initialCategory="Grains" /></Route>
      <Route path="/farmer" component={FarmerRegistration} />
      <Route path="/profile" component={Profile} />
      <Route path="/orders" component={Orders} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/vendor" component={VendorDashboard} />

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

      <Route component={NotFound} />
    </Switch>
  );
}

import { LocationProvider } from "@/lib/location-context";
import { ApiStatusProvider } from "@/lib/api-status";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LocationProvider>
          <CartProvider>
            <ApiStatusProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
            </ApiStatusProvider>
            <Toaster />
            <Sonner richColors position="top-right" />
          </CartProvider>
        </LocationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
