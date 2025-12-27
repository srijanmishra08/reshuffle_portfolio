# Interaction Contracts (Locked)

## ⚠️ CRITICAL: This is a LOCKED CONTRACT

Interactions are the most fragile part of this system. This document defines **exactly** what interactions are allowed.

**Constraints:**
- ❌ No free-form JavaScript
- ❌ No arbitrary callbacks
- ❌ No nested interaction logic
- ❌ No custom gestures

This keeps SwiftUI & Flutter implementations deterministic and maintainable.

---

## 1. Allowed Interaction Types

Only **4 interaction types** are permitted:

| Type | Description | Use Case |
|------|-------------|----------|
| `expand` | Toggle expanded/collapsed state | Text blocks, media |
| `navigate` | Move to section/block/screen | Any navigable element |
| `reveal` | Show additional information | Hotspots, metadata |
| `trigger_action` | Execute an action | CTAs, buttons |

### Type Definitions

```typescript
type InteractionType = "expand" | "navigate" | "reveal" | "trigger_action";

type InteractionTarget = 
  | "self"                    // Current block
  | "next"                    // Next item in sequence
  | "previous"                // Previous item
  | `section_${SectionId}`    // Navigate to section
  | `block_${BlockId}`        // Navigate to block
  | `action_${ActionId}`      // Trigger action
  | "metadata"                // Reveal metadata
  | "analytics";              // Reveal analytics
```

---

## 2. Interaction Contract Schema

### Full Schema

```json
{
  "on_tap": {
    "type": "expand | navigate | trigger_action",
    "target": "string",
    "analytics_event": "string | null"
  },
  "on_double_tap": {
    "type": "trigger_action",
    "target": "string",
    "analytics_event": "string | null"
  },
  "on_swipe": {
    "type": "navigate",
    "target": "next | previous",
    "direction": "left | right | up | down"
  },
  "on_long_press": {
    "type": "reveal",
    "target": "metadata | analytics | string",
    "duration_ms": 500
  }
}
```

### Gesture Priority

When multiple gestures could apply, use this priority:

1. `on_tap` (highest)
2. `on_double_tap`
3. `on_long_press`
4. `on_swipe` (lowest)

---

## 3. Interaction Contracts by Block Type

### 3.1 Media Block

```json
{
  "interaction": {
    "on_tap": {
      "type": "expand",
      "target": "self",
      "analytics_event": "media_tap"
    },
    "on_double_tap": {
      "type": "trigger_action",
      "target": "like",
      "analytics_event": "media_like"
    },
    "on_long_press": {
      "type": "reveal",
      "target": "metadata",
      "duration_ms": 500
    }
  }
}
```

**Behaviors:**
- Tap: Toggle play/pause (video) or fullscreen (image)
- Double-tap: Like/save interaction
- Long-press: Show source, duration, etc.

### 3.2 Expandable Text Block

```json
{
  "interaction": {
    "on_tap": {
      "type": "expand",
      "target": "self",
      "analytics_event": "text_expand"
    }
  }
}
```

**Behaviors:**
- Tap: Toggle between summary and full text
- No other gestures

### 3.3 Metric Block

```json
{
  "interaction": {
    "on_tap": {
      "type": "navigate",
      "target": "section_work",
      "analytics_event": "metric_tap"
    },
    "on_long_press": {
      "type": "reveal",
      "target": "metadata",
      "duration_ms": 500
    }
  }
}
```

**Behaviors:**
- Tap: Navigate to work section
- Long-press: Show data source, date range

### 3.4 Comparison Block

```json
{
  "interaction": {
    "on_swipe": {
      "type": "reveal",
      "target": "comparison_slider",
      "direction": "left"
    },
    "on_tap": {
      "type": "expand",
      "target": "self",
      "analytics_event": "comparison_expand"
    }
  }
}
```

**Behaviors:**
- Swipe: Move comparison slider
- Tap: Fullscreen comparison

### 3.5 Hotspot Media Block

```json
{
  "interaction": {
    "on_tap_hotspot": {
      "type": "reveal",
      "target": "hotspot_${hotspot_id}",
      "analytics_event": "hotspot_tap"
    },
    "on_long_press_hotspot": {
      "type": "navigate",
      "target": "${hotspot.link_to}",
      "duration_ms": 500
    },
    "on_tap_background": {
      "type": "expand",
      "target": "self"
    }
  }
}
```

**Behaviors:**
- Tap hotspot: Show hotspot info popup
- Long-press hotspot: Navigate to linked block
- Tap background: Fullscreen image

### 3.6 Scroll Container Block

```json
{
  "interaction": {
    "on_swipe": {
      "type": "navigate",
      "target": "next",
      "direction": "left"
    },
    "on_tap_item": {
      "type": "navigate",
      "target": "${item.detail_block_id}",
      "analytics_event": "scroll_item_tap"
    }
  }
}
```

**Behaviors:**
- Swipe: Navigate through items
- Tap item: Navigate to detail view

### 3.7 CTA Block

```json
{
  "interaction": {
    "on_tap_primary": {
      "type": "trigger_action",
      "target": "primary_action",
      "analytics_event": "cta_primary_tap"
    },
    "on_tap_secondary": {
      "type": "trigger_action",
      "target": "secondary_action",
      "analytics_event": "cta_secondary_tap"
    }
  }
}
```

**Behaviors:**
- Tap primary: Execute primary action
- Tap secondary: Execute secondary action

### 3.8 Timeline Block

```json
{
  "interaction": {
    "on_tap_item": {
      "type": "expand",
      "target": "timeline_item_${item_id}",
      "analytics_event": "timeline_item_tap"
    }
  }
}
```

**Behaviors:**
- Tap item: Expand item details (if available)

### 3.9 Gallery Block

```json
{
  "interaction": {
    "on_swipe": {
      "type": "navigate",
      "target": "next",
      "direction": "left"
    },
    "on_tap_item": {
      "type": "expand",
      "target": "${item.item_id}",
      "analytics_event": "gallery_item_tap"
    }
  }
}
```

**Behaviors:**
- Swipe: Navigate through gallery
- Tap: Fullscreen image

---

## 4. Navigation Object

### Schema

```json
{
  "navigation": {
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
        },
        {
          "label": "Contact",
          "target_section": "action",
          "icon": "envelope"
        }
      ]
    }
  }
}
```

### Deep Link Patterns

```
reshuffle://portfolio/{portfolio_id}
reshuffle://portfolio/{portfolio_id}/hook
reshuffle://portfolio/{portfolio_id}/credibility
reshuffle://portfolio/{portfolio_id}/work
reshuffle://portfolio/{portfolio_id}/process
reshuffle://portfolio/{portfolio_id}/action
reshuffle://portfolio/{portfolio_id}/block/{block_id}
```

### State Preservation

Client must persist and restore:
- Current scroll position
- Expanded/collapsed state of all blocks
- Current item in scroll containers
- Gallery position

---

## 5. Action Types (for trigger_action)

### Schema

```json
{
  "action_type": "open_chat | external_link | calendar | save_card | share | phone | email",
  "payload": {
    // Action-specific data
  }
}
```

### Action Definitions

#### open_chat
```json
{
  "action_type": "open_chat",
  "payload": {
    "user_id": "u_12345...",
    "prefill_message": "Hi, I saw your portfolio..." // optional
  }
}
```
**Behavior:** Open ReShuffle in-app chat with user

#### external_link
```json
{
  "action_type": "external_link",
  "payload": {
    "url": "https://...",
    "open_in_app": false
  }
}
```
**Behavior:** Open URL in system browser or in-app browser

#### calendar
```json
{
  "action_type": "calendar",
  "payload": {
    "calendar_link": "https://calendly.com/..."
  }
}
```
**Behavior:** Open calendar booking link

#### save_card
```json
{
  "action_type": "save_card",
  "payload": {}
}
```
**Behavior:** Save user's business card to "My Cards"

#### share
```json
{
  "action_type": "share",
  "payload": {
    "share_url": "https://reshuffle.app/portfolio/{portfolio_id}",
    "share_text": "Check out this portfolio"
  }
}
```
**Behavior:** Open system share sheet

#### phone
```json
{
  "action_type": "phone",
  "payload": {
    "phone": "+91-9876543210"
  }
}
```
**Behavior:** Open phone dialer

#### email
```json
{
  "action_type": "email",
  "payload": {
    "email": "contact@example.com",
    "subject": "Inquiry from ReShuffle", // optional
    "body": "" // optional
  }
}
```
**Behavior:** Open email client

---

## 6. Analytics Events

All interactions can trigger analytics events.

### Event Schema

```json
{
  "analytics_event": "string",
  "analytics_payload": {
    "block_id": "string",
    "block_type": "string",
    "section_id": "string",
    "timestamp": "ISO-8601"
  }
}
```

### Standard Events

| Event | Trigger |
|-------|---------|
| `portfolio_view` | Portfolio opened |
| `section_view` | Section scrolled into view |
| `block_view` | Block scrolled into view (>50%) |
| `block_expand` | Block expanded |
| `block_collapse` | Block collapsed |
| `media_play` | Video/audio started |
| `media_complete` | Video/audio completed |
| `cta_tap` | CTA button tapped |
| `hotspot_tap` | Hotspot tapped |
| `scroll_depth` | Scroll milestone reached |
| `time_spent` | Periodic time spent update |

---

## 7. Implementation Guidelines

### SwiftUI

```swift
struct InteractionHandler {
    func handleTap(interaction: Interaction, context: BlockContext) {
        switch interaction.type {
        case .expand:
            expandBlock(id: interaction.target)
        case .navigate:
            navigateTo(target: interaction.target)
        case .reveal:
            revealContent(target: interaction.target)
        case .triggerAction:
            executeAction(actionId: interaction.target)
        }
        
        // Track analytics
        if let event = interaction.analyticsEvent {
            Analytics.track(event: event, context: context)
        }
    }
}
```

### Flutter

```dart
class InteractionHandler {
  void handleTap(Interaction interaction, BlockContext context) {
    switch (interaction.type) {
      case InteractionType.expand:
        _expandBlock(interaction.target);
        break;
      case InteractionType.navigate:
        _navigateTo(interaction.target);
        break;
      case InteractionType.reveal:
        _revealContent(interaction.target);
        break;
      case InteractionType.triggerAction:
        _executeAction(interaction.target);
        break;
    }
    
    // Track analytics
    if (interaction.analyticsEvent != null) {
      Analytics.track(event: interaction.analyticsEvent!, context: context);
    }
  }
}
```

---

## 8. Forbidden Patterns

### ❌ DO NOT

```json
// ❌ Nested interactions
{
  "on_tap": {
    "then": {
      "on_complete": {...}
    }
  }
}

// ❌ Custom callbacks
{
  "on_tap": {
    "callback": "myCustomFunction"
  }
}

// ❌ Conditional interactions
{
  "on_tap": {
    "if": "user.isPremium",
    "then": {...},
    "else": {...}
  }
}

// ❌ Multiple actions per gesture
{
  "on_tap": [
    { "type": "expand" },
    { "type": "navigate" }
  ]
}
```

### ✅ DO

```json
// ✅ Single, deterministic interaction
{
  "on_tap": {
    "type": "expand",
    "target": "self"
  }
}

// ✅ Clear action type
{
  "on_tap": {
    "type": "trigger_action",
    "target": "primary_action"
  }
}
```

---

## 9. Interaction State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTERACTION STATE MACHINE                    │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │    IDLE      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │   TAP    │ │  SWIPE   │ │LONG PRESS│
       └────┬─────┘ └────┬─────┘ └────┬─────┘
            │            │            │
            ▼            ▼            ▼
    ┌───────────────────────────────────────┐
    │           RESOLVE INTERACTION          │
    │  (Check block's interaction contract)  │
    └───────────────────┬───────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │ EXPAND  │    │ NAVIGATE │    │ TRIGGER  │
   └────┬────┘    └────┬─────┘    └────┬─────┘
        │              │               │
        ▼              ▼               ▼
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │ UPDATE  │    │  SCROLL  │    │ EXECUTE  │
   │  STATE  │    │    TO    │    │  ACTION  │
   └────┬────┘    └────┬─────┘    └────┬─────┘
        │              │               │
        └──────────────┴───────────────┘
                       │
                       ▼
              ┌──────────────┐
              │TRACK ANALYTICS│
              └──────────────┘
                       │
                       ▼
              ┌──────────────┐
              │    IDLE      │
              └──────────────┘
```

---

## 10. Testing Interactions

Every interaction must be tested:

```swift
// Unit test example
func testExpandInteraction() {
    let block = ExpandableTextBlock(...)
    let handler = InteractionHandler()
    
    // Initial state
    XCTAssertFalse(block.isExpanded)
    
    // Tap
    handler.handleTap(
        interaction: block.interaction.onTap!,
        context: BlockContext(blockId: block.id)
    )
    
    // After tap
    XCTAssertTrue(block.isExpanded)
    
    // Verify analytics
    XCTAssertTrue(Analytics.lastEvent == "text_expand")
}
```
