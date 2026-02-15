import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Send, X, MessageSquare } from "lucide-react";
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
  foodQuality: number;
  serviceSpeed: number;
  comment: string;
}

function StarRating({
  value,
  onChange,
  label,
  size = "lg",
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  size?: "sm" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  const iconSize = size === "lg" ? "w-10 h-10" : "w-6 h-6";

  return (
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <div className="flex justify-center gap-1">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                iconSize,
                "transition-colors",
                (hovered ? star <= hovered : star <= value)
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-200"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FeedbackModal({
  isOpen,
  orderId,
  orderNumber,
  onClose,
  onSubmitted,
}: FeedbackModalProps) {
  const [feedback, setFeedback] = useState<FeedbackData>({
    rating: 0,
    foodQuality: 0,
    serviceSpeed: 0,
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
        food_quality: data.foodQuality || null,
        service_speed: data.serviceSpeed || null,
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
      }, 2000);
    },
  });

  // Don't render if not open
  if (!isOpen) return null;

  const canSubmit = feedback.rating > 0;

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-10 h-10 text-green-600 fill-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            Thank You!
          </h2>
          <p className="text-gray-600">
            Your feedback helps us serve you better.
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
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
        className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#212282]/10 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-[#212282]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#212282]">
                How was your order?
              </h2>
              <p className="text-sm text-gray-500">Order {orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Main Rating */}
        <div className="mb-8">
          <StarRating
            value={feedback.rating}
            onChange={(v) => setFeedback({ ...feedback, rating: v })}
            label="Overall Experience"
            size="lg"
          />
        </div>

        {/* Detailed Ratings */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <StarRating
            value={feedback.foodQuality}
            onChange={(v) => setFeedback({ ...feedback, foodQuality: v })}
            label="Food Quality"
            size="sm"
          />
          <StarRating
            value={feedback.serviceSpeed}
            onChange={(v) => setFeedback({ ...feedback, serviceSpeed: v })}
            label="Service Speed"
            size="sm"
          />
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (Optional)
          </label>
          <textarea
            value={feedback.comment}
            onChange={(e) =>
              setFeedback({ ...feedback, comment: e.target.value })
            }
            placeholder="Tell us more about your experience..."
            rows={3}
            className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:border-[#212282] focus:ring-1 focus:ring-[#212282] outline-none"
            maxLength={500}
          />
          <p className="text-xs text-gray-400 text-right mt-1">
            {feedback.comment.length}/500
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={submitFeedback.isPending}
          >
            Skip
          </Button>
          <Button
            onClick={() => submitFeedback.mutate(feedback)}
            className="flex-1 bg-[#E6411C] hover:bg-[#d13a18]"
            disabled={!canSubmit || submitFeedback.isPending}
          >
            {submitFeedback.isPending ? (
              "Submitting..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
