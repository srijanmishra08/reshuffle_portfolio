# Sample Portfolios

## Overview

This document contains complete, production-ready sample portfolio JSON for each of the 8 supported categories.

These are **not toy examples** — they demonstrate the full schema with realistic content.

---

## 1. Finance Category

```json
{
  "portfolio_id": "p_fin_001",
  "user_id": "u_vikram_mehta",
  "category": "Finance",
  "version": "v1",
  "meta": {
    "title": "Vikram Mehta",
    "subtitle": "CFO & Financial Strategist",
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
          "block_id": "b_fin_hook_001",
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
                "label": "Companies",
                "value": "9",
                "unit": null,
                "trend": null,
                "highlight": false
              },
              {
                "label": "Years",
                "value": "15",
                "unit": "+",
                "trend": null,
                "highlight": false
              }
            ],
            "source_attribution": "Verified client results 2022-2025",
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
            "background": "#0F172A",
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
          "block_id": "b_fin_cred_001",
          "block_type": "expandable_text",
          "content": {
            "title": "15+ Years in Corporate Finance",
            "summary": "Ex-CFO at Fortune 500, CA, CFA Charter Holder",
            "full_text": "## Background\n\nStarted my career at KPMG in 2008, where I spent 5 years in audit and advisory services working with manufacturing and technology clients.\n\n## Corporate Experience\n\n- **CFO, Tata Technologies** (2015-2020)\n  - Led $500M IPO preparation\n  - Restructured debt saving ₹12Cr annually\n\n- **VP Finance, Infosys BPM** (2013-2015)\n  - Managed $200M annual budget\n  - Implemented cost optimization program\n\n## Certifications\n\n- Chartered Accountant (ICAI)\n- CFA Charter Holder\n- MBA Finance (IIM Bangalore)",
            "reading_time_seconds": 90,
            "icon": "building.2",
            "tags": ["CFA", "CA", "Fortune 500", "Ex-CFO"]
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
          "block_id": "b_fin_work_001",
          "block_type": "scroll_container",
          "content": {
            "scroll_direction": "horizontal",
            "items": [
              {
                "item_id": "case_mfg",
                "title": "Manufacturing Cost Optimization",
                "subtitle": "22% cost reduction in 6 months",
                "media_url": "https://storage.reshuffle.app/portfolios/fin/case_mfg.jpg",
                "detail_block_id": "b_fin_work_detail_001"
              },
              {
                "item_id": "case_series_b",
                "title": "Series B Financial Restructuring",
                "subtitle": "$12M secured at 40% better terms",
                "media_url": "https://storage.reshuffle.app/portfolios/fin/case_series_b.jpg",
                "detail_block_id": "b_fin_work_detail_002"
              },
              {
                "item_id": "case_tax",
                "title": "Tax Optimization Strategy",
                "subtitle": "₹4.2Cr annual savings",
                "media_url": "https://storage.reshuffle.app/portfolios/fin/case_tax.jpg",
                "detail_block_id": "b_fin_work_detail_003"
              }
            ],
            "peek_next": true,
            "snap_to_item": true
          },
          "interaction": {
            "on_swipe": {
              "type": "navigate",
              "target": "next"
            },
            "on_tap_item": {
              "type": "expand",
              "target": "item.detail_block_id"
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
          "block_id": "b_fin_process_001",
          "block_type": "timeline",
          "content": {
            "timeline_type": "vertical",
            "items": [
              {
                "item_id": "step_1",
                "date": "Week 1",
                "title": "Financial Audit",
                "description": "Deep dive into your books, identify leakages",
                "icon": "magnifyingglass",
                "media_url": null
              },
              {
                "item_id": "step_2",
                "date": "Week 2-3",
                "title": "Strategy Formulation",
                "description": "Custom optimization plan based on findings",
                "icon": "chart.bar",
                "media_url": null
              },
              {
                "item_id": "step_3",
                "date": "Week 4-8",
                "title": "Implementation",
                "description": "Hands-on execution with your team",
                "icon": "gearshape.2",
                "media_url": null
              },
              {
                "item_id": "step_4",
                "date": "Ongoing",
                "title": "Monitoring & Optimization",
                "description": "Monthly reviews and course corrections",
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
            "background": "#F8FAFC",
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
          "block_id": "b_fin_action_001",
          "block_type": "cta",
          "content": {
            "primary_action": {
              "label": "Book Financial Audit",
              "action_type": "calendar",
              "payload": {
                "calendar_link": "https://calendly.com/vikram-mehta/financial-audit"
              },
              "style": "filled"
            },
            "secondary_action": {
              "label": "Message Me",
              "action_type": "open_chat",
              "payload": {
                "user_id": "u_vikram_mehta"
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
      "base_url": "reshuffle://portfolio/p_fin_001",
      "section_format": "reshuffle://portfolio/p_fin_001/{section_id}",
      "block_format": "reshuffle://portfolio/p_fin_001/block/{block_id}"
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

## 2. Entertainment Category

```json
{
  "portfolio_id": "p_ent_001",
  "user_id": "u_maya_sharma",
  "category": "Entertainment",
  "version": "v1",
  "meta": {
    "title": "Maya Sharma",
    "subtitle": "Actor & Content Creator",
    "created_at": "2025-12-23T10:00:00Z",
    "updated_at": "2025-12-23T10:00:00Z",
    "language": "en",
    "theme": "dark"
  },
  "sections": [
    {
      "section_id": "hook",
      "order": 1,
      "layout": "full",
      "visibility": {
        "initial": "visible",
        "min_content_required": 1
      },
      "blocks": [
        {
          "block_id": "b_ent_hook_001",
          "block_type": "media",
          "content": {
            "media_type": "video",
            "source_url": "https://storage.reshuffle.app/portfolios/ent/showreel_maya.mp4",
            "thumbnail_url": "https://storage.reshuffle.app/portfolios/ent/showreel_thumb.jpg",
            "fallback_url": null,
            "dimensions": {
              "width": 1080,
              "height": 1920,
              "aspect_ratio": "9:16"
            },
            "playback": {
              "autoplay": true,
              "muted": true,
              "loop": true,
              "start_time": 0,
              "end_time": 15
            },
            "caption": "Showreel 2025 • 12M+ views across platforms",
            "accessibility": {
              "alt_text": "Maya Sharma acting showreel featuring scenes from recent films and series",
              "transcript_url": null
            }
          },
          "interaction": {
            "on_tap": {
              "type": "expand",
              "target": "self"
            }
          },
          "visibility": {
            "initial": "expanded",
            "priority": "high"
          },
          "style": {
            "background": "#000000",
            "padding": "none"
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
          "block_id": "b_ent_cred_001",
          "block_type": "metric",
          "content": {
            "headline": "Award-Winning Performer",
            "subheadline": null,
            "metrics": [
              {
                "label": "Filmfare Nominee",
                "value": "2",
                "unit": "x",
                "trend": null,
                "highlight": true
              },
              {
                "label": "Projects",
                "value": "15",
                "unit": "+",
                "trend": null,
                "highlight": false
              },
              {
                "label": "Followers",
                "value": "2.3",
                "unit": "M",
                "trend": "up",
                "highlight": false
              }
            ],
            "source_attribution": null,
            "date_range": null
          },
          "interaction": {},
          "visibility": {
            "initial": "expanded",
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
          "block_id": "b_ent_work_001",
          "block_type": "gallery",
          "content": {
            "gallery_type": "carousel",
            "items": [
              {
                "item_id": "project_1",
                "media_url": "https://storage.reshuffle.app/portfolios/ent/project_film1.jpg",
                "thumbnail_url": "https://storage.reshuffle.app/portfolios/ent/project_film1_thumb.jpg",
                "caption": "Lead Role • 'City of Dreams' (Netflix)",
                "tap_action": "expand"
              },
              {
                "item_id": "project_2",
                "media_url": "https://storage.reshuffle.app/portfolios/ent/project_series.jpg",
                "thumbnail_url": "https://storage.reshuffle.app/portfolios/ent/project_series_thumb.jpg",
                "caption": "Recurring Role • 'The Office India' (Hotstar)",
                "tap_action": "expand"
              },
              {
                "item_id": "project_3",
                "media_url": "https://storage.reshuffle.app/portfolios/ent/project_ad.jpg",
                "thumbnail_url": "https://storage.reshuffle.app/portfolios/ent/project_ad_thumb.jpg",
                "caption": "Brand Ambassador • Nykaa",
                "tap_action": "expand"
              }
            ],
            "auto_advance": true,
            "show_indicators": true
          },
          "interaction": {
            "on_swipe": {
              "type": "navigate",
              "target": "next"
            },
            "on_tap_item": {
              "type": "expand",
              "target": "gallery_fullscreen"
            }
          },
          "visibility": {
            "initial": "expanded",
            "priority": "high"
          },
          "style": {
            "background": "#000000",
            "padding": "none"
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
          "block_id": "b_ent_action_001",
          "block_type": "cta",
          "content": {
            "primary_action": {
              "label": "Collaborate",
              "action_type": "open_chat",
              "payload": {
                "user_id": "u_maya_sharma",
                "prefill_message": "Hi Maya, I'd love to discuss a collaboration..."
              },
              "style": "filled"
            },
            "secondary_action": {
              "label": "View Full Portfolio",
              "action_type": "external_link",
              "payload": {
                "url": "https://mayasharma.com"
              }
            },
            "urgency_text": null
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
            "background": "#EC4899",
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
      "base_url": "reshuffle://portfolio/p_ent_001",
      "section_format": "reshuffle://portfolio/p_ent_001/{section_id}",
      "block_format": "reshuffle://portfolio/p_ent_001/block/{block_id}"
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
          "icon": "film"
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

## 3. Design Category

```json
{
  "portfolio_id": "p_des_001",
  "user_id": "u_arjun_rao",
  "category": "Design",
  "version": "v1",
  "meta": {
    "title": "Arjun Rao",
    "subtitle": "Product Designer",
    "created_at": "2025-12-23T10:00:00Z",
    "updated_at": "2025-12-23T10:00:00Z",
    "language": "en",
    "theme": "light"
  },
  "sections": [
    {
      "section_id": "hook",
      "order": 1,
      "layout": "full",
      "visibility": {
        "initial": "visible",
        "min_content_required": 1
      },
      "blocks": [
        {
          "block_id": "b_des_hook_001",
          "block_type": "comparison",
          "content": {
            "comparison_type": "slider",
            "items": [
              {
                "label": "Before",
                "media_url": "https://storage.reshuffle.app/portfolios/des/dash_before.png",
                "caption": "Original dashboard • 23% task completion"
              },
              {
                "label": "After",
                "media_url": "https://storage.reshuffle.app/portfolios/des/dash_after.png",
                "caption": "Redesign • 67% task completion (+191%)"
              }
            ],
            "context": "Fintech Dashboard Redesign"
          },
          "interaction": {
            "on_swipe": {
              "type": "reveal",
              "target": "comparison_slider"
            }
          },
          "visibility": {
            "initial": "expanded",
            "priority": "high"
          },
          "style": {
            "background": "#FFFFFF",
            "padding": "none"
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
          "block_id": "b_des_cred_001",
          "block_type": "expandable_text",
          "content": {
            "title": "8 Years Designing for Scale",
            "summary": "Ex-Swiggy, Ex-Razorpay • Currently freelancing",
            "full_text": "## Experience\n\n**Senior Product Designer @ Swiggy** (2020-2024)\n- Led design for Swiggy Instamart\n- Design system architecture\n- 15-person design team mentorship\n\n**Product Designer @ Razorpay** (2017-2020)\n- Checkout experience redesign\n- Increased conversion by 34%\n\n## Tools\nFigma, Framer, Principle, After Effects\n\n## Education\nNID Ahmedabad (2017)",
            "reading_time_seconds": 60,
            "icon": "paintbrush",
            "tags": ["Swiggy", "Razorpay", "NID", "Figma"]
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
          "block_id": "b_des_work_001",
          "block_type": "gallery",
          "content": {
            "gallery_type": "masonry",
            "items": [
              {
                "item_id": "work_1",
                "media_url": "https://storage.reshuffle.app/portfolios/des/work_swiggy.png",
                "thumbnail_url": "https://storage.reshuffle.app/portfolios/des/work_swiggy_thumb.png",
                "caption": "Swiggy Instamart",
                "tap_action": "expand"
              },
              {
                "item_id": "work_2",
                "media_url": "https://storage.reshuffle.app/portfolios/des/work_razorpay.png",
                "thumbnail_url": "https://storage.reshuffle.app/portfolios/des/work_razorpay_thumb.png",
                "caption": "Razorpay Checkout",
                "tap_action": "expand"
              },
              {
                "item_id": "work_3",
                "media_url": "https://storage.reshuffle.app/portfolios/des/work_freelance.png",
                "thumbnail_url": "https://storage.reshuffle.app/portfolios/des/work_freelance_thumb.png",
                "caption": "Healthcare App",
                "tap_action": "expand"
              }
            ],
            "auto_advance": false,
            "show_indicators": false
          },
          "interaction": {
            "on_tap_item": {
              "type": "expand",
              "target": "gallery_fullscreen"
            }
          },
          "visibility": {
            "initial": "expanded",
            "priority": "high"
          },
          "style": {
            "background": "#F9FAFB",
            "padding": "small"
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
          "block_id": "b_des_process_001",
          "block_type": "hotspot_media",
          "content": {
            "media_type": "image",
            "source_url": "https://storage.reshuffle.app/portfolios/des/design_process.png",
            "hotspots": [
              {
                "hotspot_id": "hs_1",
                "position": {
                  "x_percent": 0.15,
                  "y_percent": 0.50
                },
                "label": "Discovery",
                "description": "User research, stakeholder interviews, competitive analysis",
                "link_to": null
              },
              {
                "hotspot_id": "hs_2",
                "position": {
                  "x_percent": 0.40,
                  "y_percent": 0.50
                },
                "label": "Define",
                "description": "Problem framing, success metrics, constraints mapping",
                "link_to": null
              },
              {
                "hotspot_id": "hs_3",
                "position": {
                  "x_percent": 0.65,
                  "y_percent": 0.50
                },
                "label": "Design",
                "description": "Wireframes, prototypes, design system integration",
                "link_to": null
              },
              {
                "hotspot_id": "hs_4",
                "position": {
                  "x_percent": 0.90,
                  "y_percent": 0.50
                },
                "label": "Deliver",
                "description": "Dev handoff, QA support, iteration based on feedback",
                "link_to": null
              }
            ]
          },
          "interaction": {
            "on_tap_hotspot": {
              "type": "reveal",
              "target": "hotspot_info"
            }
          },
          "visibility": {
            "initial": "expanded",
            "priority": "medium"
          },
          "style": {
            "background": "#FFFFFF",
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
          "block_id": "b_des_action_001",
          "block_type": "cta",
          "content": {
            "primary_action": {
              "label": "Start a Project",
              "action_type": "open_chat",
              "payload": {
                "user_id": "u_arjun_rao"
              },
              "style": "filled"
            },
            "secondary_action": {
              "label": "View Dribbble",
              "action_type": "external_link",
              "payload": {
                "url": "https://dribbble.com/arjunrao"
              }
            },
            "urgency_text": "Currently accepting 1 new project"
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
            "background": "#7C3AED",
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
      "base_url": "reshuffle://portfolio/p_des_001",
      "section_format": "reshuffle://portfolio/p_des_001/{section_id}",
      "block_format": "reshuffle://portfolio/p_des_001/block/{block_id}"
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
          "icon": "paintbrush"
        },
        {
          "label": "Hire",
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

## 4-8: Additional Categories (Condensed)

For brevity, here are the key differentiators for remaining categories:

### 4. Legal
```json
{
  "hook": {
    "block_type": "expandable_text",
    "content": {
      "title": "Corporate & IP Law",
      "summary": "15+ years | 200+ cases | 98% success rate"
    }
  },
  "emphasis": "credibility over visuals"
}
```

### 5. Tech
```json
{
  "hook": {
    "block_type": "hotspot_media",
    "content": {
      "source_url": "architecture_diagram.png",
      "hotspots": ["API Gateway", "Database", "Cache"]
    }
  },
  "work": {
    "block_type": "scroll_container",
    "items": ["GitHub repos with stars"]
  }
}
```

### 6. Marketing
```json
{
  "hook": {
    "block_type": "metric",
    "content": {
      "headline": "5x growth in 60 days",
      "metrics": ["CTR: 3.2%", "ROAS: 4.5x", "CAC: -40%"]
    }
  }
}
```

### 7. Influencers
```json
{
  "hook": {
    "block_type": "media",
    "content": {
      "media_type": "video",
      "autoplay": true,
      "caption": "12M views • 500K likes"
    }
  },
  "credibility": {
    "block_type": "metric",
    "metrics": ["Followers: 2.3M", "Avg Engagement: 8.2%"]
  }
}
```

### 8. Business
```json
{
  "hook": {
    "block_type": "expandable_text",
    "content": {
      "title": "0→1 & 1→10 Growth Advisory",
      "summary": "12 startups scaled from seed to Series B"
    }
  },
  "process": {
    "block_type": "hotspot_media",
    "content": {
      "source_url": "growth_framework.png"
    }
  }
}
```

---

## Usage Notes

1. **These are templates** - Actual portfolios will be generated dynamically
2. **Content URLs are placeholders** - Replace with actual storage URLs
3. **Block IDs must be unique** - Generate UUID in production
4. **Test rendering** - Validate JSON in both SwiftUI and Flutter before launch
