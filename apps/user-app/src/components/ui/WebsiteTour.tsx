import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Check, HelpCircle, X, MapPin, Zap, Shield, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TourStep {
  targetId?: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface WebsiteTourProps {
  portalName?: string;
  customSteps?: TourStep[];
}

export const DEFAULT_USER_TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Sunotal 10-Minute Express Grocery!",
    description: "Experience hyper-local grocery & fresh produce delivery direct from neighborhood dark stores to your doorstep in under 10 minutes.",
    icon: <Zap className="w-6 h-6 text-amber-500 animate-bounce" />,
    badge: "Instant Delivery"
  },
  {
    targetId: "location-picker-trigger",
    title: "1. Hyper-Local Dark Store Location",
    description: "Your delivery area is automatically detected (<2.5km geo-fence). Click anytime to change your address or pinpoint your delivery building on the map.",
    icon: <MapPin className="w-6 h-6 text-emerald-500" />,
    badge: "Geo-Fenced"
  },
  {
    targetId: "category-nav",
    title: "2. Fresh Produce & Pantry Categories",
    description: "Browse farm-fresh vegetables, dairy, snacks, and daily essentials sourced directly from local partner farmers.",
    icon: <ShoppingBag className="w-6 h-6 text-emerald-600" />,
    badge: "Farm Direct"
  },
  {
    targetId: "cart-button",
    title: "3. Express Checkout & Cart",
    description: "Add items to your cart with instant stock validation. Wallet balance and promo discounts apply automatically at checkout.",
    icon: <Shield className="w-6 h-6 text-indigo-500" />,
    badge: "1-Click Checkout"
  },
  {
    targetId: "sunobot-widget",
    title: "4. SunoBot AI Assistant & Live Order Tracking",
    description: "Need recipe ideas or order updates? Click SunoBot AI assistant at the bottom right to track your rider in real time or ask for meal suggestions.",
    icon: <Truck className="w-6 h-6 text-sky-500" />,
    badge: "AI Powered"
  }
];

export const WebsiteTour: React.FC<WebsiteTourProps> = ({
  portalName = "Storefront",
  customSteps
}) => {
  const steps = customSteps || DEFAULT_USER_TOUR_STEPS;
  const storageKey = `sunotal_tour_done_${portalName.toLowerCase()}`;
  
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const tourDone = localStorage.getItem(storageKey);
    if (!tourDone) {
      const timer = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
    setCurrentStep(0);
  };

  const handleStartManual = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const activeStep = steps[currentStep];

  return (
    <>
      {/* Floating Manual Tour Launcher Button */}
      <button
        onClick={handleStartManual}
        className="fixed bottom-24 right-5 z-40 flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg hover:shadow-emerald-500/25 transition-all text-xs font-semibold group border border-emerald-400/30"
        title="Start Interactive Platform Tour"
      >
        <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
        <span>Platform Tour</span>
      </button>

      {/* Tour Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-card border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-5 text-foreground overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                  {activeStep.icon || <Sparkles className="w-5 h-5" />}
                </span>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    {activeStep.badge || `Step ${currentStep + 1}`}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sunotal {portalName} Tour • Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
              </div>
              <button
                onClick={handleComplete}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                title="Skip Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-foreground leading-snug">
                {activeStep.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {activeStep.description}
              </p>
            </div>

            {/* Step Indicators Bar */}
            <div className="flex items-center gap-1.5 py-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'w-8 bg-emerald-500'
                      : idx < currentStep
                      ? 'w-3 bg-emerald-500/40'
                      : 'w-3 bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between pt-2 border-t">
              <button
                onClick={handleComplete}
                className="text-xs text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
              >
                Skip Tour
              </button>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    className="rounded-xl text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-4 shadow-md shadow-emerald-600/20"
                >
                  {currentStep === steps.length - 1 ? (
                    <>Finish <Check className="w-3.5 h-3.5 ml-1" /></>
                  ) : (
                    <>Next <ArrowRight className="w-3.5 h-3.5 ml-1" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
