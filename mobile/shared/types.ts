export interface Product {
  id: number | string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  unit: string;
  image: string;
  stock: number;
  description?: string;
  isOrganic?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id: number | string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  items: OrderItem[];
  totalPrice: number;
  status: 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  deliveryAddress: string;
  city: string;
  pincode: string;
  paymentMethod: string;
  tipAmount?: number;
  deliveryInstruction?: string;
  replacementPref?: string;
  estimatedDelivery?: string;
  riderName?: string;
  riderPhone?: string;
}

export interface RiderLocation {
  orderId: string;
  riderId: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  speedKmH?: number;
}

export interface Subscription {
  id: number | string;
  productName: string;
  frequency: string;
  deliverySlot: string;
  quantity: number;
  price: number;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
}
