# AGENTS.md

## Project

Build **Everything Wishlist**: a desktop application that lets users capture anything they may want to buy, research, watch, read, try, eat, visit, etc., and organize it automatically using AI.

The user should be able to capture something with minimal friction and edit anything the AI gets wrong.

## Stack

* Electron
* React
* TypeScript
* Tailwind CSS
* Node.js
* Supabase PostgreSQL
* Supabase Auth
* Supabase Storage
* OpenAI API
* Chrome Extension Manifest V3
* Git

Do not use Solidity.

## Desktop Capture

The desktop app must support:

1. Global keyboard shortcut.
2. Screen-selection overlay.
3. User draws/selects an area of the screen.
4. Capture the selected area temporarily.
5. Send the image to the backend/OpenAI Vision.
6. AI identifies the item and extracts useful information.
7. Open a small prompt window.
8. User can add context such as:

   * "Buy this"
   * "Gift for my cousin"
   * "Research this"
   * "Want to try this later"
9. Combine the image analysis and user prompt.
10. Create a structured wishlist item.

The screenshot is temporary input. Do not permanently store it unless explicitly needed.

## Browser Extension

Build a **Chrome Manifest V3 extension**.

The extension must provide:

* Right-click → Add to Wishlist
* Extension button
* Keyboard shortcut

When triggered, extract available information from the current webpage:

* Title
* URL
* Website
* Product/item name
* Image
* Price when available
* Relevant page information

Send this information to the backend for AI processing.

Do not require separate integrations for individual websites in the MVP.

## AI Categorization

AI should automatically identify and categorize items.

Example:

```text
Nike Vomero 5
→ Fashion
→ Shoes
```

```text
Atomic Habits
→ Books
```

```text
LEGO Technic Ferrari
→ Toys
```

```text
Interstellar
→ Movies
```

The application must automatically create/use category sections and organize items accordingly.

Equivalent categories/items should be normalized.

For example, "clothes", "clothing", and "fashion" should not unnecessarily become separate categories.

The user must always be able to:

* Change category
* Change subcategory
* Change title
* Change description
* Change intent
* Edit any AI-generated information
* Delete an item

AI suggestions are never authoritative.

## Wishlist Data

Use a common wishlist-item structure rather than separate databases for every category.

Each item should support:

* Title
* Description
* Category
* Subcategory
* Intent
* Image
* Source URL
* Source website
* Price
* User prompt/notes
* Date added
* Flexible metadata

Categories should be data-driven so the application can create and reorganize them without requiring code changes.

## Database

Use **Supabase PostgreSQL** as the source of truth.

Use Supabase Auth for authentication.

Use Supabase Storage for persistent item images when needed.

Enable Row Level Security so users can only access their own data.

## AI API

Never expose the OpenAI API key to the client.

AI calls must go through trusted server-side code.

Prefer structured outputs from the AI.

Validate AI output before writing to the database.

Do not build a complex autonomous agent for the MVP.

## Core Principle

The user captures something.

**AI identifies it → categorizes it → user adds context → item is saved → user remains in control.**

Do not make assumptions that the AI cannot reasonably support, and always allow the user to correct the result.
