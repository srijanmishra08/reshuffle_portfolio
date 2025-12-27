# Category Rules

## Overview

The Portfolio Engine supports **8 user categories**. Each category has unique rules for:
- Content prioritization
- Scoring weights
- Block type preferences
- Hook selection
- Credibility signals

---

## Category Summary

| Category | Primary Goal | Hook Style | Key Metric |
|----------|-------------|------------|------------|
| **Finance** | Trust & ROI | Metrics | Credibility (0.35) |
| **Entertainment** | Engagement | Video | Engagement (0.40) |
| **Design** | Visual Impact | Comparison | Quality (0.30) |
| **Legal** | Authority | Text | Credibility (0.40) |
| **Tech** | Technical Depth | Architecture | Quality (0.25) |
| **Marketing** | Growth Proof | Metrics | Engagement (0.30) |
| **Influencers** | Viral Appeal | Video | Engagement (0.45) |
| **Business** | Strategy | Framework | Credibility (0.35) |

---

## 1. Finance Category

### Profile
- **Target Users:** CFOs, Financial Advisors, Accountants, Investment Professionals
- **Primary Goal:** Establish trust through quantifiable results
- **Tone:** Professional, data-driven, authoritative

### Scoring Weights
```json
{
  "category": "Finance",
  "weights": {
    "relevance": 0.25,
    "quality": 0.20,
    "credibility": 0.35,
    "engagement": 0.05,
    "freshness": 0.15
  }
}
```

### Content Prioritization
| Priority | Content Type | Block Type |
|----------|--------------|------------|
| 1 | ROI/Savings metrics | metric |
| 2 | Case studies | scroll_container |
| 3 | Certifications | expandable_text |
| 4 | Process explanations | timeline |
| 5 | Testimonials | expandable_text |

### Hook Selection Rules
```
IF video exists AND duration < 30s AND contains["ROI", "saved", "returns"]:
    hook = media(video)
ELSE IF metrics exist:
    hook = metric(top_metric)
ELSE:
    hook = expandable_text(headline)
```

### Preferred Block Types
- ✅ `metric` - Primary hook
- ✅ `expandable_text` - Credibility, process
- ✅ `timeline` - Process
- ✅ `scroll_container` - Case studies
- ⚠️ `media` - Only if high quality
- ❌ `comparison` - Rarely appropriate

### Credibility Signals
- CPA/CFA certifications
- Years of experience
- Company names (Fortune 500, Big 4)
- $ amounts saved/managed
- Client count

### Sample Hook
```json
{
  "block_type": "metric",
  "content": {
    "headline": "₹18Cr saved across 9 companies",
    "metrics": [
      { "label": "Avg ROI", "value": "3.6x", "trend": "up" },
      { "label": "Companies", "value": "9" }
    ]
  }
}
```

---

## 2. Entertainment Category

### Profile
- **Target Users:** Actors, Musicians, Directors, Content Creators
- **Primary Goal:** Showcase creative work, build buzz
- **Tone:** Dynamic, visual, engaging

### Scoring Weights
```json
{
  "category": "Entertainment",
  "weights": {
    "relevance": 0.15,
    "quality": 0.15,
    "credibility": 0.10,
    "engagement": 0.40,
    "freshness": 0.20
  }
}
```

### Content Prioritization
| Priority | Content Type | Block Type |
|----------|--------------|------------|
| 1 | Video reels/clips | media |
| 2 | Photo gallery | gallery |
| 3 | Awards/recognition | expandable_text |
| 4 | Press coverage | expandable_text |
| 5 | Behind-the-scenes | media |

### Hook Selection Rules
```
IF video exists AND (views > 10K OR duration < 15s):
    hook = media(video, autoplay=true, muted=true)
ELSE IF high_res_image exists:
    hook = media(image)
ELSE:
    hook = metric(follower_count)
```

### Preferred Block Types
- ✅ `media` - Primary (video/image)
- ✅ `gallery` - Work showcase
- ✅ `scroll_container` - Project showcase
- ⚠️ `metric` - Only for stats (views, followers)
- ❌ `timeline` - Too static
- ❌ `hotspot_media` - Not engaging enough

### Credibility Signals
- View counts
- Follower counts
- Award nominations/wins
- Notable collaborations
- Press mentions

### Sample Hook
```json
{
  "block_type": "media",
  "content": {
    "media_type": "video",
    "source_url": "https://storage.../showreel.mp4",
    "playback": {
      "autoplay": true,
      "muted": true,
      "loop": true
    }
  }
}
```

---

## 3. Design Category

### Profile
- **Target Users:** Graphic Designers, UI/UX, Architects, Product Designers
- **Primary Goal:** Visual portfolio showcase
- **Tone:** Clean, visual, process-oriented

### Scoring Weights
```json
{
  "category": "Design",
  "weights": {
    "relevance": 0.25,
    "quality": 0.30,
    "credibility": 0.10,
    "engagement": 0.25,
    "freshness": 0.10
  }
}
```

### Content Prioritization
| Priority | Content Type | Block Type |
|----------|--------------|------------|
| 1 | Before/after | comparison |
| 2 | Project gallery | gallery |
| 3 | Process documentation | hotspot_media |
| 4 | Case study writeup | scroll_container |
| 5 | Tools/skills | expandable_text |

### Hook Selection Rules
```
IF comparison_images exist:
    hook = comparison(before_after)
ELSE IF hero_image exists AND resolution > 1080p:
    hook = media(image)
ELSE:
    hook = gallery(top_3_projects)
```

### Preferred Block Types
- ✅ `comparison` - Before/after (primary)
- ✅ `gallery` - Project showcase
- ✅ `hotspot_media` - Process explanation
- ✅ `scroll_container` - Case studies
- ⚠️ `media` - Single hero shots
- ❌ `metric` - Design isn't about numbers

### Credibility Signals
- Brand names worked with
- Design awards
- Tool proficiency (Figma, etc.)
- Project outcomes (conversion %, etc.)

### Sample Hook
```json
{
  "block_type": "comparison",
  "content": {
    "comparison_type": "slider",
    "items": [
      { "label": "Before", "media_url": "...old_ui.png" },
      { "label": "After", "media_url": "...new_ui.png" }
    ],
    "context": "Dashboard redesign • 40% conversion increase"
  }
}
```

---

## 4. Legal Category

### Profile
- **Target Users:** Lawyers, Legal Consultants, Compliance Officers
- **Primary Goal:** Establish expertise and trust
- **Tone:** Authoritative, precise, professional

### Scoring Weights
```json
{
  "category": "Legal",
  "weights": {
    "relevance": 0.25,
    "quality": 0.15,
    "credibility": 0.40,
    "engagement": 0.05,
    "freshness": 0.15
  }
}
```

### Content Prioritization
| Priority | Content Type | Block Type |
|----------|--------------|------------|
| 1 | Expertise areas | expandable_text |
| 2 | Case outcomes | expandable_text |
| 3 | Credentials | expandable_text |
| 4 | Process/approach | timeline |
| 5 | Publications | scroll_container |

### Hook Selection Rules
```
IF expertise_text exists AND contains_credentials:
    hook = expandable_text(expertise_summary)
ELSE IF case_count OR years_experience:
    hook = metric(case_stats)
ELSE:
    hook = expandable_text(bio)
```

### Preferred Block Types
- ✅ `expandable_text` - Primary (expertise, cases)
- ✅ `timeline` - Process, career
- ✅ `metric` - Stats (cases won, years)
- ⚠️ `scroll_container` - Publications only
- ❌ `media` - Rarely appropriate
- ❌ `comparison` - Not relevant
- ❌ `gallery` - Not relevant

### Credibility Signals
- Bar admissions
- Years of practice
- Notable cases (if public)
- Firm name/prestige
- Publications
- Speaking engagements

### Sample Hook
```json
{
  "block_type": "expandable_text",
  "content": {
    "title": "Corporate & IP Law",
    "summary": "15+ years specializing in M&A, IP filings, and startup compliance",
    "tags": ["M&A", "IP", "Compliance", "Startups"]
  }
}
```

---

## 5. Tech Category

### Profile
- **Target Users:** Developers, Engineers, CTOs, Tech Leads
- **Primary Goal:** Demonstrate technical expertise
- **Tone:** Technical, precise, innovative

### Scoring Weights
```json
{
  "category": "Tech",
  "weights": {
    "relevance": 0.25,
    "quality": 0.25,
    "credibility": 0.20,
    "engagement": 0.15,
    "freshness": 0.15
  }
}
```

### Content Prioritization
| Priority | Content Type | Block Type |
|----------|--------------|------------|
| 1 | Architecture diagrams | hotspot_media |
| 2 | GitHub projects | scroll_container |
| 3 | Tech stack | expandable_text |
| 4 | System metrics | metric |
| 5 | Blog/talks | scroll_container |

### Hook Selection Rules
```
IF architecture_diagram exists:
    hook = hotspot_media(architecture)
ELSE IF github_stats exist AND stars > 100:
    hook = metric(github_stats)
ELSE IF tech_video exists:
    hook = media(video)
ELSE:
    hook = expandable_text(tech_stack)
```

### Preferred Block Types
- ✅ `hotspot_media` - Architecture (primary)
- ✅ `scroll_container` - Projects, repos
- ✅ `metric` - GitHub stars, scale numbers
- ✅ `expandable_text` - Tech stack, approach
- ⚠️ `media` - Demo videos only
- ❌ `comparison` - Rarely useful
- ❌ `gallery` - Not visual-first

### Credibility Signals
- GitHub stars/contributions
- System scale (req/sec, users)
- Tech stack expertise
- Company names
- Open source contributions
- Conference talks

### Sample Hook
```json
{
  "block_type": "hotspot_media",
  "content": {
    "media_type": "image",
    "source_url": "https://storage.../architecture.png",
    "hotspots": [
      {
        "position": { "x_percent": 0.25, "y_percent": 0.40 },
        "label": "API Gateway",
        "description": "10K req/sec, rate limiting"
      }
    ]
  }
}
```

---

## 6. Marketing Category

### Profile
- **Target Users:** Growth Marketers, CMOs, Brand Managers
- **Primary Goal:** Prove growth capabilities
- **Tone:** Results-driven, energetic, data-backed

### Scoring Weights
```json
{
  "category": "Marketing",
  "weights": {
    "relevance": 0.20,
    "quality": 0.15,
    "credibility": 0.15,
    "engagement": 0.30,
    "freshness": 0.20
  }
}
```

### Content Prioritization
| Priority | Content Type | Block Type |
|----------|--------------|------------|
| 1 | Growth metrics | metric |
| 2 | Campaign results | scroll_container |
| 3 | Brand work | gallery |
| 4 | Strategy frameworks | hotspot_media |
| 5 | Testimonials | expandable_text |

### Hook Selection Rules
```
IF growth_metrics exist AND impressive:
    hook = metric(growth_headline)
ELSE IF campaign_video exists:
    hook = media(video)
ELSE:
    hook = metric(aggregate_stats)
```

### Preferred Block Types
- ✅ `metric` - Primary (growth numbers)
- ✅ `scroll_container` - Campaigns
- ✅ `gallery` - Creative work
- ✅ `comparison` - Before/after campaigns
- ⚠️ `media` - Campaign videos
- ⚠️ `expandable_text` - Strategy only

### Credibility Signals
- Growth percentages
- ROI numbers
- Brand names
- Campaign scale (impressions, spend)
- Industry recognition

### Sample Hook
```json
{
  "block_type": "metric",
  "content": {
    "headline": "5x growth in 60 days",
    "metrics": [
      { "label": "CTR", "value": "3.2%", "trend": "up" },
      { "label": "ROAS", "value": "4.5x" }
    ]
  }
}
```

---

## 7. Influencers Category

### Profile
- **Target Users:** Social Media Influencers, Content Creators
- **Primary Goal:** Showcase reach and engagement
- **Tone:** Authentic, engaging, personal

### Scoring Weights
```json
{
  "category": "Influencers",
  "weights": {
    "relevance": 0.15,
    "quality": 0.10,
    "credibility": 0.10,
    "engagement": 0.45,
    "freshness": 0.20
  }
}
```

### Content Prioritization
| Priority | Content Type | Block Type |
|----------|--------------|------------|
| 1 | Viral videos | media |
| 2 | Engagement stats | metric |
| 3 | Brand collabs | scroll_container |
| 4 | Photo content | gallery |
| 5 | Bio/story | expandable_text |

### Hook Selection Rules
```
IF viral_video exists AND views > 100K:
    hook = media(video, autoplay=true)
ELSE IF follower_count > threshold:
    hook = metric(social_stats)
ELSE:
    hook = gallery(top_posts)
```

### Preferred Block Types
- ✅ `media` - Primary (videos)
- ✅ `metric` - Followers, engagement
- ✅ `gallery` - Content showcase
- ✅ `scroll_container` - Brand deals
- ❌ `expandable_text` - Too static
- ❌ `hotspot_media` - Wrong vibe
- ❌ `timeline` - Not engaging

### Credibility Signals
- Follower count
- Average engagement rate
- Brand partnerships
- Viral content metrics
- Platform verification

### Sample Hook
```json
{
  "block_type": "media",
  "content": {
    "media_type": "video",
    "source_url": "https://storage.../viral_reel.mp4",
    "playback": {
      "autoplay": true,
      "muted": true,
      "loop": true
    },
    "caption": "12M views • 500K likes"
  }
}
```

---

## 8. Business Category

### Profile
- **Target Users:** Entrepreneurs, Consultants, Business Coaches, CEOs
- **Primary Goal:** Demonstrate strategic thinking and results
- **Tone:** Strategic, experienced, results-oriented

### Scoring Weights
```json
{
  "category": "Business",
  "weights": {
    "relevance": 0.25,
    "quality": 0.20,
    "credibility": 0.35,
    "engagement": 0.05,
    "freshness": 0.15
  }
}
```

### Content Prioritization
| Priority | Content Type | Block Type |
|----------|--------------|------------|
| 1 | Framework/methodology | hotspot_media |
| 2 | Success metrics | metric |
| 3 | Case studies | scroll_container |
| 4 | Process | timeline |
| 5 | About/philosophy | expandable_text |

### Hook Selection Rules
```
IF methodology_diagram exists:
    hook = hotspot_media(framework)
ELSE IF business_metrics exist:
    hook = metric(headline_stat)
ELSE:
    hook = expandable_text(value_prop)
```

### Preferred Block Types
- ✅ `hotspot_media` - Frameworks
- ✅ `metric` - Business results
- ✅ `timeline` - Process
- ✅ `expandable_text` - Philosophy, approach
- ✅ `scroll_container` - Case studies
- ⚠️ `media` - Talks/presentations
- ❌ `gallery` - Not visual-first
- ❌ `comparison` - Rarely appropriate

### Credibility Signals
- Companies founded/scaled
- Revenue/growth numbers
- Notable clients
- Speaking engagements
- Publications/books

### Sample Hook
```json
{
  "block_type": "expandable_text",
  "content": {
    "title": "0→1 & 1→10 Growth Advisory",
    "summary": "Helped 12 startups scale from seed to Series B",
    "tags": ["Strategy", "Growth", "Startups"]
  }
}
```

---

## Category Detection Rules

If category is not specified, detect from content:

```python
def detect_category(content_items):
    signals = {
        "Finance": 0,
        "Entertainment": 0,
        "Design": 0,
        "Legal": 0,
        "Tech": 0,
        "Marketing": 0,
        "Influencers": 0,
        "Business": 0
    }
    
    for item in content_items:
        # Source-based signals
        if item.source == "github":
            signals["Tech"] += 3
        if item.source == "instagram" or item.source == "tiktok":
            signals["Influencers"] += 2
            signals["Entertainment"] += 1
        if item.source == "behance" or item.source == "dribbble":
            signals["Design"] += 3
        
        # Content-based signals
        if contains_keywords(item, ["ROI", "savings", "revenue", "tax"]):
            signals["Finance"] += 2
        if contains_keywords(item, ["case", "court", "legal", "law"]):
            signals["Legal"] += 2
        if contains_keywords(item, ["growth", "CTR", "conversion", "campaign"]):
            signals["Marketing"] += 2
        if item.type == "video" and item.duration < 60:
            signals["Entertainment"] += 1
            signals["Influencers"] += 1
    
    return max(signals, key=signals.get)
```

---

## Block Type Compatibility Matrix

| Block Type | Finance | Entertainment | Design | Legal | Tech | Marketing | Influencers | Business |
|------------|---------|---------------|--------|-------|------|-----------|-------------|----------|
| media | ⚠️ | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| expandable_text | ✅ | ❌ | ⚠️ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| metric | ✅ | ⚠️ | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| comparison | ❌ | ❌ | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ |
| hotspot_media | ❌ | ❌ | ✅ | ❌ | ✅ | ⚠️ | ❌ | ✅ |
| scroll_container | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| gallery | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| timeline | ✅ | ❌ | ⚠️ | ✅ | ⚠️ | ❌ | ❌ | ✅ |
| cta | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Legend: ✅ Preferred | ⚠️ Allowed | ❌ Avoid
