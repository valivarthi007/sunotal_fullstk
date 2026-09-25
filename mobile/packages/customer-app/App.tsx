import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  StatusBar,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import { theme } from '../../shared/theme';
import { mobileApiFetch } from '../../shared/api';
import { Product, CartItem, Order, Subscription } from '../../shared/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'store' | 'search' | 'cart' | 'track' | 'profile'>('store');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Dynamic Checkout options
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [deliveryInstruction, setDeliveryInstruction] = useState<string>('');
  const [replacementPref, setReplacementPref] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  // Orders & Subscriptions state
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeOrderTrack, setActiveOrderTrack] = useState<Order | null>(null);

  // Fetch products on mount dynamically
  useEffect(() => {
    mobileApiFetch('/api/products')
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch((err) => {
        console.warn('Mobile API fetch error:', err);
        setProducts([]);
      });
  }, []);

  // Handle Typo-Tolerant Search API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    mobileApiFetch(`/api/storefront/search?q=${encodeURIComponent(searchQuery)}`)
      .then((res) => {
        if (res.products && Array.isArray(res.products)) {
          setSearchResults(res.products);
        }
      })
      .catch(() => {
        const filtered = products.filter((p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
      });
  }, [searchQuery, products]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => String(item.product.id) === String(product.id));
      if (existing) {
        return prev.map((item) =>
          String(item.product.id) === String(product.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string | number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          String(item.product.id) === String(productId)
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const getCartQuantity = (productId: string | number) => {
    const item = cart.find((i) => String(i.product.id) === String(productId));
    return item ? item.quantity : 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const gstAmount = Math.round(cartTotal * 0.05);
  const deliveryFee = cartTotal > 0 ? 0 : 0;
  const finalAmount = cartTotal + gstAmount + deliveryFee + tipAmount;

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before checking out.');
      return;
    }
    const orderId = `SUN-MOB-${Date.now().toString().slice(-6)}`;
    const newOrder: Order = {
      id: orderId,
      orderNumber: orderId,
      date: new Date().toLocaleDateString(),
      items: cart.map((c) => ({
        id: c.product.id,
        name: c.product.name,
        quantity: c.quantity,
        unit: c.product.unit,
        price: c.product.price,
      })),
      totalPrice: finalAmount,
      status: 'out_for_delivery',
      deliveryAddress: deliveryAddress,
      city: 'Bengaluru',
      pincode: '560038',
      paymentMethod: 'UPI / Mobile Pay',
      tipAmount: tipAmount,
      deliveryInstruction: deliveryInstruction,
      replacementPref: replacementPref,
      estimatedDelivery: '10 mins Express',
      riderName: 'Ramesh Kumar (Sunotal Partner)',
      riderPhone: '+91 98765 43210',
    };

    setOrders((prev) => [newOrder, ...prev]);
    setActiveOrderTrack(newOrder);
    setCart([]);
    Alert.alert('Order Confirmed! 🚀', `Order ${orderId} placed successfully. Track live delivery in real time.`);
    setActiveTab('track');
  };

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter((p) => p.category === selectedCategory);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Top Mobile Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>⚡ 10-MIN QUICK COMMERCE</Text>
          <Text style={styles.headerTitle}>Indiranagar, Bengaluru</Text>
        </View>
        <TouchableOpacity style={styles.headerBadge} onPress={() => setActiveTab('cart')}>
          <Text style={styles.headerBadgeText}>🛒 {cart.reduce((a, b) => a + b.quantity, 0)} Items</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Views */}
      <View style={styles.body}>
        {/* STOREFRONT TAB */}
        {activeTab === 'store' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Search Trigger Banner */}
            <TouchableOpacity style={styles.searchBarFake} onPress={() => setActiveTab('search')}>
              <Text style={styles.searchBarFakeText}>🔍 Search milk, organic vegetables, eggs...</Text>
            </TouchableOpacity>

            {/* Banner Carousel */}
            <View style={styles.bannerContainer}>
              <Text style={styles.bannerTitle}>🌾 Fresh Farm Direct 10-Min Delivery</Text>
              <Text style={styles.bannerSub}>Get up to 30% OFF organic dairy & veggies</Text>
            </View>

            {/* Category Filter Horizontal List */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Products Grid */}
            <Text style={styles.sectionTitle}>Farm Fresh Offerings ({filteredProducts.length})</Text>
            <View style={styles.grid}>
              {filteredProducts.map((product) => {
                const qty = getCartQuantity(product.id);
                return (
                  <View key={product.id} style={styles.card}>
                    <Image source={{ uri: product.image }} style={styles.cardImage} />
                    {product.isOrganic && (
                      <View style={styles.organicTag}>
                        <Text style={styles.organicTagText}>Organic</Text>
                      </View>
                    )}
                    <Text style={styles.cardCategory}>{product.category}</Text>
                    <Text style={styles.cardTitle} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.cardUnit}>{product.unit}</Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.cardPrice}>₹{product.price}</Text>
                      {qty === 0 ? (
                        <TouchableOpacity style={styles.addButton} onPress={() => addToCart(product)}>
                          <Text style={styles.addButtonText}>ADD</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.stepper}>
                          <TouchableOpacity style={styles.stepperBtn} onPress={() => removeFromCart(product.id)}>
                            <Text style={styles.stepperBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.stepperVal}>{qty}</Text>
                          <TouchableOpacity style={styles.stepperBtn} onPress={() => addToCart(product)}>
                            <Text style={styles.stepperBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* TYPO-TOLERANT SEARCH TAB */}
        {activeTab === 'search' && (
          <View style={{ flex: 1 }}>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search products (e.g. mlik, tomats)..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {searchResults.length > 0 ? (
                searchResults.map((product) => (
                  <View key={product.id} style={styles.searchRow}>
                    <Image source={{ uri: product.image }} style={styles.searchThumb} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.searchRowTitle}>{product.name}</Text>
                      <Text style={styles.searchRowSub}>{product.unit} • ₹{product.price}</Text>
                    </View>
                    <TouchableOpacity style={styles.addButton} onPress={() => addToCart(product)}>
                      <Text style={styles.addButtonText}>ADD</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : searchQuery ? (
                <Text style={styles.emptyText}>No products matching "{searchQuery}"</Text>
              ) : (
                <Text style={styles.emptyText}>Type above for typo-tolerant fuzzy search</Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* CART & CHECKOUT TAB */}
        {activeTab === 'cart' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Your Delivery Cart ({cart.length} items)</Text>

            {cart.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🛒</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>Your cart is empty</Text>
                <TouchableOpacity style={[styles.submitBtn, { marginTop: 16 }]} onPress={() => setActiveTab('store')}>
                  <Text style={styles.submitBtnText}>Explore Storefront</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {/* Cart Items */}
                {cart.map((item) => (
                  <View key={item.product.id} style={styles.cartRow}>
                    <Image source={{ uri: item.product.image }} style={styles.cartThumb} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cartRowTitle}>{item.product.name}</Text>
                      <Text style={styles.cartRowSub}>₹{item.product.price} × {item.quantity}</Text>
                    </View>
                    <Text style={styles.cartRowPrice}>₹{item.product.price * item.quantity}</Text>
                  </View>
                ))}

                {/* Delivery Address */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>📍 Delivery Destination</Text>
                  <TextInput
                    style={styles.addressInput}
                    value={deliveryAddress}
                    onChangeText={setDeliveryAddress}
                  />
                </View>

                {/* Delivery Instructions Chips */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>📦 Rider Instructions</Text>
                  <View style={styles.chipRow}>
                    {['Do not ring bell', 'Leave with security', 'Pet at home', 'Call before arrival'].map((inst) => (
                      <TouchableOpacity
                        key={inst}
                        style={[styles.instChip, deliveryInstruction === inst && styles.instChipActive]}
                        onPress={() => setDeliveryInstruction(inst)}
                      >
                        <Text style={[styles.instChipText, deliveryInstruction === inst && styles.instChipTextActive]}>
                          {inst}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Rider Tipping Options */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>🚴 Tip Delivery Partner (100% goes to rider)</Text>
                  <View style={styles.tipRow}>
                    {[0, 10, 20, 30, 50].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={[styles.tipChip, tipAmount === amt && styles.tipChipActive]}
                        onPress={() => setTipAmount(amt)}
                      >
                        <Text style={[styles.tipChipText, tipAmount === amt && styles.tipChipTextActive]}>
                          {amt === 0 ? 'No Tip' : `₹${amt}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Bill Breakdown */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>🧾 Price Breakdown</Text>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Item Subtotal</Text>
                    <Text style={styles.billVal}>₹{cartTotal}</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>GST (5% Organic)</Text>
                    <Text style={styles.billVal}>₹{gstAmount}</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Delivery Fee</Text>
                    <Text style={[styles.billVal, { color: theme.colors.primary }]}>FREE</Text>
                  </View>
                  {tipAmount > 0 && (
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Rider Tip</Text>
                      <Text style={styles.billVal}>₹{tipAmount}</Text>
                    </View>
                  )}
                  <View style={[styles.billRow, { borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Total Payable</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'extrabold', color: theme.colors.primary }}>₹{finalAmount}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handlePlaceOrder}>
                  <Text style={styles.submitBtnText}>Place Order • ₹{finalAmount}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* LIVE TRACKING TAB */}
        {activeTab === 'track' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Live GPS Delivery Tracker</Text>

            {activeOrderTrack ? (
              <View style={styles.sectionCard}>
                <View style={styles.trackHeader}>
                  <Text style={styles.trackOrderId}>{activeOrderTrack.id}</Text>
                  <Text style={styles.trackStatus}>🚚 OUT FOR DELIVERY</Text>
                </View>

                {/* Simulated Map Visual */}
                <View style={styles.mapSim}>
                  <Text style={{ fontSize: 32 }}>📍 🛵 🏠</Text>
                  <Text style={styles.mapSimText}>Rider Ramesh Kumar is 0.8 km away from your address</Text>
                  <Text style={styles.mapSimTime}>Estimated arrival: 4 mins</Text>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>Delivery Address:</Text>
                  <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{activeOrderTrack.deliveryAddress}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#0284c7', marginTop: 16 }]}
                  onPress={() => Alert.alert('Calling Partner', 'Dialing rider Ramesh Kumar...')}
                >
                  <Text style={styles.submitBtnText}>📞 Call Delivery Partner ({activeOrderTrack.riderName})</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🛵</Text>
                <Text style={{ color: theme.colors.textMuted }}>No active order currently out for delivery.</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* PROFILE & SUBSCRIPTIONS TAB */}
        {activeTab === 'profile' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>Sunotal Mobile User</Text>
              <Text style={styles.profileEmail}>customer@sunotal.com • Verified</Text>
            </View>

            <Text style={styles.sectionTitle}>Daily Milk & Produce Subscriptions</Text>
            <TouchableOpacity
              style={styles.subscribeCard}
              onPress={() => {
                const newSub: Subscription = {
                  id: Date.now(),
                  productName: 'A2 Organic Fresh Milk (1L)',
                  frequency: 'Daily 6:00 AM',
                  deliverySlot: 'Morning Doorstep',
                  quantity: 1,
                  price: 68,
                  status: 'ACTIVE',
                };
                setSubscriptions((prev) => [newSub, ...prev]);
                Alert.alert('Subscription Started!', 'A2 Organic Fresh Milk will be delivered daily at 6 AM.');
              }}
            >
              <Text style={styles.subscribeTitle}>✨ Subscribe A2 Fresh Milk (Daily 6 AM)</Text>
              <Text style={styles.subscribeSub}>Tap to start doorstep morning delivery every day</Text>
            </TouchableOpacity>

            {subscriptions.map((sub) => (
              <View key={sub.id} style={styles.subItem}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{sub.status}</Text>
                  <Text style={{ fontSize: 15, fontWeight: 'bold' }}>{sub.productName}</Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>{sub.frequency}</Text>
                </View>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>₹{sub.price}/day</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Bottom Mobile Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('store')}>
          <Text style={styles.tabIcon}>🛒</Text>
          <Text style={[styles.tabLabel, activeTab === 'store' && styles.tabLabelActive]}>Store</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('search')}>
          <Text style={styles.tabIcon}>🔍</Text>
          <Text style={[styles.tabLabel, activeTab === 'search' && styles.tabLabelActive]}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('cart')}>
          <Text style={styles.tabIcon}>🛍️</Text>
          <Text style={[styles.tabLabel, activeTab === 'cart' && styles.tabLabelActive]}>Cart ({cart.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('track')}>
          <Text style={styles.tabIcon}>🚴</Text>
          <Text style={[styles.tabLabel, activeTab === 'track' && styles.tabLabelActive]}>Live Track</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSubtitle: {
    color: '#a7f3d0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  searchBarFake: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  searchBarFakeText: {
    color: '#64748b',
    fontSize: 13,
  },
  bannerContainer: {
    backgroundColor: '#064e3b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'extrabold',
  },
  bannerSub: {
    color: '#a7f3d0',
    fontSize: 12,
    marginTop: 4,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'extrabold',
    color: '#0f172a',
    marginVertical: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  organicTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  organicTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardCategory: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  cardUnit: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: 'extrabold',
    color: theme.colors.primary,
  },
  addButton: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addButtonText: {
    color: theme.colors.primary,
    fontWeight: 'extrabold',
    fontSize: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepperBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepperVal: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    marginHorizontal: 4,
  },
  searchInputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    height: 44,
    fontSize: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  searchRowTitle: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  searchRowSub: {
    fontSize: 11,
    color: '#64748b',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 30,
    fontSize: 13,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cartThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  cartRowTitle: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  cartRowSub: {
    fontSize: 11,
    color: '#64748b',
  },
  cartRowPrice: {
    fontWeight: 'extrabold',
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0f172a',
  },
  addressInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  instChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  instChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: theme.colors.primary,
  },
  instChipText: {
    fontSize: 11,
    color: '#475569',
  },
  instChipTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  tipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tipChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tipChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: theme.colors.primary,
  },
  tipChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
  },
  tipChipTextActive: {
    color: theme.colors.primary,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  billLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  billVal: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'extrabold',
    fontSize: 15,
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  trackOrderId: {
    fontWeight: 'extrabold',
    fontSize: 14,
  },
  trackStatus: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  mapSim: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  mapSimText: {
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  mapSimTime: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  subscribeCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  subscribeTitle: {
    fontWeight: 'bold',
    color: '#b45309',
    fontSize: 13,
  },
  subscribeSub: {
    fontSize: 11,
    color: '#d97706',
    marginTop: 2,
  },
  subItem: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  tabLabelActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
