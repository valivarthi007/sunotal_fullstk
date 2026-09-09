import React, { useState, useEffect } from "react";
import { Clock, Zap, CheckCircle2 } from "lucide-react";
import { fetchDeliverySlots, DeliverySlotApi } from "../../lib/api-client";

interface DeliverySlotPickerProps {
  selectedSlotId: string;
  onSelectSlot: (slotId: string, slotName: string) => void;
}

export const DeliverySlotPicker: React.FC<DeliverySlotPickerProps> = ({
  selectedSlotId,
  onSelectSlot,
}) => {
  const [slots, setSlots] = useState<DeliverySlotApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliverySlots()
      .then((data) => {
        setSlots(data);
        if (data.length > 0 && !selectedSlotId) {
          onSelectSlot(data[0].id, data[0].name);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-emerald-600" /> Choose Preferred Delivery Window
        </label>
        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
          GUARANTEED TIMINGS
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          return (
            <div
              key={slot.id}
              onClick={() => onSelectSlot(slot.id, slot.name)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                isSelected
                  ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 shadow-sm font-semibold"
                  : "border-border hover:border-emerald-600/40 text-muted-foreground bg-card"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {slot.id === "express_2hr" ? <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> : <Clock className="w-4 h-4 text-emerald-600" />}
                  <span className="text-xs font-bold text-foreground">{slot.name}</span>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">{slot.description}</span>
                <span className="font-bold text-emerald-600">₹{slot.price}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
