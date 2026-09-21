import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Bike, PackageCheck, Heart, Sparkles, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  riderName?: string;
  riderId?: string;
  productId?: number;
  productName?: string;
  onSubmitRating?: (ratingData: {
    orderId: string;
    riderRating: number;
    productRating: number;
    riderFeedback: string;
    productFeedback: string;
  }) => void;
}

export function RatingModal({
  isOpen,
  onClose,
  orderId,
  riderName = "Delivery Partner",
  riderId,
  productId,
  productName = "Produce Quality",
  onSubmitRating,
}: RatingModalProps) {
  const [riderRating, setRiderRating] = useState(5);
  const [productRating, setProductRating] = useState(5);
  const [riderFeedback, setRiderFeedback] = useState("");
  const [productFeedback, setProductFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (onSubmitRating) {
        onSubmitRating({
          orderId,
          riderRating,
          productRating,
          riderFeedback,
          productFeedback,
        });
      } else {
        await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            userId: 1,
            riderId,
            productId,
            riderRating,
            productRating,
            riderFeedback,
            productFeedback,
          }),
        });
      }
      setSubmitted(true);
      toast.success("Thank you! Your ratings & feedback have been recorded.");
      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 1500);
    } catch (err: any) {
      toast.error("Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 border-border shadow-2xl">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            {submitted ? <CheckCircle className="w-8 h-8" /> : <Sparkles className="w-7 h-7" />}
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {submitted ? "Rating Submitted!" : "Rate Your Experience"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Order #{orderId} — Help us maintain high quality standards
          </DialogDescription>
        </DialogHeader>

        {!submitted && (
          <div className="space-y-6 py-2">
            {/* Delivery Rider Rating */}
            <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Bike className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Rider: {riderName}</h4>
                    <p className="text-[10px] text-muted-foreground">Speed & courtesy</p>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-600">
                  {riderRating} / 5 ★
                </span>
              </div>

              {/* Star Selector */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRiderRating(star)}
                    className="p-1 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= riderRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted hover:text-amber-200"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Add feedback for delivery partner (optional)..."
                value={riderFeedback}
                onChange={(e) => setRiderFeedback(e.target.value)}
                className="text-xs h-16 rounded-xl bg-background"
              />
            </div>

            {/* Product Quality Rating */}
            <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-teal-100 text-teal-700 rounded-lg">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Product & Freshness</h4>
                    <p className="text-[10px] text-muted-foreground">{productName}</p>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-teal-600">
                  {productRating} / 5 ★
                </span>
              </div>

              {/* Star Selector */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setProductRating(star)}
                    className="p-1 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= productRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted hover:text-amber-200"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Add feedback for produce quality & packaging (optional)..."
                value={productFeedback}
                onChange={(e) => setProductFeedback(e.target.value)}
                className="text-xs h-16 rounded-xl bg-background"
              />
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          {!submitted && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 text-sm shadow-md"
            >
              {isSubmitting ? "Submitting..." : <><Heart className="w-4 h-4 fill-white" /> Submit Feedback</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
