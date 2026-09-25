import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { mobileApiFetch } from '../../shared/api';

interface InventoryItem {
  id: number | string;
  name: string;
  category: string;
  price: number;
  stock: number;
  inStock: boolean;
}

interface VendorOrder {
  id: string;
  orderNumber: string;
  items: string;
  total: number;
  status: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'inventory' | 'sales'>('dispatch');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [grossSales, setGrossSales] = useState<number>(0);

  // Fetch live inventory and orders dynamically from backend API
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      mobileApiFetch('/api/products').catch(() => []),
      mobileApiFetch('/api/orders').catch(() => []),
    ])
      .then(([productsData, ordersData]) => {
        if (Array.isArray(productsData)) {
          const mappedInv: InventoryItem[] = productsData.map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category || 'General',
            price: Number(p.price || 0),
            stock: Number(p.stock || 0),
            inStock: Number(p.stock || 0) > 0,
          }));
          setInventory(mappedInv);
        }

        const rawOrders = Array.isArray(ordersData) ? ordersData : (ordersData.orders || []);
        if (Array.isArray(rawOrders)) {
          const mappedOrders: VendorOrder[] = rawOrders.map((o: any) => ({
            id: String(o.orderNumber || o.id || `ORD-${o.id}`),
            orderNumber: String(o.orderNumber || o.id),
            items: Array.isArray(o.items)
              ? o.items.map((i: any) => `${i.quantity}x ${i.name || i.productName || 'Item'}`).join(', ')
              : 'Farm Produce Package',
            total: Number(o.totalPrice || o.total_amount || 0),
            status: (o.status || 'PACKING').toUpperCase(),
          }));
          setOrders(mappedOrders);
          
          const totalSales = mappedOrders.reduce((sum, o) => sum + o.total, 0);
          setGrossSales(totalSales);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const toggleStock = (id: number | string) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newInStock = !item.inStock;
          const newStock = newInStock ? 50 : 0;
          // Sync with API
          mobileApiFetch(`/api/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ stock: newStock }),
          }).catch(() => null);
          return { ...item, inStock: newInStock, stock: newStock };
        }
        return item;
      })
    );
  };

  const handleDispatch = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'DISPATCHED' } : o))
    );
    mobileApiFetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'out_for_delivery' }),
    }).catch(() => null);

    Alert.alert('Order Dispatched 📦', `Order ${orderId} marked packed & handed to nearest rider.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Store Partner Portal</Text>
        <Text style={styles.headerSub}>Dynamic API Inventory & Dispatch Controller</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Fetching live catalog & orders from API...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'dispatch' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Live Order Packing Queue ({orders.length})</Text>
                {orders.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📦</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 14 }}>No incoming orders</Text>
                    <Text style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Orders placed by customers will appear here live.</Text>
                  </View>
                ) : (
                  orders.map((o) => (
                    <View key={o.id} style={styles.card}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.orderId}>{o.orderNumber}</Text>
                        <Text style={[styles.statusTag, o.status === 'DISPATCHED' && styles.statusDispatched]}>
                          {o.status}
                        </Text>
                      </View>
                      <Text style={styles.orderItems}>{o.items}</Text>
                      <Text style={styles.orderTotal}>Order Value: ₹{o.total}</Text>

                      {o.status !== 'DISPATCHED' && (
                        <TouchableOpacity style={styles.dispatchBtn} onPress={() => handleDispatch(o.id)}>
                          <Text style={styles.dispatchBtnText}>MARK PACKED & DISPATCH TO RIDER</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {activeTab === 'inventory' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Live Stock Controller ({inventory.length} SKUs)</Text>
                {inventory.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 14 }}>Catalog is empty</Text>
                  </View>
                ) : (
                  inventory.map((item) => (
                    <View key={item.id} style={styles.card}>
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTitle}>{item.name}</Text>
                          <Text style={styles.itemSub}>{item.category} • ₹{item.price} • Stock: {item.stock}</Text>
                        </View>
                        <Switch
                          value={item.inStock}
                          onValueChange={() => toggleStock(item.id)}
                          trackColor={{ false: '#cbd5e1', true: '#a7f3d0' }}
                          thumbColor={item.inStock ? '#059669' : '#f8fafc'}
                        />
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {activeTab === 'sales' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Revenue & Platform Payouts</Text>
                <View style={styles.salesCard}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Gross Store Sales (Live API Aggregate)</Text>
                  <Text style={{ color: '#ffffff', fontSize: 28, fontWeight: '800', marginTop: 4 }}>₹{grossSales}</Text>
                  <Text style={{ color: '#10b981', fontSize: 12, marginTop: 4 }}>
                    Net Payout (8% Fee Deducted): ₹{Math.round(grossSales * 0.92)}
                  </Text>
                </View>
              </ScrollView>
            )}
          </>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('dispatch')}>
          <Text style={styles.tabIcon}>📦</Text>
          <Text style={[styles.tabLabel, activeTab === 'dispatch' && styles.tabLabelActive]}>Dispatch</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('inventory')}>
          <Text style={styles.tabIcon}>📑</Text>
          <Text style={[styles.tabLabel, activeTab === 'inventory' && styles.tabLabelActive]}>Stock Grid</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('sales')}>
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={[styles.tabLabel, activeTab === 'sales' && styles.tabLabelActive]}>Sales</Text>
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
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 10,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontWeight: '800',
    fontSize: 15,
  },
  statusTag: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDispatched: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  orderItems: {
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
  },
  orderTotal: {
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 4,
    color: '#059669',
  },
  dispatchBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  dispatchBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  salesCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 8,
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
    color: '#059669',
    fontWeight: 'bold',
  },
});
