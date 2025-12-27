# Content Creation & Interactive Portfolio Engine

## 🎯 Overview

A standalone, headless engine that generates **JSON-driven, interactive, narrative-style portfolio documents** for the ReShuffle mobile app.

This is NOT:
- ❌ A portfolio builder
- ❌ A website generator
- ❌ A reels feature

This IS:
- ✅ A **Narrative Interaction Engine for Professional Identity**
- ✅ A headless interactive website generator optimized for mobile
- ✅ A deterministic content composition system

---

## 🏗️ Architecture Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PORTFOLIO ENGINE - STANDALONE SERVER                      │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   Raw Content    │
                              │  (User Inputs)   │
                              └────────┬─────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CONTENT INGESTION PIPELINE                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Videos    │  │   Images    │  │    PDFs     │  │   YouTube   │          │
│  │  (Upload)   │  │  (Upload)   │  │  (Upload)   │  │   GitHub    │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                │                  │
│         └────────────────┴────────────────┴────────────────┘                  │
│                                   │                                           │
│                                   ▼                                           │
│                        ┌─────────────────────┐                               │
│                        │  NORMALIZE + PARSE  │                               │
│                        └──────────┬──────────┘                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           SCORING ENGINE                                      │
│                                                                               │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│   │  Relevance   │  │   Quality    │  │ Credibility  │  │  Engagement  │     │
│   │    Score     │  │    Score     │  │    Score     │  │    Score     │     │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                               │
│                        ┌──────────────────────┐                              │
│                        │  Category Weighting  │                              │
│                        │   (8 Categories)     │                              │
│                        └──────────────────────┘                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        COMPOSITION ENGINE                                     │
│                                                                               │
│   ┌─────────┐   ┌─────────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   │
│   │  HOOK   │ → │ CREDIBILITY │ → │  WORK   │ → │ PROCESS │ → │ ACTION  │   │
│   └─────────┘   └─────────────┘   └─────────┘   └─────────┘   └─────────┘   │
│                                                                               │
│                    ┌──────────────────────────────┐                          │
│                    │  Block Type Selection        │                          │
│                    │  Interaction Graph Building  │                          │
│                    └──────────────────────────────┘                          │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                           ┌───────────────────────┐
                           │   JSON Portfolio      │
                           │   (Deterministic)     │
                           └───────────┬───────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
           ┌───────────────┐                     ┌───────────────┐
           │   SwiftUI     │                     │   Flutter     │
           │   (Native)    │                     │   (Native)    │
           └───────────────┘                     └───────────────┘
```

---

## 📚 Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [JSON_SCHEMAS.md](01_JSON_SCHEMAS.md) | Locked JSON contracts for portfolio structure |
| 02 | [BLOCK_TYPES.md](02_BLOCK_TYPES.md) | All block types with content schemas |
| 03 | [INTERACTION_CONTRACTS.md](03_INTERACTION_CONTRACTS.md) | Locked interaction types and behaviors |
| 04 | [CATEGORY_RULES.md](04_CATEGORY_RULES.md) | Rules for 8 user categories |
| 05 | [SCORING_HEURISTICS.md](05_SCORING_HEURISTICS.md) | Content scoring algorithms |
| 06 | [COMPOSITION_ENGINE.md](06_COMPOSITION_ENGINE.md) | Portfolio composition logic |
| 07 | [CONTENT_INGESTION.md](07_CONTENT_INGESTION.md) | Content parsing and normalization |
| 08 | [URL_PARSING.md](08_URL_PARSING.md) | YouTube/GitHub extraction + clickable social links |
| 09 | [SAMPLE_PORTFOLIOS.md](09_SAMPLE_PORTFOLIOS.md) | Example JSON for all 8 categories |
| 10 | [API_SPECIFICATION.md](10_API_SPECIFICATION.md) | REST API endpoints |
| 11 | [IMPLEMENTATION_PLAN.md](11_IMPLEMENTATION_PLAN.md) | Step-by-step build guide |

---

## 🎯 Supported Categories

| Category | Primary Focus | Hook Style | Credibility Weight |
|----------|--------------|------------|-------------------|
| **Finance** | ROI, metrics, trust | Metric-heavy | Very High (0.35) |
| **Entertainment** | Visual impact | Video autoplay | Low (0.10) |
| **Design** | Before/after, visual | Comparison block | Low (0.10) |
| **Legal** | Expertise, trust | Text credibility | Very High (0.40) |
| **Tech** | Technical depth | Architecture visual | Medium (0.20) |
| **Marketing** | Growth metrics | Metric + engagement | Medium (0.15) |
| **Influencers** | Viral content | Video hook | Low (0.10) |
| **Business** | Process, strategy | Framework visual | High (0.35) |

---

## 🔒 Core Constraints

### MUST
- ✅ Generate deterministic JSON output
- ✅ Support all 8 categories
- ✅ Use fixed portfolio skeleton (Hook → Credibility → Work → Process → Action)
- ✅ Remain client-agnostic (no UI rendering)
- ✅ Support only locked interaction types
- ✅ Be mobile-first optimized

### MUST NOT
- ❌ Render any UI
- ❌ Use WebViews
- ❌ Allow arbitrary customization
- ❌ Support infinite block types
- ❌ Use desktop-only interaction models
- ❌ Deviate from locked schemas

---

## 🚀 Quick Start

```bash
# Server setup (future implementation)
cd portfolio-engine
npm install
npm run dev

# Generate portfolio
POST /api/v1/portfolio/generate
{
  "user_id": "uuid",
  "category": "Finance",
  "content": [...]
}

# Response: Deterministic JSON portfolio
```

---

## 📊 Output Example (Simplified)

```json
{
  "portfolio_id": "p_abc123",
  "user_id": "u_xyz789",
  "category": "Finance",
  "version": "v1",
  "sections": [
    {
      "section_id": "hook",
      "blocks": [{ "block_type": "metric", "content": {...} }]
    },
    {
      "section_id": "credibility",
      "blocks": [{ "block_type": "expandable_text", "content": {...} }]
    },
    {
      "section_id": "work",
      "blocks": [{ "block_type": "scroll_container", "content": {...} }]
    },
    {
      "section_id": "process",
      "blocks": [{ "block_type": "expandable_text", "content": {...} }]
    },
    {
      "section_id": "action",
      "blocks": [{ "block_type": "cta", "content": {...} }]
    }
  ],
  "navigation": { "anchors": {...}, "deep_links": true },
  "analytics": { "tracking_enabled": true }
}
```

---

## 🔧 Tech Stack (Recommended)

| Component | Technology | Reason |
|-----------|------------|--------|
| **Server** | Node.js / Python FastAPI | JSON-native, async support |
| **Database** | PostgreSQL + Redis | Structured data + caching |
| **Storage** | Firebase Storage / S3 | Media handling |
| **Queue** | Bull / Celery | Content processing jobs |
| **Metadata** | OpenGraph / oembed | URL parsing |

---

## ⚠️ Important Notes

### URL Parsing Complexity
URL parsing (YouTube, Instagram, GitHub, etc.) requires:
- Third-party API integrations
- Rate limiting considerations
- Fallback strategies

See [08_URL_PARSING.md](08_URL_PARSING.md) for detailed strategies and workarounds.

### Why Standalone Server?
1. **Separation of concerns** - Portfolio logic ≠ app logic
2. **Cross-platform** - Same JSON for iOS + Android
3. **Scalability** - Heavy processing off mobile
4. **Iteration** - Update engine without app releases

---

## 📅 Development Phases

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Schema finalization + basic composition | Week 1-2 |
| 2 | Scoring engine + category rules | Week 2-3 |
| 3 | Content ingestion pipeline | Week 3-4 |
| 4 | URL parsing integration | Week 4-5 |
| 5 | API endpoints + testing | Week 5-6 |
| 6 | Client integration (SwiftUI/Flutter) | Week 6-8 |

---

## 📞 Next Steps

1. Review all documentation files
2. Validate JSON schemas against client requirements
3. Decide on URL parsing strategy (see notes below)
4. Begin Phase 1 implementation

**Start with:** [01_JSON_SCHEMAS.md](01_JSON_SCHEMAS.md)
