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

import AdminLogin from "@/pages/admin/AdminLogin";
import Dashboard from "@/pages/admin/Dashboard";
import ProductsAdmin from "@/pages/admin/Products";
import VendorsAdmin from "@/pages/admin/Vendors";
import UsersAdmin from "@/pages/admin/Users";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

// Export queryClient so login/register pages can invalidate the user query
export { queryClient };

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products"><ProductsPage initialCategory="All" /></Route>
      <Route path="/vegetables"><ProductsPage initialCategory="Vegetables" /></Route>
      <Route path="/fruits"><ProductsPage initialCategory="Fruits" /></Route>
      <Route path="/dairy"><ProductsPage initialCategory="Dairy" /></Route>
      <Route path="/dry-fruits"><ProductsPage initialCategory="Dry Fruits" /></Route>
      <Route path="/grains"><ProductsPage initialCategory="Grains" /></Route>
      <Route path="/farmer" component={FarmerRegistration} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={Dashboard} />
      <Route path="/admin/products" component={ProductsAdmin} />
      <Route path="/admin/vendors" component={VendorsAdmin} />
      <Route path="/admin/users" component={UsersAdmin} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          <Sonner richColors position="top-right" />
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
