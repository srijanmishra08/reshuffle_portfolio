# Composition Engine

## Overview

The Composition Engine is the core algorithm that transforms raw content into a structured, deterministic portfolio document.

**Input:** Raw content items + User category
**Output:** Complete portfolio JSON

---

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       COMPOSITION ENGINE PIPELINE                            │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────────┐
                          │    RAW CONTENT      │
                          │  (User's uploads)   │
                          └──────────┬──────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: NORMALIZE                                                            │
│ - Validate content items                                                     │
│ - Extract metadata                                                           │
│ - Standardize formats                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: SCORE                                                                │
│ - Calculate base scores (relevance, quality, credibility, engagement, fresh)│
│ - Apply category weights                                                     │
│ - Detect content intent                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: FILTER                                                               │
│ - Remove low-signal content (score < threshold)                             │
│ - Remove duplicates                                                          │
│ - Enforce content limits                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: ASSIGN                                                               │
│ - Select Hook content                                                        │
│ - Assign Credibility content                                                 │
│ - Assign Work content                                                        │
│ - Generate Process section                                                   │
│ - Create Action CTA                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: BUILD BLOCKS                                                         │
│ - Select appropriate block type per item                                     │
│ - Generate content schema                                                    │
│ - Attach interaction contract                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: ASSEMBLE                                                             │
│ - Build section objects                                                      │
│ - Add navigation                                                             │
│ - Configure analytics                                                        │
│ - Generate portfolio JSON                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │  PORTFOLIO JSON     │
                          │  (Deterministic)    │
                          └─────────────────────┘
```

---

## Pseudocode Implementation

### Main Entry Point

```python
def compose_portfolio(user_id: str, category: str, raw_content: List[ContentItem]) -> Portfolio:
    """
    Main composition function.
    Converts raw content to a complete portfolio document.
    """
    
    # STEP 1: Normalize
    normalized_content = normalize_content(raw_content)
    
    # STEP 2: Score
    scored_content = score_content(normalized_content, category)
    
    # STEP 3: Filter
    filtered_content = filter_content(scored_content, category)
    
    # STEP 4: Assign to sections
    section_assignments = assign_to_sections(filtered_content, category)
    
    # STEP 5: Build blocks
    sections = build_sections(section_assignments, category)
    
    # STEP 6: Assemble portfolio
    portfolio = assemble_portfolio(
        user_id=user_id,
        category=category,
        sections=sections
    )
    
    # Validate output
    validate_portfolio(portfolio)
    
    return portfolio
```

---

### Step 1: Normalize Content

```python
def normalize_content(raw_content: List[ContentItem]) -> List[NormalizedContent]:
    """
    Standardize all content items to a common format.
    """
    normalized = []
    
    for item in raw_content:
        try:
            # Validate required fields
            if not item.source_url and not item.content:
                continue
            
            # Extract/normalize metadata
            normalized_item = NormalizedContent(
                id=generate_content_id(),
                type=detect_content_type(item),
                source=detect_source(item.source_url),
                source_url=item.source_url,
                title=item.title or extract_title(item),
                description=item.description or "",
                extracted_text=extract_text(item),
                metadata=extract_metadata(item),
                created_at=item.created_at or datetime.now(),
                raw=item
            )
            
            normalized.append(normalized_item)
            
        except Exception as e:
            log_error(f"Failed to normalize content: {e}")
            continue
    
    return normalized

def detect_content_type(item: ContentItem) -> str:
    """Detect content type from URL or file"""
    url = item.source_url or ""
    
    # Video (uploaded files)
    if any(ext in url.lower() for ext in ['.mp4', '.mov', '.webm']):
        return "video"
    
    # YouTube (extractable)
    if any(domain in url for domain in ['youtube.com', 'youtu.be']):
        return "video"
    
    # Image
    if any(ext in url.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']):
        return "image"
    
    # PDF
    if '.pdf' in url.lower():
        return "pdf"
    
    # Code/Repo (extractable)
    if 'github.com' in url:
        return "code"
    
    # External Link (Instagram, LinkedIn, TikTok, etc. - not extractable)
    return "external_link"

def detect_source(url: str) -> str:
    """Detect the source platform from URL"""
    SOURCE_PATTERNS = {
        "youtube": ["youtube.com", "youtu.be"],
        "instagram": ["instagram.com"],
        "tiktok": ["tiktok.com"],
        "linkedin": ["linkedin.com"],
        "github": ["github.com"],
        "behance": ["behance.net"],
        "dribbble": ["dribbble.com"],
        "twitter": ["twitter.com", "x.com"]
    }
    
    for source, patterns in SOURCE_PATTERNS.items():
        if any(p in url for p in patterns):
            return source
    
    return "upload"
```

---

### Step 2: Score Content

```python
def score_content(content: List[NormalizedContent], category: str) -> List[ScoredContent]:
    """
    Calculate scores for all content items.
    See 05_SCORING_HEURISTICS.md for details.
    """
    scored = []
    
    for item in content:
        # Calculate all base scores
        relevance = calculate_relevance(item, category)
        quality = calculate_quality(item)
        credibility = calculate_credibility(item, category)
        engagement = calculate_engagement(item)
        freshness = calculate_freshness(item, category)
        
        # Apply category weights
        weights = CATEGORY_WEIGHTS[category]
        total_score = (
            relevance * weights["relevance"] +
            quality * weights["quality"] +
            credibility * weights["credibility"] +
            engagement * weights["engagement"] +
            freshness * weights["freshness"]
        )
        
        # Detect intent
        intents = detect_intent(item, category)
        
        scored.append(ScoredContent(
            content=item,
            scores=Scores(
                total=total_score,
                relevance=relevance,
                quality=quality,
                credibility=credibility,
                engagement=engagement,
                freshness=freshness
            ),
            intents=intents
        ))
    
    # Sort by total score descending
    scored.sort(key=lambda x: x.scores.total, reverse=True)
    
    return scored
```

---

### Step 3: Filter Content

```python
def filter_content(scored_content: List[ScoredContent], category: str) -> List[ScoredContent]:
    """
    Remove low-quality and duplicate content.
    """
    filtered = []
    seen_urls = set()
    
    # Minimum score threshold
    MIN_SCORE = 0.3
    
    for item in scored_content:
        # Skip low scores
        if item.scores.total < MIN_SCORE:
            continue
        
        # Skip duplicates
        url = item.content.source_url
        if url in seen_urls:
            continue
        seen_urls.add(url)
        
        # Skip content that doesn't fit category at all
        if item.scores.relevance < 0.2:
            continue
        
        filtered.append(item)
    
    return filtered
```

---

### Step 4: Assign to Sections

```python
def assign_to_sections(content: List[ScoredContent], category: str) -> SectionAssignments:
    """
    Assign content to portfolio sections based on scores and intents.
    """
    assignments = SectionAssignments(
        hook=None,
        credibility=[],
        work=[],
        process=None,
        action=None
    )
    
    available = list(content)  # Copy to track unassigned
    
    # 1. SELECT HOOK (one item only)
    assignments.hook = select_hook(available, category)
    if assignments.hook:
        available.remove(assignments.hook)
    
    # 2. SELECT CREDIBILITY (max 3)
    credibility_items = select_credibility(available, category, limit=3)
    assignments.credibility = credibility_items
    for item in credibility_items:
        available.remove(item)
    
    # 3. SELECT WORK (max 5)
    work_items = select_work(available, category, limit=5)
    assignments.work = work_items
    for item in work_items:
        available.remove(item)
    
    # 4. SELECT/GENERATE PROCESS
    assignments.process = select_or_generate_process(available, category)
    
    # 5. GENERATE ACTION (always)
    assignments.action = generate_action(category)
    
    return assignments

def select_hook(content: List[ScoredContent], category: str) -> Optional[ScoredContent]:
    """
    Select the best hook content.
    Hook must be attention-grabbing and appropriate for category.
    """
    # Prefer items with "hook" intent
    hook_candidates = [c for c in content if "hook" in c.intents]
    
    if hook_candidates:
        return max(hook_candidates, key=lambda x: x.scores.total)
    
    # Fall back to highest scoring item
    if content:
        # Category-specific hook preferences
        if category in ["Entertainment", "Influencers"]:
            video_content = [c for c in content if c.content.type == "video"]
            if video_content:
                return max(video_content, key=lambda x: x.scores.engagement)
        
        if category in ["Finance", "Marketing", "Business"]:
            # Prefer metrics/stats
            metric_content = [c for c in content 
                           if has_metric_potential(c.content)]
            if metric_content:
                return max(metric_content, key=lambda x: x.scores.credibility)
        
        if category == "Design":
            # Prefer comparison/visual
            visual_content = [c for c in content 
                           if c.content.type == "image" and is_comparison_candidate(c.content)]
            if visual_content:
                return visual_content[0]
        
        # Default: highest total score
        return content[0]
    
    return None

def select_credibility(content: List[ScoredContent], category: str, limit: int) -> List[ScoredContent]:
    """
    Select credibility-building content.
    """
    # Prefer items with "proof" or "testimonial" intent
    credibility_candidates = [c for c in content 
                            if "proof" in c.intents or "testimonial" in c.intents]
    
    if not credibility_candidates:
        # Fall back to items with high credibility score
        credibility_candidates = [c for c in content if c.scores.credibility > 0.5]
    
    if not credibility_candidates:
        # Use any available content
        credibility_candidates = content
    
    # Sort by credibility score and take top N
    credibility_candidates.sort(key=lambda x: x.scores.credibility, reverse=True)
    return credibility_candidates[:limit]

def select_work(content: List[ScoredContent], category: str, limit: int) -> List[ScoredContent]:
    """
    Select work/portfolio content.
    """
    # Prefer items with "case-study" or "demo" intent
    work_candidates = [c for c in content 
                      if "case-study" in c.intents or "demo" in c.intents]
    
    if not work_candidates:
        # Fall back to any remaining content
        work_candidates = content
    
    # Sort by total score and take top N
    work_candidates.sort(key=lambda x: x.scores.total, reverse=True)
    return work_candidates[:limit]

def select_or_generate_process(content: List[ScoredContent], category: str) -> Optional[ScoredContent]:
    """
    Select process content or generate placeholder.
    """
    # Look for explanation content
    process_candidates = [c for c in content if "explanation" in c.intents]
    
    if process_candidates:
        return process_candidates[0]
    
    # Generate category-specific process placeholder
    return generate_process_placeholder(category)

def generate_action(category: str) -> ActionContent:
    """
    Generate CTA based on category.
    """
    CTA_TEMPLATES = {
        "Finance": {
            "label": "Book Consultation",
            "action_type": "calendar"
        },
        "Entertainment": {
            "label": "Get in Touch",
            "action_type": "open_chat"
        },
        "Design": {
            "label": "Start a Project",
            "action_type": "open_chat"
        },
        "Legal": {
            "label": "Schedule Consultation",
            "action_type": "calendar"
        },
        "Tech": {
            "label": "Let's Connect",
            "action_type": "open_chat"
        },
        "Marketing": {
            "label": "Get Growth Strategy",
            "action_type": "calendar"
        },
        "Influencers": {
            "label": "Collaborate",
            "action_type": "open_chat"
        },
        "Business": {
            "label": "Book Advisory Call",
            "action_type": "calendar"
        }
    }
    
    return ActionContent(**CTA_TEMPLATES[category])
```

---

### Step 5: Build Blocks

```python
def build_sections(assignments: SectionAssignments, category: str) -> List[Section]:
    """
    Convert section assignments to actual section objects with blocks.
    """
    sections = []
    
    # Hook Section
    if assignments.hook:
        hook_block = build_block(assignments.hook, "hook", category)
        sections.append(Section(
            section_id="hook",
            order=1,
            layout=get_section_layout("hook", category),
            blocks=[hook_block]
        ))
    
    # Credibility Section
    if assignments.credibility:
        cred_blocks = [
            build_block(item, "credibility", category) 
            for item in assignments.credibility
        ]
        sections.append(Section(
            section_id="credibility",
            order=2,
            layout=get_section_layout("credibility", category),
            blocks=cred_blocks
        ))
    
    # Work Section
    if assignments.work:
        work_blocks = [
            build_block(item, "work", category) 
            for item in assignments.work
        ]
        
        # Wrap multiple work items in scroll container
        if len(work_blocks) > 1:
            work_blocks = [wrap_in_scroll_container(work_blocks)]
        
        sections.append(Section(
            section_id="work",
            order=3,
            layout=get_section_layout("work", category),
            blocks=work_blocks
        ))
    
    # Process Section
    if assignments.process:
        process_block = build_block(assignments.process, "process", category)
        sections.append(Section(
            section_id="process",
            order=4,
            layout=get_section_layout("process", category),
            blocks=[process_block]
        ))
    
    # Action Section
    action_block = build_cta_block(assignments.action, category)
    sections.append(Section(
        section_id="action",
        order=5,
        layout=get_section_layout("action", category),
        blocks=[action_block]
    ))
    
    return sections

def build_block(item: ScoredContent, section: str, category: str) -> Block:
    """
    Build a block from scored content.
    """
    # Select block type based on content and section
    block_type = select_block_type(item, section, category)
    
    # Build content schema based on block type
    content = build_block_content(item, block_type)
    
    # Get interaction contract for this block type
    interaction = get_interaction_contract(block_type, section)
    
    return Block(
        block_id=generate_block_id(),
        block_type=block_type,
        content=content,
        interaction=interaction,
        visibility={
            "initial": "expanded" if section == "hook" else "collapsed",
            "priority": "high" if section in ["hook", "action"] else "medium"
        }
    )

def select_block_type(item: ScoredContent, section: str, category: str) -> str:
    """
    Select appropriate block type based on content, section, and category.
    """
    content = item.content
    
    # Section-specific rules
    if section == "hook":
        if content.type == "video":
            return "media"
        if has_metric_data(content):
            return "metric"
        if is_comparison_candidate(content):
            return "comparison"
        if content.type == "image":
            return "media"
        return "expandable_text"
    
    if section == "credibility":
        return "expandable_text"  # Always text for credibility
    
    if section == "work":
        if content.type == "video":
            return "media"
        if is_comparison_candidate(content):
            return "comparison"
        if has_hotspot_potential(content):
            return "hotspot_media"
        if content.type == "image":
            return "gallery"
        return "expandable_text"
    
    if section == "process":
        if has_timeline_structure(content):
            return "timeline"
        return "expandable_text"
    
    if section == "action":
        return "cta"
    
    return "expandable_text"  # Default

def build_block_content(item: ScoredContent, block_type: str) -> dict:
    """
    Build content schema for specific block type.
    """
    content = item.content
    
    if block_type == "media":
        return {
            "media_type": content.type,
            "source_url": content.source_url,
            "thumbnail_url": content.metadata.get("thumbnail_url"),
            "dimensions": content.metadata.get("dimensions", {}),
            "playback": {
                "autoplay": True,
                "muted": True,
                "loop": False
            },
            "caption": content.title
        }
    
    if block_type == "expandable_text":
        return {
            "title": content.title or "Untitled",
            "summary": truncate(content.description, 150),
            "full_text": content.extracted_text or content.description,
            "reading_time_seconds": estimate_reading_time(content.extracted_text),
            "tags": extract_tags(content)
        }
    
    if block_type == "metric":
        metrics = extract_metrics(content)
        return {
            "headline": content.title,
            "metrics": metrics[:4]  # Max 4 metrics
        }
    
    if block_type == "comparison":
        return {
            "comparison_type": "slider",
            "items": extract_comparison_items(content),
            "context": content.title
        }
    
    # ... other block types
    
    return {}
```

---

### Step 6: Assemble Portfolio

```python
def assemble_portfolio(user_id: str, category: str, sections: List[Section]) -> Portfolio:
    """
    Final assembly of portfolio document.
    """
    portfolio_id = generate_portfolio_id()
    
    return Portfolio(
        portfolio_id=portfolio_id,
        user_id=user_id,
        category=category,
        version="v1",
        meta={
            "title": generate_title(user_id, category),
            "subtitle": generate_subtitle(category),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "language": "en",
            "theme": "auto"
        },
        sections=sections,
        navigation={
            "anchors": {
                "hook": "section_hook",
                "work": "section_work",
                "contact": "section_action"
            },
            "deep_links": {
                "enabled": True,
                "base_url": f"reshuffle://portfolio/{portfolio_id}",
                "section_format": "reshuffle://portfolio/{portfolio_id}/{section_id}",
                "block_format": "reshuffle://portfolio/{portfolio_id}/block/{block_id}"
            },
            "state_preservation": {
                "enabled": True,
                "restore_scroll_position": True,
                "restore_expanded_state": True
            },
            "quick_nav": build_quick_nav(sections)
        },
        analytics={
            "tracking_enabled": True,
            "events": {
                "portfolio_view": True,
                "section_view": True,
                "block_interaction": True,
                "cta_tap": True,
                "scroll_depth": True,
                "time_spent": True
            }
        }
    )

def validate_portfolio(portfolio: Portfolio) -> None:
    """
    Validate portfolio meets all requirements.
    Raises exception if invalid.
    """
    # Required sections
    section_ids = {s.section_id for s in portfolio.sections}
    required = {"hook", "action"}
    
    if not required.issubset(section_ids):
        raise ValidationError(f"Missing required sections: {required - section_ids}")
    
    # Section order
    for i, section in enumerate(portfolio.sections):
        expected_order = i + 1
        if section.order != expected_order:
            raise ValidationError(f"Invalid section order for {section.section_id}")
    
    # Block limits
    for section in portfolio.sections:
        limit = SECTION_LIMITS.get(section.section_id, 5)
        if len(section.blocks) > limit:
            raise ValidationError(f"Too many blocks in {section.section_id}")
    
    # No duplicate block IDs
    all_block_ids = [b.block_id for s in portfolio.sections for b in s.blocks]
    if len(all_block_ids) != len(set(all_block_ids)):
        raise ValidationError("Duplicate block IDs found")
    
    # Valid block types
    for section in portfolio.sections:
        for block in section.blocks:
            if block.block_type not in VALID_BLOCK_TYPES:
                raise ValidationError(f"Invalid block type: {block.block_type}")
```

---

## Error Handling

```python
def compose_portfolio_safe(user_id: str, category: str, raw_content: List[ContentItem]) -> Result:
    """
    Safe wrapper with error handling.
    """
    try:
        portfolio = compose_portfolio(user_id, category, raw_content)
        return Result(success=True, data=portfolio)
    
    except ValidationError as e:
        log_error(f"Validation failed: {e}")
        return Result(success=False, error=str(e), error_code="VALIDATION_ERROR")
    
    except InsufficientContentError as e:
        log_error(f"Not enough content: {e}")
        return Result(success=False, error=str(e), error_code="INSUFFICIENT_CONTENT")
    
    except Exception as e:
        log_error(f"Composition failed: {e}")
        return Result(success=False, error="Internal error", error_code="INTERNAL_ERROR")
```

---

## Testing Strategy

```python
def test_composition_determinism():
    """Same input must produce same output"""
    content = create_test_content()
    
    portfolio1 = compose_portfolio("user1", "Finance", content)
    portfolio2 = compose_portfolio("user1", "Finance", content)
    
    # Remove timestamps for comparison
    p1_normalized = remove_timestamps(portfolio1)
    p2_normalized = remove_timestamps(portfolio2)
    
    assert p1_normalized == p2_normalized

def test_all_categories():
    """Test composition works for all categories"""
    content = create_generic_content()
    
    for category in VALID_CATEGORIES:
        portfolio = compose_portfolio("user1", category, content)
        validate_portfolio(portfolio)

def test_empty_content():
    """Test graceful handling of no content"""
    result = compose_portfolio_safe("user1", "Finance", [])
    
    assert not result.success
    assert result.error_code == "INSUFFICIENT_CONTENT"
```
