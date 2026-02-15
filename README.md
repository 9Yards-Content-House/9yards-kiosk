# 9Yards Kiosk & Kitchen Dashboard

Touch-screen kiosk ordering system and kitchen management dashboard for [9Yards Food](https://food.9yards.co.ug).

## Overview

A complete food ordering and delivery management system built for:
- **Kiosk**: Customer-facing touch screen for placing orders
- **Dashboard**: Staff app for kitchen, riders, reception, and admin

## Architecture

Single monorepo with two entry points:

| App | URL | Purpose |
|---|---|---|
| **Kiosk** | `kiosk.9yards.co.ug` | Customer ordering + queue display |
| **Dashboard** | `kitchen.9yards.co.ug` | Staff management dashboard |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5 + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **State**: React Context + @tanstack/react-query

## Features

### Kiosk App
- Browse menu by category
- Build combos with customization
- Cart management
- Customer details (name, phone required)
- 5,000 UGX flat delivery fee
- Mobile Money payment (MTN/Airtel)
- Pay on delivery option
- Order confirmation with tracking number
- Queue display mode for waiting area
- Pre-ordering with time picker

### Dashboard App
- Real-time order board with sound notifications
- Role-based access (Admin, Kitchen, Rider, Reception)
- Drag-and-drop order status updates
- Menu management (CRUD, availability toggle)
- Staff management with PIN login
- Analytics and reporting
- AI-powered insights
- Push notifications

## Order Flow

Orders follow a 4-step status progression:

```
New → Preparing → Out for Delivery → Arrived
```

| Status | Description |
|--------|-------------|
| **New** | Order received, pending kitchen action |
| **Preparing** | Kitchen is preparing the order |
| **Out for Delivery** | Rider has picked up and is en route |
| **Arrived** | Delivered to reception, customer notified via WhatsApp |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

1. Clone and install:

```bash
git clone <repo-url>
cd 9yards-kiosk
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Run database migrations:

```bash
# Via Supabase CLI
supabase db push

# Or run each migration file manually in SQL editor
```

4. Seed menu data:

```bash
# Run supabase/seed.sql in SQL editor
```

### Development

```bash
# Kiosk (port 3000)
npm run dev:kiosk

# Dashboard (port 3001)
npm run dev:dashboard
```

### Build

```bash
npm run build:kiosk     # → dist-kiosk/
npm run build:dashboard # → dist-dashboard/
```

### Deployment

Both apps deploy to Netlify with separate configs:

| App | Config File | Output |
|-----|-------------|--------|
| Kiosk | `netlify-kiosk.toml` | `dist-kiosk/` |
| Dashboard | `netlify-dashboard.toml` | `dist-dashboard/` |

Create two Netlify sites pointing to the same repo.

## Project Structure

```
src/
├── shared/              # Shared code between apps
│   ├── types/           # TypeScript types (menu, orders, auth)
│   ├── lib/             # Supabase client, utils, constants
│   ├── hooks/           # useMenu, useOrders, useRealtime
│   ├── theme/           # CSS variables & base styles
│   └── components/      # shadcn/ui components
│
├── kiosk/               # Kiosk app
│   ├── pages/           # Welcome, Menu, Cart, Details, Payment, Confirmation
│   ├── components/      # KioskHeader, ComboBuilder, CartBar
│   ├── context/         # KioskCartContext
│   └── hooks/           # useInactivityTimer
│
└── dashboard/           # Staff dashboard
    ├── pages/           # Orders, Menu, Staff, Analytics, Settings
    │   ├── admin/       # Admin-only pages
    │   ├── kitchen/     # Kitchen view
    │   ├── rider/       # Rider deliveries
    │   └── reception/   # Reception desk
    ├── components/      # Sidebar, OrderBoard, OrderCard, charts
    ├── context/         # AuthContext
    └── hooks/           # useOrderSubscription, usePushNotifications

supabase/
├── migrations/          # SQL migration files (001-013+)
├── functions/           # Edge Functions
│   ├── momo-payment/    # MTN/Airtel payment initiation
│   ├── momo-callback/   # Payment callback handler
│   ├── send-whatsapp/   # WhatsApp notifications
│   ├── send-push/       # Web push notifications
│   ├── pin-login/       # Staff PIN authentication
│   └── daily-summary/   # Analytics summary
└── seed.sql             # Menu data
```

## Dashboard Roles

| Role | Access |
|------|--------|
| **Admin** | Full access: orders, menu CRUD, staff management, analytics, settings |
| **Kitchen** | Order board, toggle menu availability, mark orders as preparing |
| **Rider** | View assigned deliveries, mark as out for delivery/arrived |
| **Reception** | View arrived orders, mark as picked up, contact customers |

## Database Setup

### Initial Setup

1. Run migrations in order (001 through latest)
2. Run `seed.sql` to populate menu data
3. Create admin user via Supabase Auth
4. Set admin role:
   ```sql
   UPDATE profiles SET role = 'admin', full_name = 'Admin Name' WHERE id = '<user-id>';
   ```

### Key Tables

| Table | Purpose |
|-------|---------|
| `categories` | Menu categories |
| `menu_items` | Food items with prices |
| `orders` | Customer orders |
| `order_items` | Items in each order |
| `profiles` | Staff profiles with roles |
| `notifications` | System notifications |
| `push_subscriptions` | Web push subscriptions |

### Edge Function Environment Variables

Set in Supabase Dashboard → Settings → Edge Functions:

**Mobile Money:**
- `MTN_MOMO_API_USER`
- `MTN_MOMO_API_KEY`
- `MTN_MOMO_SUBSCRIPTION_KEY`
- `AIRTEL_CLIENT_ID`
- `AIRTEL_CLIENT_SECRET`

**WhatsApp Business API:**
- `WHATSAPP_BUSINESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

**Web Push:**
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

## Scripts

```bash
npm run dev:kiosk       # Start kiosk dev server
npm run dev:dashboard   # Start dashboard dev server
npm run build:kiosk     # Production build kiosk
npm run build:dashboard # Production build dashboard
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript check
```