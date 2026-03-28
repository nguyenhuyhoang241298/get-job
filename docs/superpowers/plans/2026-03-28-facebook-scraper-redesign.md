# Facebook Scraper Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Puppeteer-based Facebook scraper with a lightweight mbasic.facebook.com + Cheerio implementation.

**Architecture:** Rewrite `lib/scrapers/facebook.ts` to fetch HTML from `mbasic.facebook.com/groups/{slug}` using cookie-based authentication, parse posts with Cheerio, and return `JobPost[]`. Groups are scraped in parallel via `Promise.allSettled`. Pagination is configurable via env vars.

**Tech Stack:** Cheerio (already installed), Node fetch, existing utils from `lib/scrapers/utils.ts`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Rewrite | `lib/scrapers/facebook.ts` | mbasic scraper: fetch, parse, paginate, map to JobPost |
| Create | `.env.local` | Template with FB_COOKIES and scraper config |
| Modify | `package.json` | Remove `puppeteer` dependency |

No changes to: `types.ts`, `utils.ts`, `route.ts`, `source-colors.ts`, `facebook-groups.json`

---

### Task 1: Create `.env.local` template

**Files:**
- Create: `.env.local`

- [ ] **Step 1: Create the env file**

```env
# Facebook cookies (REQUIRED)
# How to get:
#   1. Open Chrome, log in to Facebook
#   2. F12 > Application > Cookies > https://www.facebook.com
#   3. Copy values of: c_user, xs, fr, datr
#   4. Paste below in this format
#   5. Cookies expire after ~30-90 days — refresh when scraper reports errors
FB_COOKIES="c_user=xxx; xs=xxx; fr=xxx; datr=xxx"

# Facebook scraper config (optional)
SCRAPE_MAX_PAGES=2
SCRAPE_DELAY_MS=3000
```

- [ ] **Step 2: Verify `.env.local` is in `.gitignore`**

Run: `grep -q '.env.local' .gitignore && echo "OK" || echo "MISSING"`
Expected: `OK` (Next.js projects include this by default)

- [ ] **Step 3: Commit**

```bash
git add .env.local
git commit -m "chore: add .env.local template with Facebook cookies config"
```

Note: `.env.local` is in `.gitignore` so this commit will be empty, which is expected. The file exists locally for the user.

---

### Task 2: Rewrite Facebook scraper

**Files:**
- Rewrite: `lib/scrapers/facebook.ts`

- [ ] **Step 1: Write the complete scraper**

Replace the entire contents of `lib/scrapers/facebook.ts` with:

```typescript
import * as cheerio from "cheerio"
import type { JobPost, FacebookGroup } from "./types"
import {
  generateId,
  sanitizeKeyword,
  parseRelativeDate,
  MAX_RESULTS_PER_SOURCE,
  SCRAPE_TIMEOUT,
} from "./utils"

const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

const MAX_PAGES = parseInt(process.env.SCRAPE_MAX_PAGES || "2", 10)
const DELAY_MS = parseInt(process.env.SCRAPE_DELAY_MS || "3000", 10)

function getCookies(): string | null {
  return process.env.FB_COOKIES?.trim() || null
}

function getMbasicUrl(groupUrl: string): string {
  // Extract group slug/id from facebook.com URL
  // e.g. "https://www.facebook.com/groups/vieclam.it" -> "vieclam.it"
  const match = groupUrl.match(/facebook\.com\/groups\/([^/?#]+)/)
  if (!match) throw new Error(`Invalid group URL: ${groupUrl}`)
  return `https://mbasic.facebook.com/groups/${match[1]}`
}

async function fetchMbasicHtml(
  url: string,
  cookies: string
): Promise<{ html: string; redirected: boolean; finalUrl: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": MOBILE_USER_AGENT,
      Cookie: cookies,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT),
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  return {
    html: await res.text(),
    redirected: res.redirected,
    finalUrl: res.url,
  }
}

function isLoginPage(html: string, finalUrl: string): boolean {
  return (
    finalUrl.includes("/login") ||
    html.includes('name="login"') ||
    html.includes('id="login_form"')
  )
}

interface RawPost {
  author: string
  content: string
  timestamp: string | null
  postUrl: string | null
  reactionCount: number
  commentCount: number
}

function parsePosts($: cheerio.CheerioAPI): RawPost[] {
  const posts: RawPost[] = []

  // mbasic uses article elements or div[data-ft] for posts
  const containers = $("article, div[data-ft]")

  containers.each((_, el) => {
    const $el = $(el)

    // Author: h3 a or strong a
    const authorEl = $el.find("h3 a, strong a").first()
    const author = authorEl.text().trim()

    // Content: main text — try multiple selectors
    // mbasic wraps post text in divs inside the article
    let content = ""
    const paragraphs = $el.find("p")
    if (paragraphs.length > 0) {
      content = paragraphs
        .map((_, p) => $(p).text().trim())
        .get()
        .join("\n")
    }
    if (!content) {
      // Fallback: get text from div children, excluding header/footer
      const textDivs = $el.find("div > div > div")
      content = textDivs.first().text().trim()
    }

    // Timestamp: abbr element text
    const timestampEl = $el.find("abbr").first()
    const timestamp = timestampEl.text().trim() || null

    // Post URL: links to /story.php or /permalink/
    let postUrl: string | null = null
    $el.find("a[href]").each((_, a) => {
      const href = $(a).attr("href") || ""
      if (href.includes("/story.php") || href.includes("/permalink/")) {
        postUrl = href.startsWith("http")
          ? href
          : `https://mbasic.facebook.com${href}`
      }
    })

    // Reactions: look for text like "12" near reaction indicators
    let reactionCount = 0
    let commentCount = 0
    $el.find("a[href]").each((_, a) => {
      const text = $(a).text().trim()
      // Reaction links typically contain just a number or "X likes"
      const reactionMatch = text.match(/^(\d+)$/)
      if (reactionMatch && !commentCount) {
        reactionCount = parseInt(reactionMatch[1]!, 10)
      }
      // Comment links: "X Comments" or "X binh luan"
      const commentMatch = text.match(
        /(\d+)\s*(comment|bình luận|binh luan)/i
      )
      if (commentMatch) {
        commentCount = parseInt(commentMatch[1]!, 10)
      }
    })

    posts.push({ author, content, timestamp, postUrl, reactionCount, commentCount })
  })

  return posts
}

function extractPaginationUrl($: cheerio.CheerioAPI): string | null {
  // mbasic pagination: link with "See more posts" or containing bacr= param
  let nextUrl: string | null = null
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") || ""
    if (href.includes("bacr=")) {
      nextUrl = href.startsWith("http")
        ? href
        : `https://mbasic.facebook.com${href}`
      return false // break
    }
  })
  return nextUrl
}

function delay(ms: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 2000)
  return new Promise((resolve) => setTimeout(resolve, ms + jitter))
}

function buildPostUrl(
  rawUrl: string | null,
  groupSlug: string
): string | null {
  if (!rawUrl) return null
  // Extract post ID from story.php?story_fbid=XXX or /permalink/XXX
  const storyMatch = rawUrl.match(/story_fbid=(\d+)/)
  const permalinkMatch = rawUrl.match(/\/permalink\/(\d+)/)
  const postId = storyMatch?.[1] || permalinkMatch?.[1]
  if (postId) {
    return `https://www.facebook.com/groups/${groupSlug}/posts/${postId}`
  }
  // Fallback: just point to the group
  return `https://www.facebook.com/groups/${groupSlug}`
}

async function scrapeGroup(
  group: FacebookGroup,
  cookies: string,
  maxPages: number
): Promise<JobPost[]> {
  const groupSlug =
    group.url.match(/facebook\.com\/groups\/([^/?#]+)/)?.[1] || group.id
  const baseUrl = getMbasicUrl(group.url)
  const posts: JobPost[] = []
  let currentUrl: string | null = baseUrl
  let page = 0

  while (currentUrl && page < maxPages) {
    const { html, finalUrl } = await fetchMbasicHtml(currentUrl, cookies)

    if (isLoginPage(html, finalUrl)) {
      throw new Error("Facebook cookies het han, can lay lai")
    }

    const $ = cheerio.load(html, { decodeEntities: true })
    const rawPosts = parsePosts($)

    if (rawPosts.length === 0 && page === 0) {
      console.warn(
        `facebook: 0 posts parsed from ${group.name} (${currentUrl}). HTML structure may have changed.`
      )
    }

    for (const raw of rawPosts) {
      const content = raw.content || ""
      const postUrl = buildPostUrl(raw.postUrl, groupSlug)

      const tags: string[] = [group.name]
      if (raw.reactionCount > 0) tags.push(`👍 ${raw.reactionCount}`)
      if (raw.commentCount > 0) tags.push(`💬 ${raw.commentCount}`)

      posts.push({
        id: generateId("facebook", postUrl || `${group.url}#${posts.length}`),
        title: content
          ? content.slice(0, 150).trim()
          : "[Bai dang co anh/video]",
        company: raw.author || null,
        location: group.name,
        salary: null,
        description: content
          ? content.slice(0, 500).trim()
          : "[Bai dang co anh/video] — Xem tren Facebook",
        url: postUrl || group.url,
        source: "facebook",
        postedAt: parseRelativeDate(raw.timestamp),
        updatedAt: null,
        tags,
      })
    }

    // Pagination
    currentUrl = extractPaginationUrl($)
    page++

    if (currentUrl && page < maxPages) {
      await delay(DELAY_MS)
    }
  }

  return posts
}

export async function scrapeFacebook(
  keyword: string,
  groups: FacebookGroup[]
): Promise<JobPost[]> {
  const cookies = getCookies()
  if (!cookies) {
    console.warn("facebook: FB_COOKIES not configured, skipping")
    return []
  }

  if (groups.length === 0) {
    return []
  }

  const sanitized = sanitizeKeyword(keyword).toLowerCase()

  const results = await Promise.allSettled(
    groups.map((group) => scrapeGroup(group, cookies, MAX_PAGES))
  )

  const allPosts: JobPost[] = []
  for (const result of results) {
    if (result.status === "fulfilled") {
      allPosts.push(...result.value)
    } else {
      console.error(`facebook: group scrape failed:`, result.reason?.message)
    }
  }

  // Filter by keyword match in content
  const filtered = allPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(sanitized) ||
      post.description.toLowerCase().includes(sanitized)
  )

  return filtered.slice(0, MAX_RESULTS_PER_SOURCE)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors related to `lib/scrapers/facebook.ts`. The function signature `scrapeFacebook(keyword: string, groups: FacebookGroup[]): Promise<JobPost[]>` matches what `app/api/jobs/search/route.ts` calls.

- [ ] **Step 3: Commit**

```bash
git add lib/scrapers/facebook.ts
git commit -m "feat: rewrite Facebook scraper to use mbasic.facebook.com + Cheerio

Replace Puppeteer browser automation with lightweight HTTP fetch + Cheerio parsing.
Scrapes mbasic.facebook.com which serves simple HTML, no JS rendering needed.
Supports pagination, configurable delay, cookie expiry detection."
```

---

### Task 3: Remove Puppeteer dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove puppeteer from package.json**

Run: `cd /Users/nguyenhuyhoang/Documents/next/get-job && pnpm remove puppeteer`
Expected: `puppeteer` removed from `dependencies` in `package.json`, `pnpm-lock.yaml` updated.

- [ ] **Step 2: Verify no remaining puppeteer imports**

Run: `grep -r "from ['\"]puppeteer" lib/ app/ components/ hooks/ --include="*.ts" --include="*.tsx"`
Expected: No output (no files import puppeteer).

- [ ] **Step 3: Verify build still works**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: remove puppeteer dependency

No longer needed — Facebook scraper now uses Cheerio instead of browser automation."
```

---

### Task 4: Manual integration test

This task requires the user to have set real cookies in `.env.local`.

- [ ] **Step 1: Remind user to fill in cookies**

Print: "Before testing, paste your real Facebook cookies into `.env.local`. Format: `FB_COOKIES=\"c_user=XXX; xs=XXX; fr=XXX; datr=XXX\"`"

- [ ] **Step 2: Start dev server and test**

Run: `pnpm dev`

Then in another terminal:
```bash
curl -s "http://localhost:3000/api/jobs/search?keyword=frontend" | head -c 2000
```

Expected: JSON response with `results` array. Facebook posts should appear alongside other sources. If cookies are invalid, the `errors` array will contain `{ source: "facebook", message: "Facebook cookies het han, can lay lai" }`.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/jobs`, search for a keyword. Facebook results should appear with sky-blue source badge, group name as location, author as company.
