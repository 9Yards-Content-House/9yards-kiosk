import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, FileEdit, Loader2 } from 'lucide-react';
import { formatPrice } from '@shared/lib/utils';
import { useUpdateOrder } from '@shared/hooks/useOrders';
import { Button } from '@shared/components/ui/button';
import { Textarea } from '@shared/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@shared/components/ui/dialog';
import { toast } from 'sonner';
import type { Order } from '@shared/types/orders';

interface EditOrderModalProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ItemEdit {
  id: string;
  originalQuantity: number;
  quantity: number;
  name: string;
  unitPrice: number;
}

export default function EditOrderModal({ order, open, onOpenChange }: EditOrderModalProps) {
  const updateOrder = useUpdateOrder();
  
  // Build editable items from order
  const initialItems = useMemo(() => {
    return (order.items || []).map((item): ItemEdit => ({
      id: item.id,
      originalQuantity: item.quantity,
      quantity: item.quantity,
      name: item.type === 'combo' 
        ? (item.sauce_name ? `${item.sauce_name} Lusaniya` : 'Combo Meal')
        : (item.sauce_name || 'Item'),
      unitPrice: item.unit_price,
    }));
  }, [order.items]);

  const [items, setItems] = useState<ItemEdit[]>(initialItems);
  const [specialInstructions, setSpecialInstructions] = useState(order.special_instructions || '');

  // Calculate new total
  const newTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [items]);

  // Check if there are changes
  const hasChanges = useMemo(() => {
    const instructionsChanged = specialInstructions !== (order.special_instructions || '');
    const itemsChanged = items.some(
      item => item.quantity !== item.originalQuantity
    );
    return instructionsChanged || itemsChanged;
  }, [items, specialInstructions, order.special_instructions]);

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: 0 };
      }
      return item;
    }));
  };

  const handleSave = async () => {
    // Can't save if no items left
    const activeItems = items.filter(i => i.quantity > 0);
    if (activeItems.length === 0) {
      toast.error('Order must have at least one item');
      return;
    }

    try {
      await updateOrder.mutateAsync({
        orderId: order.id,
        items: items
          .filter(item => item.quantity !== item.originalQuantity)
          .map(item => ({
            itemId: item.id,
            quantity: item.quantity,
          })),
        special_instructions: specialInstructions,
      });
      toast.success('Order updated successfully');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update order';
      toast.error(message);
    }
  };

  // Reset state when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setItems(initialItems);
      setSpecialInstructions(order.special_instructions || '');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            Edit Order {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Items List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Items</h4>
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ 
                    opacity: item.quantity > 0 ? 1 : 0.5, 
                    height: 'auto' 
                  }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.quantity === 0 ? 'bg-red-50 border-red-200' : 'bg-card'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${item.quantity === 0 ? 'line-through text-gray-400' : ''}`}>
                      {item.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(item.unitPrice)} each
                    </p>
                  </div>

                  {item.quantity > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.originalQuantity)}
                    >
                      Undo
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Special Instructions</h4>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Add any special instructions..."
              className="resize-none"
              rows={3}
            />
          </div>

          {/* New Total */}
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="font-medium">New Total</span>
            <div className="text-right">
              {newTotal !== order.total && (
                <span className="text-sm text-muted-foreground line-through mr-2">
                  {formatPrice(order.total)}
                </span>
              )}
              <span className="text-lg font-bold text-[#E6411C]">
                {formatPrice(newTotal)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateOrder.isPending}
            className="bg-secondary hover:bg-secondary/90"
          >
            {updateOrder.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
