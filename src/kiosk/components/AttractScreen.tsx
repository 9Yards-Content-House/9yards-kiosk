import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand, UtensilsCrossed, Clock, Sparkles, Star } from "lucide-react";
import { useTranslation } from "@shared/context/LanguageContext";
import { formatPrice } from "@shared/lib/utils";

interface FeaturedItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  badge?: "popular" | "new" | "deal";
}

// Featured items shown on attract screen
const FEATURED_ITEMS: FeaturedItem[] = [
  {
    id: "1",
    name: "Lusaniya Combo",
    description: "Aromatic pilao with tender chicken and fresh kachumbari",
    price: 45000,
    image: "/images/menu/lusaniya/whole-chicken-lusaniya.jpg",
    badge: "popular",
  },
  {
    id: "2",
    name: "Chicken Stew",
    description: "Slow-cooked in rich tomato and onion gravy",
    price: 20000,
    image: "/images/menu/sauces/9Yards-Chicken-Stew-Menu.jpg",
    badge: "popular",
  },
  {
    id: "3",
    name: "Fresh Juices",
    description: "Passion, Mango, Watermelon & more",
    price: 5000,
    image: "/images/menu/juices/9yards-passion-fruit-juice-menu.jpg",
    badge: "new",
  },
];

// Promotional messages that cycle
const PROMO_MESSAGES = [
  { title: "Build Your Perfect Meal", subtitle: "Mix & match your favorite dishes" },
  { title: "Order in Seconds", subtitle: "No waiting in line" },
  { title: "Fresh & Hot", subtitle: "Made to order, just for you" },
  { title: "Today's Specials", subtitle: "Check out our featured items" },
];

interface AttractScreenProps {
  onTouch: () => void;
  isVisible: boolean;
}

export default function AttractScreen({ onTouch, isVisible }: AttractScreenProps) {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentPromo, setCurrentPromo] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Auto-rotate slides
  useEffect(() => {
    if (!isVisible) return;
    
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % FEATURED_ITEMS.length);
    }, 5000);

    const promoTimer = setInterval(() => {
      setCurrentPromo((prev) => (prev + 1) % PROMO_MESSAGES.length);
    }, 4000);

    const timeTimer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearInterval(slideTimer);
      clearInterval(promoTimer);
      clearInterval(timeTimer);
    };
  }, [isVisible]);

  const handleTouch = useCallback(() => {
    onTouch();
  }, [onTouch]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-UG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (!isVisible) return null;

  const currentItem = FEATURED_ITEMS[currentSlide];
  const currentMessage = PROMO_MESSAGES[currentPromo];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-hidden cursor-pointer"
      onClick={handleTouch}
      onTouchStart={handleTouch}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 gradient-hero" />
      
      {/* Floating particles for visual interest */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <img
              src="/images/logo/9Yards-Food-White-Logo-colored.png"
              alt="9Yards"
              className="w-8 h-8 object-contain"
            />
          </div>
          <span className="text-white/90 font-semibold">9Yards Food</span>
        </div>
        <div className="text-white/80 text-lg font-medium flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
        {/* Greeting */}
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/70 text-xl mb-2"
        >
          {getTimeOfDayGreeting()}!
        </motion.p>

        {/* Animated promo text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPromo}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3">
              {currentMessage.title}
            </h1>
            <p className="text-xl md:text-2xl text-white/80">
              {currentMessage.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Featured item carousel */}
        <div className="relative w-full max-w-2xl mb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.9, x: 100 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -100 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white/15 backdrop-blur-md rounded-3xl p-6 flex items-center gap-6 border border-white/20"
            >
              {/* Image */}
              <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
                <img
                  src={currentItem.image}
                  alt={currentItem.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
                {currentItem.badge && (
                  <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    currentItem.badge === "popular" ? "bg-amber-500 text-white" :
                    currentItem.badge === "new" ? "bg-green-500 text-white" :
                    "bg-red-500 text-white"
                  }`}>
                    {currentItem.badge === "popular" && <Star className="w-3 h-3" />}
                    {currentItem.badge === "new" && <Sparkles className="w-3 h-3" />}
                    {currentItem.badge === "popular" ? "Popular" : currentItem.badge === "new" ? "New" : "Deal"}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-white">
                <h3 className="text-2xl md:text-3xl font-bold mb-2">{currentItem.name}</h3>
                <p className="text-white/70 text-lg mb-3">{currentItem.description}</p>
                <p className="text-3xl font-bold text-secondary">{formatPrice(currentItem.price)}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Slide indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {FEATURED_ITEMS.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? "w-8 bg-secondary" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Touch CTA */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Hand className="w-12 h-12 text-secondary" />
            </motion.div>
          </div>
          <div className="bg-secondary hover:bg-secondary/90 text-white px-12 py-5 rounded-2xl inline-flex items-center gap-3 shadow-cta">
            <UtensilsCrossed className="w-7 h-7" />
            <span className="text-2xl font-bold">Touch to Start Ordering</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-white/40 text-sm">Powered by 9Yards Food</p>
      </div>
    </motion.div>
  );
}
