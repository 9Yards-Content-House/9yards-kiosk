import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pencil, ShoppingBag } from 'lucide-react';
import { useKioskCart } from '../context/KioskCartContext';
import { useAllMenuItems } from '@shared/hooks/useMenu';
import { formatPrice } from '@shared/lib/utils';

/**
 * A sticky order summary bar that shows during checkout flow (Details, Payment pages).
 * Displays item thumbnails, count, total, and an "Edit Order" button.
 */
export default function OrderSummaryBar() {
  const navigate = useNavigate();
  const { items, itemCount, subtotal } = useKioskCart();
  const { data: allMenuItems = [] } = useAllMenuItems();

  // Get first 3 item images
  const itemImages = items.slice(0, 3).map((item) => {
    const itemName = item.label || item.sauceName;
    const menuItem = allMenuItems.find(
      (m) => m.name === itemName || m.name.includes(itemName) || itemName.includes(m.name)
    );
    return menuItem?.image_url || null;
  });

  const hasMoreItems = items.length > 3;

  if (itemCount === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3"
    >
      <div className="flex items-center gap-4 max-w-lg mx-auto">
        {/* Item Thumbnails */}
        <div className="flex items-center -space-x-2">
          {itemImages.map((imageUrl, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="w-12 h-12 rounded-xl border-2 border-white shadow-md overflow-hidden bg-gray-100"
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`Item ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <ShoppingBag className="w-5 h-5 text-gray-300" />
                </div>
              )}
            </motion.div>
          ))}
          {hasMoreItems && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-12 h-12 rounded-xl border-2 border-white shadow-md overflow-hidden bg-[#212282] flex items-center justify-center"
            >
              <span className="text-white font-bold text-sm">+{items.length - 3}</span>
            </motion.div>
          )}
        </div>

        {/* Order Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
          <p className="font-bold text-lg text-[#212282] truncate">
            {formatPrice(subtotal)}
          </p>
        </div>

        {/* Edit Order Button */}
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-[#212282] font-medium text-sm min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6411C] focus-visible:ring-offset-2"
        >
          <Pencil className="w-4 h-4" />
          Edit Order
        </button>
      </div>
    </motion.div>
  );
}
