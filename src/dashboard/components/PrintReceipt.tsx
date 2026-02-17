import { useRef } from "react";
import { Printer } from "lucide-react";
import { formatPrice, formatPaymentMethod } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import type { Order } from "@shared/types/orders";

interface PrintReceiptProps {
  order: Order;
  trigger?: React.ReactNode;
}

export default function PrintReceipt({ order, trigger }: PrintReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop propagation for card clicks
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.order_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            padding: 20px;
            max-width: 300px;
            margin: 0 auto;
          }
          .header { text-align: center; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; }
          .order-num { font-size: 20px; font-weight: bold; margin: 10px 0; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .item-name { max-width: 180px; }
          .item-details { font-size: 11px; color: #666; margin-left: 10px; }
          .total { font-size: 16px; font-weight: bold; margin-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          .customer { margin: 10px 0; font-size: 12px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Delay print to allow styles to load
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <>
      <div onClick={handlePrint} className="inline-block">
        {trigger || (
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
        )}
      </div>

      {/* Hidden receipt template */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <div className="header">
            <img 
              src="/images/logo/9Yards-Food-Coloured-favicon.jpg" 
              alt="9Yards Food" 
              style={{ width: "80px", marginBottom: "10px", borderRadius: "8px" }}
            />
            <p style={{ fontSize: "14px", fontWeight: "bold" }}>Kigo</p>
          </div>

          <div className="divider" />
          
          <div className="order-num">#{order.order_number}</div>
          <p style={{ fontSize: "12px", marginBottom: "15px" }}>
            {new Date(order.created_at).toLocaleString()}
          </p>

          <div className="customer" style={{ textAlign: "left", border: "1px solid #eee", padding: "10px", borderRadius: "4px" }}>
            <p style={{ marginBottom: "4px" }}><strong>Customer:</strong> {order.customer_name}</p>
            {order.customer_phone && <p style={{ marginBottom: "4px" }}><strong>Phone:</strong> {order.customer_phone}</p>}
            {order.customer_location && <p><strong>Loc:</strong> {order.customer_location}</p>}
          </div>

          <div className="divider" />

          <div style={{ marginTop: "15px", marginBottom: "15px" }}>
            {order.items?.map((item, idx) => {
              const itemName = item.type === "combo" 
                ? (item.sauce_name ? `${item.sauce_name} Lusaniya` : "Combo Meal")
                : (item.sauce_name || "Item");
              
              return (
                <div key={idx} style={{ marginBottom: "12px" }}>
                  <div className="item" style={{ alignItems: "flex-start" }}>
                    <span className="item-name" style={{ fontWeight: "bold", fontSize: "13px" }}>
                      {item.quantity}x {itemName}
                    </span>
                    <span style={{ fontWeight: "bold" }}>{formatPrice(item.total_price)}</span>
                  </div>
                  {item.main_dishes && item.main_dishes.length > 0 && (
                    <div className="item-details" style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>
                      • {item.main_dishes.join(", ")}
                    </div>
                  )}
                  {item.sauce_preparation && (
                    <div className="item-details" style={{ fontSize: "11px", color: "#444" }}>
                      • {item.sauce_preparation} {item.sauce_size && `(${item.sauce_size})`}
                    </div>
                  )}
                  {item.side_dish && (
                    <div className="item-details" style={{ fontSize: "11px", color: "#444" }}>
                      • Side: {item.side_dish}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="divider" />

          <div className="item total" style={{ fontSize: "18px", marginTop: "15px" }}>
            <span>TOTAL</span>
            <span>{formatPrice(order.total)}</span>
          </div>

          <div className="item" style={{ fontSize: "12px", marginTop: "5px", color: "#666" }}>
            <span>Payment</span>
            <span style={{ textTransform: "capitalize" }}>
              {formatPaymentMethod(order.payment_method)} ({order.payment_status})
            </span>
          </div>

          {order.special_instructions && (
            <div style={{ marginTop: "15px", padding: "10px", background: "#f9f9f9", borderRadius: "4px", textAlign: "left" }}>
              <p style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "2px" }}>Notes:</p>
              <p style={{ fontSize: "11px" }}>{order.special_instructions}</p>
            </div>
          )}

          <div className="divider" style={{ marginTop: "20px" }} />

          <div className="footer">
            <p style={{ fontWeight: "bold", fontSize: "14px" }}>Thank you for your order!</p>
            <p style={{ marginTop: "5px" }}>food.9yards.co.ug</p>
          </div>
        </div>
      </div>
    </>
  );
}
