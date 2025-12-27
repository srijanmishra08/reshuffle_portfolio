# 📱 SwiftUI Integration Guide

## Portfolio Engine → ReShuffle iOS App

This document provides a step-by-step guide to integrate the Portfolio Engine backend with your SwiftUI iOS app.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [JSON Schema Summary](#json-schema-summary)
3. [Step 1: Swift Models](#step-1-swift-models)
4. [Step 2: API Service](#step-2-api-service)
5. [Step 3: View Models](#step-3-view-models)
6. [Step 4: SwiftUI Views](#step-4-swiftui-views)
7. [Step 5: Navigation & Gestures](#step-5-navigation--gestures)
8. [Step 6: Media Handling](#step-6-media-handling)
9. [Step 7: Deep Linking](#step-7-deep-linking)
10. [Step 8: Analytics Integration](#step-8-analytics-integration)
11. [Testing Checklist](#testing-checklist)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        iOS App Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Content    │───▶│  Portfolio   │───▶│   Portfolio      │  │
│  │   Upload     │    │   Engine     │    │   JSON Response  │  │
│  │   (Inputs)   │    │   (Backend)  │    │                  │  │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘  │
│                                                    │            │
│                                                    ▼            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    SwiftUI App                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │ Portfolio  │  │   View     │  │    SwiftUI Views   │  │  │
│  │  │  Models    │─▶│   Models   │─▶│  (Reel Experience) │  │  │
│  │  │ (Codable)  │  │ (State)    │  │                    │  │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User uploads content** → Images, videos, PDFs, URLs, text
2. **Backend processes** → Extracts metadata, scores, composes sections
3. **JSON returned** → Structured portfolio with sections & blocks
4. **Swift decodes** → Codable models parse JSON
5. **ViewModel manages** → State, navigation, interactions
6. **SwiftUI renders** → Full-screen reel experience

---

## JSON Schema Summary

### Portfolio Structure

```
Portfolio
├── portfolio_id: String
├── user_id: String
├── category: String (Tech, Design, Finance, etc.)
├── meta
│   ├── title: String
│   ├── subtitle: String
│   ├── created_at: Date
│   └── theme: String
├── sections: [Section]
│   ├── section_id: String (hook, credibility, work, action)
│   ├── order: Int
│   ├── layout: String (full, contained)
│   └── blocks: [Block]
│       ├── block_id: String
│       ├── block_type: String
│       ├── content: BlockContent (varies by type)
│       └── visibility: Visibility
├── navigation
│   ├── quick_nav: [NavItem]
│   └── deep_links: DeepLinkConfig
└── analytics: AnalyticsConfig
```

### Block Types

| Type | Content Fields | Use Case |
|------|---------------|----------|
| `media` | sources, thumbnail, playback | Images, Videos |
| `expandable_text` | preview, full_content, header, tags | Resume, Bio |
| `external_link` | url, platform, preview | GitHub, Work links |
| `gallery` | items, layout | Image collections |
| `cta` | primary_action, secondary_action | Contact buttons |
| `metric` | metrics, layout | Stats display |

---

## Step 1: Swift Models

Create a new group `Models/Portfolio/` in your Xcode project.

### Portfolio.swift

```swift
import Foundation

// MARK: - API Response
struct PortfolioResponse: Codable {
    let success: Bool
    let portfolio: Portfolio
    let processingSummary: ProcessingSummary
    
    enum CodingKeys: String, CodingKey {
        case success, portfolio
        case processingSummary = "processing_summary"
    }
}

struct ProcessingSummary: Codable {
    let totalInputs: Int
    let processed: Int
    let failed: Int
    let sectionsGenerated: Int
    let blocksGenerated: Int
    
    enum CodingKeys: String, CodingKey {
        case totalInputs = "total_inputs"
        case processed, failed
        case sectionsGenerated = "sections_generated"
        case blocksGenerated = "blocks_generated"
    }
}

// MARK: - Portfolio
struct Portfolio: Codable, Identifiable {
    let portfolioId: String
    let userId: String
    let category: String
    let version: String
    let meta: PortfolioMeta
    let sections: [Section]
    let navigation: Navigation
    let analytics: AnalyticsConfig
    
    var id: String { portfolioId }
    
    enum CodingKeys: String, CodingKey {
        case portfolioId = "portfolio_id"
        case userId = "user_id"
        case category, version, meta, sections, navigation, analytics
    }
}

struct PortfolioMeta: Codable {
    let title: String
    let subtitle: String
    let createdAt: String
    let updatedAt: String
    let language: String
    let theme: String
    
    enum CodingKeys: String, CodingKey {
        case title, subtitle
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case language, theme
    }
}
```

### Section.swift

```swift
import Foundation

struct Section: Codable, Identifiable {
    let sectionId: String
    let order: Int
    let layout: SectionLayout
    let visibility: SectionVisibility
    let blocks: [Block]
    
    var id: String { sectionId }
    
    enum CodingKeys: String, CodingKey {
        case sectionId = "section_id"
        case order, layout, visibility, blocks
    }
}

enum SectionLayout: String, Codable {
    case full
    case contained
}

struct SectionVisibility: Codable {
    let initial: String
    let minContentRequired: Int
    
    enum CodingKeys: String, CodingKey {
        case initial
        case minContentRequired = "min_content_required"
    }
}
```

### Block.swift

```swift
import Foundation

struct Block: Codable, Identifiable {
    let blockId: String
    let blockType: BlockType
    let content: BlockContent
    let visibility: BlockVisibility
    let style: BlockStyle
    
    var id: String { blockId }
    
    enum CodingKeys: String, CodingKey {
        case blockId = "block_id"
        case blockType = "block_type"
        case content, visibility, style
    }
}

enum BlockType: String, Codable {
    case media
    case expandableText = "expandable_text"
    case externalLink = "external_link"
    case gallery
    case cta
    case metric
    case timeline
    case comparison
    case scrollContainer = "scroll_container"
    case hotspotMedia = "hotspot_media"
}

struct BlockVisibility: Codable {
    let initial: String
    let priority: String
}

struct BlockStyle: Codable {
    let padding: String
}
```

### BlockContent.swift

```swift
import Foundation

// MARK: - Block Content (polymorphic)
struct BlockContent: Codable {
    // Media Block
    var mediaType: String?
    var sources: [MediaSource]?
    var thumbnail: MediaThumbnail?
    var altText: String?
    var caption: String?
    var playback: PlaybackConfig?
    var aspectRatio: String?
    
    // Expandable Text Block
    var preview: TextPreview?
    var fullContent: FullContent?
    var header: String?
    var tags: [String]?
    
    // External Link Block
    var url: String?
    var platform: String?
    var linkPreview: LinkPreview?
    var linkStyle: String?
    var openIn: String?
    
    // Gallery Block
    var items: [GalleryItem]?
    var layout: GalleryLayout?
    var lightbox: LightboxConfig?
    
    // CTA Block
    var primaryAction: CTAAction?
    var secondaryAction: CTAAction?
    var urgencyText: String?
    
    // Metric Block
    var metrics: [Metric]?
    var metricLayout: String?
    var metricStyle: String?
    
    enum CodingKeys: String, CodingKey {
        case mediaType = "media_type"
        case sources, thumbnail
        case altText = "alt_text"
        case caption, playback
        case aspectRatio = "aspect_ratio"
        case preview
        case fullContent = "full_content"
        case header, tags
        case url, platform
        case linkPreview = "preview"
        case linkStyle = "style"
        case openIn = "open_in"
        case items, layout, lightbox
        case primaryAction = "primary_action"
        case secondaryAction = "secondary_action"
        case urgencyText = "urgency_text"
        case metrics
        case metricLayout, metricStyle
    }
}

// MARK: - Media Types
struct MediaSource: Codable {
    let url: String
    let quality: String
    let mimeType: String
    
    enum CodingKeys: String, CodingKey {
        case url, quality
        case mimeType = "mime_type"
    }
}

struct MediaThumbnail: Codable {
    let url: String
    let blurhash: String?
}

struct PlaybackConfig: Codable {
    let autoplay: Bool
    let loop: Bool
    let muted: Bool
    let controls: Bool
}

// MARK: - Text Types
struct TextPreview: Codable {
    let text: String
    let maxLines: Int
    
    enum CodingKeys: String, CodingKey {
        case text
        case maxLines = "max_lines"
    }
}

struct FullContent: Codable {
    let text: String
    let format: String
}

// MARK: - Link Types
struct LinkPreview: Codable {
    let title: String
    let description: String
    let thumbnailUrl: String?
    let faviconUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case title, description
        case thumbnailUrl = "thumbnail_url"
        case faviconUrl = "favicon_url"
    }
}

// MARK: - Gallery Types
struct GalleryItem: Codable {
    let url: String
    let thumbnailUrl: String
    let caption: String?
    let mediaType: String
    
    enum CodingKeys: String, CodingKey {
        case url
        case thumbnailUrl = "thumbnail_url"
        case caption
        case mediaType = "media_type"
    }
}

struct GalleryLayout: Codable {
    let type: String
    let columns: Int
}

struct LightboxConfig: Codable {
    let enabled: Bool
    let showCaptions: Bool
    
    enum CodingKeys: String, CodingKey {
        case enabled
        case showCaptions = "show_captions"
    }
}

// MARK: - CTA Types
struct CTAAction: Codable {
    let label: String
    let actionType: String
    let payload: [String: String]?
    let style: String?
    
    enum CodingKeys: String, CodingKey {
        case label
        case actionType = "action_type"
        case payload, style
    }
    
    // Custom decoding for flexible payload
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        label = try container.decode(String.self, forKey: .label)
        actionType = try container.decode(String.self, forKey: .actionType)
        style = try container.decodeIfPresent(String.self, forKey: .style)
        
        // Handle flexible payload
        if let payloadDict = try? container.decode([String: String].self, forKey: .payload) {
            payload = payloadDict
        } else {
            payload = nil
        }
    }
}

// MARK: - Metric Types
struct Metric: Codable {
    let label: String
    let value: String
    let unit: String?
    let trend: MetricTrend?
}

struct MetricTrend: Codable {
    let direction: String
    let percentage: Double
}
```

### Navigation.swift

```swift
import Foundation

struct Navigation: Codable {
    let anchors: [String: String]
    let deepLinks: DeepLinkConfig
    let statePreservation: StatePreservation
    let quickNav: QuickNav
    
    enum CodingKeys: String, CodingKey {
        case anchors
        case deepLinks = "deep_links"
        case statePreservation = "state_preservation"
        case quickNav = "quick_nav"
    }
}

struct DeepLinkConfig: Codable {
    let enabled: Bool
    let baseUrl: String
    let sectionFormat: String
    let blockFormat: String
    
    enum CodingKeys: String, CodingKey {
        case enabled
        case baseUrl = "base_url"
        case sectionFormat = "section_format"
        case blockFormat = "block_format"
    }
}

struct StatePreservation: Codable {
    let enabled: Bool
    let restoreScrollPosition: Bool
    let restoreExpandedState: Bool
    
    enum CodingKeys: String, CodingKey {
        case enabled
        case restoreScrollPosition = "restore_scroll_position"
        case restoreExpandedState = "restore_expanded_state"
    }
}

struct QuickNav: Codable {
    let enabled: Bool
    let items: [QuickNavItem]
}

struct QuickNavItem: Codable, Identifiable {
    let label: String
    let targetSection: String
    let icon: String
    
    var id: String { targetSection }
    
    enum CodingKeys: String, CodingKey {
        case label
        case targetSection = "target_section"
        case icon
    }
}

struct AnalyticsConfig: Codable {
    let enabled: Bool
    let trackEvents: [String]
    
    enum CodingKeys: String, CodingKey {
        case enabled
        case trackEvents = "track_events"
    }
}
```

---

## Step 2: API Service

Create `Services/PortfolioService.swift`:

```swift
import Foundation

enum PortfolioError: Error, LocalizedError {
    case invalidURL
    case networkError(Error)
    case decodingError(Error)
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid server URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Failed to parse response: \(error.localizedDescription)"
        case .serverError(let message):
            return message
        }
    }
}

actor PortfolioService {
    static let shared = PortfolioService()
    
    // MARK: - Configuration
    private let baseURL: String
    private let session: URLSession
    
    init(baseURL: String = "http://localhost:3000/api") {
        self.baseURL = baseURL
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Generate Portfolio
    func generatePortfolio(
        userId: String,
        title: String,
        subtitle: String,
        category: String,
        inputs: [ContentInput]
    ) async throws -> PortfolioResponse {
        guard let url = URL(string: "\(baseURL)/portfolios/generate") else {
            throw PortfolioError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = GeneratePortfolioRequest(
            userId: userId,
            title: title,
            subtitle: subtitle,
            category: category,
            inputs: inputs
        )
        
        request.httpBody = try JSONEncoder().encode(body)
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw PortfolioError.networkError(NSError(domain: "", code: -1))
            }
            
            if httpResponse.statusCode != 200 {
                if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    throw PortfolioError.serverError(errorResponse.message)
                }
                throw PortfolioError.serverError("Server returned status \(httpResponse.statusCode)")
            }
            
            let decoder = JSONDecoder()
            return try decoder.decode(PortfolioResponse.self, from: data)
        } catch let error as PortfolioError {
            throw error
        } catch let error as DecodingError {
            throw PortfolioError.decodingError(error)
        } catch {
            throw PortfolioError.networkError(error)
        }
    }
    
    // MARK: - Upload File
    func uploadFile(
        data: Data,
        filename: String,
        mimeType: String
    ) async throws -> UploadResponse {
        guard let url = URL(string: "\(baseURL)/content/upload") else {
            throw PortfolioError.invalidURL
        }
        
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        let (responseData, _) = try await session.data(for: request)
        return try JSONDecoder().decode(UploadResponse.self, from: responseData)
    }
}

// MARK: - Request/Response Types
struct GeneratePortfolioRequest: Codable {
    let userId: String
    let title: String
    let subtitle: String
    let category: String
    let inputs: [ContentInput]
    
    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case title, subtitle, category, inputs
    }
}

struct ContentInput: Codable {
    let type: String          // "url", "file", "text"
    let url: String?          // For URL inputs
    let filePath: String?     // For uploaded files
    let text: String?         // For text inputs
    let title: String?        // Optional user-provided title
    let description: String?  // Optional description
    
    enum CodingKeys: String, CodingKey {
        case type, url
        case filePath = "file_path"
        case text, title, description
    }
}

struct UploadResponse: Codable {
    let success: Bool
    let filePath: String
    let contentId: String
    
    enum CodingKeys: String, CodingKey {
        case success
        case filePath = "file_path"
        case contentId = "content_id"
    }
}

struct ErrorResponse: Codable {
    let error: String
    let message: String
}
```

---

## Step 3: View Models

Create `ViewModels/PortfolioViewModel.swift`:

```swift
import SwiftUI
import Combine

@MainActor
class PortfolioViewModel: ObservableObject {
    // MARK: - Published State
    @Published var portfolio: Portfolio?
    @Published var currentSectionIndex: Int = 0
    @Published var isLoading: Bool = false
    @Published var error: PortfolioError?
    @Published var expandedBlockId: String?
    
    // MARK: - Computed Properties
    var currentSection: Section? {
        guard let portfolio = portfolio,
              currentSectionIndex < portfolio.sections.count else {
            return nil
        }
        return portfolio.sections[currentSectionIndex]
    }
    
    var totalSections: Int {
        portfolio?.sections.count ?? 0
    }
    
    var progress: Double {
        guard totalSections > 0 else { return 0 }
        return Double(currentSectionIndex + 1) / Double(totalSections)
    }
    
    // MARK: - Navigation
    func nextSection() {
        guard currentSectionIndex < totalSections - 1 else { return }
        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
            currentSectionIndex += 1
        }
        trackSectionView()
    }
    
    func previousSection() {
        guard currentSectionIndex > 0 else { return }
        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
            currentSectionIndex -= 1
        }
        trackSectionView()
    }
    
    func goToSection(_ index: Int) {
        guard index >= 0 && index < totalSections else { return }
        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
            currentSectionIndex = index
        }
        trackSectionView()
    }
    
    func goToSection(id: String) {
        guard let index = portfolio?.sections.firstIndex(where: { $0.sectionId == id }) else {
            return
        }
        goToSection(index)
    }
    
    // MARK: - Block Interaction
    func toggleBlockExpansion(_ blockId: String) {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            if expandedBlockId == blockId {
                expandedBlockId = nil
            } else {
                expandedBlockId = blockId
            }
        }
        trackBlockInteraction(blockId: blockId, action: "expand_toggle")
    }
    
    // MARK: - Data Loading
    func loadPortfolio(_ portfolioResponse: PortfolioResponse) {
        self.portfolio = portfolioResponse.portfolio
        self.currentSectionIndex = 0
        trackPortfolioView()
    }
    
    // MARK: - Analytics
    private func trackPortfolioView() {
        guard let portfolio = portfolio,
              portfolio.analytics.enabled else { return }
        // Implement analytics tracking
        print("📊 Analytics: portfolio_view - \(portfolio.portfolioId)")
    }
    
    private func trackSectionView() {
        guard let portfolio = portfolio,
              portfolio.analytics.enabled,
              let section = currentSection else { return }
        print("📊 Analytics: section_view - \(section.sectionId)")
    }
    
    private func trackBlockInteraction(blockId: String, action: String) {
        guard let portfolio = portfolio,
              portfolio.analytics.enabled else { return }
        print("📊 Analytics: block_interaction - \(blockId) - \(action)")
    }
}
```

---

## Step 4: SwiftUI Views

### PortfolioReelView.swift (Main Container)

```swift
import SwiftUI

struct PortfolioReelView: View {
    @StateObject private var viewModel = PortfolioViewModel()
    let portfolioResponse: PortfolioResponse
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background
                Color.black.ignoresSafeArea()
                
                // Sections
                if let portfolio = viewModel.portfolio {
                    TabView(selection: $viewModel.currentSectionIndex) {
                        ForEach(Array(portfolio.sections.enumerated()), id: \.element.id) { index, section in
                            SectionView(
                                section: section,
                                viewModel: viewModel
                            )
                            .tag(index)
                        }
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                    .ignoresSafeArea()
                    
                    // Overlay UI
                    VStack {
                        // Progress bar
                        ProgressBarView(
                            current: viewModel.currentSectionIndex,
                            total: viewModel.totalSections
                        )
                        .padding(.horizontal, 16)
                        .padding(.top, 50)
                        
                        // Header
                        HeaderView(portfolio: portfolio)
                            .padding(.horizontal, 16)
                        
                        Spacer()
                        
                        // Quick nav
                        if portfolio.navigation.quickNav.enabled {
                            QuickNavView(
                                items: portfolio.navigation.quickNav.items,
                                currentSection: portfolio.sections[viewModel.currentSectionIndex].sectionId,
                                onSelect: { viewModel.goToSection(id: $0) }
                            )
                            .padding(.horizontal, 16)
                            .padding(.bottom, 34)
                        }
                    }
                }
            }
            // Tap zones for navigation
            .overlay(
                HStack(spacing: 0) {
                    // Left tap - previous
                    Color.clear
                        .contentShape(Rectangle())
                        .onTapGesture { viewModel.previousSection() }
                        .frame(width: geometry.size.width * 0.3)
                    
                    Spacer()
                    
                    // Right tap - next
                    Color.clear
                        .contentShape(Rectangle())
                        .onTapGesture { viewModel.nextSection() }
                        .frame(width: geometry.size.width * 0.3)
                }
                .padding(.top, 120)
                .padding(.bottom, 100)
            )
        }
        .onAppear {
            viewModel.loadPortfolio(portfolioResponse)
        }
    }
}
```

### SectionView.swift

```swift
import SwiftUI

struct SectionView: View {
    let section: Section
    @ObservedObject var viewModel: PortfolioViewModel
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Section title for non-hook sections
                if section.sectionId != "hook" {
                    Text(sectionTitle)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.purple, .blue],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 16)
                }
                
                // Blocks
                ForEach(section.blocks) { block in
                    BlockView(
                        block: block,
                        isExpanded: viewModel.expandedBlockId == block.blockId,
                        onTap: { viewModel.toggleBlockExpansion(block.blockId) }
                    )
                    .padding(.horizontal, 16)
                }
            }
            .padding(.top, section.sectionId == "hook" ? 120 : 80)
            .padding(.bottom, 120)
        }
        .scrollIndicators(.hidden)
    }
    
    private var sectionTitle: String {
        switch section.sectionId {
        case "hook": return ""
        case "credibility": return "About & Links"
        case "work": return "My Work"
        case "action": return "Let's Connect"
        default: return section.sectionId.capitalized
        }
    }
}
```

### BlockView.swift

```swift
import SwiftUI

struct BlockView: View {
    let block: Block
    let isExpanded: Bool
    let onTap: () -> Void
    
    var body: some View {
        Group {
            switch block.blockType {
            case .media:
                MediaBlockView(content: block.content)
            case .expandableText:
                ExpandableTextBlockView(
                    content: block.content,
                    isExpanded: isExpanded,
                    onTap: onTap
                )
            case .externalLink:
                ExternalLinkBlockView(content: block.content)
            case .gallery:
                GalleryBlockView(content: block.content)
            case .cta:
                CTABlockView(content: block.content)
            case .metric:
                MetricBlockView(content: block.content)
            default:
                EmptyView()
            }
        }
    }
}
```

### Individual Block Views

#### MediaBlockView.swift

```swift
import SwiftUI
import AVKit

struct MediaBlockView: View {
    let content: BlockContent
    @State private var isMuted = true
    
    var body: some View {
        Group {
            if content.mediaType == "video" {
                VideoPlayerView(
                    url: URL(string: content.sources?.first?.url ?? ""),
                    isMuted: $isMuted,
                    autoplay: content.playback?.autoplay ?? true,
                    loop: content.playback?.loop ?? true
                )
            } else {
                AsyncImage(url: URL(string: content.sources?.first?.url ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay(ProgressView())
                }
            }
        }
        .aspectRatio(16/9, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}

struct VideoPlayerView: View {
    let url: URL?
    @Binding var isMuted: Bool
    let autoplay: Bool
    let loop: Bool
    
    @State private var player: AVPlayer?
    
    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if let player = player {
                VideoPlayer(player: player)
                    .onAppear {
                        player.isMuted = isMuted
                        if autoplay { player.play() }
                    }
            }
            
            // Mute button
            Button {
                isMuted.toggle()
                player?.isMuted = isMuted
            } label: {
                Image(systemName: isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                    .foregroundColor(.white)
                    .padding(10)
                    .background(Color.black.opacity(0.6))
                    .clipShape(Circle())
            }
            .padding(12)
        }
        .onAppear {
            if let url = url {
                player = AVPlayer(url: url)
                if loop {
                    NotificationCenter.default.addObserver(
                        forName: .AVPlayerItemDidPlayToEndTime,
                        object: player?.currentItem,
                        queue: .main
                    ) { _ in
                        player?.seek(to: .zero)
                        player?.play()
                    }
                }
            }
        }
    }
}
```

#### ExpandableTextBlockView.swift

```swift
import SwiftUI

struct ExpandableTextBlockView: View {
    let content: BlockContent
    let isExpanded: Bool
    let onTap: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header row
            HStack(spacing: 12) {
                // Icon
                RoundedRectangle(cornerRadius: 12)
                    .fill(LinearGradient(
                        colors: [.purple, .blue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "doc.text.fill")
                            .foregroundColor(.white)
                    )
                
                // Title
                Text(content.header ?? "Details")
                    .font(.headline)
                    .foregroundColor(.white)
                
                Spacer()
            }
            
            // Content text
            Text(isExpanded ? (content.fullContent?.text ?? "") : (content.preview?.text ?? ""))
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.7))
                .lineLimit(isExpanded ? nil : 3)
            
            // Tags
            if let tags = content.tags, !tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(tags, id: \.self) { tag in
                            Text(tag)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.blue)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.blue.opacity(0.2))
                                .clipShape(Capsule())
                        }
                    }
                }
            }
            
            // Expand hint
            if !isExpanded {
                HStack {
                    Spacer()
                    Label("Tap to expand", systemImage: "arrow.up.and.down")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                    Spacer()
                }
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        )
        .onTapGesture(perform: onTap)
    }
}
```

#### ExternalLinkBlockView.swift

```swift
import SwiftUI

struct ExternalLinkBlockView: View {
    let content: BlockContent
    @Environment(\.openURL) private var openURL
    
    var body: some View {
        Button {
            if let urlString = content.url,
               let url = URL(string: urlString) {
                openURL(url)
            }
        } label: {
            HStack(spacing: 14) {
                // Avatar/Icon
                if let thumbnailUrl = content.linkPreview?.thumbnailUrl,
                   let url = URL(string: thumbnailUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        platformIcon
                    }
                    .frame(width: 50, height: 50)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                } else {
                    platformIcon
                        .frame(width: 50, height: 50)
                }
                
                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(content.linkPreview?.title ?? "Link")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                    
                    if let description = content.linkPreview?.description,
                       !description.isEmpty {
                        Text(description)
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
                
                Spacer()
                
                // Platform icon
                Text(platformEmoji)
                    .font(.title3)
                
                // Arrow
                Image(systemName: "chevron.right")
                    .foregroundColor(.white.opacity(0.4))
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.08))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }
    
    @ViewBuilder
    private var platformIcon: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(platformGradient)
            .overlay(
                Image(systemName: platformSystemIcon)
                    .foregroundColor(.white)
            )
    }
    
    private var platformEmoji: String {
        switch content.platform {
        case "github": return "🐙"
        case "linkedin": return "💼"
        case "instagram": return "📷"
        case "twitter": return "🐦"
        default: return "🔗"
        }
    }
    
    private var platformSystemIcon: String {
        switch content.platform {
        case "github": return "chevron.left.forwardslash.chevron.right"
        case "linkedin": return "briefcase.fill"
        default: return "link"
        }
    }
    
    private var platformGradient: LinearGradient {
        switch content.platform {
        case "github":
            return LinearGradient(colors: [.gray, .black], startPoint: .topLeading, endPoint: .bottomTrailing)
        case "linkedin":
            return LinearGradient(colors: [.blue, .cyan], startPoint: .topLeading, endPoint: .bottomTrailing)
        default:
            return LinearGradient(colors: [.purple, .blue], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }
}
```

#### CTABlockView.swift

```swift
import SwiftUI

struct CTABlockView: View {
    let content: BlockContent
    
    var body: some View {
        VStack(spacing: 16) {
            // Primary action
            if let primary = content.primaryAction {
                Button {
                    handleAction(primary)
                } label: {
                    HStack {
                        Image(systemName: actionIcon(primary.actionType))
                        Text(primary.label)
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        LinearGradient(
                            colors: [.purple, .blue],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: .purple.opacity(0.4), radius: 20, y: 10)
                }
            }
            
            // Secondary action
            if let secondary = content.secondaryAction {
                Button {
                    handleAction(secondary)
                } label: {
                    HStack {
                        Image(systemName: actionIcon(secondary.actionType))
                        Text(secondary.label)
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )
                }
            }
        }
        .padding(20)
    }
    
    private func actionIcon(_ actionType: String) -> String {
        switch actionType {
        case "open_chat": return "message.fill"
        case "save_card": return "square.and.arrow.down"
        case "call": return "phone.fill"
        case "email": return "envelope.fill"
        default: return "hand.tap.fill"
        }
    }
    
    private func handleAction(_ action: CTAAction) {
        switch action.actionType {
        case "open_chat":
            // Navigate to chat with user
            if let userId = action.payload?["user_id"] {
                print("Opening chat with: \(userId)")
                // Implement navigation to chat
            }
        case "save_card":
            // Save card functionality
            print("Saving card...")
            // Implement save functionality
        default:
            break
        }
    }
}
```

---

## Step 5: Navigation & Gestures

### ProgressBarView.swift

```swift
import SwiftUI

struct ProgressBarView: View {
    let current: Int
    let total: Int
    
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<total, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(index <= current ? Color.white : Color.white.opacity(0.3))
                    .frame(height: 3)
                    .animation(.easeInOut(duration: 0.2), value: current)
            }
        }
    }
}
```

### QuickNavView.swift

```swift
import SwiftUI

struct QuickNavView: View {
    let items: [QuickNavItem]
    let currentSection: String
    let onSelect: (String) -> Void
    
    var body: some View {
        HStack(spacing: 8) {
            ForEach(items) { item in
                Button {
                    onSelect(item.targetSection)
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: item.icon)
                            .font(.system(size: 20))
                        Text(item.label)
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundColor(currentSection == item.targetSection ? .white : .white.opacity(0.6))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        currentSection == item.targetSection
                            ? Color.white.opacity(0.1)
                            : Color.clear
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .padding(8)
        .background(
            RoundedRectangle(cornerRadius: 30)
                .fill(Color.black.opacity(0.7))
                .background(
                    RoundedRectangle(cornerRadius: 30)
                        .fill(.ultraThinMaterial)
                )
        )
    }
}
```

### HeaderView.swift

```swift
import SwiftUI

struct HeaderView: View {
    let portfolio: Portfolio
    
    var body: some View {
        HStack(spacing: 12) {
            // Avatar placeholder
            Circle()
                .fill(LinearGradient(
                    colors: [.purple, .blue],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(width: 40, height: 40)
                .overlay(
                    Text(String(portfolio.meta.title.prefix(1)).uppercased())
                        .font(.headline)
                        .foregroundColor(.white)
                )
            
            VStack(alignment: .leading, spacing: 2) {
                Text(portfolio.meta.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                
                Text(portfolio.meta.subtitle)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
            }
            
            Spacer()
            
            // Actions
            Button { } label: {
                Image(systemName: "ellipsis")
                    .foregroundColor(.white)
                    .padding(8)
            }
            
            Button { } label: {
                Image(systemName: "xmark")
                    .foregroundColor(.white)
                    .padding(8)
            }
        }
    }
}
```

---

## Step 6: Media Handling

### Server URL Configuration

```swift
// Config.swift
enum Config {
    #if DEBUG
    static let apiBaseURL = "http://localhost:3000/api"
    static let mediaBaseURL = "http://localhost:3000"
    #else
    static let apiBaseURL = "https://your-production-server.com/api"
    static let mediaBaseURL = "https://your-production-server.com"
    #endif
    
    static func mediaURL(for path: String) -> URL? {
        // Convert relative paths to absolute URLs
        if path.starts(with: "http") {
            return URL(string: path)
        }
        return URL(string: "\(mediaBaseURL)\(path)")
    }
}
```

---

## Step 7: Deep Linking

### URL Scheme Setup

1. Add to `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>reshuffle</string>
        </array>
    </dict>
</array>
```

2. Handle in App:
```swift
// App.swift
@main
struct ReShuffleApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    DeepLinkHandler.shared.handle(url)
                }
        }
    }
}

// DeepLinkHandler.swift
class DeepLinkHandler: ObservableObject {
    static let shared = DeepLinkHandler()
    
    @Published var pendingPortfolioId: String?
    @Published var pendingSectionId: String?
    
    func handle(_ url: URL) {
        // reshuffle://portfolio/{portfolio_id}
        // reshuffle://portfolio/{portfolio_id}/{section_id}
        
        guard url.scheme == "reshuffle",
              url.host == "portfolio" else { return }
        
        let pathComponents = url.pathComponents.filter { $0 != "/" }
        
        if pathComponents.count >= 1 {
            pendingPortfolioId = pathComponents[0]
        }
        if pathComponents.count >= 2 {
            pendingSectionId = pathComponents[1]
        }
    }
}
```

---

## Step 8: Analytics Integration

```swift
// PortfolioAnalytics.swift
protocol PortfolioAnalyticsProvider {
    func track(event: String, properties: [String: Any])
}

class PortfolioAnalytics {
    static let shared = PortfolioAnalytics()
    var provider: PortfolioAnalyticsProvider?
    
    func trackPortfolioView(portfolioId: String, category: String) {
        provider?.track(event: "portfolio_view", properties: [
            "portfolio_id": portfolioId,
            "category": category
        ])
    }
    
    func trackSectionView(portfolioId: String, sectionId: String) {
        provider?.track(event: "section_view", properties: [
            "portfolio_id": portfolioId,
            "section_id": sectionId
        ])
    }
    
    func trackBlockInteraction(portfolioId: String, blockId: String, blockType: String, action: String) {
        provider?.track(event: "block_interaction", properties: [
            "portfolio_id": portfolioId,
            "block_id": blockId,
            "block_type": blockType,
            "action": action
        ])
    }
    
    func trackCTAClick(portfolioId: String, actionType: String) {
        provider?.track(event: "cta_click", properties: [
            "portfolio_id": portfolioId,
            "action_type": actionType
        ])
    }
}
```

---

## Testing Checklist

### Backend Connection
- [ ] API endpoint reachable from simulator
- [ ] JSON decoding works for all block types
- [ ] File uploads work (images, videos, PDFs)
- [ ] Error handling displays properly

### UI Rendering
- [ ] All block types render correctly
- [ ] Progress bar updates on section change
- [ ] Quick nav highlights current section
- [ ] Expandable text expands/collapses
- [ ] Videos autoplay and loop
- [ ] External links open correctly

### Navigation
- [ ] Tap left → previous section
- [ ] Tap right → next section
- [ ] Quick nav jumps to sections
- [ ] Swipe gestures work

### Deep Linking
- [ ] URL scheme registered
- [ ] Portfolio opens from link
- [ ] Section navigation from link

### Edge Cases
- [ ] Empty sections handled
- [ ] Missing images show placeholder
- [ ] Network errors show alert
- [ ] Loading states displayed

---

## File Structure Summary

```
ReShuffle/
├── Models/
│   └── Portfolio/
│       ├── Portfolio.swift
│       ├── Section.swift
│       ├── Block.swift
│       ├── BlockContent.swift
│       └── Navigation.swift
├── Services/
│   ├── PortfolioService.swift
│   └── DeepLinkHandler.swift
├── ViewModels/
│   └── PortfolioViewModel.swift
├── Views/
│   └── Portfolio/
│       ├── PortfolioReelView.swift
│       ├── SectionView.swift
│       ├── BlockView.swift
│       ├── Blocks/
│       │   ├── MediaBlockView.swift
│       │   ├── ExpandableTextBlockView.swift
│       │   ├── ExternalLinkBlockView.swift
│       │   ├── GalleryBlockView.swift
│       │   ├── CTABlockView.swift
│       │   └── MetricBlockView.swift
│       └── Components/
│           ├── ProgressBarView.swift
│           ├── QuickNavView.swift
│           └── HeaderView.swift
└── Config/
    └── Config.swift
```

---

## Next Steps

1. **Copy Models** → Create all the Swift model files
2. **Setup API Service** → Configure for your server URL
3. **Build Views** → Start with PortfolioReelView
4. **Test with Mock Data** → Use sample JSON before connecting
5. **Connect Backend** → Point to running server
6. **Iterate UI** → Refine animations and interactions

---

*Last updated: December 26, 2025*
