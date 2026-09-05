# Everything Wishlist 🪄

An AI-powered wishlist and capture system that lets you save anything you want to buy, research, watch, read, try, eat, or visit — and organizes it automatically with AI.

Capture items from **anywhere on your computer**, from your **browser**, or directly via **WhatsApp**.

---

## What's Inside

| Component | Tech | Role |
| :--- | :--- | :--- |
| **Desktop App** | Electron, React, Tailwind, Vite | Global screen snipping (`Ctrl+Shift+S`), offline cache & visual wishlist viewer |
| **Chrome Extension** | Manifest V3, TypeScript | One-click webpage capture, context menu right-click, keyboard shortcut (`Ctrl+Shift+W`) |
| **Backend API** | Node.js, Express, TypeScript | AI processing, WhatsApp query engine, dual-persistence (Local Disk + Supabase) |
| **AI Engine** | Local Ollama / OpenAI / Heuristic | Auto-categorization into 10 canonical categories, intent detection, bullet points |
| **WhatsApp Bot** | n8n / Twilio Webhook | Ask *"What's my latest item?"*, *"Show my books"*, or send links/prompts to save |

---

## Quick Start (Clone & Run)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/everything-wishlist.git
cd everything-wishlist
npm install
```

### 2. Environment Setup
Copy the example environment file:
```bash
# Windows PowerShell
copy apps\backend\.env.example apps\backend\.env

# Mac / Linux
cp apps/backend/.env.example apps/backend/.env
```

Open `apps/backend/.env` to configure your AI:
* **Option A: 100% Free & Local with Ollama (Recommended)**
  Install [Ollama](https://ollama.com/) and run:
  ```bash
  ollama run qwen2.5vl:7b
  ```
  *(Default `.env` is already configured for Ollama on port 11434).*
* **Option B: OpenAI**
  Set `AI_PROVIDER=openai` and add your `OPENAI_API_KEY`.
* **Option C: Zero-Config Offline Fallback**
  If Ollama isn't running and no OpenAI key is set, the app automatically falls back to built-in smart heuristic categorization.

---

### 3. Start the Backend
In your first terminal:
```bash
npm run dev:backend
```
Backend runs at `http://localhost:3001`.

---

### 4. Start the Desktop App
In your second terminal:
```bash
npm run dev:electron
```
* Press **`Ctrl+Shift+S`** anywhere on your desktop to draw a box around any product or image.
* Add an optional prompt (e.g. *"Gift for birthday"* or *"Buy later"*), and AI saves it directly.

---

### 5. Load the Chrome Extension
1. Build the extension scripts:
   ```bash
   npm run build:extension
   ```
2. Open Google Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the folder:
   ```text
   everything-wishlist/apps/extension
   ```
5. Click the extension icon on any page, right-click an item, or press **`Ctrl+Shift+W`** to save!

---

## Key Features & Mechanisms

### 1. Dual-Tier Persistent Storage
* **Works out of the box with zero cloud setup:** Items are stored on local persistent disk (`apps/backend/data/wishlist_store.json`) and cached in Desktop `localStorage`.
* **Optional Supabase Cloud Sync:** If you configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `apps/backend/.env`, items automatically mirror to your PostgreSQL database.
  * *To setup Supabase:* Simply run [`supabase/setup_complete.sql`](supabase/setup_complete.sql) in your Supabase SQL Editor.

### 2. WhatsApp Query & Save Integration
* Chat with your wishlist over WhatsApp using Twilio and n8n!
* **Natural Language Queries:** Ask *"Show my books"*, *"What is my latest item?"*, or *"Show my wishlist"*.
* **Save on the Go:** Send any product URL or message (e.g., *"Save Nike shoes"*) to add it instantly to your wishlist.
* An importable n8n workflow is included at [`scripts/n8n-twilio-wishlist-workflow.json`](scripts/n8n-twilio-wishlist-workflow.json).

---

## Useful Commands

```bash
npm run dev:backend       # Run backend API server with hot reload
npm run dev:electron      # Run Vite desktop frontend + Electron window
npm run build:extension   # Compile Chrome extension TypeScript
npm run build             # Build all workspaces
```

---

## Security & Privacy
* Secret credentials and AI keys **only live on the backend** (`.env`).
* Desktop and browser extension clients never expose API keys.
* Screenshots captured via desktop snipper are analyzed temporarily in-memory and discarded.
