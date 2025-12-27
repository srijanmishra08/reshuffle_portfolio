# Scoring Heuristics

## Overview

The scoring engine is the **intelligence layer** of the Portfolio Engine. It determines which content appears where, in what order, and with what prominence.

**Principles:**
- ❌ No black-box ML (initially)
- ✅ Rule-based, explainable
- ✅ Category-aware
- ✅ Deterministic

---

## Scoring Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SCORING PIPELINE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Raw Content
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        1. BASE SCORE CALCULATION                             │
│                                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │ Relevance  │ │  Quality   │ │Credibility │ │ Engagement │ │ Freshness  │ │
│  │   Score    │ │   Score    │ │   Score    │ │   Score    │ │   Score    │ │
│  │  (0-1)     │ │   (0-1)    │ │   (0-1)    │ │   (0-1)    │ │   (0-1)    │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      2. CATEGORY WEIGHT APPLICATION                          │
│                                                                              │
│  weighted_score = relevance × w_r + quality × w_q + credibility × w_c       │
│                 + engagement × w_e + freshness × w_f                         │
└─────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        3. INTENT DETECTION                                   │
│                                                                              │
│  Content → [hook, case-study, demo, explanation, proof, testimonial]        │
└─────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     4. SECTION ASSIGNMENT                                    │
│                                                                              │
│  Intent + Score → Hook | Credibility | Work | Process | Action              │
└─────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
Scored & Assigned Content
```

---

## 1. Base Scores

### 1.1 Relevance Score

**Question:** Does this content belong to this category?

```python
def calculate_relevance(content, category):
    score = 0.0
    
    # Type match (0.4 weight)
    type_match = content.type in category.allowed_types
    type_score = 1.0 if type_match else 0.3
    score += type_score * 0.4
    
    # Keyword overlap (0.4 weight)
    text = content.extracted_text or ""
    keywords = category.keywords
    overlap = len(set(text.lower().split()) & set(keywords))
    keyword_score = min(overlap / 5, 1.0)  # Cap at 5 matches
    score += keyword_score * 0.4
    
    # Source affinity (0.2 weight)
    source_affinity = CATEGORY_SOURCE_AFFINITY[category][content.source]
    score += source_affinity * 0.2
    
    return clamp(score, 0, 1)
```

### Source Affinity Matrix

| Source | Finance | Entertainment | Design | Legal | Tech | Marketing | Influencers | Business |
|--------|---------|---------------|--------|-------|------|-----------|-------------|----------|
| github | 0.2 | 0.1 | 0.3 | 0.0 | 1.0 | 0.1 | 0.0 | 0.2 |
| youtube | 0.3 | 1.0 | 0.4 | 0.2 | 0.6 | 0.8 | 1.0 | 0.5 |
| instagram | 0.1 | 0.9 | 0.7 | 0.1 | 0.2 | 0.8 | 1.0 | 0.3 |
| linkedin | 0.8 | 0.3 | 0.4 | 0.7 | 0.7 | 0.6 | 0.4 | 0.9 |
| behance | 0.1 | 0.3 | 1.0 | 0.0 | 0.2 | 0.5 | 0.2 | 0.1 |
| dribbble | 0.1 | 0.2 | 1.0 | 0.0 | 0.2 | 0.4 | 0.2 | 0.1 |
| tiktok | 0.1 | 0.9 | 0.3 | 0.1 | 0.2 | 0.7 | 1.0 | 0.2 |
| upload | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 |

### Category Keywords

```python
CATEGORY_KEYWORDS = {
    "Finance": [
        "roi", "revenue", "savings", "tax", "audit", "financial", "investment",
        "portfolio", "returns", "profit", "margin", "budget", "forecast",
        "cfo", "cpa", "cfa", "accounting", "compliance", "fiduciary"
    ],
    "Entertainment": [
        "film", "music", "acting", "director", "producer", "cast", "scene",
        "performance", "show", "episode", "series", "album", "track", "award",
        "nomination", "premiere", "release", "tour", "concert"
    ],
    "Design": [
        "ui", "ux", "design", "visual", "brand", "logo", "typography", "color",
        "layout", "wireframe", "prototype", "figma", "sketch", "adobe",
        "responsive", "accessibility", "user", "experience", "interface"
    ],
    "Legal": [
        "law", "legal", "case", "court", "litigation", "contract", "compliance",
        "attorney", "counsel", "practice", "firm", "bar", "ip", "patent",
        "trademark", "m&a", "merger", "acquisition", "settlement"
    ],
    "Tech": [
        "software", "engineering", "code", "api", "database", "cloud", "aws",
        "kubernetes", "docker", "react", "python", "javascript", "backend",
        "frontend", "devops", "architecture", "scale", "performance", "security"
    ],
    "Marketing": [
        "growth", "campaign", "ctr", "conversion", "roas", "cac", "ltv",
        "funnel", "acquisition", "retention", "brand", "content", "seo",
        "sem", "social", "influencer", "viral", "engagement", "reach"
    ],
    "Influencers": [
        "followers", "likes", "views", "viral", "collab", "brand", "sponsor",
        "content", "creator", "audience", "engagement", "reach", "post",
        "reel", "story", "live", "trending", "hashtag"
    ],
    "Business": [
        "startup", "founder", "ceo", "strategy", "growth", "scale", "funding",
        "series", "investor", "pitch", "market", "gtm", "product", "revenue",
        "team", "leadership", "advisory", "consulting", "transformation"
    ]
}
```

---

### 1.2 Quality Score

**Question:** Is this well-formed, high-quality content?

```python
def calculate_quality(content):
    score = 0.0
    
    # Media resolution (0.3 weight)
    if content.type in ["video", "image"]:
        resolution_score = calculate_resolution_score(content)
        score += resolution_score * 0.3
    else:
        score += 0.5 * 0.3  # Default for non-media
    
    # Metadata completeness (0.4 weight)
    completeness = calculate_completeness(content)
    score += completeness * 0.4
    
    # Clarity (0.3 weight)
    if content.extracted_text:
        clarity = calculate_clarity(content.extracted_text)
        score += clarity * 0.3
    else:
        score += 0.5 * 0.3
    
    return clamp(score, 0, 1)

def calculate_resolution_score(content):
    if content.type == "video":
        if content.resolution >= 1080:
            return 1.0
        elif content.resolution >= 720:
            return 0.7
        else:
            return 0.4
    elif content.type == "image":
        megapixels = (content.width * content.height) / 1_000_000
        if megapixels >= 2:
            return 1.0
        elif megapixels >= 1:
            return 0.7
        else:
            return 0.4
    return 0.5

def calculate_completeness(content):
    required_fields = ["title", "source", "created_at"]
    optional_fields = ["description", "tags", "duration", "dimensions"]
    
    required_score = sum(1 for f in required_fields if getattr(content, f)) / len(required_fields)
    optional_score = sum(1 for f in optional_fields if getattr(content, f)) / len(optional_fields)
    
    return required_score * 0.7 + optional_score * 0.3

def calculate_clarity(text):
    # Simplified readability score
    words = text.split()
    avg_word_length = sum(len(w) for w in words) / max(len(words), 1)
    sentences = text.count('.') + text.count('!') + text.count('?')
    avg_sentence_length = len(words) / max(sentences, 1)
    
    # Penalize very long words and sentences
    word_score = 1.0 if avg_word_length < 8 else 0.7
    sentence_score = 1.0 if avg_sentence_length < 25 else 0.7
    
    return (word_score + sentence_score) / 2
```

---

### 1.3 Credibility Score

**Question:** Does this build trust?

```python
def calculate_credibility(content, category):
    score = 0.0
    
    # Brand signals (0.4 weight)
    brand_score = detect_brand_signals(content, category)
    score += brand_score * 0.4
    
    # Professional signals (0.4 weight)
    professional_score = detect_professional_signals(content, category)
    score += professional_score * 0.4
    
    # Verification (0.2 weight)
    verification_score = detect_verification(content)
    score += verification_score * 0.2
    
    return clamp(score, 0, 1)

def detect_brand_signals(content, category):
    text = (content.extracted_text or "").lower()
    
    # Known brand mentions
    PRESTIGIOUS_BRANDS = {
        "Finance": ["kpmg", "deloitte", "ey", "pwc", "goldman", "morgan stanley", "jpmorgan"],
        "Tech": ["google", "meta", "amazon", "microsoft", "apple", "netflix", "stripe"],
        "Design": ["apple", "google", "airbnb", "uber", "spotify", "nike", "coca-cola"],
        "Legal": ["skadden", "latham", "kirkland", "wachtell", "sullivan & cromwell"],
        "Marketing": ["google", "meta", "hubspot", "salesforce", "ogilvy", "wpp"],
        "Business": ["mckinsey", "bcg", "bain", "sequoia", "a16z", "yc", "accel"],
        "Entertainment": ["netflix", "disney", "warner", "universal", "sony", "paramount"],
        "Influencers": []  # Brands are less relevant
    }
    
    brands = PRESTIGIOUS_BRANDS.get(category, [])
    mentions = sum(1 for brand in brands if brand in text)
    return min(mentions / 2, 1.0)

def detect_professional_signals(content, category):
    text = (content.extracted_text or "").lower()
    
    CREDENTIALS = {
        "Finance": ["cfa", "cpa", "mba", "chartered", "certified"],
        "Legal": ["bar", "jd", "llm", "admitted", "licensed"],
        "Tech": ["phd", "msc", "certified", "aws", "gcp", "azure"],
        "Design": ["certified", "award", "recognized"],
        "Marketing": ["certified", "google ads", "meta blueprint"],
        "Business": ["mba", "founder", "ceo", "advisor"],
        "Entertainment": ["award", "nominated", "emmy", "grammy", "oscar"],
        "Influencers": ["verified", "partner", "ambassador"]
    }
    
    creds = CREDENTIALS.get(category, [])
    mentions = sum(1 for cred in creds if cred in text)
    return min(mentions / 2, 1.0)

def detect_verification(content):
    # Platform verification
    if content.verified:
        return 1.0
    
    # Source credibility
    HIGH_TRUST_SOURCES = ["linkedin", "github", "behance", "dribbble"]
    if content.source in HIGH_TRUST_SOURCES:
        return 0.7
    
    return 0.3
```

---

### 1.4 Engagement Score

**Question:** Will this hold attention?

```python
def calculate_engagement(content):
    score = 0.0
    
    # View count (0.4 weight)
    if content.view_count:
        view_score = normalize_views(content.view_count, content.source)
        score += view_score * 0.4
    else:
        score += 0.3 * 0.4  # Default
    
    # Retention proxy (0.3 weight)
    if content.type == "video" and content.duration:
        retention_score = calculate_retention_proxy(content.duration)
        score += retention_score * 0.3
    else:
        score += 0.5 * 0.3
    
    # Interaction density (0.3 weight)
    interaction_score = calculate_interaction_density(content)
    score += interaction_score * 0.3
    
    return clamp(score, 0, 1)

def normalize_views(views, source):
    # Different thresholds per platform
    THRESHOLDS = {
        "youtube": {"low": 1000, "mid": 10000, "high": 100000},
        "instagram": {"low": 500, "mid": 5000, "high": 50000},
        "tiktok": {"low": 5000, "mid": 50000, "high": 500000},
        "linkedin": {"low": 100, "mid": 1000, "high": 10000},
        "default": {"low": 500, "mid": 5000, "high": 50000}
    }
    
    t = THRESHOLDS.get(source, THRESHOLDS["default"])
    
    if views >= t["high"]:
        return 1.0
    elif views >= t["mid"]:
        return 0.7
    elif views >= t["low"]:
        return 0.4
    else:
        return 0.2

def calculate_retention_proxy(duration_seconds):
    # Optimal duration varies by use case
    # Short-form: 15-60s optimal
    # Long-form: 2-10 min optimal
    
    if duration_seconds <= 15:
        return 1.0  # Perfect hook length
    elif duration_seconds <= 60:
        return 0.9  # Good short-form
    elif duration_seconds <= 180:
        return 0.7  # Acceptable
    elif duration_seconds <= 600:
        return 0.5  # Long but okay for deep content
    else:
        return 0.3  # Too long for mobile

def calculate_interaction_density(content):
    # Content with natural interaction points scores higher
    score = 0.5  # Base
    
    if content.has_annotations:
        score += 0.2
    if content.has_chapters:
        score += 0.1
    if content.has_timestamps:
        score += 0.1
    if content.type == "image" and content.has_hotspot_candidates:
        score += 0.2
    
    return min(score, 1.0)
```

---

### 1.5 Freshness Score

**Question:** Is this current and relevant?

```python
def calculate_freshness(content, category):
    if not content.created_at:
        return 0.5  # Default for unknown dates
    
    days_old = (datetime.now() - content.created_at).days
    half_life = CATEGORY_HALF_LIFE[category]
    
    # Exponential decay
    score = math.exp(-0.693 * days_old / half_life)
    return clamp(score, 0, 1)

# Half-life in days (when content is 50% as fresh)
CATEGORY_HALF_LIFE = {
    "Finance": 180,      # 6 months - financial data ages
    "Entertainment": 60, # 2 months - needs to be current
    "Design": 365,       # 1 year - design ages slower
    "Legal": 180,        # 6 months - laws change
    "Tech": 120,         # 4 months - tech moves fast
    "Marketing": 90,     # 3 months - campaigns are timely
    "Influencers": 30,   # 1 month - viral content ages fast
    "Business": 180      # 6 months - strategy is durable
}
```

---

## 2. Category Weights

### Weight Table

| Category | Relevance | Quality | Credibility | Engagement | Freshness |
|----------|-----------|---------|-------------|------------|-----------|
| Finance | 0.25 | 0.20 | 0.35 | 0.05 | 0.15 |
| Entertainment | 0.15 | 0.15 | 0.10 | 0.40 | 0.20 |
| Design | 0.25 | 0.30 | 0.10 | 0.25 | 0.10 |
| Legal | 0.25 | 0.15 | 0.40 | 0.05 | 0.15 |
| Tech | 0.25 | 0.25 | 0.20 | 0.15 | 0.15 |
| Marketing | 0.20 | 0.15 | 0.15 | 0.30 | 0.20 |
| Influencers | 0.15 | 0.10 | 0.10 | 0.45 | 0.20 |
| Business | 0.25 | 0.20 | 0.35 | 0.05 | 0.15 |

### Weighted Score Calculation

```python
def calculate_weighted_score(content, category):
    weights = CATEGORY_WEIGHTS[category]
    
    relevance = calculate_relevance(content, category)
    quality = calculate_quality(content)
    credibility = calculate_credibility(content, category)
    engagement = calculate_engagement(content)
    freshness = calculate_freshness(content, category)
    
    weighted_score = (
        relevance * weights["relevance"] +
        quality * weights["quality"] +
        credibility * weights["credibility"] +
        engagement * weights["engagement"] +
        freshness * weights["freshness"]
    )
    
    return {
        "total": weighted_score,
        "breakdown": {
            "relevance": relevance,
            "quality": quality,
            "credibility": credibility,
            "engagement": engagement,
            "freshness": freshness
        }
    }

CATEGORY_WEIGHTS = {
    "Finance": {
        "relevance": 0.25,
        "quality": 0.20,
        "credibility": 0.35,
        "engagement": 0.05,
        "freshness": 0.15
    },
    # ... other categories
}
```

---

## 3. Intent Detection

### Intent Types

| Intent | Description | Target Section |
|--------|-------------|----------------|
| `hook` | Attention grabber | Hook |
| `case-study` | Detailed work example | Work |
| `demo` | Product/skill demonstration | Work |
| `explanation` | Process/approach description | Process |
| `proof` | Credibility evidence | Credibility |
| `testimonial` | Third-party endorsement | Credibility |

### Detection Logic

```python
def detect_intent(content, category):
    intents = []
    
    # Hook intent
    if content.type == "video" and content.duration and content.duration < 15:
        intents.append("hook")
    if content.type == "image" and is_hero_quality(content):
        intents.append("hook")
    
    # Case study intent
    case_keywords = ["case", "result", "reduced", "increased", "improved", 
                     "achieved", "delivered", "generated"]
    if any(kw in (content.extracted_text or "").lower() for kw in case_keywords):
        intents.append("case-study")
    
    # Demo intent
    if content.source == "github":
        intents.append("demo")
    if content.type == "video" and "demo" in (content.title or "").lower():
        intents.append("demo")
    if content.type == "pdf" and has_diagrams(content):
        intents.append("demo")
    
    # Explanation intent
    if content.extracted_text and len(content.extracted_text) > 500:
        intents.append("explanation")
    if content.type == "video" and content.duration and content.duration > 120:
        intents.append("explanation")
    
    # Proof intent
    proof_keywords = ["certified", "award", "recognized", "featured", 
                      "published", "verified"]
    if any(kw in (content.extracted_text or "").lower() for kw in proof_keywords):
        intents.append("proof")
    
    # Testimonial intent
    testimonial_patterns = ["said", "according to", "testimonial", 
                           "review", "feedback", "recommended"]
    if any(p in (content.extracted_text or "").lower() for p in testimonial_patterns):
        intents.append("testimonial")
    
    # Default based on type
    if not intents:
        intents = infer_default_intent(content, category)
    
    return intents

def infer_default_intent(content, category):
    TYPE_DEFAULT_INTENTS = {
        "video": ["demo"],
        "image": ["demo"],
        "pdf": ["explanation"],
        "link": ["proof"],
        "code": ["demo"]
    }
    return TYPE_DEFAULT_INTENTS.get(content.type, ["demo"])
```

---

## 4. Scoring Output

### Scored Content Item

```json
{
  "content_id": "c_12345",
  "original_content": { /* ... */ },
  "scores": {
    "total": 0.78,
    "breakdown": {
      "relevance": 0.85,
      "quality": 0.72,
      "credibility": 0.90,
      "engagement": 0.45,
      "freshness": 0.80
    }
  },
  "intents": ["case-study", "proof"],
  "assigned_section": "work",
  "recommended_block_type": "scroll_container",
  "priority": "high"
}
```

---

## 5. Thresholds and Filters

### Minimum Score Thresholds

```python
MINIMUM_THRESHOLDS = {
    "hook": 0.6,       # Hook must be strong
    "credibility": 0.4, # Some credibility required
    "work": 0.3,       # Lower bar for work items
    "process": 0.3,    # Lower bar for process
    "action": 0.0      # CTA always included
}

def should_include(scored_item, section):
    threshold = MINIMUM_THRESHOLDS.get(section, 0.3)
    return scored_item.scores.total >= threshold
```

### Content Limits

```python
SECTION_LIMITS = {
    "hook": 1,        # Only one hook
    "credibility": 3, # Max 3 credibility items
    "work": 5,        # Max 5 work items
    "process": 2,     # Max 2 process items
    "action": 1       # One CTA
}
```

---

## 6. Debugging Scores

Always log scoring decisions for debugging:

```python
def score_with_logging(content, category, debug=False):
    result = calculate_weighted_score(content, category)
    
    if debug:
        print(f"""
        Content: {content.id}
        Category: {category}
        
        Scores:
        - Relevance: {result.breakdown.relevance:.2f}
        - Quality: {result.breakdown.quality:.2f}
        - Credibility: {result.breakdown.credibility:.2f}
        - Engagement: {result.breakdown.engagement:.2f}
        - Freshness: {result.breakdown.freshness:.2f}
        
        Total: {result.total:.2f}
        
        Intents: {detect_intent(content, category)}
        """)
    
    return result
```

---

## 7. Testing Scoring

```python
def test_scoring_determinism():
    """Same input must always produce same output"""
    content = create_test_content()
    
    score1 = calculate_weighted_score(content, "Finance")
    score2 = calculate_weighted_score(content, "Finance")
    
    assert score1.total == score2.total
    assert score1.breakdown == score2.breakdown

def test_category_differentiation():
    """Same content should score differently per category"""
    github_repo = create_github_content()
    
    tech_score = calculate_weighted_score(github_repo, "Tech")
    finance_score = calculate_weighted_score(github_repo, "Finance")
    
    assert tech_score.total > finance_score.total
```
