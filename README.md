# 9Yards Kiosk & Kitchen Dashboard

Touch-screen kiosk ordering system and kitchen management dashboard for [9Yards Food](https://food.9yards.co.ug).

## Architecture

Single codebase with two entry points:

| App | URL | Purpose |
|---|---|---|
| **Kiosk** | `kiosk.9yards.co.ug` | Customer-facing touch screen for placing orders |
| **Dashboard** | `kitchen.9yards.co.ug` | Staff dashboard for managing orders, menu, and analytics |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5 + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **State**: React Context + @tanstack/react-query
- **Hosting**: Netlify (2 sites)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

1. Clone the repo and install dependencies:

```bash
git clone <repo-url>
cd 9yards-kiosk
npm install
```

2. Copy the environment template and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Run the Supabase migrations (via Supabase Dashboard SQL editor or CLI):

```bash
# Apply migrations in order
supabase db push
# Or run each file manually via the SQL editor
```

4. Seed the menu data:

```bash
# Via Supabase SQL editor, run:
# supabase/seed.sql
```

### Development

```bash
# Run kiosk app (port 3000)
npm run dev:kiosk

# Run dashboard app (port 3001)
npm run dev:dashboard
```

### Build

```bash
# Build kiosk
npm run build:kiosk

# Build dashboard
npm run build:dashboard
```

### Deployment

Both apps deploy to Netlify using separate config files:

- **Kiosk**: Uses `netlify-kiosk.toml` → builds to `dist-kiosk/`
- **Dashboard**: Uses `netlify-dashboard.toml` → builds to `dist-dashboard/`

Create two Netlify sites pointing to the same repo, each using its respective config.

## Project Structure

```
src/
├── shared/          # Shared types, lib, hooks, UI components
│   ├── types/       # Menu, order, auth types
│   ├── lib/         # Supabase client, utils, constants
│   ├── hooks/       # useMenu, useOrders, useRealtime
│   ├── theme/       # CSS variables & base styles
│   └── components/  # shadcn/ui components
│
├── kiosk/           # Kiosk app (touch-optimized)
│   ├── pages/       # Welcome, Menu, Cart, Details, Payment, Confirmation
│   ├── components/  # KioskHeader, ComboBuilder, CartBar, etc.
│   ├── context/     # KioskCartContext (useReducer-based cart)
│   └── hooks/       # useInactivityTimer
│
└── dashboard/       # Staff dashboard
    ├── pages/       # Login, Orders, MenuManagement, Staff, Analytics, etc.
    ├── components/  # Sidebar, OrderBoard, OrderCard, charts, etc.
    ├── context/     # AuthContext
    └── hooks/       # useOrderSubscription, useNotificationSound, usePushNotifications

supabase/
├── migrations/      # 10 SQL migration files
├── functions/       # Edge Functions (momo-payment, momo-callback, send-whatsapp, send-push)
└── seed.sql         # Menu data from existing site
```

## Dashboard Roles

| Role | Access |
|---|---|
| **Admin** | Full access: orders, menu CRUD, staff management, analytics, settings |
| **Kitchen** | Orders board, toggle menu availability, notifications |
| **Rider** | View ready orders, mark as delivered |

## Supabase Setup

After creating your Supabase project:

1. Run migrations in order (001 through 010)
2. Run `seed.sql` to populate menu data
3. Create your first admin user via Supabase Auth
4. Update that user's profile role to `admin`:
   ```sql
   UPDATE profiles SET role = 'admin', full_name = 'Your Name' WHERE id = '<user-id>';
   ```

### Environment Variables for Edge Functions

Set these in Supabase Dashboard → Settings → Edge Functions:

- `MTN_MOMO_API_USER` / `MTN_MOMO_API_KEY` / `MTN_MOMO_SUBSCRIPTION_KEY` — MTN MoMo API
- `AIRTEL_CLIENT_ID` / `AIRTEL_CLIENT_SECRET` — Airtel Money API
- `WHATSAPP_BUSINESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` — WhatsApp Business API
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — Web Push notifications

## License

Private — 9Yards Digital Ltd.
