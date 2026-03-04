# Bloodwork Panel Integration — Design Document
**Date:** 2026-03-04
**Phase:** 1 of 3 (Core Longevity Panel)
**Status:** Approved

---

## Overview

Add a bloodwork panel to the Healthspan app that allows users to upload lab documents (photos or PDFs), parse them with Claude Vision API, verify the results, and view a detailed breakdown on a dedicated page. Critical out-of-range markers surface as alerts on the main dashboard.

This is a local-first, proof-of-concept feature. No medical data is ever committed to the codebase or sent to any server other than the Anthropic API for parsing.

---

## Architecture & Data Storage

### Local-first model
- All data lives in `localStorage` — no backend, no accounts, no network persistence
- Oura data migrates from the static TypeScript file (`src/data/oura-data.ts`) to `localStorage`, imported by the user via JSON file upload
- Bloodwork results stored in `localStorage` as structured JSON, keyed by draw date
- Anthropic API key stored in `localStorage` under `healthspan:apiKey`
- The only network call is: image (base64) + prompt → Anthropic Vision API → structured JSON

### New routes
| Route | Purpose |
|---|---|
| `/settings` | API key setup with step-by-step instructions |
| `/bloodwork` | Full lab results page (upload, verify, history, breakdown) |

### Onboarding gate
If no API key is set, a dismissible banner on the main dashboard prompts the user to visit Settings before uploading labs.

---

## Phase Roadmap

| Phase | Scope |
|---|---|
| **Phase 1** (current) | Core longevity panel (~25 markers), document upload, Claude Vision parsing, user verification, dedicated page, dashboard alerts |
| **Phase 2** | Comprehensive panel (60-80+ markers), multi-draw comparison view |
| **Phase 3** | Tiered panel (required core + optional extended), manual entry fallback |

---

## Core Bloodwork Metrics (Phase 1)

~25 markers from Peter Attia's *Outlive* framework, organized by panel.

### Lipids & Cardiovascular
| Marker | Unit | Optimal Range | Attention Threshold |
|---|---|---|---|
| ApoB | mg/dL | 40–90 | >120 |
| LDL-C | mg/dL | <100 | >160 |
| HDL-C | mg/dL | >60 | <40 |
| Triglycerides | mg/dL | <100 | >200 |
| Lp(a) | nmol/L | <75 | >125 |
| hsCRP | mg/L | <1.0 | >3.0 |

### Metabolic
| Marker | Unit | Optimal Range | Attention Threshold |
|---|---|---|---|
| Fasting Glucose | mg/dL | 72–85 | >100 |
| Fasting Insulin | µIU/mL | 2–6 | >10 |
| HbA1c | % | <5.4 | >5.7 |
| HOMA-IR | computed | <1.0 | >2.0 |
| ALT | U/L | <30 | >40 |
| AST | U/L | <30 | >40 |
| GGT | U/L | <25 | >40 |

### CBC
| Marker | Unit | Optimal Range |
|---|---|---|
| WBC | K/µL | 4.0–7.0 |
| RBC | M/µL | 4.5–5.5 |
| Hemoglobin | g/dL | 14–17 (M) / 12–15 (F) |
| Hematocrit | % | 41–52 (M) / 36–46 (F) |
| Platelets | K/µL | 150–350 |

### Hormones
| Marker | Unit | Optimal Range |
|---|---|---|
| Testosterone (Total) | ng/dL | 600–900 (M) |
| Free Testosterone | pg/mL | 15–25 (M) |
| DHEA-S | µg/dL | 200–400 |
| Cortisol | µg/dL | 10–18 (AM) |
| TSH | mIU/L | 1.0–2.5 |

### Micronutrients & Other
| Marker | Unit | Optimal Range | Attention Threshold |
|---|---|---|---|
| Vitamin D (25-OH) | ng/mL | 60–80 | <30 |
| Ferritin | ng/mL | 50–150 | <20 or >300 |
| Homocysteine | µmol/L | <8 | >12 |
| Uric Acid | mg/dL | 3.5–5.5 | >7.0 |

Each marker has:
- **Optimal range** — longevity-calibrated (Attia targets)
- **Acceptable range** — broader clinical normal
- **Unit** — with alternate unit support (e.g. mg/dL vs mmol/L)
- **Status** — `optimal` / `acceptable` / `attention`
- **Action threshold** — triggers dashboard alert

---

## Document Upload & Claude Vision Parsing Flow

### Upload
1. User drags/drops or selects a file (JPG, PNG, PDF)
2. PDF first page is rendered to canvas client-side; all formats converted to base64
3. Privacy notice displayed: *"Your document is sent only to Anthropic's API for parsing. It is never stored on any server."*
4. File never touches any server other than Anthropic's API

### Claude Vision prompt strategy
- Structured system prompt instructs Claude to:
  - Extract only recognized core markers
  - Return strict JSON schema
  - Flag uncertain values with `confidence: "low"`
  - Ignore unrecognized content
- Response schema:
```json
{
  "markers": [
    { "name": "string", "value": number, "unit": "string", "rawText": "string", "confidence": "high|low" }
  ],
  "drawDate": "YYYY-MM-DD",
  "institution": "string"
}
```

### Validation layer (automatic, before user review)
- Physiologically impossible values flagged (e.g. Glucose 4 mg/dL, HbA1c 45%)
- Unit mismatches detected and flagged
- Missing expected markers shown as "not found" — never silently omitted
- Low-confidence values highlighted in amber

### User verification screen
- Editable table: parsed value | unit | raw text from document
- Low-confidence and flagged rows highlighted in amber
- User corrects or confirms each value
- Data writes to `localStorage` only after explicit user confirmation

---

## Bloodwork Page Layout (`/bloodwork`)

### Header bar
- Upload new labs button
- Draw date selector (switch between stored draws)
- Compare toggle (Phase 2 placeholder)

### Summary strip
- 4 stat cards: Total Markers | Optimal (green) | Acceptable (yellow) | Attention (red)
- Overall lab score — weighted composite (mirrors existing health score pattern)

### Panel breakdown
- Collapsible sections: Lipids, Metabolic, CBC, Hormones, Micronutrients
- Each marker row: name | value + unit | optimal range | status badge | sparkline (if multiple draws)
- Attention markers float to top of each panel

### Action items block
- Only shown when attention markers exist
- Plain-language descriptions with "discuss with your clinician" footer
- Example: *"ApoB (142 mg/dL) is above the optimal ceiling of 90 mg/dL — consider discussing with your clinician"*

---

## Dashboard Integration

### Overview tab additions
- "Lab Status" card showing Good / Neutral / Negative overall status
- Mirrors existing stat card pattern

### Alert banner
- Persistent banner if any attention markers are present
- Links directly to `/bloodwork`
- Dismissible per session (not permanently — re-appears on next visit if markers still in attention)

---

## Settings Page (`/settings`)

### API Key Setup — Step-by-step instructions
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create a free account
3. Click **API Keys** in the left sidebar
4. Click **Create Key**, give it a name (e.g. "Healthspan App")
5. Copy the key (starts with `sk-ant-...`)
6. Paste it in the field below and click Save

Key is stored in `localStorage` under `healthspan:apiKey`. It never leaves your device except when calling the Anthropic API directly from your browser.

---

## Privacy & Security Principles

- No medical data is ever committed to the codebase
- No medical data is sent to any server other than Anthropic's API (for parsing only)
- All data lives in the user's browser `localStorage`
- API key lives in `localStorage`, never in code or `.env` files
- A `docs/plans/` entry in `.gitignore` is not needed — design docs are safe to commit; only data files are sensitive

---

## File Structure (new files)

```
src/
├── pages/
│   ├── Bloodwork.tsx         # Main bloodwork page
│   └── Settings.tsx          # API key setup page
├── components/
│   ├── UploadZone.tsx        # Drag/drop file upload
│   ├── VerificationTable.tsx # Parsed marker review/edit
│   └── LabStatusCard.tsx     # Dashboard summary card
├── data/
│   └── bloodwork-metrics.ts  # Marker definitions, ranges, weights (no user data)
├── utils/
│   ├── claude-parser.ts      # Claude Vision API call + prompt
│   ├── lab-validation.ts     # Physiological bounds checking
│   └── lab-storage.ts        # localStorage read/write for lab results
└── types/
    └── bloodwork.ts          # BloodworkMarker, LabResult, ParsedDoc interfaces
```
