import React, { useState, useEffect } from "react";
import { MapPin, Plus, Navigation, CheckCircle2, RefreshCw, Loader2, Edit3, Settings, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { fetchWarehouses, createWarehouse, updateWarehouse, calculateDeliveryFee, Warehouse } from "../../lib/api-client";

export const WarehouseManager: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    latitude: 12.9716,
    longitude: 77.5946,
    freeDeliveryRadiusKm: 25.0,
    baseDeliveryFee: 50.0,
    perKmRate: 8.0,
  });

  // Delivery Calculator Test Tool State
  const [testCity, setTestCity] = useState("Bengaluru");
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const loadWarehouses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWarehouses();
      setWarehouses(data);
    } catch (err: any) {
      setError(err.message || "Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleOpenAdd = () => {
    setEditWarehouse(null);
    setFormData({
      name: "",
      address: "",
      city: "",
      latitude: 12.9716,
      longitude: 77.5946,
      freeDeliveryRadiusKm: 25.0,
      baseDeliveryFee: 50.0,
      perKmRate: 8.0,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (wh: Warehouse) => {
    setEditWarehouse(wh);
    setFormData({
      name: wh.name,
      address: wh.address,
      city: wh.city,
      latitude: wh.latitude,
      longitude: wh.longitude,
      freeDeliveryRadiusKm: wh.freeDeliveryRadiusKm,
      baseDeliveryFee: wh.baseDeliveryFee,
      perKmRate: wh.perKmRate,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editWarehouse) {
        await updateWarehouse(editWarehouse.id, formData);
      } else {
        await createWarehouse(formData);
      }
      setShowModal(false);
      loadWarehouses();
    } catch (err: any) {
      alert(err.message || "Operation failed");
    }
  };

  const handleTestCalculate = async () => {
    setCalcLoading(true);
    try {
      const res = await calculateDeliveryFee({ city: testCity });
      setCalcResult(res);
    } catch (err: any) {
      alert("Calculation failed");
    } finally {
      setCalcLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Navigation className="w-7 h-7 text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight">Warehouse & Delivery Logistics Engine</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure fulfillment hub coordinates, 25km free delivery radius thresholds, and distance rates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadWarehouses} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Warehouse Hub
          </Button>
        </div>
      </div>

      {/* Industry Standard Rule Summary Banner */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
          <p className="font-bold text-sm">Industry Standard Delivery Fee Calculation Active</p>
          <p>
            Distance is dynamically computed using the <strong>Haversine Spherical Formula</strong> between customer coordinates and nearest warehouse:
          </p>
          <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px]">
            <li>Distance &le; 25 km: <strong>FREE Delivery (₹0)</strong></li>
            <li>Distance &gt; 25 km: <strong>Base Fee (₹50) + ₹8 per extra km</strong></li>
          </ul>
        </div>
      </div>

      {/* Warehouse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((wh) => (
          <div key={wh.id} className="border rounded-xl p-5 bg-card shadow-sm hover:shadow-md transition-shadow relative space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">{wh.name}</h3>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                wh.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-muted-foreground"
              }`}>
                {wh.isActive ? "ACTIVE HUB" : "INACTIVE"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">{wh.address}, {wh.city}</p>

            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-3 rounded-lg font-mono">
              <div>
                <span className="text-muted-foreground text-[10px]">Coordinates</span>
                <p className="font-medium text-foreground">{wh.latitude.toFixed(4)}, {wh.longitude.toFixed(4)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px]">Free Radius</span>
                <p className="font-medium text-emerald-600">{wh.freeDeliveryRadiusKm} km (₹0)</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px]">Base Fee</span>
                <p className="font-medium text-foreground">₹{wh.baseDeliveryFee}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px]">Rate After 25km</span>
                <p className="font-medium text-foreground">₹{wh.perKmRate}/km</p>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(wh)}>
                <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit Hub
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Distance Calculator Test Tool */}
      <div className="border rounded-xl p-6 bg-card space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-lg">Test Distance & Delivery Calculator</h2>
        </div>
        <p className="text-xs text-muted-foreground">Test how delivery fees are calculated for different Indian cities.</p>

        <div className="flex gap-3 max-w-md">
          <Input
            value={testCity}
            onChange={(e) => setTestCity(e.target.value)}
            placeholder="e.g. Bengaluru, Mumbai, Delhi, Hosur"
            className="text-xs"
          />
          <Button onClick={handleTestCalculate} disabled={calcLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
            {calcLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Calculate
          </Button>
        </div>

        {calcResult && (
          <div className="p-4 bg-muted/40 rounded-xl border text-xs space-y-2 font-mono max-w-lg">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nearest Hub:</span>
              <strong className="text-foreground">{calcResult.warehouseName} ({calcResult.warehouseCity})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Haversine Distance:</span>
              <strong className="text-foreground">{calcResult.distanceKm} km</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Free Threshold:</span>
              <strong className="text-emerald-600">{calcResult.freeRadiusKm} km</strong>
            </div>
            <div className="flex justify-between pt-2 border-t text-sm font-bold">
              <span>Calculated Delivery Charge:</span>
              <span className={calcResult.isFree ? "text-emerald-600 font-extrabold" : "text-foreground"}>
                {calcResult.isFree ? "FREE (₹0)" : `₹${calcResult.deliveryFee}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg">{editWarehouse ? "Edit Warehouse Hub" : "Add Fulfillment Warehouse"}</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs">Warehouse Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Bengaluru Central Hub"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Bengaluru"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Indiranagar"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Free Radius (km)</Label>
                  <Input
                    type="number"
                    value={formData.freeDeliveryRadiusKm}
                    onChange={(e) => setFormData({ ...formData, freeDeliveryRadiusKm: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Base Fee (₹)</Label>
                  <Input
                    type="number"
                    value={formData.baseDeliveryFee}
                    onChange={(e) => setFormData({ ...formData, baseDeliveryFee: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Per Km Rate (₹)</Label>
                  <Input
                    type="number"
                    value={formData.perKmRate}
                    onChange={(e) => setFormData({ ...formData, perKmRate: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save Warehouse Hub
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
