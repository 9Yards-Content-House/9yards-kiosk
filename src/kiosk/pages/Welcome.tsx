import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCallback } from "react";

export default function Welcome() {
  const navigate = useNavigate();

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/menu");
  }, [navigate]);

  return (
    <motion.div
      className="kiosk-screen flex flex-col items-center justify-center gradient-hero text-white p-8 cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={handleStart}
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="mb-12"
      >
        <div className="w-36 h-36 rounded-full bg-white flex items-center justify-center shadow-elevated p-4">
          <img
            src="/images/logo/9Yards-Food-White-Logo-colored.png"
            alt="9Yards Food"
            className="w-full h-full object-contain"
          />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-4xl md:text-5xl font-extrabold text-center mb-4 tracking-tight"
      >
        9Yards Food
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xl text-white/80 text-center mb-16 max-w-md"
      >
        Fresh Ugandan cuisine, made with love
      </motion.p>

      {/* Tap prompt */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="bg-secondary text-white rounded-2xl px-12 py-6 text-2xl font-bold shadow-cta"
        >
          Tap to Start Your Order
        </motion.div>
        <p className="text-white/50 text-sm mt-6">
          Touch anywhere to begin
        </p>
      </motion.div>
    </motion.div>
  );
}
