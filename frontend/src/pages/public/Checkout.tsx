import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetCurrentUser({ query: { retry: false } });
  const { items, totalItems, totalPrice, clearCart } = useCart();

  useEffect(() => {
    if (!user) setLocation('/login');
  }, [user, setLocation]);

  const handlePlaceOrder = async () => {
    // NOTE: No orders API implemented yet — simulate order placement for now
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 600));
    clearCart();
    toast.success('Order placed (demo) — implement backend orders for production');
    setLocation('/');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <p className="text-sm text-muted-foreground mb-6">Review your items and place the order.</p>

      {items.length === 0 ? (
        <div className="p-8 bg-card border border-border rounded-xl text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-4">
            <ul className="space-y-4">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.unit} × {quantity}</div>
                  </div>
                  <div className="font-semibold">₹{product.price * quantity}</div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="bg-card border border-border rounded-xl p-4">
            <div className="mb-4">
              <div className="text-sm text-muted-foreground">Subtotal ({totalItems} items)</div>
              <div className="text-2xl font-bold">₹{totalPrice}</div>
            </div>
            <Button className="w-full" onClick={handlePlaceOrder}>Place Order</Button>
          </aside>
        </div>
      )}
    </div>
  );
}
