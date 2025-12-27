# JSON Schemas (Locked Contract)

## ⚠️ IMPORTANT: This is a LOCKED CONTRACT

These schemas define the API contract between the Portfolio Engine and client apps (SwiftUI/Flutter).

**Do NOT casually modify these schemas** - any change requires:
1. Version bump
2. Client app updates
3. Migration strategy

---

## 1. Top-Level Portfolio Schema

```json
{
  "portfolio_id": "string (uuid)",
  "user_id": "string (uuid)",
  "category": "Finance | Entertainment | Design | Legal | Tech | Marketing | Influencers | Business",
  "version": "v1",
  "meta": {
    "title": "string",
    "subtitle": "string",
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601",
    "language": "en",
    "theme": "light | dark | auto"
  },
  "sections": [Section],
  "navigation": Navigation,
  "analytics": Analytics
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `portfolio_id` | UUID | ✅ | Unique portfolio identifier |
| `user_id` | UUID | ✅ | Owner user identifier |
| `category` | Enum | ✅ | One of 8 allowed categories |
| `version` | String | ✅ | Schema version (always "v1") |
| `meta` | Object | ✅ | Portfolio metadata |
| `sections` | Array | ✅ | Ordered list of sections |
| `navigation` | Object | ✅ | Navigation configuration |
| `analytics` | Object | ✅ | Analytics configuration |

---

## 2. Section Schema

```json
{
  "section_id": "hook | credibility | work | process | action",
  "order": 1,
  "layout": "full | contained | split",
  "visibility": {
    "initial": "visible | collapsed",
    "min_content_required": 1
  },
  "blocks": [Block]
}
```

### Section IDs (Fixed Order)

| Order | Section ID | Purpose | Required |
|-------|------------|---------|----------|
| 1 | `hook` | Attention grabber | ✅ |
| 2 | `credibility` | Trust building | ✅ |
| 3 | `work` | Portfolio/case studies | ✅ |
| 4 | `process` | How they work | ⚠️ Optional |
| 5 | `action` | CTA/conversion | ✅ |

### Layout Types

| Layout | Description | Use Case |
|--------|-------------|----------|
| `full` | Full-width, immersive | Videos, hero images |
| `contained` | Padded container | Text, metrics |
| `split` | Two-column on tablet | Comparisons |

---

## 3. Block Schema (Core Unit)

```json
{
  "block_id": "string (uuid)",
  "block_type": "media | expandable_text | hotspot_media | scroll_container | metric | comparison | cta | timeline | gallery | external_link",
  "content": ContentByType,
  "interaction": Interaction,
  "visibility": {
    "initial": "collapsed | expanded",
    "priority": "high | medium | low"
  },
  "style": {
    "background": "string (hex)",
    "padding": "none | small | medium | large"
  }
}
```

### Block Types Overview

| Type | Description | Sections Allowed |
|------|-------------|------------------|
| `media` | Video/image/audio | All |
| `expandable_text` | Collapsible text | credibility, work, process |
| `hotspot_media` | Interactive image | work, process |
| `scroll_container` | Horizontal scroll | work |
| `metric` | Numbers/stats | hook, work |
| `comparison` | Before/after | work |
| `cta` | Call-to-action | action |
| `timeline` | Chronological items | process, work |
| `gallery` | Image carousel | work |
| `external_link` | Clickable social link | work, credibility |

---

## 4. Content Schemas (By Block Type)

### 4.1 Media Block Content

```json
{
  "media_type": "video | image | audio",
  "source_url": "string (URL)",
  "thumbnail_url": "string (URL)",
  "fallback_url": "string (URL) | null",
  "dimensions": {
    "width": 1080,
    "height": 1920,
    "aspect_ratio": "9:16 | 16:9 | 1:1 | 4:5"
  },
  "playback": {
    "autoplay": true,
    "muted": true,
    "loop": false,
    "start_time": 0,
    "end_time": null
  },
  "caption": "string | null",
  "accessibility": {
    "alt_text": "string",
    "transcript_url": "string | null"
  }
}
```

### 4.2 Expandable Text Content

```json
{
  "title": "string",
  "summary": "string (max 150 chars)",
  "full_text": "string (markdown supported)",
  "reading_time_seconds": 120,
  "icon": "string (SF Symbol / Material Icon name) | null",
  "tags": ["string"]
}
```

### 4.3 Metric Block Content

```json
{
  "headline": "string",
  "subheadline": "string | null",
  "metrics": [
    {
      "label": "string",
      "value": "string",
      "unit": "string | null",
      "trend": "up | down | neutral | null",
      "highlight": true
    }
  ],
  "source_attribution": "string | null",
  "date_range": {
    "start": "ISO-8601 | null",
    "end": "ISO-8601 | null"
  }
}
```

### 4.4 Comparison Block Content

```json
{
  "comparison_type": "before_after | side_by_side | slider",
  "items": [
    {
      "label": "Before",
      "media_url": "string (URL)",
      "caption": "string | null"
    },
    {
      "label": "After",
      "media_url": "string (URL)",
      "caption": "string | null"
    }
  ],
  "context": "string | null"
}
```

### 4.5 Hotspot Media Content

```json
{
  "media_type": "image",
  "source_url": "string (URL)",
  "hotspots": [
    {
      "hotspot_id": "string",
      "position": {
        "x_percent": 0.45,
        "y_percent": 0.30
      },
      "label": "string",
      "description": "string",
      "link_to": "block_id | external_url | null"
    }
  ]
}
```

### 4.6 Scroll Container Content

```json
{
  "scroll_direction": "horizontal | vertical",
  "items": [
    {
      "item_id": "string",
      "title": "string",
      "subtitle": "string | null",
      "media_url": "string (URL)",
      "detail_block_id": "string | null"
    }
  ],
  "peek_next": true,
  "snap_to_item": true
}
```

### 4.7 CTA Block Content

```json
{
  "primary_action": {
    "label": "string",
    "action_type": "open_chat | external_link | calendar | save_card | share | phone | email",
    "payload": {
      "url": "string | null",
      "user_id": "string | null",
      "phone": "string | null",
      "email": "string | null",
      "calendar_link": "string | null"
    },
    "style": "filled | outlined | text"
  },
  "secondary_action": {
    "label": "string | null",
    "action_type": "string | null",
    "payload": {}
  },
  "urgency_text": "string | null"
}
```

### 4.8 Timeline Block Content

```json
{
  "timeline_type": "vertical | horizontal",
  "items": [
    {
      "item_id": "string",
      "date": "string (display format)",
      "title": "string",
      "description": "string | null",
      "icon": "string | null",
      "media_url": "string | null"
    }
  ],
  "show_connectors": true
}
```

### 4.9 Gallery Block Content

```json
{
  "gallery_type": "carousel | grid | masonry",
  "items": [
    {
      "item_id": "string",
      "media_url": "string (URL)",
      "thumbnail_url": "string (URL)",
      "caption": "string | null",
      "tap_action": "expand | navigate | null"
    }
  ],
  "auto_advance": false,
  "show_indicators": true
}
```

### 4.10 External Link Block Content

For displaying clickable links to external social platforms (Instagram, LinkedIn, TikTok, etc.)
where automatic metadata extraction is not available.

```json
{
  "platform": "instagram | linkedin | tiktok | twitter | behance | dribbble | other",
  "url": "string (URL)",
  "title": "string (user-provided)",
  "description": "string | null (user-provided)",
  "thumbnail_url": "string (URL) | null (user-uploaded)",
  "display": {
    "icon": "string (platform icon name)",
    "label": "string (e.g., 'View on Instagram')",
    "style": "card | button | minimal"
  }
}
```

**Note:** This block type is used for social links where the Portfolio Engine cannot automatically extract metadata. Users must provide title and optionally description/thumbnail.

---

## 5. Navigation Schema

```json
{
  "anchors": {
    "hook": "section_hook",
    "work": "section_work",
    "contact": "section_action"
  },
  "deep_links": {
    "enabled": true,
    "base_url": "reshuffle://portfolio/{portfolio_id}",
    "section_format": "reshuffle://portfolio/{portfolio_id}/{section_id}",
    "block_format": "reshuffle://portfolio/{portfolio_id}/block/{block_id}"
  },
  "state_preservation": {
    "enabled": true,
    "restore_scroll_position": true,
    "restore_expanded_state": true
  },
  "quick_nav": {
    "enabled": true,
    "items": [
      {
        "label": "Work",
        "target_section": "work",
        "icon": "briefcase"
      }
    ]
  }
}
```

---

## 6. Analytics Schema

```json
{
  "tracking_enabled": true,
  "events": {
    "portfolio_view": true,
    "section_view": true,
    "block_interaction": true,
    "cta_tap": true,
    "scroll_depth": true,
    "time_spent": true
  },
  "metadata": {
    "source": "explore | direct | share | qr",
    "referrer_user_id": "string | null"
  }
}
```

---

## 7. Full Example (Finance Category)

```json
{
  "portfolio_id": "p_f8a3b2c1-d4e5-6789-abcd-ef0123456789",
  "user_id": "u_12345678-90ab-cdef-1234-567890abcdef",
  "category": "Finance",
  "version": "v1",
  "meta": {
    "title": "Vikram Mehta - CFO & Financial Strategist",
    "subtitle": "Helping businesses optimize for growth",
    "created_at": "2025-12-23T10:00:00Z",
    "updated_at": "2025-12-23T10:00:00Z",
    "language": "en",
    "theme": "auto"
  },
  "sections": [
    {
      "section_id": "hook",
      "order": 1,
      "layout": "contained",
      "visibility": {
        "initial": "visible",
        "min_content_required": 1
      },
      "blocks": [
        {
          "block_id": "b_hook_001",
          "block_type": "metric",
          "content": {
            "headline": "₹18Cr saved across 9 companies",
            "subheadline": "Through strategic financial optimization",
            "metrics": [
              {
                "label": "Avg ROI",
                "value": "3.6",
                "unit": "x",
                "trend": "up",
                "highlight": true
              },
              {
                "label": "Companies Served",
                "value": "9",
                "unit": null,
                "trend": null,
                "highlight": false
              }
            ],
            "source_attribution": "Verified client data",
            "date_range": {
              "start": "2022-01-01",
              "end": "2025-12-01"
            }
          },
          "interaction": {
            "on_tap": {
              "type": "navigate",
              "target": "section_work"
            }
          },
          "visibility": {
            "initial": "expanded",
            "priority": "high"
          },
          "style": {
            "background": "#1A1A2E",
            "padding": "large"
          }
        }
      ]
    },
    {
      "section_id": "credibility",
      "order": 2,
      "layout": "contained",
      "visibility": {
        "initial": "visible",
        "min_content_required": 1
      },
      "blocks": [
        {
          "block_id": "b_cred_001",
          "block_type": "expandable_text",
          "content": {
            "title": "15+ Years in Corporate Finance",
            "summary": "Ex-CFO at Fortune 500, CA, CFA Charter holder",
            "full_text": "Started career at KPMG, moved to corporate finance at Tata Group...",
            "reading_time_seconds": 60,
            "icon": "building.2",
            "tags": ["CFO", "CFA", "Fortune 500"]
          },
          "interaction": {
            "on_tap": {
              "type": "expand",
              "target": "self"
            }
          },
          "visibility": {
            "initial": "collapsed",
            "priority": "high"
          },
          "style": {
            "background": null,
            "padding": "medium"
          }
        }
      ]
    },
    {
      "section_id": "work",
      "order": 3,
      "layout": "full",
      "visibility": {
        "initial": "visible",
        "min_content_required": 1
      },
      "blocks": [
        {
          "block_id": "b_work_001",
          "block_type": "scroll_container",
          "content": {
            "scroll_direction": "horizontal",
            "items": [
              {
                "item_id": "case_001",
                "title": "Manufacturing Cost Optimization",
                "subtitle": "22% cost reduction in 6 months",
                "media_url": "https://storage.reshuffle.app/cases/mfg_001.jpg",
                "detail_block_id": "b_work_detail_001"
              },
              {
                "item_id": "case_002",
                "title": "Series B Financial Restructuring",
                "subtitle": "Secured $12M at 40% better terms",
                "media_url": "https://storage.reshuffle.app/cases/series_b.jpg",
                "detail_block_id": "b_work_detail_002"
              }
            ],
            "peek_next": true,
            "snap_to_item": true
          },
          "interaction": {
            "on_swipe": {
              "type": "navigate",
              "target": "next"
            }
          },
          "visibility": {
            "initial": "expanded",
            "priority": "high"
          },
          "style": {
            "background": null,
            "padding": "none"
          }
        }
      ]
    },
    {
      "section_id": "process",
      "order": 4,
      "layout": "contained",
      "visibility": {
        "initial": "visible",
        "min_content_required": 0
      },
      "blocks": [
        {
          "block_id": "b_process_001",
          "block_type": "timeline",
          "content": {
            "timeline_type": "vertical",
            "items": [
              {
                "item_id": "step_1",
                "date": "Week 1",
                "title": "Financial Audit",
                "description": "Deep dive into your books",
                "icon": "magnifyingglass",
                "media_url": null
              },
              {
                "item_id": "step_2",
                "date": "Week 2-3",
                "title": "Strategy Formulation",
                "description": "Custom optimization plan",
                "icon": "chart.bar",
                "media_url": null
              },
              {
                "item_id": "step_3",
                "date": "Week 4+",
                "title": "Implementation",
                "description": "Hands-on execution support",
                "icon": "checkmark.circle",
                "media_url": null
              }
            ],
            "show_connectors": true
          },
          "interaction": {},
          "visibility": {
            "initial": "expanded",
            "priority": "medium"
          },
          "style": {
            "background": null,
            "padding": "medium"
          }
        }
      ]
    },
    {
      "section_id": "action",
      "order": 5,
      "layout": "contained",
      "visibility": {
        "initial": "visible",
        "min_content_required": 1
      },
      "blocks": [
        {
          "block_id": "b_action_001",
          "block_type": "cta",
          "content": {
            "primary_action": {
              "label": "Book Financial Audit",
              "action_type": "calendar",
              "payload": {
                "calendar_link": "https://calendly.com/vikram-mehta/audit"
              },
              "style": "filled"
            },
            "secondary_action": {
              "label": "Message Me",
              "action_type": "open_chat",
              "payload": {
                "user_id": "u_12345678-90ab-cdef-1234-567890abcdef"
              }
            },
            "urgency_text": "Limited slots available this month"
          },
          "interaction": {
            "on_tap": {
              "type": "trigger_action",
              "target": "primary_action"
            }
          },
          "visibility": {
            "initial": "expanded",
            "priority": "high"
          },
          "style": {
            "background": "#4F46E5",
            "padding": "large"
          }
        }
      ]
    }
  ],
  "navigation": {
    "anchors": {
      "hook": "section_hook",
      "work": "section_work",
      "contact": "section_action"
    },
    "deep_links": {
      "enabled": true,
      "base_url": "reshuffle://portfolio/p_f8a3b2c1-d4e5-6789-abcd-ef0123456789",
      "section_format": "reshuffle://portfolio/{portfolio_id}/{section_id}",
      "block_format": "reshuffle://portfolio/{portfolio_id}/block/{block_id}"
    },
    "state_preservation": {
      "enabled": true,
      "restore_scroll_position": true,
      "restore_expanded_state": true
    },
    "quick_nav": {
      "enabled": true,
      "items": [
        {
          "label": "Work",
          "target_section": "work",
          "icon": "briefcase"
        },
        {
          "label": "Contact",
          "target_section": "action",
          "icon": "envelope"
        }
      ]
    }
  },
  "analytics": {
    "tracking_enabled": true,
    "events": {
      "portfolio_view": true,
      "section_view": true,
      "block_interaction": true,
      "cta_tap": true,
      "scroll_depth": true,
      "time_spent": true
    },
    "metadata": {
      "source": null,
      "referrer_user_id": null
    }
  }
}
```

---

## 8. Schema Validation Rules

### Required Fields
- All fields marked as Required in tables MUST be present
- `null` is acceptable only where explicitly noted

### String Constraints
- `portfolio_id`: UUID v4 format, prefixed with `p_`
- `user_id`: UUID v4 format, prefixed with `u_`
- `block_id`: UUID v4 format, prefixed with `b_`
- URLs: Must be valid HTTPS URLs (except for app deep links)

### Enum Constraints
```javascript
VALID_CATEGORIES = ["Finance", "Entertainment", "Design", "Legal", "Tech", "Marketing", "Influencers", "Business"]
VALID_BLOCK_TYPES = ["media", "expandable_text", "hotspot_media", "scroll_container", "metric", "comparison", "cta", "timeline", "gallery"]
VALID_SECTION_IDS = ["hook", "credibility", "work", "process", "action"]
VALID_LAYOUTS = ["full", "contained", "split"]
VALID_ACTION_TYPES = ["open_chat", "external_link", "calendar", "save_card", "share", "phone", "email"]
VALID_INTERACTION_TYPES = ["expand", "navigate", "reveal", "trigger_action"]
```

---

## 9. Versioning Strategy

```
v1 - Current (Locked)
v2 - Reserved for breaking changes

Version in URL: /api/v1/portfolio
Version in JSON: "version": "v1"
```

**Breaking changes require:**
1. New version number
2. Migration path documented
3. Deprecation period (minimum 3 months)
4. Client app updates
