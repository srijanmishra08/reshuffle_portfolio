# Content Ingestion Pipeline

## Overview

The Content Ingestion Pipeline handles all raw user inputs and transforms them into normalized content items that the Composition Engine can process.

---

## Supported Input Types

| Input Type | Sources | Extraction |
|------------|---------|------------|
| **Video** | YouTube URL, Direct Upload | Metadata, thumbnails, duration |
| **Image** | Direct Upload | Dimensions, format, EXIF |
| **PDF** | Direct Upload | Text extraction, page count |
| **Text** | Direct Input | Plain text content |
| **Code** | GitHub URL | README, stars, language |
| **External Link** | Instagram, LinkedIn, TikTok, etc. | User-provided metadata only |

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CONTENT INGESTION PIPELINE                             │
└─────────────────────────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────────────────┐
         │                   USER INPUTS                        │
         │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ │
         │  │ Video │ │ Image │ │  PDF  │ │ Text  │ │ Links │ │
         │  │Upload │ │Upload │ │Upload │ │ Input │ │ (URL) │ │
         │  └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ │
         └─────┼─────────┼─────────┼─────────┼─────────┼───────┘
               │         │         │         │         │
               ▼         ▼         ▼         ▼         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          1. TYPE DETECTION                                   │
│  - File extension analysis                                                   │
│  - MIME type detection                                                       │
│  - URL pattern matching (YouTube, GitHub, Social)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          2. SOURCE ROUTING                                   │
│                                                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐     │
│  │  Video    │ │  Image    │ │   PDF     │ │  YouTube  │ │  GitHub   │     │
│  │  Handler  │ │  Handler  │ │  Handler  │ │  Handler  │ │  Handler  │     │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘     │
│                                                                              │
│                        ┌───────────────────────┐                            │
│                        │  External Link Handler │                           │
│                        │  (Instagram, LinkedIn, │                           │
│                        │   TikTok - no extract) │                           │
│                        └───────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       3. METADATA EXTRACTION                                 │
│  - YouTube API / oEmbed (for YouTube URLs)                                  │
│  - GitHub API (for GitHub URLs)                                             │
│  - Local processing (for uploads)                                           │
│  - User-provided only (for social links)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        4. NORMALIZATION                                      │
│  - Standardize schema                                                        │
│  - Validate data                                                             │
│  - Generate IDs                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                     ┌───────────────────────────┐
                     │   NORMALIZED CONTENT      │
                     │   (Ready for scoring)     │
                     └───────────────────────────┘
```

---

## Input Schema

### Raw Input

```json
{
  "input_id": "string (uuid)",
  "input_type": "url | file | text",
  "source_url": "string (URL) | null",
  "file_data": "Base64 | null",
  "file_name": "string | null",
  "mime_type": "string | null",
  "raw_text": "string | null",
  "user_metadata": {
    "title": "string | null",
    "description": "string | null",
    "tags": ["string"],
    "thumbnail": "Base64 | null"
  }
}
```

### Normalized Output

```json
{
  "content_id": "string (uuid)",
  "type": "video | image | pdf | text | code | external_link",
  "source": "youtube | github | upload | input | instagram | linkedin | tiktok | other",
  "source_url": "string (URL) | null",
  "storage_url": "string (URL) | null",
  "title": "string",
  "description": "string",
  "extracted_text": "string | null",
  "metadata": {
    "duration_seconds": "number | null",
    "view_count": "number | null",
    "dimensions": { "width": 0, "height": 0 },
    "thumbnail_url": "string | null",
    "created_at": "ISO-8601",
    "platform_metadata": {}
  },
  "extraction_status": "complete | partial | user_provided",
  "extraction_errors": ["string"]
}
```

---

## Type-Specific Handlers

### 1. Video Handler (Direct Upload)

```python
class VideoUploadHandler:
    """Handle directly uploaded video files"""
    
    SUPPORTED_FORMATS = ["mp4", "mov", "avi", "webm"]
    MAX_SIZE_MB = 500
    
    def process(self, input_item: RawInput) -> NormalizedContent:
        # Validate format and size
        self.validate(input_item)
        
        # Upload to storage
        storage_url = upload_to_storage(input_item.file_data, "video")
        
        # Extract metadata using ffprobe
        video_info = extract_video_info(input_item.file_data)
        
        # Generate thumbnail
        thumbnail_url = generate_video_thumbnail(storage_url)
        
        return NormalizedContent(
            content_id=generate_id(),
            type="video",
            source="upload",
            source_url=None,
            storage_url=storage_url,
            title=input_item.user_metadata.get("title", input_item.file_name),
            description=input_item.user_metadata.get("description", ""),
            metadata={
                "duration_seconds": video_info.duration,
                "dimensions": {
                    "width": video_info.width,
                    "height": video_info.height
                },
                "thumbnail_url": thumbnail_url,
                "created_at": datetime.utcnow().isoformat()
            },
            extraction_status="complete"
        )
```

### 2. YouTube Handler (URL)

```python
class YouTubeHandler:
    """Handle YouTube video URLs - full metadata extraction"""
    
    def process(self, input_item: RawInput) -> NormalizedContent:
        video_id = extract_youtube_id(input_item.source_url)
        
        # Try API first, fallback to oEmbed
        # See 08_URL_PARSING.md for full implementation
        metadata = self.extract_metadata(video_id)
        
        return NormalizedContent(
            content_id=generate_id(),
            type="video",
            source="youtube",
            source_url=input_item.source_url,
            storage_url=None,  # YouTube hosted
            title=metadata["title"],
            description=metadata.get("description", ""),
            metadata={
                "duration_seconds": metadata.get("duration"),
                "view_count": metadata.get("view_count"),
                "thumbnail_url": metadata["thumbnail_url"],
                "created_at": metadata.get("published_at"),
                "platform_metadata": {
                    "video_id": video_id,
                    "channel": metadata.get("channel_name"),
                    "likes": metadata.get("like_count")
                }
            },
            extraction_status="complete"
        )
```

### 3. Image Handler (Direct Upload)

```python
class ImageHandler:
    """Handle image file uploads"""
    
    SUPPORTED_FORMATS = ["jpg", "jpeg", "png", "webp", "heic"]
    MAX_SIZE_MB = 20
    
    def process(self, input_item: RawInput) -> NormalizedContent:
        # Validate
        self.validate(input_item)
        
        # Upload to storage (with optimization)
        storage_url = upload_to_storage(
            input_item.file_data, 
            "image",
            optimize=True
        )
        
        # Extract metadata
        image_info = extract_image_info(input_item.file_data)
        
        # Generate thumbnail
        thumbnail_url = generate_image_thumbnail(storage_url)
        
        return NormalizedContent(
            content_id=generate_id(),
            type="image",
            source="upload",
            storage_url=storage_url,
            title=input_item.user_metadata.get("title", input_item.file_name),
            description=input_item.user_metadata.get("description", ""),
            metadata={
                "dimensions": {
                    "width": image_info.width,
                    "height": image_info.height
                },
                "thumbnail_url": thumbnail_url,
                "format": image_info.format,
                "created_at": image_info.exif_date or datetime.utcnow().isoformat()
            },
            extraction_status="complete"
        )
```

### 4. PDF Handler (Direct Upload)

```python
class PDFHandler:
    """Handle PDF file uploads with text extraction"""
    
    MAX_SIZE_MB = 50
    MAX_PAGES = 100
    
    def process(self, input_item: RawInput) -> NormalizedContent:
        # Validate
        self.validate(input_item)
        
        # Upload to storage
        storage_url = upload_to_storage(input_item.file_data, "pdf")
        
        # Extract text content
        pdf_info = extract_pdf_text(input_item.file_data)
        
        # Generate preview thumbnail (first page)
        thumbnail_url = generate_pdf_thumbnail(input_item.file_data)
        
        return NormalizedContent(
            content_id=generate_id(),
            type="pdf",
            source="upload",
            storage_url=storage_url,
            title=input_item.user_metadata.get("title", input_item.file_name),
            description=input_item.user_metadata.get("description", ""),
            extracted_text=pdf_info.text[:10000],  # First 10K chars
            metadata={
                "page_count": pdf_info.page_count,
                "thumbnail_url": thumbnail_url,
                "word_count": pdf_info.word_count,
                "created_at": datetime.utcnow().isoformat()
            },
            extraction_status="complete"
        )
```

### 5. Text Handler (Direct Input)

```python
class TextHandler:
    """Handle plain text input"""
    
    MAX_CHARS = 50000
    
    def process(self, input_item: RawInput) -> NormalizedContent:
        text = input_item.raw_text[:self.MAX_CHARS]
        
        return NormalizedContent(
            content_id=generate_id(),
            type="text",
            source="input",
            title=input_item.user_metadata.get("title", "Text Content"),
            description=input_item.user_metadata.get("description", ""),
            extracted_text=text,
            metadata={
                "char_count": len(text),
                "word_count": len(text.split()),
                "created_at": datetime.utcnow().isoformat()
            },
            extraction_status="complete"
        )
```

### 6. GitHub Handler (URL)

```python
class GitHubHandler:
    """Handle GitHub repository URLs - full metadata extraction"""
    
    def process(self, input_item: RawInput) -> NormalizedContent:
        owner, repo = extract_github_repo(input_item.source_url)
        
        # Full extraction via GitHub API
        # See 08_URL_PARSING.md for implementation
        metadata = self.extract_repo_metadata(owner, repo)
        readme = self.extract_readme(owner, repo)
        
        return NormalizedContent(
            content_id=generate_id(),
            type="code",
            source="github",
            source_url=input_item.source_url,
            title=metadata["title"],
            description=metadata.get("description", ""),
            extracted_text=readme,
            metadata={
                "stars": metadata["stars"],
                "forks": metadata["forks"],
                "language": metadata["language"],
                "topics": metadata.get("topics", []),
                "created_at": metadata["created_at"],
                "platform_metadata": {
                    "owner": owner,
                    "repo": repo,
                    "open_issues": metadata["open_issues"],
                    "license": metadata.get("license")
                }
            },
            extraction_status="complete"
        )
```

### 7. External Link Handler (Social Platforms)

For Instagram, LinkedIn, TikTok, and other social platforms - **NO automatic extraction**.
Users must provide metadata manually.

```python
class ExternalLinkHandler:
    """
    Handle social media and other external links.
    NO automatic metadata extraction - user provides all data.
    """
    
    SUPPORTED_PLATFORMS = [
        "instagram", "linkedin", "tiktok", 
        "twitter", "behance", "dribbble", "other"
    ]
    
    def process(self, input_item: RawInput) -> NormalizedContent:
        platform = detect_platform(input_item.source_url)
        
        # Require user-provided title for social links
        if not input_item.user_metadata.get("title"):
            raise ValidationError(
                f"Title is required for {platform} links. "
                "We cannot automatically extract metadata from this platform."
            )
        
        # Optional: User can upload a custom thumbnail
        thumbnail_url = None
        if input_item.user_metadata.get("thumbnail"):
            thumbnail_url = upload_to_storage(
                input_item.user_metadata["thumbnail"],
                "thumbnail"
            )
        
        return NormalizedContent(
            content_id=generate_id(),
            type="external_link",
            source=platform,
            source_url=input_item.source_url,
            title=input_item.user_metadata["title"],
            description=input_item.user_metadata.get("description", ""),
            metadata={
                "platform": platform,
                "thumbnail_url": thumbnail_url,
                "display_label": f"View on {platform.title()}",
                "open_in": "external_browser",
                "created_at": datetime.utcnow().isoformat()
            },
            extraction_status="user_provided"
        )
```

---

## Content Type Detection

```python
def detect_content_type(input_item: RawInput) -> str:
    """Determine how to process the input"""
    
    # If it's a URL
    if input_item.input_type == "url" and input_item.source_url:
        platform = detect_platform(input_item.source_url)
        
        if platform == "youtube":
            return "youtube"  # Full extraction
        elif platform == "github":
            return "github"   # Full extraction
        else:
            return "external_link"  # User-provided only
    
    # If it's a file upload
    elif input_item.input_type == "file":
        mime = input_item.mime_type.lower()
        
        if mime.startswith("video/"):
            return "video_upload"
        elif mime.startswith("image/"):
            return "image_upload"
        elif mime == "application/pdf":
            return "pdf_upload"
        else:
            raise UnsupportedFileType(mime)
    
    # If it's raw text
    elif input_item.input_type == "text":
        return "text_input"
    
    raise InvalidInput("Cannot determine content type")


def detect_platform(url: str) -> str:
    """Detect platform from URL"""
    patterns = {
        "youtube": [r"youtube\.com", r"youtu\.be"],
        "github": [r"github\.com/[\w-]+/[\w-]+"],
        "instagram": [r"instagram\.com"],
        "linkedin": [r"linkedin\.com"],
        "tiktok": [r"tiktok\.com", r"vm\.tiktok\.com"],
        "twitter": [r"twitter\.com", r"x\.com"],
        "behance": [r"behance\.net"],
        "dribbble": [r"dribbble\.com"]
    }
    
    for platform, regexes in patterns.items():
        for regex in regexes:
            if re.search(regex, url, re.IGNORECASE):
                return platform
    
    return "other"
```

---

## Batch Processing

```python
async def process_batch(inputs: List[RawInput]) -> List[NormalizedContent]:
    """Process multiple inputs concurrently"""
    
    handlers = {
        "youtube": YouTubeHandler(),
        "github": GitHubHandler(),
        "video_upload": VideoUploadHandler(),
        "image_upload": ImageHandler(),
        "pdf_upload": PDFHandler(),
        "text_input": TextHandler(),
        "external_link": ExternalLinkHandler()
    }
    
    async def process_single(input_item: RawInput) -> NormalizedContent:
        try:
            content_type = detect_content_type(input_item)
            handler = handlers[content_type]
            return await handler.process(input_item)
        except Exception as e:
            return NormalizedContent(
                content_id=generate_id(),
                type="error",
                title=input_item.user_metadata.get("title", "Unknown"),
                extraction_status="failed",
                extraction_errors=[str(e)]
            )
    
    # Process all inputs concurrently
    results = await asyncio.gather(*[
        process_single(item) for item in inputs
    ])
    
    return results
```

---

## Storage Integration

```python
STORAGE_CONFIG = {
    "bucket": "reshuffle-portfolio-content",
    "regions": {
        "default": "us-central1",
        "eu": "europe-west1"
    },
    "paths": {
        "video": "videos/{user_id}/{content_id}.{ext}",
        "image": "images/{user_id}/{content_id}.{ext}",
        "pdf": "documents/{user_id}/{content_id}.pdf",
        "thumbnail": "thumbnails/{user_id}/{content_id}.jpg"
    },
    "limits": {
        "video_max_mb": 500,
        "image_max_mb": 20,
        "pdf_max_mb": 50
    }
}

async def upload_to_storage(
    file_data: bytes,
    content_type: str,
    user_id: str = None,
    optimize: bool = False
) -> str:
    """Upload file to cloud storage"""
    
    content_id = generate_id()
    path = STORAGE_CONFIG["paths"][content_type].format(
        user_id=user_id or "anonymous",
        content_id=content_id,
        ext=get_extension(file_data)
    )
    
    # Optimize if requested (images)
    if optimize and content_type == "image":
        file_data = optimize_image(file_data)
    
    # Upload to Firebase Storage
    blob = storage_bucket.blob(path)
    blob.upload_from_string(file_data)
    blob.make_public()
    
    return blob.public_url
```

---

## Error Handling

```python
class ContentIngestionError(Exception):
    """Base exception for content ingestion"""
    pass

class UnsupportedFileType(ContentIngestionError):
    """File type not supported"""
    pass

class FileTooLarge(ContentIngestionError):
    """File exceeds size limit"""
    pass

class ExtractionFailed(ContentIngestionError):
    """Metadata extraction failed"""
    pass

class ValidationError(ContentIngestionError):
    """Input validation failed (e.g., missing required title for social links)"""
    pass

class InvalidURL(ContentIngestionError):
    """URL format invalid or unreachable"""
    pass
```

---

## Summary

| Input | Handler | Extraction | User Input Required |
|-------|---------|------------|---------------------|
| YouTube URL | YouTubeHandler | Full (API) | None |
| GitHub URL | GitHubHandler | Full (API) | None |
| Video Upload | VideoUploadHandler | Local | Title (optional) |
| Image Upload | ImageHandler | Local | Title (optional) |
| PDF Upload | PDFHandler | Local | Title (optional) |
| Plain Text | TextHandler | N/A | Title (optional) |
| Instagram/LinkedIn/TikTok | ExternalLinkHandler | None | **Title required** |
