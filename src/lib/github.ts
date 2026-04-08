export type RepoInfo = {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  language: string | null;
  visibility: string;
  defaultBranch: string;
  license: string | null;
  topics: string[];
  homepage: string | null;
  sizeKb: number;
  sizeMb: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  url: string;
  archived: boolean;
  fork: boolean;
};

const GITHUB_API_BASE = 'https://api.github.com';

export const parseRepoInput = (input: string): {owner: string; repo: string} | null => {
  const trimmed = input.trim().replace(/^git\+/u, '').replace(/\.git$/u, '');

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname === 'github.com') {
      const [owner, repo] = url.pathname.split('/').filter(Boolean);
      if (owner && repo) {
        return {owner, repo};
      }
    }
  } catch {
    // Treat input as owner/repo below.
  }

  const match = trimmed.match(/^([a-zA-Z0-9-]+)\/([a-zA-Z0-9._-]+)$/u);
  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2]
  };
};

const toRepoInfo = (payload: GitHubRepoResponse): RepoInfo => {
  const sizeMb = Number((payload.size / 1024).toFixed(2));

  return {
    owner: payload.owner.login,
    name: payload.name,
    fullName: payload.full_name,
    description: payload.description,
    stars: payload.stargazers_count,
    forks: payload.forks_count,
    watchers: payload.subscribers_count ?? payload.watchers_count,
    openIssues: payload.open_issues_count,
    language: payload.language,
    visibility: payload.visibility,
    defaultBranch: payload.default_branch,
    license: payload.license?.spdx_id && payload.license.spdx_id !== 'NOASSERTION'
      ? payload.license.spdx_id
      : payload.license?.name ?? null,
    topics: payload.topics,
    homepage: payload.homepage,
    sizeKb: payload.size,
    sizeMb,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
    pushedAt: payload.pushed_at,
    url: payload.html_url,
    archived: payload.archived,
    fork: payload.fork
  };
};

export const fetchRepoInfo = async (input: string): Promise<RepoInfo> => {
  const parsed = parseRepoInput(input);

  if (!parsed) {
    throw new Error('Use a GitHub URL or owner/repo.');
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'repopeek-cli'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`${GITHUB_API_BASE}/repos/${parsed.owner}/${parsed.repo}`, {
    headers
  });

  if (response.status === 404) {
    throw new Error(`Repository "${parsed.owner}/${parsed.repo}" was not found.`);
  }

  if (response.status === 403) {
    throw new Error('GitHub API rate limit reached. Set GITHUB_TOKEN and try again.');
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as GitHubRepoResponse;
  return toRepoInfo(payload);
};

type GitHubRepoResponse = {
  archived: boolean;
  created_at: string;
  default_branch: string;
  description: string | null;
  fork: boolean;
  forks_count: number;
  full_name: string;
  homepage: string | null;
  html_url: string;
  language: string | null;
  license: {
    name: string;
    spdx_id: string | null;
  } | null;
  name: string;
  open_issues_count: number;
  owner: {
    login: string;
  };
  pushed_at: string;
  size: number;
  stargazers_count: number;
  subscribers_count?: number;
  topics: string[];
  updated_at: string;
  visibility: string;
  watchers_count: number;
};
