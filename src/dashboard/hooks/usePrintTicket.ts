import { useCallback } from 'react';
import { formatPrice } from '@shared/lib/utils';

interface OrderItem {
  id: string;
  menu_item: {
    name: string;
    category?: { name: string };
  };
  quantity: number;
  unit_price: number;
  notes?: string | null;
  preparations?: any;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  subtotal: number;
  total: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  notes?: string | null;
  created_at: string;
  order_items: OrderItem[];
}

interface TicketConfig {
  paperWidth?: number; // in mm, default 80
  showCustomerInfo?: boolean;
  showPrices?: boolean;
  showQRCode?: boolean;
  copies?: number;
}

/**
 * Hook for generating and printing kitchen tickets
 * Supports thermal printers (ESC/POS) and browser print dialog
 */
export function usePrintTicket() {
  /**
   * Generate ticket HTML for browser printing
   */
  const generateTicketHtml = useCallback(
    (order: Order, config: TicketConfig = {}) => {
      const {
        paperWidth = 80,
        showCustomerInfo = true,
        showPrices = true,
      } = config;

      const orderTime = new Date(order.created_at).toLocaleTimeString('en-UG', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const orderDate = new Date(order.created_at).toLocaleDateString('en-UG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      // Group items by category for kitchen organization
      const groupedItems: Record<string, OrderItem[]> = {};
      order.order_items.forEach((item) => {
        const category = item.menu_item.category?.name || 'Other';
        if (!groupedItems[category]) {
          groupedItems[category] = [];
        }
        groupedItems[category].push(item);
      });

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order ${order.order_number}</title>
  <style>
    @page {
      size: ${paperWidth}mm auto;
      margin: 2mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.3;
      width: ${paperWidth - 4}mm;
      color: #000;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .logo {
      font-size: 16px;
      font-weight: bold;
    }
    .order-number {
      font-size: 24px;
      font-weight: bold;
      margin: 8px 0;
      letter-spacing: 2px;
    }
    .time {
      font-size: 14px;
    }
    .section {
      margin: 8px 0;
      padding: 8px 0;
      border-bottom: 1px dashed #000;
    }
    .section-title {
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 4px;
      font-size: 11px;
      color: #666;
    }
    .item {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
    }
    .item-qty {
      font-weight: bold;
      min-width: 24px;
    }
    .item-name {
      flex: 1;
      padding: 0 4px;
    }
    .item-price {
      text-align: right;
    }
    .item-notes {
      font-size: 10px;
      color: #666;
      padding-left: 28px;
      font-style: italic;
    }
    .item-preps {
      font-size: 10px;
      padding-left: 28px;
      color: #333;
    }
    .customer-info {
      margin: 8px 0;
    }
    .customer-info p {
      margin: 2px 0;
    }
    .total {
      font-size: 16px;
      font-weight: bold;
      text-align: right;
      margin-top: 8px;
    }
    .payment-badge {
      display: inline-block;
      padding: 2px 8px;
      background: #000;
      color: #fff;
      font-size: 10px;
      text-transform: uppercase;
      border-radius: 3px;
    }
    .footer {
      text-align: center;
      margin-top: 12px;
      font-size: 10px;
      color: #666;
    }
    .cut-line {
      border-top: 2px dashed #000;
      margin-top: 16px;
      padding-top: 8px;
      text-align: center;
      font-size: 10px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">9YARDS FOOD</div>
    <div class="order-number">${order.order_number}</div>
    <div class="time">${orderDate} • ${orderTime}</div>
    <span class="payment-badge">${formatPaymentMethod(order.payment_method)}</span>
  </div>

  ${showCustomerInfo && (order.customer_name || order.customer_phone) ? `
  <div class="customer-info">
    ${order.customer_name ? `<p><strong>Name:</strong> ${order.customer_name}</p>` : ''}
    ${order.customer_phone ? `<p><strong>Phone:</strong> ${order.customer_phone}</p>` : ''}
  </div>
  ` : ''}

  ${Object.entries(groupedItems).map(([category, items]) => `
  <div class="section">
    <div class="section-title">${category}</div>
    ${items.map((item) => `
    <div class="item">
      <span class="item-qty">${item.quantity}x</span>
      <span class="item-name">${item.menu_item.name}</span>
      ${showPrices ? `<span class="item-price">${formatPrice(item.unit_price * item.quantity)}</span>` : ''}
    </div>
    ${item.preparations ? `<div class="item-preps">${formatPreparations(item.preparations)}</div>` : ''}
    ${item.notes ? `<div class="item-notes">Note: ${item.notes}</div>` : ''}
    `).join('')}
  </div>
  `).join('')}

  ${order.notes ? `
  <div class="section">
    <div class="section-title">Order Notes</div>
    <p>${order.notes}</p>
  </div>
  ` : ''}

  ${showPrices ? `
  <div class="total">
    TOTAL: ${formatPrice(order.total)}
  </div>
  ` : ''}

  <div class="cut-line">
    ✂ - - - - - - - - - - - - - - - - ✂
  </div>
</body>
</html>
      `;

      return html;
    },
    []
  );

  /**
   * Print ticket using browser print dialog
   */
  const printTicket = useCallback(
    (order: Order, config: TicketConfig = {}) => {
      const html = generateTicketHtml(order, config);
      const { copies = 1 } = config;

      // Open print window
      const printWindow = window.open('', '_blank', 'width=300,height=600');
      if (!printWindow) {
        console.error('Could not open print window');
        return false;
      }

      printWindow.document.write(html);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        for (let i = 0; i < copies; i++) {
          printWindow.print();
        }
        printWindow.close();
      };

      return true;
    },
    [generateTicketHtml]
  );

  /**
   * Generate ESC/POS commands for thermal printers
   * This can be sent to a local print server or WebUSB
   */
  const generateEscPos = useCallback((order: Order): Uint8Array => {
    const encoder = new TextEncoder();
    const commands: number[] = [];

    // ESC/POS commands
    const ESC = 0x1b;
    const GS = 0x1d;
    const LF = 0x0a;

    // Initialize printer
    commands.push(ESC, 0x40); // ESC @

    // Center alignment
    commands.push(ESC, 0x61, 0x01); // ESC a 1

    // Bold on
    commands.push(ESC, 0x45, 0x01); // ESC E 1

    // Logo/Header
    const header = '9YARDS FOOD\n';
    commands.push(...encoder.encode(header));

    // Double size for order number
    commands.push(GS, 0x21, 0x11); // GS ! n (double width+height)
    commands.push(...encoder.encode(`${order.order_number}\n`));
    commands.push(GS, 0x21, 0x00); // Reset size

    // Bold off
    commands.push(ESC, 0x45, 0x00);

    // Time
    const time = new Date(order.created_at).toLocaleTimeString('en-UG', {
      hour: '2-digit',
      minute: '2-digit',
    });
    commands.push(...encoder.encode(`${time}\n`));

    // Left alignment
    commands.push(ESC, 0x61, 0x00);

    // Dashed line
    commands.push(...encoder.encode('--------------------------------\n'));

    // Items
    order.order_items.forEach((item) => {
      const line = `${item.quantity}x ${item.menu_item.name}\n`;
      commands.push(...encoder.encode(line));

      if (item.preparations) {
        const preps = `   ${formatPreparations(item.preparations)}\n`;
        commands.push(...encoder.encode(preps));
      }
    });

    // Dashed line
    commands.push(...encoder.encode('--------------------------------\n'));

    // Cut paper
    commands.push(GS, 0x56, 0x00); // GS V 0 (full cut)

    return new Uint8Array(commands);
  }, []);

  return {
    printTicket,
    generateTicketHtml,
    generateEscPos,
  };
}

// Helper functions
function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    counter: 'Pay at Counter',
    cash: 'Cash',
    momo: 'Mobile Money',
  };
  return methods[method] || method;
}

function formatPreparations(preps: any): string {
  if (!preps) return '';
  if (typeof preps === 'string') return preps;
  if (Array.isArray(preps)) {
    return preps
      .map((p) => (typeof p === 'string' ? p : p.name || p.label || ''))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof preps === 'object') {
    return Object.values(preps)
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

export default usePrintTicket;
