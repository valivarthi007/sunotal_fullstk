import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

const products: any[] = [];
const categories: any[] = [];
const DARK_STORES: any[] = [];

app.get('/healthz', (_req, res) => {
  res.json({ service: 'catalog-service', status: 'OK', productsCount: products.length, timestamp: new Date().toISOString() });
});

app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'catalog-service' });
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
