import { motion } from "framer-motion";
import { Sparkles, Plus, Clock, TrendingUp, Star } from "lucide-react";
import { formatPrice } from "@shared/lib/utils";
import { Recommendation, RecommendationType, getTimeBasedGreeting } from "@shared/lib/recommendations";

interface RecommendationSectionProps {
  recommendations: Recommendation[];
  onAddToCart: (itemId: string) => void;
  title?: string;
  subtitle?: string;
}

const TYPE_ICONS: Record<RecommendationType, typeof Sparkles> = {
  "time-based": Clock,
  "popular": TrendingUp,
  "frequently-bought-together": Star,
  "upsell": Sparkles,
  "cross-sell": Sparkles,
  "combo-completion": Sparkles,
};

const TYPE_BADGES: Record<RecommendationType, { label: string; color: string }> = {
  "time-based": { label: "Perfect for now", color: "bg-purple-500" },
  "popular": { label: "Customer favorite", color: "bg-amber-500" },
  "frequently-bought-together": { label: "Great combo", color: "bg-green-500" },
  "upsell": { label: "Recommended", color: "bg-blue-500" },
  "cross-sell": { label: "You might like", color: "bg-pink-500" },
  "combo-completion": { label: "Complete your meal", color: "bg-orange-500" },
};

export default function RecommendationSection({
  recommendations,
  onAddToCart,
  title,
  subtitle,
}: RecommendationSectionProps) {
  const greeting = getTimeBasedGreeting();
  
  if (recommendations.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-secondary" />
            <h2 className="text-xl font-bold text-gray-900">
              {title || greeting.greeting}
            </h2>
          </div>
          <p className="text-gray-500">
            {subtitle || greeting.suggestion}
          </p>
        </div>
      </div>

      {/* Recommendation Cards - Horizontal Scroll */}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {recommendations.map((rec, idx) => (
          <RecommendationCard
            key={rec.item.id}
            recommendation={rec}
            onAdd={() => onAddToCart(rec.item.id)}
            delay={idx * 0.1}
          />
        ))}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAdd: () => void;
  delay?: number;
}

function RecommendationCard({ recommendation, onAdd, delay = 0 }: RecommendationCardProps) {
  const { item, type, reason, confidence } = recommendation;
  const badge = TYPE_BADGES[type];
  const Icon = TYPE_ICONS[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex-shrink-0 w-64 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden group hover:shadow-xl transition-shadow"
    >
      {/* Image */}
      <div className="relative h-36 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <Icon className="w-12 h-12 text-primary/40" />
          </div>
        )}
        
        {/* Badge */}
        <div className={`absolute top-2 left-2 ${badge.color} text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1`}>
          <Icon className="w-3 h-3" />
          {badge.label}
        </div>

        {/* Confidence indicator (small dots) */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                confidence > (i + 1) * 0.33 ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{item.name}</h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-1">{reason}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {formatPrice(item.price)}
          </span>
          <button
            onClick={onAdd}
            className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center shadow-md hover:bg-secondary/90 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Mini recommendation cards for cart sidebar
export function MiniRecommendations({
  recommendations,
  onAddToCart,
}: {
  recommendations: Recommendation[];
  onAddToCart: (itemId: string) => void;
}) {
  if (recommendations.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-gray-700">Add to your order?</span>
      </div>
      <div className="space-y-2">
        {recommendations.slice(0, 2).map((rec) => (
          <div
            key={rec.item.id}
            className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              {rec.item.image_url ? (
                <img
                  src={rec.item.image_url}
                  alt={rec.item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{rec.item.name}</p>
              <p className="text-sm text-secondary font-semibold">{formatPrice(rec.item.price)}</p>
            </div>
            <button
              onClick={() => onAddToCart(rec.item.id)}
              className="w-8 h-8 bg-secondary text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-secondary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
