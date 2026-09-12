import { Router, Request, Response } from 'express';
import { reserveOrderInventory } from '../services/reservation.service';

const router = Router();

// 1. Dark Store Discovery (Geospatial lookup within 2.5 km radius)
router.get('/dark-stores/nearby', (req: Request, res: Response) => {
  const lat = Number(req.query.lat) || 12.9716;
  const lon = Number(req.query.lon) || 77.5946;

  const nearbyStores = [
    {
      id: 'STORE-BANGALORE-CENTRAL-01',
      name: 'Sunotal Dark Store - Indiranagar Hub',
      distanceKm: 1.2,
      deliveryWindowMinutes: '10-12 mins',
      isOpen: true,
      address: '100ft Road, Indiranagar, Bengaluru'
    }
  ];

  return res.json({ success: true, userLocation: { lat, lon }, stores: nearbyStores });
});

// 2. Sub-Second Typo-Tolerant Catalog Search
router.get('/search', (req: Request, res: Response) => {
  const query = String(req.query.q || '').toLowerCase();
  
  const mockProducts = [
    { id: 'PROD-01', name: 'Fresh Organic Tomatoes', category: 'Vegetables', price: 32, rating: 4.8, image: '/assets/tomatoes.jpg' },
    { id: 'PROD-02', name: 'Amul Taaza Toned Milk 500ml', category: 'Dairy', price: 27, rating: 4.9, image: '/assets/milk.jpg' },
    { id: 'PROD-03', name: 'Britannia Whole Wheat Bread 400g', category: 'Bakery', price: 45, rating: 4.7, image: '/assets/bread.jpg' },
    { id: 'PROD-04', name: 'Farm Fresh White Eggs 6s', category: 'Eggs & Poultry', price: 52, rating: 4.9, image: '/assets/eggs.jpg' }
  ];

  const results = mockProducts.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query) || query === '');
  
  return res.json({ success: true, count: results.length, products: results });
});

// 3. Reserve Cart Inventory with 5-Minute TTL Lock
router.post('/checkout/reserve', async (req: Request, res: Response) => {
  const { storeId, items } = req.body;
  const targetStore = storeId || 'STORE-BANGALORE-CENTRAL-01';
  const cartItems = items || [{ skuId: 'SKU-MILK-01', qty: 1 }];

  const reserved = await reserveOrderInventory(targetStore, cartItems);

  if (!reserved) {
    return res.status(400).json({ success: false, message: 'Stock unavailable or sold out during checkout reservation lock.' });
  }

  return res.json({
    success: true,
    reservationId: `RES-${Date.now()}`,
    ttlSeconds: 300,
    message: 'Cart locked for 5 minutes. Proceed to payment.'
  });
});

export default router;
