import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

const DEFAULT_PRODUCTS = [
  { id: '1', name: 'Fresh Organic Tomatoes', category: 'Vegetables', price: 40, originalPrice: 50, unit: '1 kg', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400', isOrganic: true, stock: 150, rating: 4.8 },
  { id: '2', name: 'Farm Fresh Milk (A2 Gir Cow)', category: 'Dairy', price: 65, originalPrice: 75, unit: '1 L', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', isOrganic: true, stock: 80, rating: 4.9 },
  { id: '3', name: 'Alphonso Mangoes (Devgad)', category: 'Fruits', price: 450, originalPrice: 600, unit: '1 dozen', image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400', isOrganic: true, stock: 40, rating: 5.0 },
  { id: '4', name: 'Whole Wheat Sourdough Bread', category: 'Bakery', price: 90, originalPrice: 110, unit: '400g', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', isOrganic: false, stock: 25, rating: 4.6 },
  { id: '5', name: 'Organic Spinach (Palak)', category: 'Vegetables', price: 25, originalPrice: 35, unit: '250g', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400', isOrganic: true, stock: 200, rating: 4.7 },
  { id: '6', name: 'Cold Pressed Coconut Oil', category: 'Oils & Ghee', price: 320, originalPrice: 380, unit: '500ml', image: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=400', isOrganic: true, stock: 60, rating: 4.9 },
  { id: '7', name: 'Premium Kashmiri Almonds', category: 'Dry Fruits', price: 600, originalPrice: 750, unit: '500g', image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400', isOrganic: true, stock: 90, rating: 4.8 },
  { id: '8', name: 'Fresh Paneer (Cottage Cheese)', category: 'Dairy', price: 120, originalPrice: 140, unit: '200g', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400', isOrganic: false, stock: 50, rating: 4.7 }
];

const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Vegetables', icon: '🥬' },
  { id: '2', name: 'Fruits', icon: '🍎' },
  { id: '3', name: 'Dairy', icon: '🥛' },
  { id: '4', name: 'Bakery', icon: '🍞' },
  { id: '5', name: 'Dry Fruits', icon: '🥜' },
  { id: '6', name: 'Oils & Ghee', icon: '🛢️' }
];

const DARK_STORES = [
  { id: 'DS-BLR-01', name: 'Sunotal Express - Indiranagar', lat: 12.9716, lon: 77.5946, status: 'ACTIVE', radiusKm: 2.5 },
  { id: 'DS-BLR-02', name: 'Sunotal Express - Koramangala', lat: 12.9352, lon: 77.6245, status: 'ACTIVE', radiusKm: 3.0 }
];

let products = [...DEFAULT_PRODUCTS];
let categories = [...DEFAULT_CATEGORIES];

app.get('/healthz', (_req, res) => {
  res.json({ service: 'catalog-service', status: 'OK', productsCount: products.length, timestamp: new Date().toISOString() });
});

// Products Listing with Filter/Search/Sort
app.get('/api/products', (req, res) => {
  const { category, search, sort } = req.query;
  let result = [...products];

  if (category && typeof category === 'string' && category !== 'All') {
    result = result.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    result = result.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }

  if (sort && typeof sort === 'string') {
    if (sort === 'price-low') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price-high') result.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);
  }

  // Returns direct plain array
  res.json(result);
});

// Single Product
app.get('/api/products/:id', (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// Create Product (Admin)
app.post('/api/products', (req, res) => {
  const { name, category, price, originalPrice, unit, image } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ error: 'Name, category, and price required' });
  }
  const newProduct = {
    id: String(Date.now()),
    name,
    category,
    price: Number(price),
    originalPrice: Number(originalPrice || price),
    unit: unit || '1 kg',
    image: image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    isOrganic: true,
    stock: 100,
    rating: 5.0
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// Categories List
app.get('/api/categories', (_req, res) => {
  res.json(categories);
});

// Dark Store Discovery
app.get('/api/storefront/dark-stores/nearby', (_req, res) => {
  res.json({ success: true, stores: DARK_STORES });
});

// Search API
app.get('/api/storefront/search', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const matched = products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  res.json({ success: true, products: matched });
});

app.listen(PORT, () => {
  console.log(`📦 catalog-service running on port ${PORT}`);
});
