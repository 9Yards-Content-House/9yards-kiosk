import { useRef } from "react";
import { Printer } from "lucide-react";
import { formatPrice } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import type { Order } from "@shared/types/orders";

interface PrintReceiptProps {
  order: Order;
}

export default function PrintReceipt({ order }: PrintReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
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
      <Button variant="outline" onClick={handlePrint}>
        <Printer className="w-4 h-4 mr-2" />
        Print Receipt
      </Button>

      {/* Hidden receipt template */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <div className="header">
            <div className="logo">9 YARDS</div>
            <p>Lusaniya Kitchen</p>
          </div>

          <div className="divider" />
          
          <div className="order-num">#{order.order_number}</div>
          <p style={{ fontSize: "12px" }}>
            {new Date(order.created_at).toLocaleString()}
          </p>

          <div className="customer">
            <p><strong>Customer:</strong> {order.customer_name}</p>
            {order.customer_phone && <p><strong>Phone:</strong> {order.customer_phone}</p>}
            {order.customer_location && <p><strong>Location:</strong> {order.customer_location}</p>}
          </div>

          <div className="divider" />

          <div>
            {order.items?.map((item, idx) => {
              const itemName = item.type === "combo" 
                ? (item.sauce_name ? `${item.sauce_name} Lusaniya` : "Combo Meal")
                : (item.sauce_name || "Item");
              
              return (
                <div key={idx}>
                  <div className="item">
                    <span className="item-name">{item.quantity}x {itemName}</span>
                    <span>{formatPrice(item.total_price)}</span>
                  </div>
                  {item.main_dishes && item.main_dishes.length > 0 && (
                    <div className="item-details">
                      {item.main_dishes.join(", ")}
                    </div>
                  )}
                  {item.side_dish && (
                    <div className="item-details">Side: {item.side_dish}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="divider" />

          <div className="item total">
            <span>TOTAL</span>
            <span>{formatPrice(order.total)}</span>
          </div>

          <div className="item" style={{ fontSize: "12px" }}>
            <span>Payment</span>
            <span style={{ textTransform: "capitalize" }}>
              {order.payment_method.replace("_", " ")} ({order.payment_status})
            </span>
          </div>

          {order.special_instructions && (
            <>
              <div className="divider" />
              <p style={{ fontSize: "11px" }}>
                <strong>Notes:</strong> {order.special_instructions}
              </p>
            </>
          )}

          <div className="divider" />

          <div className="footer">
            <p>Thank you for your order!</p>
            <p>9 Yards - Taste the Love</p>
          </div>
        </div>
      </div>
    </>
  );
}
