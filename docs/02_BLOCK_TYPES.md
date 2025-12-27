# Block Types Reference

## Overview

The Portfolio Engine supports **10 locked block types**. This document defines each block type, its purpose, allowed sections, and implementation requirements.

---

## Block Type Summary

| Block Type | Description | Mobile Interaction | Sections |
|------------|-------------|-------------------|----------|
| `media` | Video/image/audio | Tap to play, pinch zoom | All |
| `expandable_text` | Collapsible text content | Tap to expand/collapse | credibility, work, process |
| `hotspot_media` | Interactive image with points | Tap hotspots | work, process |
| `scroll_container` | Horizontal/vertical scroll list | Swipe to scroll | work |
| `metric` | Numbers and statistics | Tap to navigate | hook, work |
| `comparison` | Before/after comparison | Slider interaction | work |
| `cta` | Call-to-action buttons | Tap to trigger action | action |
| `timeline` | Chronological items | Scroll through | process, work |
| `gallery` | Image carousel/grid | Swipe, tap to expand | work |
| `external_link` | Clickable social media link | Tap to open browser | work, credibility |

---

## 1. Media Block

### Purpose
Display video, image, or audio content in an immersive format.

### Allowed Sections
All sections (hook, credibility, work, process, action)

### Content Schema
```json
{
  "media_type": "video | image | audio",
  "source_url": "https://...",
  "thumbnail_url": "https://...",
  "fallback_url": "https://... | null",
  "dimensions": {
    "width": 1080,
    "height": 1920,
    "aspect_ratio": "9:16"
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
    "alt_text": "Description of media",
    "transcript_url": "https://... | null"
  }
}
```

### Interaction Contract
```json
{
  "on_tap": {
    "type": "expand",
    "target": "self"
  },
  "on_double_tap": {
    "type": "trigger_action",
    "target": "like"
  }
}
```

### Mobile Implementation Notes
- Videos: Use native player (AVPlayer / ExoPlayer)
- Autoplay only when >50% visible
- Preload thumbnail, lazy load video
- Support offline caching
- Respect data saver mode

### SwiftUI Example
```swift
struct MediaBlockView: View {
    let block: MediaBlock
    
    var body: some View {
        switch block.content.mediaType {
        case .video:
            VideoPlayer(url: block.content.sourceUrl)
                .aspectRatio(block.content.dimensions.aspectRatio, contentMode: .fit)
        case .image:
            AsyncImage(url: block.content.sourceUrl)
        case .audio:
            AudioPlayerView(url: block.content.sourceUrl)
        }
    }
}
```

### Flutter Example
```dart
class MediaBlockWidget extends StatelessWidget {
  final MediaBlock block;
  
  @override
  Widget build(BuildContext context) {
    switch (block.content.mediaType) {
      case MediaType.video:
        return VideoPlayerWidget(url: block.content.sourceUrl);
      case MediaType.image:
        return CachedNetworkImage(imageUrl: block.content.sourceUrl);
      case MediaType.audio:
        return AudioPlayerWidget(url: block.content.sourceUrl);
    }
  }
}
```

---

## 2. Expandable Text Block

### Purpose
Display text content that can expand/collapse to save space.

### Allowed Sections
credibility, work, process

### Content Schema
```json
{
  "title": "15+ Years in Corporate Finance",
  "summary": "Ex-CFO at Fortune 500, CA, CFA Charter holder",
  "full_text": "Started career at KPMG in 2008...\n\nKey achievements:\n- Led $500M IPO\n- ...",
  "reading_time_seconds": 120,
  "icon": "building.2",
  "tags": ["CFO", "CFA", "Fortune 500"]
}
```

### Interaction Contract
```json
{
  "on_tap": {
    "type": "expand",
    "target": "self"
  }
}
```

### Mobile Implementation Notes
- Show summary in collapsed state
- Animate expand/collapse (300ms ease-out)
- Support markdown in full_text
- Display reading time when expanded
- Tags as horizontal chips

### States
```
┌─────────────────────────────────────────┐
│  COLLAPSED STATE                        │
├─────────────────────────────────────────┤
│  🏢 15+ Years in Corporate Finance      │
│  Ex-CFO at Fortune 500, CA, CFA...  ▼  │
│                                         │
│  [CFO] [CFA] [Fortune 500]             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  EXPANDED STATE                         │
├─────────────────────────────────────────┤
│  🏢 15+ Years in Corporate Finance  ▲   │
│                                         │
│  Started career at KPMG in 2008...      │
│                                         │
│  Key achievements:                      │
│  • Led $500M IPO                        │
│  • Restructured debt for 3 startups     │
│  • ...                                  │
│                                         │
│  📖 2 min read                          │
│  [CFO] [CFA] [Fortune 500]             │
└─────────────────────────────────────────┘
```

---

## 3. Metric Block

### Purpose
Display quantitative achievements and statistics prominently.

### Allowed Sections
hook, work

### Content Schema
```json
{
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
      "label": "Companies",
      "value": "9",
      "unit": null,
      "trend": null,
      "highlight": false
    },
    {
      "label": "Years Active",
      "value": "15",
      "unit": "+",
      "trend": null,
      "highlight": false
    }
  ],
  "source_attribution": "Verified client data",
  "date_range": {
    "start": "2022-01-01",
    "end": "2025-12-01"
  }
}
```

### Interaction Contract
```json
{
  "on_tap": {
    "type": "navigate",
    "target": "section_work"
  }
}
```

### Mobile Implementation Notes
- Animate numbers on first view (count up)
- Highlight primary metric with larger font
- Trend arrows: ↑ green, ↓ red, → gray
- Maximum 4 metrics visible

### Visual Layout
```
┌─────────────────────────────────────────┐
│                                         │
│     ₹18Cr saved across 9 companies      │
│     Through strategic optimization      │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  3.6x   │ │    9    │ │   15+   │   │
│  │ Avg ROI │ │Companies│ │  Years  │   │
│  │   ↑     │ │         │ │         │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│                                         │
│            Verified client data         │
└─────────────────────────────────────────┘
```

---

## 4. Comparison Block

### Purpose
Show before/after or side-by-side comparisons.

### Allowed Sections
work

### Content Schema
```json
{
  "comparison_type": "before_after | side_by_side | slider",
  "items": [
    {
      "label": "Before",
      "media_url": "https://storage.../before.png",
      "caption": "Original dashboard design"
    },
    {
      "label": "After",
      "media_url": "https://storage.../after.png",
      "caption": "Redesigned with 40% better conversion"
    }
  ],
  "context": "Dashboard redesign for fintech startup"
}
```

### Interaction Contract
```json
{
  "on_swipe": {
    "type": "reveal",
    "target": "comparison_slider"
  }
}
```

### Comparison Types

#### Slider (Default)
```
┌─────────────────────────────────────────┐
│                    │                    │
│     BEFORE        │|      AFTER        │
│                   │|                   │
│                   │|                   │
│                   │|                   │
│              ◄────┼────►               │
│                                         │
│  Dashboard redesign for fintech startup │
└─────────────────────────────────────────┘
```

#### Before/After (Tap to toggle)
```
┌─────────────────────────────────────────┐
│                                         │
│              [Before] After             │
│  ┌───────────────────────────────────┐ │
│  │                                   │ │
│  │         BEFORE IMAGE              │ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
│  Original dashboard design              │
└─────────────────────────────────────────┘
```

---

## 5. Hotspot Media Block

### Purpose
Interactive image with tappable points that reveal information.

### Allowed Sections
work, process

### Content Schema
```json
{
  "media_type": "image",
  "source_url": "https://storage.../architecture.png",
  "hotspots": [
    {
      "hotspot_id": "hs_001",
      "position": {
        "x_percent": 0.25,
        "y_percent": 0.40
      },
      "label": "API Gateway",
      "description": "Handles 10K req/sec with rate limiting",
      "link_to": null
    },
    {
      "hotspot_id": "hs_002",
      "position": {
        "x_percent": 0.75,
        "y_percent": 0.60
      },
      "label": "Database Cluster",
      "description": "PostgreSQL with read replicas",
      "link_to": "b_work_db_details"
    }
  ]
}
```

### Interaction Contract
```json
{
  "on_tap_hotspot": {
    "type": "reveal",
    "target": "hotspot_info"
  },
  "on_long_press_hotspot": {
    "type": "navigate",
    "target": "hotspot.link_to"
  }
}
```

### Visual Layout
```
┌─────────────────────────────────────────┐
│                                         │
│          ARCHITECTURE DIAGRAM           │
│                                         │
│       ●                                 │
│    API Gateway                          │
│                         ●               │
│                    Database             │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ● API Gateway                     │ │
│  │ Handles 10K req/sec with rate...  │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 6. Scroll Container Block

### Purpose
Horizontal or vertical scrollable list of items.

### Allowed Sections
work

### Content Schema
```json
{
  "scroll_direction": "horizontal",
  "items": [
    {
      "item_id": "case_001",
      "title": "Manufacturing Optimization",
      "subtitle": "22% cost reduction",
      "media_url": "https://storage.../case1.jpg",
      "detail_block_id": "b_work_detail_001"
    },
    {
      "item_id": "case_002",
      "title": "Series B Restructuring",
      "subtitle": "$12M secured",
      "media_url": "https://storage.../case2.jpg",
      "detail_block_id": "b_work_detail_002"
    }
  ],
  "peek_next": true,
  "snap_to_item": true
}
```

### Interaction Contract
```json
{
  "on_swipe": {
    "type": "navigate",
    "target": "next | previous"
  },
  "on_tap_item": {
    "type": "navigate",
    "target": "item.detail_block_id"
  }
}
```

### Visual Layout
```
┌─────────────────────────────────────────┐
│                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──  │
│  │              │ │              │ │    │
│  │   CASE 1     │ │   CASE 2     │ │    │
│  │              │ │              │ │    │
│  │ Manufactur.. │ │ Series B...  │ │    │
│  │ 22% cost red │ │ $12M secured │ │    │
│  └──────────────┘ └──────────────┘ └──  │
│         ●  ○  ○  ○                      │
└─────────────────────────────────────────┘
```

---

## 7. CTA Block

### Purpose
Call-to-action for conversion (contact, book, save).

### Allowed Sections
action

### Content Schema
```json
{
  "primary_action": {
    "label": "Book Financial Audit",
    "action_type": "calendar",
    "payload": {
      "calendar_link": "https://calendly.com/..."
    },
    "style": "filled"
  },
  "secondary_action": {
    "label": "Message Me",
    "action_type": "open_chat",
    "payload": {
      "user_id": "u_12345..."
    }
  },
  "urgency_text": "Limited slots this month"
}
```

### Action Types

| Action | Behavior | Payload Required |
|--------|----------|-----------------|
| `open_chat` | Open in-app chat | `user_id` |
| `external_link` | Open URL in browser | `url` |
| `calendar` | Open calendar link | `calendar_link` |
| `save_card` | Save user's card | none |
| `share` | Share portfolio | none |
| `phone` | Open dialer | `phone` |
| `email` | Open email client | `email` |

### Visual Layout
```
┌─────────────────────────────────────────┐
│                                         │
│   ┌───────────────────────────────────┐│
│   │      Book Financial Audit         ││
│   └───────────────────────────────────┘│
│                                         │
│   ┌───────────────────────────────────┐│
│   │         Message Me                ││
│   └───────────────────────────────────┘│
│                                         │
│       Limited slots this month          │
│                                         │
└─────────────────────────────────────────┘
```

---

## 8. Timeline Block

### Purpose
Show chronological progression (process, career, project phases).

### Allowed Sections
process, work

### Content Schema
```json
{
  "timeline_type": "vertical",
  "items": [
    {
      "item_id": "step_1",
      "date": "Week 1",
      "title": "Discovery & Audit",
      "description": "Deep dive into financials",
      "icon": "magnifyingglass",
      "media_url": null
    },
    {
      "item_id": "step_2",
      "date": "Week 2-3",
      "title": "Strategy Development",
      "description": "Custom optimization plan",
      "icon": "chart.bar",
      "media_url": null
    },
    {
      "item_id": "step_3",
      "date": "Week 4+",
      "title": "Implementation",
      "description": "Hands-on execution",
      "icon": "checkmark.circle",
      "media_url": null
    }
  ],
  "show_connectors": true
}
```

### Visual Layout
```
┌─────────────────────────────────────────┐
│                                         │
│  Week 1                                 │
│    ●───────────────────────────────     │
│    │  🔍 Discovery & Audit              │
│    │     Deep dive into financials      │
│    │                                    │
│  Week 2-3                               │
│    ●───────────────────────────────     │
│    │  📊 Strategy Development           │
│    │     Custom optimization plan       │
│    │                                    │
│  Week 4+                                │
│    ●───────────────────────────────     │
│       ✅ Implementation                 │
│          Hands-on execution             │
│                                         │
└─────────────────────────────────────────┘
```

---

## 9. Gallery Block

### Purpose
Display multiple images in carousel or grid format.

### Allowed Sections
work

### Content Schema
```json
{
  "gallery_type": "carousel",
  "items": [
    {
      "item_id": "img_001",
      "media_url": "https://storage.../work1.jpg",
      "thumbnail_url": "https://storage.../work1_thumb.jpg",
      "caption": "Brand identity for fintech startup",
      "tap_action": "expand"
    },
    {
      "item_id": "img_002",
      "media_url": "https://storage.../work2.jpg",
      "thumbnail_url": "https://storage.../work2_thumb.jpg",
      "caption": "Mobile app UI design",
      "tap_action": "expand"
    }
  ],
  "auto_advance": false,
  "show_indicators": true
}
```

### Gallery Types

| Type | Layout | Best For |
|------|--------|----------|
| `carousel` | Full-width swipe | Hero images |
| `grid` | 2-3 column grid | Multiple items |
| `masonry` | Variable height | Design portfolios |

---

## 10. External Link Block

### Purpose
Display clickable links to external social platforms (Instagram, LinkedIn, TikTok, etc.) where automatic metadata extraction is not available. Users provide title and optional description.

### Allowed Sections
work, credibility

### Content Schema
```json
{
  "platform": "instagram",
  "url": "https://instagram.com/p/abc123",
  "title": "Brand Campaign Launch",
  "description": "Award-winning campaign for tech startup",
  "thumbnail_url": "https://storage.reshuffle.app/thumbs/user123/abc.jpg",
  "display": {
    "icon": "instagram",
    "label": "View on Instagram",
    "style": "card"
  }
}
```

### Supported Platforms

| Platform | Icon | Label |
|----------|------|-------|
| `instagram` | Instagram logo | View on Instagram |
| `linkedin` | LinkedIn logo | View on LinkedIn |
| `tiktok` | TikTok logo | View on TikTok |
| `twitter` | X/Twitter logo | View on X |
| `behance` | Behance logo | View on Behance |
| `dribbble` | Dribbble logo | View on Dribbble |
| `other` | Link icon | View Link |

### Display Styles

| Style | Description | Best For |
|-------|-------------|----------|
| `card` | Full card with thumbnail | Work samples |
| `button` | Compact button | Multiple links |
| `minimal` | Text link only | Inline references |

### Interaction Contract
```json
{
  "on_tap": {
    "type": "trigger_action",
    "target": "open_external_browser",
    "payload": {
      "url": "https://instagram.com/p/abc123"
    }
  }
}
```

### Mobile Implementation Notes
- Opens system browser or in-app browser
- Shows platform icon for visual recognition
- Thumbnail is user-provided (not extracted)
- Track analytics event on tap

### SwiftUI Example
```swift
struct ExternalLinkBlockView: View {
    let block: ExternalLinkBlock
    
    var body: some View {
        Button(action: openURL) {
            HStack(spacing: 12) {
                // Platform icon
                Image(block.content.display.icon)
                    .resizable()
                    .frame(width: 24, height: 24)
                
                VStack(alignment: .leading) {
                    Text(block.content.title)
                        .font(.headline)
                    Text(block.content.display.label)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: "arrow.up.right")
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
    
    private func openURL() {
        if let url = URL(string: block.content.url) {
            UIApplication.shared.open(url)
        }
    }
}
```

### Flutter Example
```dart
class ExternalLinkBlockWidget extends StatelessWidget {
  final ExternalLinkBlock block;
  
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => _openURL(block.content.url),
      child: Container(
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Image.asset('assets/icons/${block.content.platform}.png',
              width: 24, height: 24),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(block.content.title,
                    style: TextStyle(fontWeight: FontWeight.bold)),
                  Text(block.content.display.label,
                    style: TextStyle(color: Colors.grey)),
                ],
              ),
            ),
            Icon(Icons.open_in_new),
          ],
        ),
      ),
    );
  }
  
  void _openURL(String url) async {
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    }
  }
}
```

---

## Block Type Selection Matrix

Use this matrix to select the appropriate block type:

| Content Type | Hook | Credibility | Work | Process | Action |
|--------------|------|-------------|------|---------|--------|
| Video | media | media | media | media | - |
| Image | media | - | gallery, comparison | hotspot_media | - |
| Stats | metric | - | metric | - | - |
| Bio/About | - | expandable_text | - | - | - |
| Case Study | - | - | scroll_container | - | - |
| Process | - | - | - | timeline | - |
| Contact | - | - | - | - | cta |
| Comparison | - | - | comparison | - | - |
| Architecture | - | - | hotspot_media | hotspot_media | - |
| Social Links | - | external_link | external_link | - | - |

---

## Adding New Block Types

⚠️ **DO NOT add new block types casually.**

New block types require:
1. Schema definition
2. Interaction contract
3. SwiftUI implementation
4. Flutter implementation
5. Scoring heuristic update
6. Category rule update
7. Version bump consideration
