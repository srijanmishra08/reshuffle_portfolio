/**
 * Text Handler
 * Processes plain text input
 * Based on 07_CONTENT_INGESTION.md
 */

import type { NormalizedContent, UserMetadata } from '../../types/index.js';
import { generateContentId, now, wordCount, truncate } from '../../utils/index.js';

const MAX_TEXT_LENGTH = 50000; // 50K characters

/**
 * Classify the type of text content based on keywords and structure
 */
function classifyTextType(text: string, title: string): 'bio' | 'intro' | 'about' | 'testimonial' | 'description' | 'general' {
  const lowerText = text.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  // Check title first
  if (lowerTitle.includes('bio') || lowerTitle.includes('about me')) return 'bio';
  if (lowerTitle.includes('intro') || lowerTitle.includes('introduction')) return 'intro';
  if (lowerTitle.includes('about')) return 'about';
  if (lowerTitle.includes('testimonial') || lowerTitle.includes('review')) return 'testimonial';
  
  // Check content patterns
  const bioPatterns = ['i am', "i'm", 'my name is', 'i have been', 'years of experience', 'passionate about'];
  const testimonialPatterns = ['worked with', 'highly recommend', 'great experience', 'excellent', 'professional'];
  const introPatterns = ['hi', 'hello', 'welcome', 'nice to meet'];
  
  let bioScore = 0;
  let testimonialScore = 0;
  let introScore = 0;
  
  for (const pattern of bioPatterns) {
    if (lowerText.includes(pattern)) bioScore++;
  }
  
  for (const pattern of testimonialPatterns) {
    if (lowerText.includes(pattern)) testimonialScore++;
  }
  
  for (const pattern of introPatterns) {
    if (lowerText.startsWith(pattern)) introScore += 2;
  }
  
  // First person = likely bio/intro
  const firstPersonCount = (lowerText.match(/\b(i|my|me|i'm|i've|i'll)\b/g) || []).length;
  if (firstPersonCount > 3) bioScore += 2;
  
  if (bioScore >= 2) return 'bio';
  if (introScore >= 2) return 'intro';
  if (testimonialScore >= 2) return 'testimonial';
  
  // Short text with first person is likely intro
  if (text.length < 500 && firstPersonCount > 0) return 'intro';
  
  // Longer text with first person is likely about/bio
  if (text.length >= 500 && firstPersonCount > 2) return 'about';
  
  return 'general';
}

/**
 * Extract key phrases from text for tagging
 */
function extractKeyPhrases(text: string): string[] {
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Common skill/role patterns
  const rolePatterns = [
    'developer', 'designer', 'engineer', 'manager', 'consultant',
    'founder', 'ceo', 'cto', 'freelancer', 'creator', 'artist',
    'writer', 'photographer', 'marketer', 'analyst'
  ];
  
  for (const role of rolePatterns) {
    if (lowerText.includes(role)) {
      keywords.push(role);
    }
  }
  
  // Tech stack patterns
  const techPatterns = [
    'javascript', 'typescript', 'python', 'react', 'node', 'swift',
    'ios', 'android', 'web', 'mobile', 'ai', 'machine learning',
    'data', 'cloud', 'aws', 'design', 'ui', 'ux'
  ];
  
  for (const tech of techPatterns) {
    if (lowerText.includes(tech)) {
      keywords.push(tech);
    }
  }
  
  return [...new Set(keywords)].slice(0, 10);
}

export function processTextInput(
  text: string,
  userMetadata?: UserMetadata
): NormalizedContent {
  // Validate and truncate
  let processedText = text.trim();
  if (processedText.length > MAX_TEXT_LENGTH) {
    processedText = processedText.substring(0, MAX_TEXT_LENGTH);
  }

  if (processedText.length === 0) {
    throw new Error('Text content cannot be empty');
  }

  // Generate title from first line if not provided
  let title = userMetadata?.title || '';
  if (!title) {
    const firstLine = processedText.split('\n')[0].trim();
    title = truncate(firstLine, 100) || 'Text Content';
  }

  // Classify text type
  const textType = classifyTextType(processedText, title);
  
  // Extract key phrases for tagging
  const tags = userMetadata?.tags || extractKeyPhrases(processedText);

  // Generate description from content if not provided
  let description = userMetadata?.description || '';
  if (!description) {
    description = truncate(processedText, 200);
  }

  return {
    content_id: generateContentId(),
    type: 'text',
    source: 'input',
    title,
    description,
    extracted_data: {
      extracted_text: processedText,
      word_count: wordCount(processedText),
      text_type: textType,
      tags
    },
    created_at: now()
  };
}
