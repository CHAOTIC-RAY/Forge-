<div align="center">

<br />

```
███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

**AI-powered social media management — for any business, any industry.**

[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-11-ffca28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285f4?style=flat-square&logo=google)](https://ai.google.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite)](https://vitejs.dev)

</div>

---

## What is Forge?

Forge is a **multi-tenant, AI-first social media management platform**. Any business — retail, real estate, restaurant, agency, or software — can sign up, create a workspace, and immediately start planning, generating, and publishing content across Instagram and Facebook.

It's built to compete with tools like Ocoya, Buffer, and Hootsuite, with **Google Gemini AI** embedded at every step: caption writing, image generation, hashtag suggestions, analytics reports, bulk scheduling, and more.

---

## Features

### 🏠 Dashboard
- AI-generated daily greeting (Gemini) personalized to your workspace
- Live KPI cards: inventory items, categories, upcoming posts, total posts
- Instagram & Facebook insights panel
- Today's schedule at a glance with post thumbnails
- Quick actions to jump into AI Studio or Ideas Bank

### 📅 Content Calendar
- Full monthly calendar with drag-and-drop rescheduling
- Click any day to create a post pre-filled with that date
- Right-click context menu: edit, duplicate, delete
- Export calendar to **Excel** (ExcelJS)
- Import posts from Excel with **AI-assisted column mapping**
- Shareable **public read-only calendar link** per workspace

### ✍️ Post Management
- Rich post editor: title, caption, hashtags, outlet, category, platform, content format (Post / Reel / Story)
- **AI caption generation** — one click, fully contextual
- **AI hashtag suggestions** based on content and category
- **AI image generation** — product mockups via Gemini image models
- **Post from image** — upload a photo and generate the whole post
- **Smart post** — generate title, brief, caption, hashtags, and visuals in one pass
- **Marketing frameworks** — AIDA, PAS, BAB, FAB, 4Ps, StoryBrand, and more
- **Approval workflow** — draft → pending → approved / rejected with reviewer notes
- **Repeat scheduling** — weekly, bi-weekly, or monthly
- Internal team comments per post
- **Direct publish** to Instagram and Facebook via Meta Graph API
- Per-post analytics: impressions, reach, engagement, likes, comments, shares

### 🎨 Creative Studio
- AI copywriting widget with tone and outlet controls
- **Bulk post generator** — create 5–20 posts for a campaign in one call
- **Campaign from URL** — paste a product page and get a multi-post campaign
- Image resizer (1:1, 4:5, 9:16, 1.91:1)
- **Custom prompt widgets** — define your own `{{variable}}` prompt templates
- AI Playground for testing prompts before saving as widgets

### 🎯 Brand Kit
- Brand color palette manager
- Font settings (heading + body) with custom font upload support
- Logo library
- Design template gallery
- Product category management
- WooCommerce product scraper (with Google PSE fallback)

### 📊 Analytics
- **AI analytics report** — Gemini analyzes your connected accounts and returns:
  - Best posting time
  - Hashtag performance scores
  - Engagement rate and trend
  - Audience demographics
  - Competitor insights
  - Content pillar performance
  - Top posts breakdown
- D3.js charts: timeline, bar, line, pie
- Summary, Timeline, and raw JSON view modes
- Optional auto-run once per day on app open

### 📓 Notebook & Ideas Bank
- Block-based notes: Text, Image, Prompt, Graph
- Folder organization with color tags
- **AI assist per block** — hit ⚡ and Gemini expands your note
- Quick Ideas capture panel (accessible from any tab)
- Real-time Firestore sync

### 📦 Inventory
- Product list synced to Firestore per workspace
- Direct product search via Google Programmable Search Engine
- Drag a product onto the AI Chat to instantly generate a post for it
- Priority products panel for quick access to flagged items

### 💬 Floating AI Chat
- Context-aware assistant powered by Gemini
- Drop any post or product onto it for instant AI assistance
- Inline "Create Post" button on AI suggestions
- Expandable to full-page mode

### 🔐 Auth & Multi-Workspace
- Google Sign-In via Firebase Auth
- Create and switch between unlimited workspaces
- Each workspace: isolated data, its own brand kit, outlets, team, and settings
- Role-based access: Admin, Content Creator, Viewer/Approver
- Industry profiles with tailored AI context and module visibility

---

## Industry Profiles

Each workspace selects an industry. Forge automatically adjusts the AI tone, terminology, and visible modules:

| Industry | AI Role | Focus |
|---|---|---|
| **Retail & E-commerce** | Retail marketer & merchandiser | Product features, seasonal promos, foot traffic |
| **Real Estate** | Top-tier property marketer | Property features, viewings, neighborhood benefits |
| **Restaurant & Food** | Food & hospitality expert | Dishes, ambience, specials, reservations |
| **Software / SaaS** | Tech product marketer | Features, updates, developer community |
| **Marketing Agency** | Creative strategist | Client campaigns, brand storytelling |
| **General** | Versatile content strategist | Broad, adaptable to any audience |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 5.8, Vite 6 |
| Styling | Tailwind CSS 4, Motion/React (Framer Motion v12) |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Google Sign-In) |
| Storage | Firebase Storage |
| AI (Primary) | Google Gemini 2.5 Flash / 3.1 Pro via `@google/genai` |
| AI (Fallback) | Groq — Llama 3.3 70B |
| AI (Images) | Gemini 3.1 Flash Image / 2.5 Flash Image / 3 Pro Image |
| Server | Express.js (Node.js) |
| Deployment | Google Cloud Run + Cloudflare |
| PWA | vite-plugin-pwa |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Charts | D3.js v7 |
| Excel | ExcelJS (export), xlsx (import) |
| Routing | React Router DOM v7 |
| Icons | Lucide React |
| Toasts | Sonner |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase project](https://console.firebase.google.com) with Firestore, Auth, and Storage enabled
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/forge.git
cd forge
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Then fill in your `.env.local`:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key

# Firebase (required)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Optional — AI fallback
GROQ_API_KEY=

# Optional — product search
# Get a Programmable Search Engine ID from https://programmablesearchengine.google.com
VITE_GOOGLE_PSE_CX=

# Optional — Google Drive integration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Optional — news search
SEARXNG_URL=https://searx.be

# Optional — Cloudinary (image hosting alternative)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 4. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Enable **Authentication** → Google sign-in provider
3. Enable **Firestore Database** and deploy the security rules:

```bash
firebase deploy --only firestore:rules
```

4. Enable **Storage**

### 5. Run locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (Vite) with the Express API server running alongside it.

---

## Deployment

### Google Cloud Run (recommended)

```bash
# Build the production bundle
npm run build

# Build and push Docker image
docker build -t gcr.io/YOUR_PROJECT/forge .
docker push gcr.io/YOUR_PROJECT/forge

# Deploy to Cloud Run
gcloud run deploy forge \
  --image gcr.io/YOUR_PROJECT/forge \
  --platform managed \
  --region us-central1 \
  --set-env-vars GEMINI_API_KEY=your_key
```

Or use the included `cloudbuild.yaml` to trigger builds via Cloud Build:

```bash
gcloud builds submit --config cloudbuild.yaml
```

### With Cloudflare (recommended)

Point your custom domain at the Cloud Run service URL via a Cloudflare DNS proxy. Cloudflare handles SSL, edge caching, and DDoS protection.

---

## Project Structure

```
forge/
├── src/
│   ├── components/
│   │   ├── modals/
│   │   │   ├── PostModal.tsx        # Main post create/edit modal
│   │   │   ├── ExcelImportModal.tsx # Excel import with AI mapping
│   │   │   ├── ExportModal.tsx      # Calendar export options
│   │   │   └── BusinessModal.tsx    # Workspace creation
│   │   ├── HomeTab.tsx              # Dashboard
│   │   ├── Calendar.tsx             # Content calendar grid
│   │   ├── CreativeStudioTab.tsx    # AI content tools
│   │   ├── AnalyticsTab.tsx         # AI analytics + D3 charts
│   │   ├── BrandKitTab.tsx          # Brand assets manager
│   │   ├── NotebookTab.tsx          # Block-based notes
│   │   ├── FloatingChat.tsx         # AI chat assistant
│   │   ├── IdeasPanel.tsx           # Quick idea capture
│   │   ├── LocalDb.tsx              # Inventory/products view
│   │   └── SettingsView.tsx         # Workspace settings
│   ├── lib/
│   │   ├── gemini.ts                # All Gemini AI functions
│   │   ├── firebase.ts              # Firebase init & helpers
│   │   ├── storage.ts               # Firebase Storage helpers
│   │   ├── industryConfig.ts        # Industry profile definitions
│   │   ├── workspaceConfig.tsx      # Workspace config context
│   │   └── utils.ts                 # Utility functions
│   ├── contexts/
│   │   └── WorkspaceContext.tsx     # Active workspace state
│   ├── data.ts                      # Type definitions & initial data
│   └── App.tsx                      # Root component & routing
├── server/
│   └── routes/
│       └── api.ts                   # Express API: scraper, news, Meta publish
├── server.ts                        # Express server entry point
├── firestore.rules                  # Firestore security rules
├── Dockerfile                       # Container definition
├── cloudbuild.yaml                  # Cloud Build CI/CD
└── vite.config.ts                   # Vite + PWA config
```

---

## AI Functions Reference

All AI functions live in `src/lib/gemini.ts`. Add new ones by following the existing pattern using `getAi()`.

| Function | Description |
|---|---|
| `generatePostContent()` | Generate caption from post context |
| `generateSmartPost()` | Full post (title, brief, caption, hashtags) in one call |
| `generateSmartBrief()` | Generate a content brief from a product/topic |
| `generateHashtagSuggestions()` | Hashtags based on post content and category |
| `generateMockupImage()` | Product mockup via Gemini image model |
| `generateAiImage()` | Free-form AI image generation |
| `generatePostFromImage()` | Generate a post from an uploaded image |
| `generatePostWithFramework()` | Caption using a copywriting framework (AIDA, PAS, etc.) |
| `generateBulkPosts()` | Batch of posts for a campaign |
| `generateCampaignFromUrl()` | Multi-post campaign from a product/article URL |
| `generateAnalyticsReport()` | AI analytics report from social profile data |
| `generateDailyGreetings()` | Contextual motivational dashboard greeting |
| `generateTextWithCascade()` | Gemini → Groq fallback text generation |
| `getExcelMappingWithAi()` | Map non-standard Excel headers to Forge fields |
| `generateGenericText()` | General-purpose text generation |
| `scrapeBuyRainbow()` | WooCommerce product scraper with PSE fallback |

---

## Firestore Collections

| Collection | Description |
|---|---|
| `businesses` | Workspace/business documents (scoped by `ownerId`) |
| `posts` | All posts (scoped by `businessId`) |
| `comments` | Post comments (scoped through `postId → businessId`) |
| `brand_kits` | Brand colors, fonts, logos per workspace |
| `inventory_products` | Product inventory per workspace |
| `priority_products` | Flagged high-priority products |
| `notebooks` | Notebook blocks and folders per user |
| `todos` | Task items per workspace |
| `idea_history` | Saved ideas per workspace |
| `categories` | Custom product categories per workspace |

---

## Environment & API Keys

| Key | Required | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `VITE_FIREBASE_*` | ✅ Yes | [Firebase Console](https://console.firebase.google.com) → Project Settings |
| `GROQ_API_KEY` | Optional | [Groq Console](https://console.groq.com) |
| `VITE_GOOGLE_PSE_CX` | Optional | [Programmable Search Engine](https://programmablesearchengine.google.com) |
| `GOOGLE_CLIENT_ID/SECRET` | Optional | [Google Cloud Console](https://console.cloud.google.com) → OAuth |
| `SEARXNG_URL` | Optional | Self-hosted or public instance |
| `CLOUDINARY_*` | Optional | [Cloudinary](https://cloudinary.com) |

---

## Roadmap

- [ ] Self-serve onboarding wizard (industry picker, outlets, brand colors)
- [ ] Team invitation system (email-based workspace invites)
- [ ] Billing & subscription tiers (Free / Pro / Business via Stripe)
- [ ] Official Meta Insights API OAuth (replace AI-estimated analytics)
- [ ] Media Library (centralized Firebase Storage browser with tagging)
- [ ] AI image generation with brand kit context (logo + brand colors injected)
- [ ] Approval workflow email/push notifications
- [ ] Bulk scheduling from CSV with per-row AI enhancement
- [ ] Cloud Tasks queue for reliable scheduled publishing
- [ ] LinkedIn and TikTok publishing channels
- [ ] Android PWA push notifications (Firebase Cloud Messaging)
- [ ] White-label mode for agencies managing client workspaces

---

## Design System

Forge follows a calm, professional design language defined in `DESIGN.md`.

| Token | Value | Usage |
|---|---|---|
| Primary | `#2665FD` | CTAs, active states, key interactions |
| Secondary | `#6074B9` | Supporting actions, chips, toggles |
| Accent | `#BD3800` | Badges, alerts, decorative highlights |
| Neutral | `#757681` | Surfaces, labels, secondary text |

- Font: **Inter** throughout
- No shadows — depth via border contrast and surface color variation
- Cards: 1px outline border, 12px corner radius
- WCAG AA contrast enforced (4.5:1 for normal text)
- Full dark mode via Tailwind `dark:` classes

---

## License

MIT — free to use, fork, and deploy.

---

<div align="center">

Built with ❤️ using React, Firebase, and Google Gemini AI.

</div>
