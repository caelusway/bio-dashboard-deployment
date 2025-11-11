# Bio Internal Dashboard

**Read-only MVP Dashboard** built with Preact for BioProtocol internal growth analytics.

## 🚀 Features

- ✅ Real-time growth metrics across all platforms
- ✅ Platform-specific deep dives (Discord, Telegram, Twitter, YouTube, etc.)
- ✅ Historical data visualization
- ✅ Responsive design with Tailwind CSS
- ✅ Fast and lightweight (Preact + Vite)
- ✅ Read-only mode for MVP phase

## 📋 Prerequisites

- Node.js 18+ or Bun
- Running `bio-internal` API on `localhost:4100`
- Migrated data in bio-internal database

## 🛠️ Installation

```bash
cd apps/bio-dashboard
bun install
# or
npm install
```

## 🏃 Development

```bash
# Start dev server (with proxy to API)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

The dashboard will be available at `http://localhost:3000`

## 🔗 API Integration

The dashboard connects to `bio-internal` API:
- Base URL: `http://localhost:4100` (configurable via `.env`)
- Endpoints used:
  - `GET /v1/growth/sources?window=day` - Overview metrics
  - `GET /v1/growth/history/:slug?metric=...&window=...&range=...` - Historical data

## 📊 Pages

1. **Overview** (`/`) - Dashboard with all platforms
2. **Platform Details** (`/platform/:platform`) - Deep dive per platform
3. **Analytics** (`/analytics`) - Advanced analytics (coming soon)

## 🎨 Tech Stack

- **Framework**: Preact 10 (lightweight React alternative)
- **Routing**: preact-router
- **Styling**: Tailwind CSS
- **Build**: Vite
- **TypeScript**: Full type safety

## 📁 Project Structure

```
apps/bio-dashboard/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MetricCard.tsx
│   │   └── LoadingSpinner.tsx
│   ├── pages/           # Route pages
│   │   ├── Overview.tsx
│   │   ├── Platform.tsx
│   │   └── Analytics.tsx
│   ├── lib/             # Utilities
│   │   ├── api.ts       # API client
│   │   └── utils.ts     # Helper functions
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## 🔮 Future Enhancements

- [ ] Authentication & user management
- [ ] Real-time updates (WebSocket or polling)
- [ ] Interactive charts (Chart.js integration)
- [ ] Export data as CSV/PDF
- [ ] Custom date range selection
- [ ] Platform comparison views
- [ ] Alert system for significant changes
- [ ] Dark/Light theme toggle

## 🐛 Troubleshooting

**Dashboard shows "Failed to load data":**
- Ensure `bio-internal` API is running on port 4100
- Check browser console for CORS errors
- Verify API endpoints are accessible

**No data appearing:**
- Run migration script first: `bun run migrate:legacy-growth`
- Check that growth sources are seeded in database
- Verify data exists in `growth_metrics` table

## 📝 License

MIT
