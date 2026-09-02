# Everything Wishlist

An AI-powered desktop application and Chrome extension that lets you capture anything you want to buy, research, watch, read, try, eat, or visit — and organizes it automatically using AI.

---

## Features

- **Instant Desktop Capture**:
  - Global keyboard shortcut (`Ctrl+Shift+S` or `Alt+Shift+W`).
  - Screen-selection overlay to snip any product, book, movie, place, or recipe directly from your screen.
  - Quick Context Prompt window: add intent notes ("Buy this", "Gift for cousin", "Research this", "Want to try later").
  - Temporary screenshot capture: screenshot is used for AI identification and discarded or kept per preference.
- **Chrome Manifest V3 Extension**:
  - Right-click context menu: "Add to Everything Wishlist" (page, selected text, image, link).
  - Browser extension popup with automatic page metadata, OpenGraph, JSON-LD, and price extraction.
  - Keyboard shortcut (`Ctrl+Shift+W`).
- **AI Categorization & Normalization**:
  - Automatically identifies items, canonical categories (e.g. *Fashion, Books, Electronics & Tech, Movies & Shows, Food & Dining, Travel & Places, Gaming & Toys, Health & Beauty, Research & Ideas*), specific subcategories, price, and intent.
  - Normalizes equivalent terms (e.g. "clothes", "apparel", and "clothing" automatically unify into "Fashion").
  - Full user sovereignty: AI suggestions are never authoritative. Edit title, category, subcategory, intent, price, description, notes, or delete anytime.
- **Privacy & Security**:
  - OpenAI API keys are strictly kept on the server; client applications never expose keys.
  - Supabase PostgreSQL with Row Level Security (RLS) ensures users only access their own items.
  - Zero-config local fallback mode: works out of the box even before configuring cloud keys.

---

## Project Structure

```
├── AGENTS.md
├── package.json                   # Root workspaces config
├── packages/
│   └── shared/                    # Shared TypeScript interfaces, taxonomy & schema
├── apps/
│   ├── backend/                   # Node.js + Express + OpenAI Vision + Supabase
│   ├── desktop/                   # Electron + React + Vite + Tailwind CSS
│   └── extension/                 # Chrome Extension Manifest V3
└── supabase/
    ├── schema.sql                 # PostgreSQL tables (wishlist_items, categories), RLS policies
    └── seed.sql                   # Canonical categories and starter seed items
```

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env` in `apps/backend`:
```bash
cp apps/backend/.env.example apps/backend/.env
```
Fill in your `OPENAI_API_KEY` and Supabase credentials if available. (If left blank, the app will run in high-fidelity mock/heuristic mode for offline development).

### 3. Start Backend Server
```bash
npm run dev:backend
```
Backend runs on `http://localhost:3001`.

### 4. Run Desktop Application
```bash
# In another terminal:
npm run dev:desktop
```
Press `Ctrl+Shift+S` anywhere on your computer to trigger the screen snipping overlay!

### 5. Load Chrome Extension
1. Open Google Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (toggle in top right).
3. Click **Load unpacked**.
4. Select the `apps/extension` folder.
5. Click the extension icon on any webpage or right-click to add to your wishlist!

---

## Supabase Database Setup

To use Supabase as your cloud source of truth:
1. Create a project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste and run the contents of [`supabase/schema.sql`](file:///e:/extension/supabase/schema.sql).
4. Run [`supabase/seed.sql`](file:///e:/extension/supabase/seed.sql) to populate initial categories.
5. Add your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `apps/backend/.env`.
