import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { mobileApiFetch } from '../../shared/api';

interface DeliveryTask {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  distanceKm: number;
  payoutAmount: number;
  tipAmount: number;
  instruction: string;
  itemsCount: number;
  status: 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED';
}

export default function App() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'active' | 'earnings'>('deliveries');
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeDelivery, setActiveDelivery] = useState<DeliveryTask | null>(null);
  const [currentLat, setCurrentLat] = useState<number>(12.9716);
  const [currentLng, setCurrentLng] = useState<number>(77.5946);
  const [completedToday, setCompletedToday] = useState<number>(0);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);

  // Fetch pending delivery tasks dynamically from API
  useEffect(() => {
    setIsLoading(true);
    mobileApiFetch('/api/orders')
      .then((data) => {
        const rawOrders = Array.isArray(data) ? data : (data.orders || []);
        if (Array.isArray(rawOrders)) {
          const mappedTasks: DeliveryTask[] = rawOrders
            .filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled')
            .map((o: any) => ({
              id: String(o.id || o.orderNumber),
              orderNumber: String(o.orderNumber || `ORD-${o.id}`),
              customerName: o.user_name || o.userName || 'Customer',
              customerPhone: o.user_phone || '+91 98765 43210',
              address: [o.delivery_address || o.deliveryAddress, o.city].filter(Boolean).join(', ') || 'Indiranagar, Bengaluru',
              distanceKm: Number(o.distance_km || 2.4),
              payoutAmount: 60 + Math.round((Number(o.distance_km || 2.4) * 5)),
              tipAmount: Number(o.tip_amount || o.tipAmount || 0),
              instruction: o.delivery_instruction || o.deliveryInstruction || 'Deliver safely to doorstep',
              itemsCount: Array.isArray(o.items) ? o.items.length : 1,
              status: 'PENDING',
            }));
          setTasks(mappedTasks);
        }
      })
      .catch((e) => console.log('Tasks fetch error:', e.message))
      .finally(() => setIsLoading(false));
  }, []);

  // Live GPS stream simulator pushing location every 5 seconds to gateway endpoint
  useEffect(() => {
    if (!activeDelivery || activeDelivery.status !== 'PICKED_UP') return;

    const interval = setInterval(() => {
      setCurrentLat((prev) => prev + (Math.random() - 0.5) * 0.001);
      setCurrentLng((prev) => prev + (Math.random() - 0.5) * 0.001);

      mobileApiFetch(`/api/orders/${activeDelivery.id}/location`, {
        method: 'POST',
        body: JSON.stringify({
          orderId: activeDelivery.id,
          riderId: 'RIDER-101',
          latitude: currentLat,
          longitude: currentLng,
          speedKmH: 24,
        }),
      }).catch((e) => console.log('Location push:', e.message));
    }, 5000);

    return () => clearInterval(interval);
  }, [activeDelivery, currentLat, currentLng]);

  const handleAcceptTask = (task: DeliveryTask) => {
    const updated = { ...task, status: 'ACCEPTED' as const };
    setActiveDelivery(updated);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setActiveTab('active');
    
    mobileApiFetch(`/api/orders/${task.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'out_for_delivery' }),
    }).catch(() => null);

    Alert.alert('Delivery Accepted 🚀', `Head to Dark Store Hub for pickup (Order ${task.orderNumber}).`);
  };

  const handlePickupOrder = () => {
    if (!activeDelivery) return;
    setActiveDelivery({ ...activeDelivery, status: 'PICKED_UP' });
    Alert.alert('Order Picked Up! 📦', 'Live GPS sharing activated. Navigation route updated.');
  };

  const handleCompleteDelivery = () => {
    if (!activeDelivery) return;
    const earned = activeDelivery.payoutAmount + activeDelivery.tipAmount;
    setTodayEarnings((prev) => prev + earned);
    setCompletedToday((prev) => prev + 1);

    mobileApiFetch(`/api/orders/${activeDelivery.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'delivered' }),
    }).catch(() => null);

    Alert.alert('Delivery Complete! 🎉', `Earned ₹${earned} (Fee: ₹${activeDelivery.payoutAmount} + Tip: ₹${activeDelivery.tipAmount})`);
    setActiveDelivery(null);
    setActiveTab('deliveries');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#047857" />

      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rider Delivery Partner</Text>
          <Text style={styles.headerSub}>ID: RIDER-101 • Dynamic Live Dispatch</Text>
        </View>
        <View style={styles.dutySwitch}>
          <Text style={styles.dutyText}>{isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}</Text>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: '#64748b', true: '#a7f3d0' }}
            thumbColor={isOnline ? '#059669' : '#f8fafc'}
          />
        </View>
      </View>

      {/* Earnings Quick Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryVal}>₹{todayEarnings}</Text>
          <Text style={styles.summaryLabel}>Today's Earnings</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryVal}>{completedToday}</Text>
          <Text style={styles.summaryLabel}>Completed Runs</Text>
        </View>
      </View>

      {/* Main Body */}
      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#047857" />
            <Text style={styles.loadingText}>Fetching available dark store orders from API...</Text>
          </View>
        ) : (
          <>
            {/* AVAILABLE ORDERS QUEUE */}
            {activeTab === 'deliveries' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Available Dark Store Orders ({tasks.length})</Text>

                {!isOnline ? (
                  <View style={styles.offlineBox}>
                    <Text style={{ fontSize: 36, marginBottom: 8 }}>🔴</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>You are currently Offline</Text>
                    <Text style={{ color: '#64748b', marginTop: 4 }}>Turn switch to Online to start receiving delivery orders.</Text>
                  </View>
                ) : tasks.length === 0 ? (
                  <View style={styles.offlineBox}>
                    <Text style={{ fontSize: 36, marginBottom: 8 }}>✅</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>No pending orders</Text>
                    <Text style={{ color: '#64748b', marginTop: 4 }}>Orders placed by customers will appear here automatically.</Text>
                  </View>
                ) : (
                  tasks.map((task) => (
                    <View key={task.id} style={styles.taskCard}>
                      <View style={styles.taskHeader}>
                        <Text style={styles.taskOrderId}>{task.orderNumber}</Text>
                        <Text style={styles.taskPayout}>₹{task.payoutAmount + task.tipAmount}</Text>
                      </View>

                      <Text style={styles.taskAddress}>📍 Destination: {task.address}</Text>
                      <Text style={styles.taskMeta}>Distance: {task.distanceKm} km • {task.itemsCount} items</Text>

                      {task.instruction ? (
                        <View style={styles.instBox}>
                          <Text style={styles.instText}>Customer Note: {task.instruction}</Text>
                        </View>
                      ) : null}

                      {task.tipAmount > 0 ? (
                        <Text style={styles.tipText}>Includes ₹{task.tipAmount} Customer Tip 🎁</Text>
                      ) : null}

                      <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptTask(task)}>
                        <Text style={styles.acceptBtnText}>ACCEPT DELIVERY ORDER</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* ACTIVE DELIVERY RUN TAB */}
            {activeTab === 'active' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Current Active Run</Text>

                {activeDelivery ? (
                  <View style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskOrderId}>{activeDelivery.orderNumber}</Text>
                      <Text style={[styles.taskPayout, { color: '#059669' }]}>
                        Status: {activeDelivery.status}
                      </Text>
                    </View>

                    <View style={styles.mapVisual}>
                      <Text style={{ fontSize: 32 }}>🛵 💨</Text>
                      <Text style={{ fontWeight: 'bold', color: '#047857', marginTop: 4 }}>
                        Live GPS Stream Active ({currentLat.toFixed(4)}, {currentLng.toFixed(4)})
                      </Text>
                      <Text style={{ fontSize: 11, color: '#065f46' }}>Target ETA: 8 minutes</Text>
                    </View>

                    <View style={{ marginVertical: 10 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{activeDelivery.customerName}</Text>
                      <Text style={{ color: '#475569', fontSize: 13 }}>{activeDelivery.address}</Text>
                      <Text style={{ color: '#0284c7', fontWeight: 'bold', marginTop: 4 }}>
                        📞 Call Customer: {activeDelivery.customerPhone}
                      </Text>
                    </View>

                    {activeDelivery.status === 'ACCEPTED' ? (
                      <TouchableOpacity style={styles.acceptBtn} onPress={handlePickupOrder}>
                        <Text style={styles.acceptBtnText}>CONFIRM DARK STORE PICKUP</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: '#10b981' }]} onPress={handleCompleteDelivery}>
                        <Text style={styles.acceptBtnText}>MARK ORDER AS DELIVERED ✅</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.offlineBox}>
                    <Text style={{ fontSize: 36, marginBottom: 8 }}>🚴</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>No active delivery in progress</Text>
                    <Text style={{ color: '#64748b', marginTop: 4 }}>Accept a new order from the Deliveries tab.</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* EARNINGS LEDGER TAB */}
            {activeTab === 'earnings' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Earnings & Payout Ledger</Text>

                <View style={styles.ledgerCard}>
                  <Text style={styles.ledgerTitle}>Today's Payout Summary</Text>
                  <View style={styles.ledgerRow}>
                    <Text style={styles.ledgerLabel}>Base Delivery Charges ({completedToday} runs)</Text>
                    <Text style={styles.ledgerVal}>₹{completedToday * 60}</Text>
                  </View>
                  <View style={styles.ledgerRow}>
                    <Text style={styles.ledgerLabel}>Customer Tips (100% Payout)</Text>
                    <Text style={styles.ledgerVal}>₹{Math.max(0, todayEarnings - (completedToday * 60))}</Text>
                  </View>
                  <View style={[styles.ledgerRow, { borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={{ fontWeight: 'bold', fontSize: 15 }}>Total Daily Earnings</Text>
                    <Text style={{ fontWeight: 'extrabold', fontSize: 18, color: '#059669' }}>₹{todayEarnings}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.payoutBtn} onPress={() => Alert.alert('Bank Payout', 'Payout of ₹' + todayEarnings + ' initiated to registered UPI ID.')}>
                  <Text style={styles.payoutBtnText}>INSTANT BANK PAYOUT TO UPI</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </>
        )}
      </View>

      {/* Bottom Rider Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('deliveries')}>
          <Text style={styles.tabIcon}>📋</Text>
          <Text style={[styles.tabLabel, activeTab === 'deliveries' && styles.tabLabelActive]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('active')}>
          <Text style={styles.tabIcon}>🛵</Text>
          <Text style={[styles.tabLabel, activeTab === 'active' && styles.tabLabelActive]}>Active Run</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('earnings')}>
          <Text style={styles.tabIcon}>💰</Text>
          <Text style={[styles.tabLabel, activeTab === 'earnings' && styles.tabLabelActive]}>Earnings</Text>
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
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#a7f3d0',
    fontSize: 11,
  },
  dutySwitch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dutyText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 6,
  },
  summaryBar: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: 'extrabold',
    color: '#059669',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: '#e2e8f0',
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    marginVertical: 10,
  },
  offlineBox: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskOrderId: {
    fontSize: 15,
    fontWeight: 'extrabold',
  },
  taskPayout: {
    fontSize: 16,
    fontWeight: 'extrabold',
    color: '#059669',
  },
  taskAddress: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  taskMeta: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  instBox: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  instText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#b45309',
  },
  tipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 10,
  },
  acceptBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  acceptBtnText: {
    color: '#ffffff',
    fontWeight: 'extrabold',
    fontSize: 13,
  },
  mapVisual: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  ledgerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  ledgerTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 10,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  ledgerLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  ledgerVal: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  payoutBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payoutBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
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
