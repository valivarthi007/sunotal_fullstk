import React, { useState } from 'react';
import { X, Navigation, CheckCircle2, PackageCheck, Zap, ArrowRight, BarChart } from 'lucide-react';

interface VisualWmsPickerPathModalProps {
  orderId: string;
  onClose: () => void;
}

export const VisualWmsPickerPathModal: React.FC<VisualWmsPickerPathModalProps> = ({ orderId, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);

  const pickingRoute = [
    { aisle: 'Aisle A1', shelf: 'Shelf S2', bin: 'Bin B02', item: 'Organic Milk 1L', qty: 2, status: 'picked' },
    { aisle: 'Aisle A2', shelf: 'Shelf S1', bin: 'Bin B05', item: 'Fresh Tomatoes 500g', qty: 1, status: 'picked' },
    { aisle: 'Aisle B1', shelf: 'Shelf S3', bin: 'Bin B01', item: 'Brown Eggs 12pk', qty: 1, status: 'current' },
    { aisle: 'Aisle C3', shelf: 'Shelf S4', bin: 'Bin B08', item: 'Whole Wheat Bread', qty: 1, status: 'pending' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Zap className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Visual Dark Store WMS Picking Path
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  EST. 78 SECONDS
                </span>
              </h3>
              <p className="text-xs text-slate-400">Order #{orderId} • SPF Shortest Path First Graph Traversal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dark Store Aisle Grid Layout Map */}
        <div className="p-6 bg-slate-950 border-b border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between items-center">
            <span>Dark Store Aisle Layout Grid (Aisle A1 → C3)</span>
            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Optimal Path Calculated</span>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {['Aisle A1', 'Aisle A2', 'Aisle B1', 'Aisle C3'].map((aisleName, idx) => {
              const matched = pickingRoute.find((r) => r.aisle === aisleName);
              const isCurrent = matched?.status === 'current';
              const isPicked = matched?.status === 'picked';

              return (
                <div
                  key={aisleName}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between h-36 ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-2 ring-amber-500/50'
                      : isPicked
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold">{aisleName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isCurrent ? 'bg-amber-500 text-slate-950' : isPicked ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isCurrent ? 'PICKING NOW' : isPicked ? 'DONE' : `STEP ${idx + 1}`}
                    </span>
                  </div>

                  {matched && (
                    <div>
                      <div className="text-xs font-bold text-slate-200 truncate">{matched.item}</div>
                      <div className="text-[10px] opacity-80 mt-1 font-mono">
                        {matched.shelf} • {matched.bin}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <ArrowRight className={`w-4 h-4 ${isCurrent ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Item Pick List Breakdown */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2 bg-slate-900/50">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Item Picking Checklist</div>
          {pickingRoute.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex items-center justify-between ${
                item.status === 'picked'
                  ? 'bg-slate-900 border-slate-800 text-slate-400 opacity-75'
                  : item.status === 'current'
                  ? 'bg-amber-500/10 border-amber-500/60 text-slate-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg font-mono text-xs font-bold ${
                  item.status === 'picked' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'
                }`}>
                  {item.aisle}
                </div>
                <div>
                  <div className="text-sm font-bold">{item.item}</div>
                  <div className="text-xs text-slate-400">Location: {item.shelf} • {item.bin}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs font-bold bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                  Qty: {item.qty}
                </span>
                <button
                  onClick={() => {
                    item.status = 'picked';
                    setActiveStep((prev) => prev + 1);
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                    item.status === 'picked'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {item.status === 'picked' ? '✓ Picked' : 'Confirm Pick'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
