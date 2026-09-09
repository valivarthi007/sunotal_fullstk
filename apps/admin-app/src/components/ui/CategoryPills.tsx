import React from "react";

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  badge?: string;
}

export const GROCERY_CATEGORIES: CategoryItem[] = [
  { id: "All", name: "All Items", icon: "🛒" },
  { id: "Vegetables", name: "Fresh Vegetables", icon: "🥦", badge: "Farm Fresh" },
  { id: "Fruits", name: "Fresh Fruits", icon: "🍎", badge: "Organic" },
  { id: "Dairy", name: "Dairy & Eggs", icon: "🥛", badge: "Daily" },
  { id: "Beverages", name: "Cold Drinks & Juices", icon: "🧃" },
  { id: "Snacks", name: "Snacks & Munchies", icon: "🍿" },
  { id: "Bakery", name: "Bakery & Instant", icon: "🥐" },
  { id: "Grains", name: "Atta, Rice & Dal", icon: "🌾" },
  { id: "Dry Fruits", name: "Dry Fruits & Nuts", icon: "🥜" },
];

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="w-full bg-background border-b border-border py-3 px-4 overflow-x-auto no-scrollbar scroll-smooth">
      <div className="max-w-7xl mx-auto flex items-center gap-2 min-w-max">
        {GROCERY_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all shadow-sm ${
                isSelected
                  ? "bg-emerald-600 text-white shadow-emerald-600/20 shadow-md scale-105"
                  : "bg-secondary/60 hover:bg-secondary text-foreground hover:scale-102"
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              <span>{cat.name}</span>
              {cat.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                    isSelected
                      ? "bg-emerald-800 text-emerald-100"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  }`}
                >
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
