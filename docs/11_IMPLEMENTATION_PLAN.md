# Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for the Portfolio Engine.

**Estimated Total Duration:** 6-8 weeks  
**Team Size:** 1-2 backend developers

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Project Setup

```
portfolio-engine/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── validators/
│   ├── core/
│   │   ├── composition/
│   │   ├── scoring/
│   │   └── ingestion/
│   ├── models/
│   ├── services/
│   │   ├── extractors/
│   │   ├── storage/
│   │   └── cache/
│   ├── types/
│   └── utils/
├── tests/
├── config/
└── docs/
```

**Tasks:**
- [ ] Initialize Node.js/TypeScript project
- [ ] Set up Express or Fastify server
- [ ] Configure TypeScript with strict mode
- [ ] Set up ESLint + Prettier
- [ ] Configure Jest for testing
- [ ] Set up Docker for local development
- [ ] Create base configuration system

### 1.2 Type Definitions

**Tasks:**
- [ ] Define all TypeScript interfaces from JSON schemas
- [ ] Create Zod validators for request/response
- [ ] Set up type exports for SDK generation

**Files to create:**
```typescript
// src/types/portfolio.ts
export interface Portfolio {
  portfolio_id: string;
  user_id: string;
  category: Category;
  created_at: string;
  updated_at: string;
  sections: Section[];
  navigation: Navigation;
  analytics?: AnalyticsEvent[];
}

// src/types/blocks.ts
export type Block = 
  | MediaBlock 
  | ExpandableTextBlock 
  | HotspotMediaBlock 
  // ... all 10 block types

// src/types/categories.ts
export type Category = 
  | 'Finance' 
  | 'Entertainment' 
  | 'Design' 
  // ... all 8 categories
```

### 1.3 Database Schema

**Using Firestore (existing):**

```
portfolios/
  {portfolio_id}/
    metadata: { user_id, category, created_at, ... }
    sections: [ ... ]
    navigation: { ... }

users/
  {user_id}/
    portfolios: [portfolio_id, ...]
    raw_content/
      {content_id}/
        type, source, metadata, ...

cache/
  url_metadata/
    {url_hash}/
      extracted_data, expires_at
```

**Tasks:**
- [ ] Define Firestore collection structure
- [ ] Create database access layer
- [ ] Set up security rules
- [ ] Implement caching layer (Redis optional)

---

## Phase 2: Content Ingestion (Week 2-3)

### 2.1 URL Extraction Service

**Supported URL Extraction (only 2 platforms):**
1. YouTube (API + oEmbed - Easy)
2. GitHub (API - Easy)

**Clickable Links Only (no extraction):**
- Instagram, LinkedIn, TikTok, Twitter, Behance, Dribbble
- User provides: title, description, optional thumbnail
- Stored as external links for viewers to click

**Tasks:**
- [ ] Create base `Extractor` interface
- [ ] Implement YouTube extractor (YouTube Data API + oEmbed fallback)
- [ ] Implement GitHub extractor (GitHub API)
- [ ] Create `ExternalLinkHandler` for social platforms
- [ ] Add URL platform detection
- [ ] Add caching for YouTube/GitHub metadata
- [ ] Create validation for required user metadata on social links

**Code Structure:**
```typescript
// src/services/extractors/base.ts
export interface Extractor {
  canHandle(url: string): boolean;
  extract(url: string): Promise<ExtractedContent>;
}

// src/services/extractors/youtube.ts
export class YouTubeExtractor implements Extractor {
  async extract(url: string): Promise<ExtractedContent> {
    // 1. Try YouTube Data API
    // 2. Fallback to oEmbed
    // 3. Fallback to OpenGraph
  }
}

// src/services/extractors/registry.ts
export class ExtractorRegistry {
  private extractors: Extractor[] = [
    new YouTubeExtractor(),
    new GitHubExtractor(),
    // Only YouTube and GitHub support full extraction
  ];
  
  async extract(url: string): Promise<ExtractedContent> {
    for (const extractor of this.extractors) {
      if (extractor.canHandle(url)) {
        return extractor.extract(url);
      }
    }
    // For all other URLs (Instagram, LinkedIn, TikTok, etc.)
    // return as external_link - requires user-provided metadata
    return this.externalLinkHandler.process(url);
  }
}
```

### 2.2 File Processing Service

**Tasks:**
- [ ] Implement PDF text extraction (pdf-parse)
- [ ] Implement image metadata extraction
- [ ] Implement video metadata extraction (ffprobe)
- [ ] Set up file upload to cloud storage
- [ ] Create thumbnail generation service

### 2.3 Content Normalization

**Tasks:**
- [ ] Create unified `ContentItem` schema
- [ ] Implement content type detection
- [ ] Normalize all sources to common format
- [ ] Generate content IDs

---

## Phase 3: Scoring Engine (Week 3-4)

### 3.1 Base Scoring

**Tasks:**
- [ ] Implement relevance scoring (keyword/category match)
- [ ] Implement quality scoring (resolution, duration, completeness)
- [ ] Implement credibility scoring (source authority, verification)
- [ ] Implement engagement scoring (views, likes, shares)
- [ ] Implement freshness scoring (age decay)

**Code Structure:**
```typescript
// src/core/scoring/scorer.ts
export class ContentScorer {
  score(content: ContentItem, category: Category): ScoredContent {
    const scores = {
      relevance: this.scoreRelevance(content, category),
      quality: this.scoreQuality(content),
      credibility: this.scoreCredibility(content),
      engagement: this.scoreEngagement(content),
      freshness: this.scoreFreshness(content)
    };
    
    const weights = CATEGORY_WEIGHTS[category];
    const finalScore = this.computeWeighted(scores, weights);
    
    return { ...content, scores, finalScore };
  }
}
```

### 3.2 Category-Specific Weights

**Tasks:**
- [ ] Define weight configurations for all 8 categories
- [ ] Implement category detection from content
- [ ] Create intent detection for ambiguous content
- [ ] Test scoring across sample portfolios

---

## Phase 4: Composition Engine (Week 4-5)

### 4.1 Section Assignment

**Tasks:**
- [ ] Implement Hook section assignment logic
- [ ] Implement Credibility section assignment logic
- [ ] Implement Work section assignment logic
- [ ] Implement Process section assignment logic
- [ ] Implement Action section assignment logic

### 4.2 Block Builder

**Tasks:**
- [ ] Create `BlockBuilder` for each of 10 block types
- [ ] Implement block type selection logic
- [ ] Generate block content from scored content
- [ ] Add interaction configuration to blocks

**Code Structure:**
```typescript
// src/core/composition/block-builder.ts
export class BlockBuilder {
  buildBlock(content: ScoredContent, section: SectionType, category: Category): Block {
    const blockType = this.selectBlockType(content, section, category);
    const builder = this.builders[blockType];
    return builder.build(content);
  }
  
  private builders = {
    media: new MediaBlockBuilder(),
    expandable_text: new ExpandableTextBlockBuilder(),
    hotspot_media: new HotspotMediaBlockBuilder(),
    // ... all 10 builders
  };
}
```

### 4.3 Portfolio Assembler

**Tasks:**
- [ ] Create section ordering logic
- [ ] Implement navigation generation
- [ ] Add analytics schema integration
- [ ] Validate final portfolio against JSON schema

---

## Phase 5: API Layer (Week 5-6)

### 5.1 REST Endpoints

**Tasks:**
- [ ] `POST /portfolios/generate` - Main generation endpoint
- [ ] `GET /portfolios/{id}` - Get portfolio
- [ ] `PUT /portfolios/{id}` - Update portfolio
- [ ] `DELETE /portfolios/{id}` - Delete portfolio
- [ ] `GET /portfolios/{id}/status` - Generation status
- [ ] `GET /users/{id}/portfolios` - List user portfolios
- [ ] `POST /portfolios/validate` - Pre-validation
- [ ] `GET /categories` - List categories
- [ ] `POST /content/extract` - URL extraction

### 5.2 Authentication & Authorization

**Tasks:**
- [ ] Integrate Firebase Auth verification
- [ ] Implement user-portfolio ownership check
- [ ] Add rate limiting middleware
- [ ] Set up request logging

### 5.3 Async Processing

**Tasks:**
- [ ] Set up job queue (Bull/BullMQ with Redis)
- [ ] Implement async generation worker
- [ ] Add progress tracking
- [ ] Implement webhook notifications

---

## Phase 6: Testing & Polish (Week 6-7)

### 6.1 Unit Tests

**Tasks:**
- [ ] Test all extractors with mock responses
- [ ] Test scoring algorithms
- [ ] Test composition logic
- [ ] Test API validators

### 6.2 Integration Tests

**Tasks:**
- [ ] Test full generation pipeline
- [ ] Test with real URLs (rate-limited)
- [ ] Test error scenarios
- [ ] Test async processing

### 6.3 Sample Portfolio Validation

**Tasks:**
- [ ] Generate portfolios for all 8 categories
- [ ] Validate JSON output matches schema
- [ ] Test rendering in SwiftUI/Flutter
- [ ] Performance testing

---

## Phase 7: Client Integration (Week 7-8)

### 7.1 iOS (SwiftUI) Integration

**Tasks:**
- [ ] Create portfolio JSON decoder
- [ ] Build block renderers for all 10 types
- [ ] Implement interaction handlers
- [ ] Add portfolio preview in app
- [ ] Test with real portfolios

### 7.2 Android (Flutter) Integration

**Tasks:**
- [ ] Create portfolio JSON decoder
- [ ] Build block widgets for all 10 types
- [ ] Implement interaction handlers
- [ ] Add portfolio preview in app
- [ ] Test with real portfolios

---

## Technical Decisions

### Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js 20+ | Team familiarity, async I/O |
| Language | TypeScript | Type safety, schema validation |
| Framework | Fastify | Performance, validation plugins |
| Database | Firestore | Already in use, realtime sync |
| Queue | Bull + Redis | Reliable job processing |
| Cache | Redis | Fast metadata caching |
| Storage | Firebase Storage | Already configured |
| Hosting | Cloud Run | Auto-scaling, cost-efficient |

### External API Setup

| Service | Setup Required | Cost |
|---------|----------------|------|
| YouTube Data API | Create project, enable API, get key | Free (10K/day) |
| GitHub API | Create OAuth app, get token | Free (5K/hour) |

**Note:** Instagram, LinkedIn, TikTok, and other social platforms are handled as **clickable links only** - no API integration needed.

---

## Risk Mitigation

### Handled Risks

1. **Social platform extraction complexity** (ELIMINATED)
   - Solution: Clickable links only - no extraction needed
   - Users provide title + description for Instagram, LinkedIn, TikTok
   - Links open in external browser for viewers

### Remaining Risks

1. **Content relevance scoring accuracy**
   - Mitigation: Start simple, iterate with user feedback
   - Workaround: Manual category override

2. **Performance at scale**
   - Mitigation: Aggressive caching, async processing
   - Workaround: Queue with priority system

3. **YouTube/GitHub API rate limits**
   - Mitigation: oEmbed fallback for YouTube, caching
   - Free tiers are generous (10K YouTube, 5K GitHub/hour)

---

## Milestones & Deliverables

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 1 | Project setup | Running dev server, types defined |
| 2 | Basic extraction | YouTube + GitHub working |
| 3 | Full ingestion | All sources + file processing |
| 4 | Scoring complete | Weighted scoring by category |
| 5 | Composition done | Full portfolio generation |
| 6 | API complete | All endpoints working |
| 7 | Tested | 90%+ test coverage |
| 8 | Integrated | Working in iOS + Flutter apps |

---

## Quick Start Commands

```bash
# Clone and setup
git clone <repo>
cd portfolio-engine
npm install

# Configure environment
cp .env.example .env
# Edit .env with API keys

# Start development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Deploy
npm run deploy
```

---

## Definition of Done

A feature is complete when:

1. ✅ Code written and compiles
2. ✅ Unit tests pass (80%+ coverage)
3. ✅ Integration tests pass
4. ✅ API documentation updated
5. ✅ Sample output validated against schema
6. ✅ Code reviewed
7. ✅ Deployed to staging
8. ✅ Tested in mobile apps
