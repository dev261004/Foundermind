FOLDER STRUCTURE:

```
foundermind-frontend/
│
├── public/
│   ├── logo.svg
│   └── favicon.ico
│
├── src/
│   │
│   ├── app/                        # App Router (Next 14)
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page
│   │   ├── globals.css
│   │
│   │   ├── (auth)/                 # Auth route group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │
│   │   ├── dashboard/              # Protected routes
│   │   │   ├── layout.tsx          # Dashboard layout (sidebar + navbar)
│   │   │   ├── page.tsx            # Dashboard home
│   │   │
│   │   │   ├── ideas/
│   │   │   │   ├── page.tsx        # All ideas
│   │   │   │   └── [id]/           # Dynamic workspace
│   │   │   │       ├── page.tsx
│   │   │   │       ├── components/
│   │   │   │       │   ├── SWOTCard.tsx
│   │   │   │       │   ├── MarketChart.tsx
│   │   │   │       │   ├── CompetitorTable.tsx
│   │   │   │       │   ├── MonetizationSection.tsx
│   │   │   │       │   └── ScorePanel.tsx
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   └── profile/
│   │   │       └── page.tsx
│   │
│   │   └── api/                    # Next API routes (optional proxy)
│   │       └── health/route.ts
│   │
│   │
│   ├── components/                 # Global reusable components
│   │   ├── ui/                     # ShadCN components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   ├── IdeaCard.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   │
│   ├── features/                   # Feature-based architecture
│   │   ├── auth/
│   │   │   ├── auth.api.ts
│   │   │   ├── auth.store.ts       # Zustand store
│   │   │   └── types.ts
│   │   │
│   │   ├── ideas/
│   │   │   ├── ideas.api.ts
│   │   │   ├── ideas.store.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── agent/
│   │   │   ├── agent.api.ts
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │
│   │
│   ├── lib/                        # Utilities
│   │   ├── axios.ts                # Axios instance
│   │   ├── jwt.ts
│   │   ├── format.ts
│   │   └── constants.ts
│   │
│   │
│   ├── hooks/                      # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useIdeas.ts
│   │   └── useAgent.ts
│   │
│   │
│   ├── types/                      # Global TS types
│   │   ├── idea.ts
│   │   ├── user.ts
│   │   └── api.ts
│   │
│   └── styles/
│       └── theme.ts
│
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```
