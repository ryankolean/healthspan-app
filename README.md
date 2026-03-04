# Healthspan App — Pharma Dashboard

Medicine 3.0 Health Intelligence Platform built on Peter Attia's *Outlive* framework.

## Current Module: Pharma Dashboard

Personal health dashboard pulling Oura Ring data with trend analysis, target zones, and course correction indicators based on longevity-optimized biomarker targets.

### Features

- **Trend Engine** — Compares 14-day rolling averages against 90-day baselines across 15 health metrics
- **Overall Health Score** — Weighted composite factoring zone status and trend direction
- **Course Corrections** — Automatic flagging of declining or out-of-zone metrics
- **7 Dashboard Tabs** — Trends, Overview, Sleep, Activity, Heart, Readiness, Resilience
- **Medicine 3.0 Targets** — All target ranges calibrated to longevity research

### Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Routing:** React Router (HashRouter for GitHub Pages)
- **Deployment:** GitHub Pages via `gh-pages`

## Getting Started

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

```bash
npm run build
npm run deploy
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Charts.tsx    # Stat, ChartCard, TrendCard, Tooltip
│   └── Layout.tsx    # App shell with sidebar navigation
├── data/
│   └── oura-data.ts  # Oura Ring export (typed)
├── pages/
│   └── Dashboard.tsx  # Main dashboard with all tabs
├── types/
│   └── index.ts       # TypeScript interfaces
├── utils/
│   ├── helpers.ts     # Formatting & filtering utilities
│   ├── metrics.ts     # Metric definitions & targets
│   └── trends.ts      # Trend computation engine
├── styles/
│   └── globals.css    # Tailwind + custom styles
├── App.tsx            # Router config
└── main.tsx           # Entry point
```

## Roadmap

- [ ] Bloodwork panel integration (lab results overlay)
- [ ] Exercise domain (node-based progression tree)
- [ ] Nutrition tracking module
- [ ] Sleep optimization module
- [ ] Emotional health module
- [ ] Exogenous molecules tracking
- [ ] Oura API live sync (OAuth flow)
- [ ] Clinician export (PDF generation)

## Data Update

To refresh Oura data:
1. Export from [membership.ouraring.com/data-export](https://membership.ouraring.com/data-export)
2. Run the processing script to regenerate `src/data/oura-data.ts`
3. Commit and redeploy

---

Summit Software Solutions LLC
