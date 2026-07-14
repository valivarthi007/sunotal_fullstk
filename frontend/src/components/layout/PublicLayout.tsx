import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Search,
  MapPin,
  Menu,
  X,
  Facebook,
  Twitter,
  Instagram,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { LogOut } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { data: user } = useGetCurrentUser({ query: { retry: false } });
  const { items, totalItems, totalPrice, isOpen, openCart, closeCart, updateQuantity, removeItem, clearCart } = useCart();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when cart or mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen || mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, mobileMenuOpen]);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "All Products", path: "/products" },
    { name: "Vegetables", path: "/vegetables" },
    { name: "Fruits", path: "/fruits" },
    { name: "Dairy", path: "/dairy" },
    { name: "Dry Fruits", path: "/dry-fruits" },
    { name: "Grains", path: "/grains" },
    { name: "For Farmers", path: "/farmer" },
  ];

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300 border-b",
          scrolled
            ? "bg-background/95 backdrop-blur-md border-border shadow-sm py-2"
            : "bg-background border-transparent py-4"
        )}
      >
        <div className="container mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold text-xl shadow-sm">
                SF
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-xl leading-none text-secondary tracking-tight">Sunotal</h1>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Farm Fresh. Daily.</p>
              </div>
            </Link>
          </div>

          <div className="hidden lg:flex flex-1 max-w-xl mx-8 items-center">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search for fresh vegetables, fruits, dairy..."
                className="pl-9 bg-accent/50 border-transparent focus-visible:bg-background focus-visible:border-primary/30 focus-visible:ring-primary/20 rounded-full h-11"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/50 text-sm font-medium border border-transparent hover:border-border cursor-pointer transition-colors">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Hyderabad</span>
            </div>

            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="hidden sm:flex gap-2 rounded-full px-4 font-medium"
                  onClick={() => setLocation('/profile')}
                >
                  Hi, {user.name.split(" ")[0]}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10"
                  onClick={() => { localStorage.removeItem("sunotal_token"); window.location.reload(); }}
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="hidden sm:flex rounded-full border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
                onClick={() => setLocation("/login")}
              >
                Login / Sign Up
              </Button>
            )}

            {/* Cart Button */}
            <Button
              size="icon"
              className="rounded-full w-11 h-11 relative shadow-sm"
              onClick={openCart}
              aria-label="Open cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop Nav */}
      <nav className="hidden lg:block bg-background border-b sticky top-[73px] z-40 shadow-sm">
        <div className="container mx-auto px-4 overflow-x-auto no-scrollbar">
          <ul className="flex items-center gap-1 py-1">
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.path}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-medium transition-all inline-block whitespace-nowrap",
                    location === link.path
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile Nav (scrollable category strip) */}
      <nav className="lg:hidden bg-background border-b overflow-x-auto no-scrollbar">
        <ul className="flex items-center px-4 py-2 gap-2 w-max">
          {navLinks.map((link) => (
            <li key={link.name}>
              <Link
                href={link.path}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                  location === link.path
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent/50 text-muted-foreground"
                )}
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="absolute inset-0 bg-secondary/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-4/5 max-w-sm bg-background shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold">
                  SF
                </div>
                <span className="font-bold text-lg text-secondary">Sunotal Farms</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-background rounded-full shadow-sm text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground"
                    onClick={() => { localStorage.removeItem("sunotal_token"); window.location.reload(); }}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={() => { setLocation("/login"); setMobileMenuOpen(false); }}>
                  Login / Sign Up
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <ul className="flex flex-col px-2 gap-1">
                {navLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "block px-4 py-3 rounded-xl font-medium transition-colors",
                        location === link.path
                          ? "bg-primary/10 text-primary"
                          : "text-secondary hover:bg-accent"
                      )}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Cart Drawer ── */}
      {isOpen && (
        <div className="fixed inset-0 z-[110]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-secondary/70 backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Panel */}
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-background shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-primary/5">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg text-secondary">Your Cart</h2>
                {totalItems > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {totalItems}
                  </span>
                )}
              </div>
              <button
                onClick={closeCart}
                className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
                  <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center">
                    <ShoppingCart className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary text-lg mb-1">Your cart is empty</p>
                    <p className="text-muted-foreground text-sm">Add some fresh produce to get started</p>
                  </div>
                  <Button onClick={() => { closeCart(); setLocation("/products"); }} className="rounded-full px-8">
                    Browse Products
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border px-4 py-2">
                  {items.map(({ product, quantity }) => (
                    <li key={product.id} className="flex gap-4 py-4">
                      <div className="w-18 h-18 flex-shrink-0">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-16 h-16 rounded-xl object-cover border border-border"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-secondary text-sm leading-tight line-clamp-2">{product.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{product.unit}</p>
                        <p className="text-primary font-bold mt-1">{fmt(product.price)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <button
                          onClick={() => removeItem(product.id)}
                          className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-2 rounded-full border border-border bg-accent/30 px-2 py-1">
                          <button
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="w-5 h-5 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold w-5 text-center">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="w-5 h-5 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-secondary">{fmt(product.price * quantity)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t bg-background px-6 py-5 space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-semibold text-secondary">{fmt(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Delivery</span>
                  <span className="text-green-600 font-semibold">FREE</span>
                </div>
                <div className="flex items-center justify-between font-bold text-lg text-secondary border-t pt-3">
                  <span>Total</span>
                  <span className="text-primary">{fmt(totalPrice)}</span>
                </div>
                <Button
                  className="w-full h-12 text-base font-bold rounded-xl shadow-md shadow-primary/20"
                  onClick={() => {
                    if (!user) { closeCart(); setLocation("/login"); }
                    else { closeCart(); setLocation("/checkout"); }
                  }}
                >
                  {user ? "Proceed to Checkout" : "Login to Checkout"}
                </Button>
                <button
                  onClick={clearCart}
                  className="w-full text-center text-xs text-muted-foreground hover:text-destructive transition-colors py-1"
                >
                  Clear cart
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground pt-16 pb-8 border-t-4 border-primary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-primary/20">
                  SF
                </div>
                <div>
                  <h3 className="font-bold text-2xl leading-none tracking-tight">Sunotal</h3>
                  <p className="text-xs uppercase tracking-widest text-primary font-bold">Farms</p>
                </div>
              </div>
              <p className="text-secondary-foreground/70 mb-6 max-w-sm">
                Premium, trust-first farm-to-door grocery platform. Every gram is traceable back to a verified farmer.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-secondary-foreground/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-secondary-foreground/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-secondary-foreground/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Company</h4>
              <ul className="flex flex-col gap-3">
                <li><Link href="/about" className="text-secondary-foreground/70 hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/farmer" className="text-secondary-foreground/70 hover:text-white transition-colors">For Farmers</Link></li>
                <li><Link href="/careers" className="text-secondary-foreground/70 hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/press" className="text-secondary-foreground/70 hover:text-white transition-colors">Press</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Categories</h4>
              <ul className="flex flex-col gap-3">
                <li><Link href="/vegetables" className="text-secondary-foreground/70 hover:text-white transition-colors">Fresh Vegetables</Link></li>
                <li><Link href="/fruits" className="text-secondary-foreground/70 hover:text-white transition-colors">Fresh Fruits</Link></li>
                <li><Link href="/dairy" className="text-secondary-foreground/70 hover:text-white transition-colors">Dairy Products</Link></li>
                <li><Link href="/grains" className="text-secondary-foreground/70 hover:text-white transition-colors">Organic Grains</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Contact Support</h4>
              <ul className="flex flex-col gap-4 text-secondary-foreground/70">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Sunotal Hub, Jubilee Hills,<br />Hyderabad, TG 500033</span>
                </li>
                <li>Email: <a href="mailto:support@sunotal.com" className="text-white hover:text-primary transition-colors">support@sunotal.com</a></li>
                <li>Phone: <a href="tel:1800555FARM" className="text-white hover:text-primary transition-colors font-medium">1800-555-FARM</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-secondary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-secondary-foreground/50">
            <p>&copy; {new Date().getFullYear()} Sunotal Farms. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
