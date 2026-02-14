## Plan: 9Yards Kiosk App Alignment & Enhancement

**TL;DR**: The kiosk app has solid foundations but needs alignment with the actual business flow. Key changes: add a **Reception role** for head office staff, implement **queue display mode** on the kiosk, add **5,000 UGX flat delivery fee**, make **phone number required**, add **pre-ordering with time picker**, update **order statuses** to a 4-step flow (New → Preparing → Out for Delivery → Arrived), add **WhatsApp arrival notification**, remove unused **loyalty features** from kiosk, add **order cancellation** before preparation, and prepare for **multi-location expansion**.

---

### Steps

**Phase 1: Fix Order Flow & Payment**

1. **Add 5,000 UGX delivery fee** to checkout in [src/kiosk/pages/CheckoutPage.tsx](src/kiosk/pages/CheckoutPage.tsx) - display as line item and include in total calculation

2. **Make phone number required** in [src/kiosk/pages/DetailsPage.tsx](src/kiosk/pages/DetailsPage.tsx) - remove optional flag, add validation for Uganda phone format

3. **Update order statuses** in [supabase/migrations/](supabase/migrations/) - change enum from `new, preparing, ready, delivered, cancelled` to `new, preparing, out_for_delivery, arrived, cancelled`

4. **Add order cancellation** - Allow customers to cancel from kiosk if order status is still `new` (before kitchen starts preparing)

---

**Phase 2: Add Reception Role**

5. **Add "reception" to user_role enum** in database migrations

6. **Create Reception Dashboard page** at `/reception` with:
   - List of orders with status `arrived` (deliveries at reception)
   - Search by order number or phone
   - "Mark as Picked Up" button (new status or flag)
   - "Contact Customer" button (tel: link)
   - "Send Arrival WhatsApp" button
   - Fullscreen queue display toggle

7. **Update role-based routing** in [src/dashboard/App.tsx](src/dashboard/App.tsx) to include reception role access

8. **Update RLS policies** in [supabase/migrations/008_rls_policies.sql](supabase/migrations/008_rls_policies.sql) for reception role permissions

---

**Phase 3: Queue Display Mode**

9. **Create QueueDisplayPage** in [src/kiosk/pages/](src/kiosk/pages/) showing:
   - Real-time list of orders: "Preparing", "Out for Delivery", "Arrived"
   - Large order numbers for visibility
   - Auto-refresh via Supabase realtime
   - Customer name displayed (first name only for privacy)
   
10. **Add queue/order toggle** on kiosk welcome screen - button to switch between ordering mode and queue display mode

---

**Phase 4: Pre-ordering**

11. **Add scheduled order fields** to checkout flow - "Order for now" or "Schedule for later" toggle with time picker

12. **Update order creation** to set `scheduled_for` timestamp (database columns already exist)

13. **Dashboard handling** - Show scheduled orders separately, auto-move to "New" when scheduled time arrives

---

**Phase 5: WhatsApp Integration**

14. **Configure arrival notification** - Trigger WhatsApp message via [supabase/functions/send-whatsapp/](supabase/functions/send-whatsapp/) when order status changes to `arrived`

15. **Message template**: "Hi [Name], your order #[OrderNumber] has arrived at reception! Please pick it up."

---

**Phase 6: Remove/Simplify Unused Features**

16. **Remove loyalty points UI** from kiosk checkout (keep backend for future, hide from kiosk UI)

17. **Remove delivery address fields** - Not needed since all orders go to reception

18. **Simplify payment options** - Keep only "Pay at Kiosk (Mobile Money)" and "Pay on Delivery (Cash)"

---

**Phase 7: Dashboard Improvements**

19. **Update Kitchen view** to use new status flow: New → Preparing → Out for Delivery

20. **Update Rider view** - Claim orders when `preparing` is done, mark as `out_for_delivery`, then `arrived` when at reception

21. **Add operating hours config** in admin settings - Store in database, kiosk checks before allowing orders

22. **Prepare multi-kiosk support** - Add `location_id` field to orders for future expansion (optional now, required later)

---

**Phase 8: UI/UX Polish**

23. **Improve touch targets** throughout kiosk - Ensure all buttons are minimum 48x48px

24. **Add clearer visual feedback** for order status on confirmation screen

25. **Update receipt/confirmation** to prominently show: Order number, Name, Phone, Estimated status

---

### Verification

- **Kiosk flow test**: Place order → verify 5K fee added → verify phone required → see confirmation with order number
- **Status flow test**: Order moves New → Preparing → Out for Delivery → Arrived correctly
- **Dashboard test**: Each role (Admin, Kitchen, Rider, Reception) sees only their permitted features
- **Queue display test**: Place 3 orders, verify all show on queue display with correct statuses
- **Pre-order test**: Schedule order for 2 hours ahead, verify it shows as scheduled
- **WhatsApp test**: Mark order as arrived, verify customer receives notification
- **Cancellation test**: Cancel order before preparation, verify refund/removal

---

### Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Order statuses | 4-step: New → Preparing → Out for Delivery → Arrived | Simpler than 6-step, matches actual workflow |
| Queue display location | On kiosk (toggle mode) | No extra hardware needed, cost-effective |
| Delivery fee | Flat 5,000 UGX | Simple, consistent pricing per your requirement |
| Phone number | Required | Needed for WhatsApp notifications + order verification |
| Pre-order method | Exact time picker | Maximum flexibility for customers |
| Loyalty | Removed from kiosk | Per your decision, simplifies kiosk flow |
| Multi-kiosk | Prepare structure now | Add `location_id` but don't require it yet |

---

### Database Changes Summary

```
Changes to order_status enum:
- Remove: ready, delivered
- Add: out_for_delivery, arrived

Changes to user_role enum:
- Add: reception

New columns:
- orders.picked_up_at (timestamp)
- orders.picked_up_by (uuid - reception staff who handed over)
- orders.location_id (uuid, nullable - for future multi-kiosk)

New table (optional):
- locations (id, name, address) - for future multi-kiosk
```
