import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { Button } from "@shared/components/ui/button";
import { useAvailableRiders } from "../hooks/useAvailableRiders";
import { Loader2, Bike } from "lucide-react";
import type { Order } from "@shared/types/orders";

interface AssignRiderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onAssign: (orderId: string, riderId: string) => Promise<void>;
  isAssigning?: boolean;
}

export function AssignRiderModal({
  open,
  onOpenChange,
  order,
  onAssign,
  isAssigning = false,
}: AssignRiderModalProps) {
  const [selectedRiderId, setSelectedRiderId] = useState<string>("");
  const { data: riders, isLoading: loadingRiders } = useAvailableRiders();

  const handleAssign = async () => {
    if (!order || !selectedRiderId) return;
    await onAssign(order.id, selectedRiderId);
    setSelectedRiderId("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedRiderId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bike className="h-5 w-5 text-primary" />
            Assign Rider
          </DialogTitle>
          <DialogDescription>
            {order ? (
              <>
                Select a rider for order <strong>#{order.order_number}</strong>
                {order.customer_location && (
                  <span className="block mt-1 text-muted-foreground">
                    Delivery to: {order.customer_location}
                  </span>
                )}
              </>
            ) : (
              "Select a rider for this delivery"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loadingRiders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : riders && riders.length > 0 ? (
            <Select value={selectedRiderId} onValueChange={setSelectedRiderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a rider..." />
              </SelectTrigger>
              <SelectContent>
                {riders.map((rider) => (
                  <SelectItem key={rider.id} value={rider.id}>
                    <div className="flex flex-col">
                      <span>{rider.full_name}</span>
                      {rider.phone && (
                        <span className="text-xs text-muted-foreground">
                          {rider.phone}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bike className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No riders available</p>
              <p className="text-sm">
                All riders are busy or no active riders found
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedRiderId || isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Rider"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
