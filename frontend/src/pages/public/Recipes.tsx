import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  Utensils,
  Clock,
  Flame,
  Plus,
  Check,
  ChevronLeft,
  ShoppingBag,
  Sparkles,
  ChefHat
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";

interface Recipe {
  id: string;
  title: string;
  category: string;
  prepTime: string;
  servings: string;
  calories: string;
  image: string;
  description: string;
  totalPrice: number;
  ingredients: { id: number; name: string; qty: string; price: number; image: string }[];
}

export default function Recipes() {
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const recipes: Recipe[] = [
    {
      id: "REC-1",
      title: "North Indian Paneer Butter Masala",
      category: "Dinner Kits",
      prepTime: "15 mins",
      servings: "3 People",
      calories: "420 kcal",
      image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80",
      description: "Rich, creamy cottage cheese in a velvety tomato-butter gravy with fresh spices.",
      totalPrice: 245,
      ingredients: [
        { id: 1, name: "Fresh Malai Paneer", qty: "200 g", price: 95, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=100&auto=format&fit=crop&q=80" },
        { id: 2, name: "Ripe Hydroponic Tomatoes", qty: "500 g", price: 45, image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=100&auto=format&fit=crop&q=80" },
        { id: 3, name: "Organic Red Onions", qty: "500 g", price: 35, image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=100&auto=format&fit=crop&q=80" },
        { id: 4, name: "Amul Pasteurised Butter", qty: "100 g", price: 58, image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=100&auto=format&fit=crop&q=80" },
      ],
    },
    {
      id: "REC-2",
      title: "Fresh Avocado Toast & Poached Egg",
      category: "Breakfast Express",
      prepTime: "8 mins",
      servings: "2 People",
      calories: "290 kcal",
      image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80",
      description: "Creamy Hass avocado on toasted artisan sourdough topped with farm-fresh organic eggs.",
      totalPrice: 280,
      ingredients: [
        { id: 5, name: "Imported Hass Avocado", qty: "1 pc", price: 120, image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=100&auto=format&fit=crop&q=80" },
        { id: 6, name: "Artisan Whole Wheat Sourdough", qty: "400 g", price: 85, image: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=100&auto=format&fit=crop&q=80" },
        { id: 7, name: "Farm Fresh Organic Brown Eggs", qty: "6 pcs", price: 75, image: "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=100&auto=format&fit=crop&q=80" },
      ],
    },
    {
      id: "REC-3",
      title: "Exotic Antioxidant Fruit Salad",
      category: "Healthy Bowls",
      prepTime: "5 mins",
      servings: "2 People",
      calories: "180 kcal",
      image: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&auto=format&fit=crop&q=80",
      description: "Hydrating mix of fresh blueberries, strawberries, kiwi, and crisp Fuji apples.",
      totalPrice: 310,
      ingredients: [
        { id: 8, name: "Fresh Blueberries Pack", qty: "125 g", price: 140, image: "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=100&auto=format&fit=crop&q=80" },
        { id: 9, name: "Fresh Zespri Green Kiwi", qty: "3 pcs", price: 90, image: "https://images.unsplash.com/photo-1585059819970-31398d66117d?w=100&auto=format&fit=crop&q=80" },
        { id: 10, name: "Crisp Red Fuji Apple", qty: "4 pcs", price: 80, image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=100&auto=format&fit=crop&q=80" },
      ],
    },
  ];

  const handleAddAllIngredients = (recipe: Recipe) => {
    recipe.ingredients.forEach((ing) => {
      addItem({
        id: ing.id,
        name: ing.name,
        price: ing.price,
        image: ing.image,
        unit: ing.qty,
      });
    });

    toast.success(
      `Added all ${recipe.ingredients.length} ingredients for "${recipe.title}" to cart!`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Store
          </Button>
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold text-white">1-Click Recipe Bundles</h1>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 border border-emerald-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 fill-emerald-400" /> Express Cooking Kits
            </div>
            <h2 className="text-3xl font-extrabold text-white">
              Cook Gourmet Meals in <span className="text-emerald-400">Under 15 Mins</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Skip ingredient hunting! Add complete curated recipe bundles to your cart in 1-click and get all fresh produce delivered in 10-15 minutes.
            </p>
          </div>
          <Button
            onClick={() => setLocation("/products")}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-2xl text-xs h-11 px-6 shadow-lg shrink-0"
          >
            Explore All Produce
          </Button>
        </div>

        {/* Recipe Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <Card
              key={recipe.id}
              className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <Badge className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur text-emerald-400 border-emerald-500/30 text-[10px]">
                    {recipe.category}
                  </Badge>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-semibold text-white bg-slate-950/70 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" /> {recipe.prepTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" /> {recipe.calories}
                    </span>
                  </div>
                </div>

                <CardContent className="p-5 space-y-3">
                  <h3 className="text-base font-bold text-white leading-tight">
                    {recipe.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {recipe.description}
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Ingredients Included ({recipe.ingredients.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.ingredients.map((ing) => (
                        <span
                          key={ing.id}
                          className="px-2 py-1 bg-slate-950 text-slate-300 text-[10px] font-medium rounded-lg border border-slate-800"
                        >
                          {ing.name} ({ing.qty})
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="p-5 pt-0 border-t border-slate-800/60 mt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Bundle Price</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    ₹{recipe.totalPrice}
                  </span>
                </div>
                <Button
                  onClick={() => handleAddAllIngredients(recipe)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs h-10 px-4 gap-1.5 shadow-md"
                >
                  <ShoppingBag className="w-4 h-4" /> 1-Click Cook
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
