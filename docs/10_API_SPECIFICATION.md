# API Specification

## Overview

The Portfolio Engine exposes a REST API for portfolio generation and management.

**Base URL:** `https://api.reshuffle.app/portfolio-engine/v1`

---

## Authentication

All endpoints require authentication via Bearer token.

```
Authorization: Bearer <access_token>
```

---

## Endpoints

### 1. Generate Portfolio

Generate a new portfolio from raw content.

**Endpoint:** `POST /portfolios/generate`

**Request:**
```json
{
  "user_id": "u_12345678",
  "category": "Finance",
  "content": [
    {
      "input_type": "url",
      "source_url": "https://youtube.com/watch?v=abc123",
      "user_metadata": {
        "title": "Financial Strategy Talk",
        "description": "Conference presentation"
      }
    },
    {
      "input_type": "file",
      "file_name": "case_study.pdf",
      "mime_type": "application/pdf",
      "file_data": "base64_encoded_content",
      "user_metadata": {
        "title": "Manufacturing Cost Optimization"
      }
    }
  ],
  "options": {
    "force_regenerate": false,
    "include_analytics": true
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "portfolio_id": "p_abc123",
    "status": "complete",
    "portfolio": {
      // Full portfolio JSON (see 01_JSON_SCHEMAS.md)
    },
    "metadata": {
      "generation_time_ms": 2340,
      "content_items_processed": 5,
      "blocks_generated": 8
    }
  }
}
```

**Response (Processing):**
```json
{
  "success": true,
  "data": {
    "portfolio_id": "p_abc123",
    "status": "processing",
    "estimated_completion_seconds": 30,
    "progress": {
      "stage": "content_ingestion",
      "percentage": 45
    }
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CONTENT",
    "message": "At least 2 content items required for portfolio generation",
    "details": {
      "provided": 1,
      "minimum": 2
    }
  }
}
```

---

### 2. Get Portfolio

Retrieve an existing portfolio.

**Endpoint:** `GET /portfolios/{portfolio_id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolio": {
      // Full portfolio JSON
    },
    "metadata": {
      "created_at": "2025-12-23T10:00:00Z",
      "updated_at": "2025-12-23T10:00:00Z",
      "version": 1
    }
  }
}
```

---

### 3. Update Portfolio

Update an existing portfolio with new content.

**Endpoint:** `PUT /portfolios/{portfolio_id}`

**Request:**
```json
{
  "content": [
    // New or updated content items
  ],
  "options": {
    "merge_mode": "replace | append | smart_merge",
    "preserve_customizations": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolio_id": "p_abc123",
    "status": "complete",
    "changes": {
      "blocks_added": 2,
      "blocks_updated": 1,
      "blocks_removed": 0
    }
  }
}
```

---

### 4. Delete Portfolio

Delete a portfolio.

**Endpoint:** `DELETE /portfolios/{portfolio_id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolio_id": "p_abc123",
    "deleted_at": "2025-12-23T10:00:00Z"
  }
}
```

---

### 5. Get Portfolio Status

Check generation status for async operations.

**Endpoint:** `GET /portfolios/{portfolio_id}/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolio_id": "p_abc123",
    "status": "processing | complete | failed",
    "progress": {
      "stage": "content_ingestion | scoring | composition | complete",
      "percentage": 75,
      "current_item": "Processing video 3 of 5"
    },
    "estimated_completion_seconds": 15
  }
}
```

---

### 6. List User Portfolios

Get all portfolios for a user.

**Endpoint:** `GET /users/{user_id}/portfolios`

**Query Parameters:**
- `status` - Filter by status (draft | published)
- `category` - Filter by category
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolios": [
      {
        "portfolio_id": "p_abc123",
        "category": "Finance",
        "status": "published",
        "created_at": "2025-12-23T10:00:00Z",
        "preview": {
          "title": "Vikram Mehta",
          "subtitle": "CFO & Financial Strategist",
          "thumbnail_url": "https://..."
        }
      }
    ],
    "pagination": {
      "total": 3,
      "limit": 20,
      "offset": 0,
      "has_more": false
    }
  }
}
```

---

### 7. Validate Content

Pre-validate content before generation.

**Endpoint:** `POST /portfolios/validate`

**Request:**
```json
{
  "category": "Finance",
  "content": [
    {
      "input_type": "url",
      "source_url": "https://youtube.com/watch?v=abc123"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "items": [
      {
        "index": 0,
        "source_url": "https://youtube.com/watch?v=abc123",
        "status": "valid",
        "detected_type": "video",
        "detected_source": "youtube",
        "estimated_relevance": 0.85
      }
    ],
    "recommendations": {
      "can_generate": true,
      "suggested_additions": [
        "Add credentials or certifications for higher credibility score"
      ]
    }
  }
}
```

---

### 8. Get Categories

List all supported categories with metadata.

**Endpoint:** `GET /categories`

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "Finance",
        "display_name": "Finance & Accounting",
        "description": "CFOs, Financial Advisors, Accountants",
        "icon": "chart.line.uptrend.xyaxis",
        "hook_emphasis": "metrics",
        "suggested_content_types": ["case_studies", "credentials", "metrics"]
      },
      // ... other categories
    ]
  }
}
```

---

### 9. Extract URL Metadata

Extract metadata from a **YouTube or GitHub URL** only. Other URLs return platform detection only.

**Endpoint:** `POST /content/extract`

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=abc123"
}
```

**Response (YouTube/GitHub - Full Extraction):**
```json
{
  "success": true,
  "data": {
    "url": "https://youtube.com/watch?v=abc123",
    "type": "video",
    "source": "youtube",
    "extractable": true,
    "metadata": {
      "title": "Financial Strategy Masterclass",
      "description": "Learn advanced financial strategies...",
      "thumbnail_url": "https://i.ytimg.com/...",
      "duration_seconds": 1234,
      "view_count": 50000,
      "published_at": "2025-01-15T10:00:00Z"
    },
    "extraction_method": "api",
    "extraction_quality": "full"
  }
}
```

**Response (Instagram/LinkedIn/TikTok - No Extraction):**
```json
{
  "success": true,
  "data": {
    "url": "https://instagram.com/p/abc123",
    "type": "external_link",
    "source": "instagram",
    "extractable": false,
    "metadata": null,
    "message": "This platform requires user-provided metadata. Use POST /content/links to add."
  }
}
```

---

### 10. Add External Link

Add a clickable external link (Instagram, LinkedIn, TikTok, etc.) with user-provided metadata.

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
    "description": "Award-winning brand identity project",
    "thumbnail_url": "https://storage.reshuffle.app/thumbs/abc.jpg",
    "display": {
      "icon": "instagram",
      "label": "View on Instagram",
      "open_in": "external_browser"
    }
  }
}
```

**Supported Platforms:**
- `instagram` - Instagram posts, reels, videos
- `linkedin` - LinkedIn posts, articles
- `tiktok` - TikTok videos
- `twitter` - Twitter/X posts
- `behance` - Behance projects
- `dribbble` - Dribbble shots
- `other` - Any other URL

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body |
| `INVALID_CATEGORY` | 400 | Category not supported |
| `INSUFFICIENT_CONTENT` | 400 | Not enough content for generation |
| `MISSING_LINK_TITLE` | 400 | External links require user-provided title |
| `UNAUTHORIZED` | 401 | Invalid or missing auth token |
| `FORBIDDEN` | 403 | User doesn't own this portfolio |
| `NOT_FOUND` | 404 | Portfolio not found |
| `CONTENT_EXTRACTION_FAILED` | 422 | Failed to extract content metadata |
| `URL_NOT_EXTRACTABLE` | 422 | URL platform doesn't support extraction |
| `RATE_LIMITED` | 429 | Too many requests |
| `GENERATION_FAILED` | 500 | Portfolio generation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /portfolios/generate` | 10/hour per user |
| `GET /portfolios/*` | 100/minute per user |
| `POST /content/extract` | 50/hour per user |
| `POST /content/links` | 100/hour per user |

---

## Webhooks

Configure webhooks to receive portfolio generation events.

**Endpoint:** `POST /webhooks`

**Request:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["portfolio.generated", "portfolio.failed"],
  "secret": "your_webhook_secret"
}
```

**Webhook Payload:**
```json
{
  "event": "portfolio.generated",
  "timestamp": "2025-12-23T10:00:00Z",
  "data": {
    "portfolio_id": "p_abc123",
    "user_id": "u_12345",
    "category": "Finance"
  },
  "signature": "sha256=..."
}
```

---

## SDK Examples

### iOS (Swift)

```swift
import Foundation

class PortfolioEngineClient {
    let baseURL = "https://api.reshuffle.app/portfolio-engine/v1"
    let accessToken: String
    
    func generatePortfolio(
        userId: String,
        category: String,
        content: [ContentItem]
    ) async throws -> Portfolio {
        let request = GenerateRequest(
            userId: userId,
            category: category,
            content: content
        )
        
        var urlRequest = URLRequest(url: URL(string: "\(baseURL)/portfolios/generate")!)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, _) = try await URLSession.shared.data(for: urlRequest)
        let response = try JSONDecoder().decode(GenerateResponse.self, from: data)
        
        return response.data.portfolio
    }
}
```

### Android (Kotlin)

```kotlin
import retrofit2.http.*

interface PortfolioEngineApi {
    @POST("portfolios/generate")
    suspend fun generatePortfolio(
        @Header("Authorization") token: String,
        @Body request: GenerateRequest
    ): GenerateResponse
    
    @GET("portfolios/{portfolioId}")
    suspend fun getPortfolio(
        @Header("Authorization") token: String,
        @Path("portfolioId") portfolioId: String
    ): PortfolioResponse
}

// Usage
val api = Retrofit.Builder()
    .baseUrl("https://api.reshuffle.app/portfolio-engine/v1/")
    .addConverterFactory(GsonConverterFactory.create())
    .build()
    .create(PortfolioEngineApi::class.java)

val portfolio = api.generatePortfolio(
    token = "Bearer $accessToken",
    request = GenerateRequest(
        userId = "u_12345",
        category = "Finance",
        content = contentItems
    )
)
```

### Flutter (Dart)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class PortfolioEngineClient {
  final String baseUrl = 'https://api.reshuffle.app/portfolio-engine/v1';
  final String accessToken;
  
  PortfolioEngineClient({required this.accessToken});
  
  Future<Portfolio> generatePortfolio({
    required String userId,
    required String category,
    required List<ContentItem> content,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/portfolios/generate'),
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'user_id': userId,
        'category': category,
        'content': content.map((c) => c.toJson()).toList(),
      }),
    );
    
    if (response.statusCode != 200) {
      throw PortfolioException.fromResponse(response);
    }
    
    final data = jsonDecode(response.body);
    return Portfolio.fromJson(data['data']['portfolio']);
  }
}
```

---

## API Versioning

- Current version: `v1`
- Version is included in URL path
- Breaking changes will increment version
- Old versions supported for 6 months after deprecation
