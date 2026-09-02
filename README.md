# Everything Wishlist

An AI-powered desktop application and Chrome extension that lets you capture anything you want to buy, research, watch, read, try, eat, or visit — and organizes it automatically using AI.

---

## Architecture Overview

* **Desktop App**: Electron + React + Vite + Tailwind CSS (Global shortcut `Ctrl+Shift+S` screen snipper)
* **Chrome Extension**: Manifest V3 extension (Popup extraction, right-click menu, keyboard shortcut)
* **Backend**: Node.js + Express API (`http://localhost:3001`)
* **AI Engine**: Supports **Local Ollama** (`qwen2.5vl:7b`), **OpenAI** (`gpt-4o`), or automatic offline heuristic fallback
* **Database**: **Supabase PostgreSQL** (or zero-config local in-memory storage if no credentials provided)

---

## Quick Start (For Anyone Cloning This Repo)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/everything-wishlist.git
cd everything-wishlist
npm install
```

---

### 2. Configure AI & Environment

Copy the example configuration:
```bash
# On Windows PowerShell:
copy apps\backend\.env.example apps\backend\.env

# On macOS/Linux:
cp apps/backend/.env.example apps/backend/.env
```

Open `apps/backend/.env` and pick your preferred AI setup:

#### Option A: 100% Free & Local with Ollama (Recommended)
No API keys needed! Download [Ollama](https://ollama.com/) and run:
```bash
ollama run qwen2.5vl:7b
```
Keep the default settings in `apps/backend/.env`:
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5vl:7b
```

#### Option B: Cloud OpenAI
Set `AI_PROVIDER=openai` and add your OpenAI API key:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o
```

#### Option C: Zero-Config Offline Mode
If Ollama is not running and no OpenAI key is set, the backend **automatically falls back to high-fidelity heuristic categorization** out of the box.

---

### 3. Start the Backend API
In terminal #1:
```bash
npm run dev:backend
```
Backend runs on `http://localhost:3001`.

---

### 4. Run the Desktop Application
In terminal #2:
```bash
npm run dev:electron
```
* The desktop application will open.
* Press **`Ctrl+Shift+S`** anywhere on your computer to trigger the global screen-selection sniper!

---

### 5. Load the Chrome Extension

1. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** (top-left button).
4. Select the `apps/extension` folder inside this repository:
   ```text
   e:/extension/apps/extension
   ```
5. *(Optional)* Pin the **Everything Wishlist** icon to your Chrome toolbar.
6. Open any product or page (e.g. Amazon), press **`F5`** to refresh, and click the extension icon to capture it!

---

## How to Use

### Desktop Screen Snipping
1. Press `Ctrl+Shift+S` (or click "Capture Screen" in the desktop app).
2. Drag a rectangle over any product, book, movie, or item on your screen.
3. Add quick context in the prompt modal (e.g., *"Buy this"*, *"Gift for mom"*, *"Research reviews"*).
4. AI analyzes the screenshot, auto-categorizes it into canonical categories, and saves it to your wishlist.

### Chrome Extension
* **Popup**: Click the extension icon on any webpage to extract metadata (Amazon titles, images, and prices are automatically detected).
* **Right-Click**: Right-click any image, link, or text selection → **"Add to Everything Wishlist"**.
* **Keyboard Shortcut**: Press `Ctrl+Shift+W`.

---

## Optional: Supabase Cloud Database

If you want cloud persistence across multiple devices:
1. Create a free project on [Supabase](https://supabase.com).
2. In your Supabase Dashboard, open the **SQL Editor**.
3. Run [`supabase/schema.sql`](supabase/schema.sql) followed by [`supabase/seed.sql`](supabase/seed.sql).
4. Add your `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `apps/backend/.env`.

*(If skipped, the app automatically runs with local in-memory storage).*

---

## Security & Privacy Note

* Client applications (Chrome extension & Desktop frontend) **never** touch AI keys or secret credentials.
* All AI inference and database interactions are securely routed through the backend server.
* Screenshots taken via the snipper are used temporarily for analysis and discarded unless saved by preference.
