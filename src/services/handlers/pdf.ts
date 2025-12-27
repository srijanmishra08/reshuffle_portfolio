/**
 * PDF Handler
 * Processes uploaded PDF files with text extraction and thumbnail generation
 * Based on 07_CONTENT_INGESTION.md
 */

// @ts-ignore - pdf-parse doesn't have types
import pdfParse from 'pdf-parse';
import type { NormalizedContent, PDFMetadata, FileInput, UserMetadata } from '../../types/index.js';
import { generateContentId, now, wordCount } from '../../utils/index.js';
import { saveFile } from '../storage.js';

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_TEXT_LENGTH = 50000; // 50K characters

export async function extractPDFMetadata(buffer: Buffer): Promise<PDFMetadata> {
  try {
    const data = await pdfParse(buffer);
    
    let textContent = data.text || '';
    
    // Truncate if too long
    if (textContent.length > MAX_TEXT_LENGTH) {
      textContent = textContent.substring(0, MAX_TEXT_LENGTH) + '...';
    }
    
    return {
      page_count: data.numpages || 1,
      text_content: textContent,
      word_count: wordCount(textContent)
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      page_count: 1,
      text_content: '',
      word_count: 0
    };
  }
}

/**
 * Detect if PDF content looks like a resume/CV
 */
function isResumePDF(text: string, filename: string): boolean {
  const resumeKeywords = [
    'resume', 'cv', 'curriculum vitae', 'experience', 'education',
    'skills', 'work history', 'employment', 'objective', 'summary',
    'qualifications', 'certifications'
  ];
  
  const lowerText = text.toLowerCase();
  const lowerFilename = filename.toLowerCase();
  
  // Check filename
  if (lowerFilename.includes('resume') || lowerFilename.includes('cv')) {
    return true;
  }
  
  // Check content - need at least 3 matches
  let matchCount = 0;
  for (const keyword of resumeKeywords) {
    if (lowerText.includes(keyword)) {
      matchCount++;
    }
  }
  
  return matchCount >= 3;
}

/**
 * Extract structured data from resume text
 */
function extractResumeData(text: string): {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  skills: string[];
  summary?: string;
} {
  const result: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    skills: string[];
    summary?: string;
  } = { skills: [] };
  
  // Extract email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  if (emailMatch) {
    result.email = emailMatch[0];
  }
  
  // Extract phone
  const phoneMatch = text.match(/(\+?\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0];
  }
  
  // Extract LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) {
    result.linkedin = `https://${linkedinMatch[0]}`;
  }
  
  // Extract GitHub
  const githubMatch = text.match(/github\.com\/[\w-]+/i);
  if (githubMatch) {
    result.github = `https://${githubMatch[0]}`;
  }
  
  // Try to extract name (usually first line or near the top)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    // First non-empty line that looks like a name (2-4 words, no special chars)
    for (const line of lines.slice(0, 5)) {
      const cleaned = line.replace(/[^a-zA-Z\s]/g, '').trim();
      const words = cleaned.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && words.every(w => w.length >= 2)) {
        result.name = cleaned;
        break;
      }
    }
  }
  
  // Extract skills (common section)
  const skillsMatch = text.match(/skills[:\s]*(.*?)(?=\n\n|experience|education|projects|$)/is);
  if (skillsMatch) {
    const skillsText = skillsMatch[1];
    // Split by common delimiters
    let skills = skillsText
      .split(/[,•|\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 50);
    
    // Merge common multi-word terms that may have been split
    const multiWordTerms = [
      'Machine Learning', 'Deep Learning', 'Computer Vision', 'Natural Language Processing',
      'Data Science', 'Web Development', 'iOS Development', 'Cloud Computing',
      'React Native', 'Node.js', 'Vue.js', 'Next.js'
    ];
    
    skills = skills.map(skill => {
      // Check if this skill is part of a multi-word term
      for (const term of multiWordTerms) {
        if (term.toLowerCase().includes(skill.toLowerCase()) && skill.length < term.length) {
          // Check if adjacent skills form the multi-word term
          return skill; // Keep as is for now, we'll merge below
        }
      }
      return skill;
    });
    
    // Filter to keep meaningful skills and merge common pairs
    const mergedSkills: string[] = [];
    for (let i = 0; i < skills.length; i++) {
      const current = skills[i];
      const next = skills[i + 1];
      
      if (next) {
        const combined = `${current} ${next}`;
        const matchingTerm = multiWordTerms.find(t => 
          t.toLowerCase() === combined.toLowerCase()
        );
        if (matchingTerm) {
          mergedSkills.push(matchingTerm);
          i++; // Skip next item
          continue;
        }
      }
      
      // Only add if it's a valid standalone skill (not single short word)
      if (current.length > 2 || /^[A-Z]/.test(current)) {
        mergedSkills.push(current);
      }
    }
    
    result.skills = mergedSkills.slice(0, 20);
  }
  
  // Extract summary/objective
  const summaryMatch = text.match(/(?:summary|objective|about)[:\s]*(.*?)(?=\n\n|experience|education|skills|$)/is);
  if (summaryMatch && summaryMatch[1].length > 20) {
    result.summary = summaryMatch[1].trim().slice(0, 500);
  }
  
  return result;
}

export async function processPdfUpload(
  file: FileInput,
  userMetadata?: UserMetadata
): Promise<NormalizedContent> {
  const { buffer, filename } = file;
  
  // Validate size
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error(`PDF too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024}MB`);
  }

  const contentId = generateContentId();

  // Extract text content
  const pdfInfo = await extractPDFMetadata(buffer);

  // Save PDF
  const filePath = await saveFile(buffer, `documents/${contentId}.pdf`);

  // Detect if this is a resume
  const isResume = isResumePDF(pdfInfo.text_content, filename);
  
  // Extract structured data if it's a resume
  const resumeData = isResume ? extractResumeData(pdfInfo.text_content) : null;

  // Generate first few sentences as description if not provided
  let description = userMetadata?.description || '';
  if (!description && pdfInfo.text_content) {
    if (resumeData?.summary) {
      description = resumeData.summary;
    } else {
      const sentences = pdfInfo.text_content.split(/[.!?]+/).slice(0, 3);
      description = sentences.join('. ').trim();
      if (description.length > 300) {
        description = description.substring(0, 300) + '...';
      }
    }
  }

  // Generate title
  let title = userMetadata?.title || filename.replace(/\.pdf$/i, '');
  if (isResume && resumeData?.name && !userMetadata?.title) {
    title = `${resumeData.name}'s Resume`;
  }

  return {
    content_id: contentId,
    type: 'pdf',
    source: 'upload',
    file_path: filePath,
    title,
    description,
    extracted_data: {
      page_count: pdfInfo.page_count,
      extracted_text: pdfInfo.text_content,
      word_count: pdfInfo.word_count,
      // Resume-specific data
      ...(isResume && resumeData ? {
        is_resume: true,
        contact_email: resumeData.email,
        contact_phone: resumeData.phone,
        linkedin_url: resumeData.linkedin,
        github_url: resumeData.github,
        skills: resumeData.skills,
        person_name: resumeData.name
      } : {})
    },
    created_at: now()
  };
}
