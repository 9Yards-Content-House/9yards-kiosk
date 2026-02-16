import { Bell } from "lucide-react";
import { motion } from "framer-motion";

interface NewOrderAlertProps {
  count: number;
}

export default function NewOrderAlert({ count }: NewOrderAlertProps) {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      role="status"
      aria-live="polite"
      aria-label={`${count} new order${count > 1 ? "s" : ""}`}
      className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-full text-sm font-semibold"
    >
      <Bell className="w-4 h-4" aria-hidden="true" />
      {count} new order{count > 1 ? "s" : ""}
    </motion.div>
  );
}
