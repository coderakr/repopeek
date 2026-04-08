# repopeek

Beautiful GitHub repository info CLI built with Ink.

## Features

- Accepts `owner/repo` or a full GitHub URL
- Fetches live repo metadata from the GitHub API
- Shows repository size in MB
- Responsive Ink UI for interactive terminal use
- Supports `GITHUB_TOKEN` for higher rate limits

## Install

```bash
npm install --global repopeek
```

Or run it without installing:

```bash
npx repopeek vercel/next.js
```

## Usage

```bash
repopeek
repopeek vercel/next.js
repopeek https://github.com/facebook/react
```

## Local Run

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev
```

## Rate Limits

If you hit GitHub API limits, set:

```bash
export GITHUB_TOKEN=your_token_here
```
