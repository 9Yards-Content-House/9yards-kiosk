import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, X, MessageSquare, ThumbsUp } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { Button } from "@shared/components/ui/button";
import { cn } from "@shared/lib/utils";

interface FeedbackModalProps {
  isOpen: boolean;
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

interface FeedbackData {
  rating: number;
  comment: string;
}

/* ─── Star Rating Component ─── */
function StarRating({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  const iconSize = size === "lg" ? "w-10 h-10" : "w-6 h-6";
  const gap = size === "lg" ? "gap-2" : "gap-1";

  const ratingLabels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Great",
    5: "Excellent",
  };

  const activeValue = hovered || value;

  return (
    <div className="flex flex-col items-center">
      <div className={cn("flex items-center justify-center", gap)}>
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="focus:outline-none"
          >
            <Star
              className={cn(
                iconSize,
                "transition-all duration-150",
                star <= activeValue
                  ? "fill-yellow-400 text-yellow-400 drop-shadow-sm"
                  : "fill-gray-200 text-gray-300"
              )}
            />
          </button>
        ))}
      </div>

    </div>
  );
}

/* ─── Main FeedbackModal Component ─── */
export default function FeedbackModal({
  isOpen,
  orderId,
  orderNumber,
  onClose,
  onSubmitted,
}: FeedbackModalProps) {
  const [feedback, setFeedback] = useState<FeedbackData>({
    rating: 0,
    comment: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = useMutation({
    mutationFn: async (data: FeedbackData) => {
      if (USE_MOCK_DATA) {
        await new Promise((r) => setTimeout(r, 500));
        console.log("Mock feedback submitted:", data);
        return { success: true };
      }

      const { error } = await supabase.from("order_feedback").insert({
        order_id: orderId,
        rating: data.rating,
        comment: data.comment || null,
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        onSubmitted?.();
        // Reset state for next open
        setSubmitted(false);
        setFeedback({ rating: 0, comment: "" });
      }, 2500);
    },
  });

  // Don't render if not open
  if (!isOpen) return null;

  const canSubmit = feedback.rating > 0;

  /* ─── Success State ─── */
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5"
          >
            <ThumbsUp className="w-10 h-10 text-green-600" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Thank You! 🎉
          </h2>
          <p className="text-gray-500 text-sm">
            Your feedback helps us improve. We appreciate you taking the time!
          </p>
        </motion.div>
      </motion.div>
    );
  }

  /* ─── Main Form ─── */
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#212282] to-[#2d2da0] rounded-t-3xl px-6 py-5 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">
                  How was your order?
                </h2>
                <p className="text-white/70 text-sm">Order #{orderNumber}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-6">
            {/* Overall Rating */}
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Overall Experience
              </p>
              <StarRating
                value={feedback.rating}
                onChange={(v) => setFeedback({ ...feedback, rating: v })}
                size="lg"
              />
            </div>



            {/* Comment */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Comments{" "}
                <span className="normal-case text-gray-400 font-normal">
                  (optional)
                </span>
              </label>
              <textarea
                value={feedback.comment}
                onChange={(e) =>
                  setFeedback({ ...feedback, comment: e.target.value })
                }
                placeholder="What did you enjoy? Anything we can improve?"
                rows={3}
                className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:border-[#212282] focus:ring-2 focus:ring-[#212282]/20 outline-none text-sm transition-all placeholder:text-gray-400"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {feedback.comment.length}/500
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl h-12 text-sm font-medium border-gray-200 text-gray-600 hover:bg-gray-50"
              disabled={submitFeedback.isPending}
            >
              Skip
            </Button>
            <Button
              onClick={() => submitFeedback.mutate(feedback)}
              className={cn(
                "flex-1 rounded-xl h-12 text-sm font-semibold transition-all",
                canSubmit
                  ? "bg-[#E6411C] hover:bg-[#d13a18] text-white shadow-md hover:shadow-lg"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
              disabled={!canSubmit || submitFeedback.isPending}
            >
              {submitFeedback.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Submit Feedback
                </div>
              )}
            </Button>
          </div>

          {/* Error message */}
          {submitFeedback.isError && (
            <div className="px-6 pb-4">
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl text-center">
                Something went wrong. Please try again.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
