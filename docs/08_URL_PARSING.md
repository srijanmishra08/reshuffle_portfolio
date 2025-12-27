# URL Parsing Strategies

## Overview

The Portfolio Engine supports **limited URL parsing** for specific platforms where API access is reliable and free. For social media platforms, we use a **clickable link approach** instead of metadata extraction.

---

## Supported Input Types

| Input Type | Method | Extraction |
|------------|--------|------------|
| **YouTube URLs** | API + oEmbed | Full metadata extraction |
| **GitHub URLs** | API | Full metadata extraction |
| **PDFs** | Direct upload | Text extraction, page count |
| **Images** | Direct upload | Dimensions, format, EXIF |
| **Videos** | Direct upload | Duration, thumbnail, resolution |
| **Text** | Direct input | Plain text content |
| **Social Links** | Clickable only | No extraction (user provides title) |

---

## Extracted Platforms (Full Metadata)

### 1. YouTube

**Complexity: 🟢 Easy**

YouTube has reliable, well-documented APIs with generous free tiers.

#### Option A: YouTube Data API v3 (Recommended)

**Pros:**
- Official, reliable
- Rich metadata (duration, views, likes, channel)
- Transcript access (separate API)

**Cons:**
- Requires API key
- 10,000 units/day quota (free)

**Implementation:**
```python
import googleapiclient.discovery

class YouTubeExtractor:
    def __init__(self, api_key: str):
        self.youtube = googleapiclient.discovery.build(
            "youtube", "v3", developerKey=api_key
        )
    
    def extract(self, video_id: str) -> dict:
        request = self.youtube.videos().list(
            part="snippet,contentDetails,statistics",
            id=video_id
        )
        response = request.execute()
        
        if not response["items"]:
            raise VideoNotFound(video_id)
        
        item = response["items"][0]
        snippet = item["snippet"]
        stats = item["statistics"]
        content = item["contentDetails"]
        
        return {
            "title": snippet["title"],
            "description": snippet["description"],
            "thumbnail_url": snippet["thumbnails"]["high"]["url"],
            "channel_name": snippet["channelTitle"],
            "published_at": snippet["publishedAt"],
            "duration": parse_duration(content["duration"]),  # PT4M13S -> 253
            "view_count": int(stats.get("viewCount", 0)),
            "like_count": int(stats.get("likeCount", 0)),
        }

# Quota cost: 1 unit per video
# Free tier: 10,000 units/day = 10,000 videos/day
```

#### Option B: oEmbed (No API Key Fallback)

**Pros:**
- No API key required
- No rate limits
- Always available

**Cons:**
- Limited metadata (title, thumbnail only)
- No view count, duration, likes

**Implementation:**
```python
import requests

def youtube_oembed(video_url: str) -> dict:
    oembed_url = f"https://www.youtube.com/oembed?url={video_url}&format=json"
    response = requests.get(oembed_url)
    
    if response.status_code != 200:
        raise ExtractionFailed("oEmbed failed")
    
    data = response.json()
    return {
        "title": data["title"],
        "thumbnail_url": data["thumbnail_url"],
        "channel_name": data["author_name"],
        # No duration, views, likes available
    }
```

#### Recommended YouTube Strategy

```python
class YouTubeHandler:
    def extract(self, url: str) -> dict:
        video_id = extract_youtube_id(url)
        
        # Try API first (if quota available)
        if self.has_api_quota():
            try:
                return self.api_extract(video_id)
            except QuotaExceeded:
                pass
        
        # Fallback to oEmbed
        try:
            return youtube_oembed(url)
        except:
            pass
        
        # Final fallback: minimal data
        return {
            "title": f"YouTube Video {video_id}",
            "source_url": url,
            "extraction_status": "minimal"
        }
```

---

### 2. GitHub

**Complexity: 🟢 Easy**

GitHub has a generous free API with excellent documentation.

#### GitHub API (Free)

```python
import requests

class GitHubExtractor:
    def __init__(self, token: str = None):
        self.headers = {}
        if token:
            self.headers["Authorization"] = f"token {token}"
    
    def extract_repo(self, owner: str, repo: str) -> dict:
        url = f"https://api.github.com/repos/{owner}/{repo}"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code != 200:
            raise ExtractionFailed(f"GitHub API error: {response.status_code}")
        
        data = response.json()
        
        return {
            "title": data["full_name"],
            "description": data["description"],
            "stars": data["stargazers_count"],
            "forks": data["forks_count"],
            "language": data["language"],
            "topics": data.get("topics", []),
            "created_at": data["created_at"],
            "updated_at": data["updated_at"],
            "open_issues": data["open_issues_count"],
            "license": data.get("license", {}).get("name"),
            "homepage": data.get("homepage")
        }
    
    def extract_readme(self, owner: str, repo: str) -> str:
        url = f"https://api.github.com/repos/{owner}/{repo}/readme"
        headers = {**self.headers, "Accept": "application/vnd.github.raw"}
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            return response.text
        return None

# Rate limits:
# - Without token: 60 requests/hour
# - With token: 5,000 requests/hour
```

---

## Clickable Links (No Extraction)

For social platforms where API access is restricted or expensive, we store links as **clickable references** that viewers can tap to visit.

### Supported Clickable Platforms

| Platform | Example URL | Stored Data |
|----------|-------------|-------------|
| **Instagram** | instagram.com/p/xxx | URL + user-provided title |
| **LinkedIn** | linkedin.com/posts/xxx | URL + user-provided title |
| **TikTok** | tiktok.com/@user/video/xxx | URL + user-provided title |
| **Twitter/X** | x.com/user/status/xxx | URL + user-provided title |
| **Behance** | behance.net/gallery/xxx | URL + user-provided title |
| **Dribbble** | dribbble.com/shots/xxx | URL + user-provided title |

### Clickable Link Schema

```json
{
  "type": "external_link",
  "platform": "instagram | linkedin | tiktok | twitter | behance | dribbble | other",
  "url": "https://instagram.com/p/abc123",
  "user_provided": {
    "title": "My Design Showcase",
    "description": "Award-winning brand identity project",
    "thumbnail_url": "https://storage.reshuffle.app/user_thumbnails/abc.jpg"
  },
  "display": {
    "icon": "platform_icon",
    "label": "View on Instagram",
    "open_in": "external_browser"
  }
}
```

### How Clickable Links Work

1. **User adds link** → Provides URL + title + optional description
2. **Optional thumbnail** → User can upload custom thumbnail image
3. **Portfolio display** → Shows as branded button/card
4. **Viewer taps** → Opens external browser to platform

```
┌────────────────────────────────────────┐
│                                        │
│  ┌────────────────────────────────┐   │
│  │  📸  My Design Showcase        │   │
│  │  Award-winning brand identity  │   │
│  │                                │   │
│  │  [View on Instagram →]         │   │
│  └────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

---

## API Input Endpoint

### Add External Link

**Endpoint:** `POST /content/links`

**Request:**
```json
{
  "platform": "instagram",
  "url": "https://instagram.com/p/abc123",
  "title": "My Design Showcase",
  "description": "Award-winning brand identity project",
  "thumbnail": "base64_image_data (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content_id": "c_link_12345",
    "type": "external_link",
    "platform": "instagram",
    "url": "https://instagram.com/p/abc123",
    "title": "My Design Showcase",
    "thumbnail_url": "https://storage.reshuffle.app/thumbs/abc.jpg"
  }
}
```

---

## Platform Detection

Automatically detect platform from URL:

```python
import re
from urllib.parse import urlparse

PLATFORM_PATTERNS = {
    "youtube": [
        r"youtube\.com/watch",
        r"youtu\.be/",
        r"youtube\.com/shorts/"
    ],
    "github": [
        r"github\.com/[\w-]+/[\w-]+"
    ],
    "instagram": [
        r"instagram\.com/(p|reel|tv)/",
        r"instagr\.am/"
    ],
    "linkedin": [
        r"linkedin\.com/(posts|pulse|feed)",
        r"lnkd\.in/"
    ],
    "tiktok": [
        r"tiktok\.com/@[\w.]+/video/",
        r"vm\.tiktok\.com/"
    ],
    "twitter": [
        r"twitter\.com/\w+/status/",
        r"x\.com/\w+/status/"
    ],
    "behance": [
        r"behance\.net/gallery/"
    ],
    "dribbble": [
        r"dribbble\.com/shots/"
    ]
}

def detect_platform(url: str) -> str:
    for platform, patterns in PLATFORM_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return platform
    return "other"

def is_extractable(platform: str) -> bool:
    """Only YouTube and GitHub support full metadata extraction"""
    return platform in ["youtube", "github"]
```

---

## Content Routing Logic

```python
def process_url(url: str, user_metadata: dict) -> Content:
    platform = detect_platform(url)
    
    if platform == "youtube":
        # Full extraction
        extracted = youtube_handler.extract(url)
        return VideoContent(
            type="video",
            source="youtube",
            **extracted
        )
    
    elif platform == "github":
        # Full extraction
        extracted = github_handler.extract(url)
        return CodeContent(
            type="code",
            source="github",
            **extracted
        )
    
    else:
        # Clickable link only - requires user metadata
        if not user_metadata.get("title"):
            raise ValidationError("Title required for social links")
        
        return ExternalLinkContent(
            type="external_link",
            platform=platform,
            url=url,
            title=user_metadata["title"],
            description=user_metadata.get("description"),
            thumbnail_url=user_metadata.get("thumbnail_url")
        )
```

---

## Cost Summary

| Platform | Method | Cost |
|----------|--------|------|
| YouTube | Data API | Free (10K/day) |
| YouTube | oEmbed | Free (unlimited) |
| GitHub | REST API | Free (5K/hour with token) |
| Social Links | None | Free (no extraction) |

**Total Estimated Cost: $0/month** (within free tiers)

---

## Caching Strategy

Only YouTube and GitHub responses need caching:

```python
CACHE_CONFIG = {
    "youtube": {
        "ttl_seconds": 86400,  # 24 hours
        "key_format": "yt:{video_id}"
    },
    "github": {
        "ttl_seconds": 3600,  # 1 hour (repos change more)
        "key_format": "gh:{owner}:{repo}"
    }
}

async def get_with_cache(platform: str, identifier: str) -> dict:
    cache_key = CACHE_CONFIG[platform]["key_format"].format(**identifier)
    
    # Check cache
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Fetch fresh
    data = await extractors[platform].extract(identifier)
    
    # Store in cache
    await redis.setex(
        cache_key,
        CACHE_CONFIG[platform]["ttl_seconds"],
        json.dumps(data)
    )
    
    return data
```

---

## Summary

| Input Type | Extraction | User Input Required |
|------------|------------|---------------------|
| **YouTube URL** | Full metadata via API | None |
| **GitHub URL** | Full metadata via API | None |
| **Instagram/LinkedIn/TikTok** | None (clickable link) | Title required |
| **Uploaded Video** | Local processing | Title optional |
| **Uploaded Image** | Local processing | Title optional |
| **Uploaded PDF** | Text extraction | Title optional |
| **Plain Text** | Direct use | N/A |

This simplified approach:
- ✅ Eliminates expensive/unreliable API integrations
- ✅ Works within free tier limits
- ✅ Provides clear UX (users know what to expect)
- ✅ Maintains link functionality for social proof
