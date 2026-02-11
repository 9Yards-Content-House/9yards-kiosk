# 9Yards Kiosk & Kitchen Dashboard — Implementation Plan

## Project Overview

Build a **kiosk ordering system** and **kitchen management dashboard** for 9Yards Food. A touch screen at the office reception lets anyone walk up and place a food order. Orders flow in real-time to a staff dashboard where kitchen/admin/rider roles manage the full order lifecycle.

**Live site:** https://food.9yards.co.ug (existing marketing + ordering website)  
**New subdomains:**  
- `kiosk.9yards.co.ug` — Customer-facing touch screen kiosk  
- `kitchen.9yards.co.ug` — Staff dashboard (admin, kitchen, riders)

---

## Decisions Made

| Decision | Choice |
|---|---|
| Location | Single location now, expandable later |
| Payment | Cash on delivery/counter + Mobile Money (Direct MoMo API) |
| Delivery scope | In-building only (desk/office delivery) |
| Backend | **Supabase** (PostgreSQL + Auth + Realtime) |
| Repo | **Separate repo** from main website |
| Kiosk reset | **Both**: manual "New Order" button + auto-timeout (~90s inactivity) |
| Order status flow | Simple: `new` → `preparing` → `ready` → `delivered` |
| Notifications | Sound + visual alert in dashboard, WhatsApp alert, browser push notifications |
| Menu management | **Dynamic from Supabase DB**, editable from dashboard |
| Auth roles | 3 roles: **Admin**, **Kitchen Staff**, **Rider** |
| Hosting | Separate subdomains on **Netlify** (free tier) |
| App architecture | **Single codebase**, route-based splitting, deployed to 2 subdomains |
| Mobile money | **Direct MTN/Airtel Mobile Money API** |
| Design system | Reuse exact fonts (Inter), colors (yards-blue, yards-orange), Tailwind tokens from existing app |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Routing | React Router v6 |
| State | React Context + useReducer (local), @tanstack/react-query (server) |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Realtime | Supabase Realtime (Postgres Changes) |
| Auth | Supabase Auth (email/password) |
| Payments | Direct MTN/Airtel MoMo API via Supabase Edge Function |
| Notifications | Web Push API + WhatsApp Business API + in-app audio |
| Animation | Framer Motion |
| Icons | lucide-react |
| Hosting | Netlify (2 sites from same repo) |
