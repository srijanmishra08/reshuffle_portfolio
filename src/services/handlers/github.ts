/**
 * GitHub Handler
 * Extracts metadata from GitHub repository and user profile URLs
 * Based on 08_URL_PARSING.md
 */

import type { NormalizedContent, GitHubMetadata } from '../../types/index.js';
import { generateContentId } from '../../utils/index.js';
import { extractGitHubRepo } from '../../utils/platform-detection.js';

// Simple in-memory cache
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour

interface GitHubUserProfile {
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitter_username: string | null;
  followers: number;
  following: number;
  public_repos: number;
  avatar_url: string;
  html_url: string;
  hireable: boolean | null;
  created_at: string;
}

interface GitHubRepoSummary {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  fork: boolean;
}

/**
 * Extract GitHub username from URL (for profile URLs)
 */
function extractGitHubUsername(url: string): string | null {
  // Match github.com/username (but not github.com/username/repo)
  const profileMatch = url.match(/github\.com\/([^\/\?#]+)\/?$/);
  if (profileMatch) {
    const username = profileMatch[1];
    // Exclude special pages
    const reserved = ['about', 'pricing', 'features', 'enterprise', 'explore', 'topics', 'collections', 'events', 'sponsors', 'settings', 'notifications'];
    if (!reserved.includes(username.toLowerCase())) {
      return username;
    }
  }
  return null;
}

/**
 * Detect if URL is a user profile or a repository
 */
function detectGitHubUrlType(url: string): 'profile' | 'repo' | 'unknown' {
  const repoMatch = extractGitHubRepo(url);
  const username = extractGitHubUsername(url);
  
  // If it matches repo pattern, it's a repo
  if (repoMatch) return 'repo';
  // If it matches username pattern, it's a profile
  if (username) return 'profile';
  
  return 'unknown';
}

/**
 * Fetch GitHub user profile data
 */
async function fetchGitHubProfile(
  username: string,
  token?: string
): Promise<{
  profile: GitHubUserProfile;
  topRepos: GitHubRepoSummary[];
}> {
  const cacheKey = `profile:${username}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Portfolio-Engine'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  // Fetch user profile
  const profileUrl = `https://api.github.com/users/${username}`;
  const profileResponse = await fetch(profileUrl, { headers });
  
  if (!profileResponse.ok) {
    if (profileResponse.status === 404) {
      throw new Error('GitHub user not found');
    }
    if (profileResponse.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Try again later or provide a token.');
    }
    throw new Error(`GitHub API failed: ${profileResponse.status}`);
  }
  
  const profile = await profileResponse.json() as GitHubUserProfile;

  // Fetch top repositories (sorted by stars)
  let topRepos: GitHubRepoSummary[] = [];
  try {
    const reposUrl = `https://api.github.com/users/${username}/repos?sort=updated&per_page=10`;
    const reposResponse = await fetch(reposUrl, { headers });
    if (reposResponse.ok) {
      const repos = await reposResponse.json() as GitHubRepoSummary[];
      // Sort by stars and filter out forks
      topRepos = repos
        .filter(r => !r.fork)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 5);
    }
  } catch {
    // Repos fetch failed, that's okay
  }

  const result = { profile, topRepos };
  
  // Cache result
  cache.set(cacheKey, {
    data: result,
    expires: Date.now() + CACHE_TTL
  });

  return result;
}

export async function extractGitHubMetadata(
  owner: string, 
  repo: string,
  token?: string
): Promise<GitHubMetadata> {
  const cacheKey = `repo:${owner}/${repo}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Portfolio-Engine'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  // Fetch repo info
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const repoResponse = await fetch(repoUrl, { headers });
  
  if (!repoResponse.ok) {
    if (repoResponse.status === 404) {
      throw new Error('Repository not found');
    }
    if (repoResponse.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Try again later or provide a token.');
    }
    throw new Error(`GitHub API failed: ${repoResponse.status}`);
  }
  
  const repoData = await repoResponse.json();

  // Try to fetch README
  let readme: string | undefined;
  try {
    const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
    const readmeResponse = await fetch(readmeUrl, {
      headers: {
        ...headers,
        'Accept': 'application/vnd.github.raw'
      }
    });
    if (readmeResponse.ok) {
      readme = await readmeResponse.text();
      // Truncate if too long
      if (readme.length > 5000) {
        readme = readme.substring(0, 5000) + '...';
      }
    }
  } catch {
    // README fetch failed, that's okay
  }

  interface GitHubRepoResponse {
    full_name: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    topics: string[];
    created_at: string;
    updated_at: string;
    open_issues_count: number;
  }
  

  const repoInfo = repoData as GitHubRepoResponse;

  const metadata: GitHubMetadata = {
    title: repoInfo.full_name,
    description: repoInfo.description || '',
    stars: repoInfo.stargazers_count,
    forks: repoInfo.forks_count,
    language: repoInfo.language || 'Unknown',
    topics: repoInfo.topics || [],
    created_at: repoInfo.created_at,
    updated_at: repoInfo.updated_at,
    readme
  };

  // Cache result
  cache.set(cacheKey, {
    data: metadata,
    expires: Date.now() + CACHE_TTL
  });

  return metadata;
}

/**
 * Process GitHub user profile URL
 */
async function processGitHubProfileURL(
  url: string,
  username: string,
  token?: string
): Promise<NormalizedContent> {
  const { profile, topRepos } = await fetchGitHubProfile(username, token);
  
  // Build description from bio and stats
  let description = profile.bio || '';
  if (profile.location) {
    description += description ? ` \u2022 ${profile.location}` : profile.location;
  }
  if (profile.company) {
    description += description ? ` \u2022 ${profile.company}` : profile.company;
  }
  
  // Build title
  const title = profile.name || profile.login;

  return {
    content_id: generateContentId(),
    type: 'code',
    source: 'github',
    original_url: url,
    title: title,
    description: description,
    extracted_data: {
      is_profile: true,
      thumbnail_url: profile.avatar_url,
      followers: profile.followers,
      following: profile.following,
      public_repos: profile.public_repos,
      bio: profile.bio || undefined,
      company: profile.company || undefined,
      location: profile.location || undefined,
      blog: profile.blog || undefined,
      twitter_username: profile.twitter_username || undefined,
      hireable: profile.hireable || undefined,
      top_repos: topRepos.map(r => ({
        name: r.name,
        description: r.description || '',
        stars: r.stargazers_count,
        language: r.language || 'Unknown',
        url: r.html_url
      }))
    },
    created_at: profile.created_at
  };
}

/**
 * Process GitHub repository URL
 */
async function processGitHubRepoURL(
  url: string,
  owner: string,
  repo: string,
  token?: string
): Promise<NormalizedContent> {
  const metadata = await extractGitHubMetadata(owner, repo, token);

  return {
    content_id: generateContentId(),
    type: 'code',
    source: 'github',
    original_url: url,
    title: metadata.title,
    description: metadata.description,
    extracted_data: {
      is_profile: false,
      stars: metadata.stars,
      forks: metadata.forks,
      language: metadata.language,
      topics: metadata.topics,
      updated_at: metadata.updated_at,
      readme_preview: metadata.readme?.substring(0, 500)
    },
    created_at: metadata.created_at
  };
}

export async function processGitHubURL(
  url: string,
  token?: string
): Promise<NormalizedContent> {
  const urlType = detectGitHubUrlType(url);
  
  if (urlType === 'profile') {
    const username = extractGitHubUsername(url)!;
    return processGitHubProfileURL(url, username, token);
  }
  
  if (urlType === 'repo') {
    const repoInfo = extractGitHubRepo(url);
    if (!repoInfo) {
      throw new Error('Invalid GitHub repository URL');
    }
    return processGitHubRepoURL(url, repoInfo.owner, repoInfo.repo, token);
  }
  
  throw new Error('Invalid GitHub URL. Provide a user profile or repository URL.');
}
