import { motion } from "framer-motion";

interface OrderNumberProps {
  number: string;
}

export default function OrderNumber({ number }: OrderNumberProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="bg-primary text-white rounded-2xl px-10 py-6 inline-block shadow-lg"
    >
      <p className="text-sm uppercase tracking-wider mb-1 opacity-80">
        Your Order Number
      </p>
      <p className="text-4xl font-black tracking-wide">{number}</p>
    </motion.div>
  );
}
