# Job Recruitment Aggregator Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a page that scrapes job postings from Facebook groups and 4 Vietnamese job sites, displaying unified results in a searchable card grid.

**Architecture:** Next.js Route Handlers scrape 5 sources in parallel (Cheerio for job sites, Puppeteer for Facebook). TanStack Query on the client handles data fetching with debounced search. No database — realtime scraping.

**Tech Stack:** Next.js 16, React 19, TanStack Query, Cheerio, Puppeteer, shadcn/ui, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-27-job-aggregator-design.md`

---

## Chunk 1: Foundation & Setup

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install npm packages**

```bash
pnpm add @tanstack/react-query cheerio puppeteer
```

- [ ] **Step 2: Install type definitions for cheerio**

```bash
pnpm add -D @types/cheerio
```

- [ ] **Step 3: Verify installation**

Run: `pnpm typecheck`
Expected: No new type errors

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add tanstack-query, cheerio, puppeteer dependencies"
```

---

### Task 2: Add shadcn/ui components

**Files:**
- Create: `components/ui/input.tsx`
- Create: `components/ui/badge.tsx`
- Create: `components/ui/card.tsx`
- Create: `components/ui/skeleton.tsx`
- Create: `components/ui/dialog.tsx`
- Create: `components/ui/sheet.tsx`
- Create: `components/ui/sonner.tsx` (toast)

Note: `components/ui/button.tsx` already exists in the project.

- [ ] **Step 1: Add all needed shadcn components**

```bash
npx shadcn@latest add input badge card skeleton dialog sheet sonner
```

- [ ] **Step 2: Verify components were created**

Check that files exist in `components/ui/`.

- [ ] **Step 3: Commit**

```bash
git add components/ui/
git commit -m "chore: add shadcn input, badge, card, skeleton, dialog, sheet, sonner"
```

---

### Task 3: Create shared types

**Files:**
- Create: `lib/scrapers/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// lib/scrapers/types.ts

export type JobSource =
  | "topcv"
  | "vietnamworks"
  | "itviec"
  | "topdev"
  | "facebook"

export interface JobPost {
  id: string
  title: string
  company: string | null
  location: string | null
  salary: string | null
  description: string
  url: string
  source: JobSource
  postedAt: string | null // ISO 8601
  updatedAt: string | null // ISO 8601
  tags: string[]
}

export interface FacebookGroup {
  id: string
  name: string
  url: string
}

export interface SearchResponse {
  results: JobPost[]
  errors: { source: string; message: string }[]
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/scrapers/types.ts
git commit -m "feat: add shared types for job scraping"
```

---

### Task 4: Create QueryProvider

**Files:**
- Create: `components/query-provider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create QueryProvider component**

```typescript
// components/query-provider.tsx
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
```

- [ ] **Step 2: Update root layout with QueryProvider and Toaster**

Replace the full content of `app/layout.tsx` with:

```typescript
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Run typecheck and verify dev server**

Run: `pnpm typecheck`
Run: `pnpm dev` — verify page loads without errors

- [ ] **Step 5: Commit**

```bash
git add components/query-provider.tsx app/layout.tsx
git commit -m "feat: add QueryProvider and Toaster to root layout"
```

---

### Task 5: Create default Facebook groups data

**Files:**
- Create: `data/facebook-groups.json`

- [ ] **Step 1: Create the default groups file**

```json
[
  {
    "id": "1",
    "name": "Viec lam IT",
    "url": "https://www.facebook.com/groups/vieclam.it"
  },
  {
    "id": "2",
    "name": "Tuyen dung IT",
    "url": "https://www.facebook.com/groups/tuyendungit"
  }
]
```

Note: These are placeholder URLs. User will update with their actual joined groups.

- [ ] **Step 2: Commit**

```bash
git add data/facebook-groups.json
git commit -m "feat: add default facebook groups data"
```

---

## Chunk 2: Scrapers

### Task 6: Create scraper utility helpers

**Files:**
- Create: `lib/scrapers/utils.ts`

- [ ] **Step 1: Create utility functions**

```typescript
// lib/scrapers/utils.ts
import { createHash } from "crypto"

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

export function generateId(source: string, url: string): string {
  return createHash("md5").update(`${source}:${url}`).digest("hex")
}

export function sanitizeKeyword(keyword: string): string {
  return keyword.trim().slice(0, 100)
}

export async function fetchHtml(
  url: string,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal,
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  return res.text()
}

/**
 * Parse Vietnamese relative dates like "2 ngay truoc", "1 tuan truoc"
 * and absolute dates like "27/03/2026" into ISO 8601 strings.
 */
export function parseVietnameseDate(dateStr: string | null): string | null {
  if (!dateStr) return null

  const cleaned = dateStr.trim().toLowerCase()

  // Absolute date: DD/MM/YYYY
  const absMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (absMatch) {
    const [, day, month, year] = absMatch
    return new Date(`${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`).toISOString()
  }

  // Relative date patterns
  const now = new Date()
  const relMatch = cleaned.match(/(\d+)\s*(giay|phut|gio|ngay|tuan|thang|nam)/)
  if (relMatch) {
    const amount = parseInt(relMatch[1]!, 10)
    const unit = relMatch[2]!
    const offsets: Record<string, number> = {
      giay: 1000,
      phut: 60 * 1000,
      gio: 60 * 60 * 1000,
      ngay: 24 * 60 * 60 * 1000,
      tuan: 7 * 24 * 60 * 60 * 1000,
      thang: 30 * 24 * 60 * 60 * 1000,
      nam: 365 * 24 * 60 * 60 * 1000,
    }
    if (offsets[unit]) {
      return new Date(now.getTime() - amount * offsets[unit]).toISOString()
    }
  }

  // Try native Date parse as fallback
  const parsed = new Date(cleaned)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }

  return null
}

export const MAX_RESULTS_PER_SOURCE = 20
export const SCRAPE_TIMEOUT = 15000
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/scrapers/utils.ts
git commit -m "feat: add scraper utility helpers"
```

---

### Task 7: TopCV scraper

**Files:**
- Create: `lib/scrapers/topcv.ts`

- [ ] **Step 1: Create the TopCV scraper**

TopCV search URL pattern: `https://www.topcv.vn/tim-viec-lam-{keyword}`

```typescript
// lib/scrapers/topcv.ts
import * as cheerio from "cheerio"
import type { JobPost } from "./types"
import {
  fetchHtml,
  generateId,
  parseVietnameseDate,
  sanitizeKeyword,
  MAX_RESULTS_PER_SOURCE,
  SCRAPE_TIMEOUT,
} from "./utils"

export async function scrapeTopcv(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const url = `https://www.topcv.vn/tim-viec-lam-${encodeURIComponent(sanitized.replace(/\s+/g, "-"))}`
  const html = await fetchHtml(url, AbortSignal.timeout(SCRAPE_TIMEOUT))
  const $ = cheerio.load(html)
  const jobs: JobPost[] = []

  // TopCV job cards — selectors may need adjustment if site updates
  $(".job-item-search-result, .job-list-item, [data-job-id]").each(
    (_, el) => {
      if (jobs.length >= MAX_RESULTS_PER_SOURCE) return false

      const $el = $(el)
      const titleEl = $el.find("h3 a, .title a, a.job-title").first()
      const title = titleEl.text().trim()
      const jobUrl = titleEl.attr("href") || ""
      const fullUrl = jobUrl.startsWith("http")
        ? jobUrl
        : `https://www.topcv.vn${jobUrl}`

      if (!title || !jobUrl) return

      const company =
        $el.find(".company-name, a[href*='/cong-ty/']").first().text().trim() ||
        null
      const salary =
        $el.find(".salary, .job-salary, .muc-luong").first().text().trim() ||
        null
      const location =
        $el
          .find(".location, .job-location, .dia-diem")
          .first()
          .text()
          .trim() || null
      const description =
        $el.find(".job-description, .description").first().text().trim() || ""
      const dateText =
        $el.find(".time, .date, .updated-at").first().text().trim() || null

      const tags: string[] = []
      $el.find(".tag, .label, .skill-tag").each((_, tagEl) => {
        const tag = $(tagEl).text().trim()
        if (tag) tags.push(tag)
      })

      jobs.push({
        id: generateId("topcv", fullUrl),
        title,
        company,
        location,
        salary,
        description,
        url: fullUrl,
        source: "topcv",
        postedAt: parseVietnameseDate(dateText),
        updatedAt: null,
        tags,
      })
    }
  )

  return jobs
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/scrapers/topcv.ts
git commit -m "feat: add TopCV scraper"
```

---

### Task 8: VietnamWorks scraper

**Files:**
- Create: `lib/scrapers/vietnamworks.ts`

- [ ] **Step 1: Create the VietnamWorks scraper**

VietnamWorks search URL: `https://www.vietnamworks.com/tim-viec-lam/tat-ca-viec-lam?q={keyword}`

```typescript
// lib/scrapers/vietnamworks.ts
import * as cheerio from "cheerio"
import type { JobPost } from "./types"
import {
  fetchHtml,
  generateId,
  parseVietnameseDate,
  sanitizeKeyword,
  MAX_RESULTS_PER_SOURCE,
  SCRAPE_TIMEOUT,
} from "./utils"

export async function scrapeVietnamworks(
  keyword: string
): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const url = `https://www.vietnamworks.com/tim-viec-lam/tat-ca-viec-lam?q=${encodeURIComponent(sanitized)}`
  const html = await fetchHtml(url, AbortSignal.timeout(SCRAPE_TIMEOUT))
  const $ = cheerio.load(html)
  const jobs: JobPost[] = []

  // VietnamWorks uses styled-components with hashed classes
  // Fallback to structural selectors
  $("[class*='JobCard'], .job-item, article").each((_, el) => {
    if (jobs.length >= MAX_RESULTS_PER_SOURCE) return false

    const $el = $(el)
    const titleEl = $el.find("h3 a, h2 a, a[href*='/viec-lam/']").first()
    const title = titleEl.text().trim()
    const jobUrl = titleEl.attr("href") || ""
    const fullUrl = jobUrl.startsWith("http")
      ? jobUrl
      : `https://www.vietnamworks.com${jobUrl}`

    if (!title || !jobUrl) return

    const company = $el.find("a[href*='/nha-tuyen-dung/'], .company-name").first().text().trim() || null
    const salary = $el.find("[class*='salary'], .salary").first().text().trim() || null
    const location = $el.find("[class*='location'], .location").first().text().trim() || null
    const description = $el.find(".job-description, .description, p").first().text().trim() || ""
    const dateText = $el.find(".date, .time, [class*='date']").first().text().trim() || null

    const tags: string[] = []
    $el.find(".tag, .skill, [class*='tag']").each((_, tagEl) => {
      const tag = $(tagEl).text().trim()
      if (tag) tags.push(tag)
    })

    jobs.push({
      id: generateId("vietnamworks", fullUrl),
      title,
      company,
      location,
      salary,
      description,
      url: fullUrl,
      source: "vietnamworks",
      postedAt: parseVietnameseDate(dateText),
      updatedAt: null,
      tags,
    })
  })

  return jobs
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/scrapers/vietnamworks.ts
git commit -m "feat: add VietnamWorks scraper"
```

---

### Task 9: ITviec scraper

**Files:**
- Create: `lib/scrapers/itviec.ts`

- [ ] **Step 1: Create the ITviec scraper**

ITviec search URL: `https://itviec.com/it-jobs?query={keyword}`

Note: ITviec returns 403 for automated requests. The scraper uses the same Cheerio pattern but may need custom headers or cookie handling. Selectors need verification via browser DevTools.

```typescript
// lib/scrapers/itviec.ts
import * as cheerio from "cheerio"
import type { JobPost } from "./types"
import {
  fetchHtml,
  generateId,
  parseVietnameseDate,
  sanitizeKeyword,
  MAX_RESULTS_PER_SOURCE,
  SCRAPE_TIMEOUT,
} from "./utils"

export async function scrapeItviec(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const url = `https://itviec.com/it-jobs?query=${encodeURIComponent(sanitized)}`
  const html = await fetchHtml(url, AbortSignal.timeout(SCRAPE_TIMEOUT))
  const $ = cheerio.load(html)
  const jobs: JobPost[] = []

  // ITviec job card selectors — verify via browser DevTools
  $(".job_content, .job-card, [data-search-result]").each((_, el) => {
    if (jobs.length >= MAX_RESULTS_PER_SOURCE) return false

    const $el = $(el)
    const titleEl = $el
      .find("h3 a, .job-title a, a[href*='/it-jobs/']")
      .first()
    const title = titleEl.text().trim()
    const jobUrl = titleEl.attr("href") || ""
    const fullUrl = jobUrl.startsWith("http")
      ? jobUrl
      : `https://itviec.com${jobUrl}`

    if (!title || !jobUrl) return

    const company =
      $el.find(".company-name, a[href*='/companies/']").first().text().trim() ||
      null
    const salary =
      $el.find(".salary, .job-salary, .text-it-red").first().text().trim() ||
      null
    const location =
      $el.find(".city, .location, .job-city").first().text().trim() || null
    const description =
      $el.find(".description, .job-description").first().text().trim() || ""
    const dateText =
      $el.find(".distance-time, .date, .posted-at").first().text().trim() ||
      null

    const tags: string[] = []
    $el.find(".skill-tag, .tag, .badge").each((_, tagEl) => {
      const tag = $(tagEl).text().trim()
      if (tag) tags.push(tag)
    })

    jobs.push({
      id: generateId("itviec", fullUrl),
      title,
      company,
      location,
      salary,
      description,
      url: fullUrl,
      source: "itviec",
      postedAt: parseVietnameseDate(dateText),
      updatedAt: null,
      tags,
    })
  })

  return jobs
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/scrapers/itviec.ts
git commit -m "feat: add ITviec scraper"
```

---

### Task 10: TopDev scraper

**Files:**
- Create: `lib/scrapers/topdev.ts`

- [ ] **Step 1: Create the TopDev scraper**

TopDev search URL: `https://topdev.vn/viec-lam-it/{keyword}-kw`

Note: TopDev may serve content via API/SPA. Selectors need verification via browser DevTools. If HTML scraping fails, consider checking for a JSON API endpoint at `https://api.topdev.vn/`.

```typescript
// lib/scrapers/topdev.ts
import * as cheerio from "cheerio"
import type { JobPost } from "./types"
import {
  fetchHtml,
  generateId,
  parseVietnameseDate,
  sanitizeKeyword,
  MAX_RESULTS_PER_SOURCE,
  SCRAPE_TIMEOUT,
} from "./utils"

export async function scrapeTopdev(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const url = `https://topdev.vn/viec-lam-it/${encodeURIComponent(sanitized.replace(/\s+/g, "-"))}-kw`
  const html = await fetchHtml(url, AbortSignal.timeout(SCRAPE_TIMEOUT))
  const $ = cheerio.load(html)
  const jobs: JobPost[] = []

  // TopDev job card selectors — verify via browser DevTools
  $(".job-item, .job-card, [data-job-slug], .card-job").each((_, el) => {
    if (jobs.length >= MAX_RESULTS_PER_SOURCE) return false

    const $el = $(el)
    const titleEl = $el
      .find("h3 a, .job-title a, a[href*='/viec-lam/']")
      .first()
    const title = titleEl.text().trim()
    const jobUrl = titleEl.attr("href") || ""
    const fullUrl = jobUrl.startsWith("http")
      ? jobUrl
      : `https://topdev.vn${jobUrl}`

    if (!title || !jobUrl) return

    const company =
      $el
        .find(".company-name, a[href*='/cong-ty/'], .employer-name")
        .first()
        .text()
        .trim() || null
    const salary =
      $el.find(".salary, .job-salary").first().text().trim() || null
    const location =
      $el.find(".location, .address, .city").first().text().trim() || null
    const description =
      $el.find(".description, .job-description").first().text().trim() || ""
    const dateText =
      $el.find(".time, .date, .posted-at").first().text().trim() || null

    const tags: string[] = []
    $el.find(".skill-tag, .tag, .badge, .technology").each((_, tagEl) => {
      const tag = $(tagEl).text().trim()
      if (tag) tags.push(tag)
    })

    jobs.push({
      id: generateId("topdev", fullUrl),
      title,
      company,
      location,
      salary,
      description,
      url: fullUrl,
      source: "topdev",
      postedAt: parseVietnameseDate(dateText),
      updatedAt: null,
      tags,
    })
  })

  return jobs
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/scrapers/topdev.ts
git commit -m "feat: add TopDev scraper"
```

---

### Task 11: Facebook scraper

**Files:**
- Create: `lib/scrapers/facebook.ts`

- [ ] **Step 1: Create the Facebook scraper**

Facebook scraper uses Puppeteer with cookie-based authentication. Cookies come from `FB_COOKIES` env var (JSON string) or `data/fb-cookies.json`.

```typescript
// lib/scrapers/facebook.ts
import puppeteer, { type Cookie } from "puppeteer"
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import type { JobPost, FacebookGroup } from "./types"
import {
  generateId,
  sanitizeKeyword,
  MAX_RESULTS_PER_SOURCE,
  SCRAPE_TIMEOUT,
} from "./utils"

function loadCookies(): Cookie[] | null {
  // Try env var first
  if (process.env.FB_COOKIES) {
    try {
      return JSON.parse(process.env.FB_COOKIES)
    } catch {
      return null
    }
  }

  // Try local file
  const cookiePath = join(process.cwd(), "data", "fb-cookies.json")
  if (existsSync(cookiePath)) {
    try {
      return JSON.parse(readFileSync(cookiePath, "utf-8"))
    } catch {
      return null
    }
  }

  return null
}

export async function scrapeFacebook(
  keyword: string,
  groups: FacebookGroup[]
): Promise<JobPost[]> {
  const cookies = loadCookies()
  if (!cookies) {
    throw new Error(
      "Facebook cookies not configured. Set FB_COOKIES env var or create data/fb-cookies.json"
    )
  }

  // Wrap entire operation in a timeout
  return Promise.race([
    scrapeFacebookInner(keyword, groups, cookies),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Facebook scraper timed out")),
        SCRAPE_TIMEOUT
      )
    ),
  ])
}

async function scrapeFacebookInner(
  keyword: string,
  groups: FacebookGroup[],
  cookies: Cookie[]
): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword).toLowerCase()
  const browser = await puppeteer.launch({ headless: true })
  const jobs: JobPost[] = []

  try {
    const page = await browser.newPage()
    await page.setCookie(...cookies)

    for (const group of groups) {
      if (jobs.length >= MAX_RESULTS_PER_SOURCE) break

      try {
        await page.goto(group.url, {
          waitUntil: "networkidle2",
          timeout: SCRAPE_TIMEOUT,
        })

        // Scroll to load more posts
        await page.evaluate(() => {
          window.scrollBy(0, 2000)
        })
        await new Promise((r) => setTimeout(r, 2000))

        // Extract posts
        const posts = await page.evaluate(() => {
          const items: {
            text: string
            url: string
            date: string
            author: string
          }[] = []

          // Facebook post selectors — these change frequently
          const postElements = document.querySelectorAll(
            '[role="article"], [data-ad-preview="message"]'
          )

          postElements.forEach((el) => {
            const text = el.textContent || ""
            const linkEl = el.querySelector('a[href*="/posts/"], a[href*="/permalink/"]')
            const url = linkEl?.getAttribute("href") || ""
            const timeEl = el.querySelector("abbr, [data-utime], time")
            const date = timeEl?.textContent || ""
            const authorEl = el.querySelector("strong a, h4 a")
            const author = authorEl?.textContent || ""

            if (text && url) {
              items.push({ text, url, date, author })
            }
          })

          return items
        })

        // Filter by keyword and convert to JobPost
        for (const post of posts) {
          if (jobs.length >= MAX_RESULTS_PER_SOURCE) break
          if (!post.text.toLowerCase().includes(sanitized)) continue

          const fullUrl = post.url.startsWith("http")
            ? post.url
            : `https://www.facebook.com${post.url}`

          jobs.push({
            id: generateId("facebook", fullUrl),
            title: post.text.slice(0, 150).trim(),
            company: post.author || null,
            location: null,
            salary: null,
            description: post.text.slice(0, 500).trim(),
            url: fullUrl,
            source: "facebook",
            postedAt: null, // Facebook dates are hard to parse reliably
            updatedAt: null,
            tags: [],
          })
        }
      } catch {
        // Skip individual group errors, continue with next
        continue
      }
    }
  } finally {
    await browser.close()
  }

  return jobs
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/scrapers/facebook.ts
git commit -m "feat: add Facebook group scraper with Puppeteer"
```

---

## Chunk 3: API Routes

### Task 12: Job search API route

**Files:**
- Create: `app/api/jobs/search/route.ts`

- [ ] **Step 1: Create the search route handler**

```typescript
// app/api/jobs/search/route.ts
import { NextRequest, NextResponse } from "next/server"
import { scrapeTopcv } from "@/lib/scrapers/topcv"
import { scrapeVietnamworks } from "@/lib/scrapers/vietnamworks"
import { scrapeItviec } from "@/lib/scrapers/itviec"
import { scrapeTopdev } from "@/lib/scrapers/topdev"
import { scrapeFacebook } from "@/lib/scrapers/facebook"
import type { JobPost, SearchResponse, FacebookGroup } from "@/lib/scrapers/types"
import { readFileSync } from "fs"
import { join } from "path"

function loadGroups(): FacebookGroup[] {
  try {
    const data = readFileSync(
      join(process.cwd(), "data", "facebook-groups.json"),
      "utf-8"
    )
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword")?.trim() || ""

  if (!keyword || keyword.length > 100) {
    return NextResponse.json(
      { results: [], errors: [{ source: "api", message: "Invalid keyword" }] },
      { status: 400 }
    )
  }

  const groups = loadGroups()

  const scrapers = [
    { name: "topcv", fn: () => scrapeTopcv(keyword) },
    { name: "vietnamworks", fn: () => scrapeVietnamworks(keyword) },
    { name: "itviec", fn: () => scrapeItviec(keyword) },
    { name: "topdev", fn: () => scrapeTopdev(keyword) },
    { name: "facebook", fn: () => scrapeFacebook(keyword, groups) },
  ]

  const settled = await Promise.allSettled(scrapers.map((s) => s.fn()))

  const results: JobPost[] = []
  const errors: SearchResponse["errors"] = []

  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      results.push(...result.value)
    } else {
      errors.push({
        source: scrapers[i]!.name,
        message: result.reason?.message || "Unknown error",
      })
    }
  })

  // Sort by postedAt descending, nulls last
  results.sort((a, b) => {
    if (!a.postedAt && !b.postedAt) return 0
    if (!a.postedAt) return 1
    if (!b.postedAt) return -1
    return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  })

  const response: SearchResponse = { results, errors }
  return NextResponse.json(response)
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/jobs/search/route.ts
git commit -m "feat: add job search API route with parallel scraping"
```

---

### Task 13: Facebook groups API route

**Files:**
- Create: `app/api/groups/route.ts`

- [ ] **Step 1: Create the groups CRUD route handler**

```typescript
// app/api/groups/route.ts
import { NextRequest, NextResponse } from "next/server"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import type { FacebookGroup } from "@/lib/scrapers/types"

const GROUPS_FILE = join(process.cwd(), "data", "facebook-groups.json")

function loadGroups(): FacebookGroup[] {
  try {
    return JSON.parse(readFileSync(GROUPS_FILE, "utf-8"))
  } catch {
    return []
  }
}

function saveGroups(groups: FacebookGroup[]) {
  writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2), "utf-8")
}

export async function GET() {
  return NextResponse.json(loadGroups())
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, url } = body as { name: string; url: string }

  if (!name?.trim() || !url?.trim()) {
    return NextResponse.json(
      { error: "Name and URL are required" },
      { status: 400 }
    )
  }

  // Basic Facebook URL validation
  if (!url.includes("facebook.com/groups/")) {
    return NextResponse.json(
      { error: "Must be a Facebook group URL" },
      { status: 400 }
    )
  }

  const groups = loadGroups()
  const newGroup: FacebookGroup = {
    id: Date.now().toString(),
    name: name.trim(),
    url: url.trim(),
  }
  groups.push(newGroup)
  saveGroups(groups)

  return NextResponse.json(newGroup, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { id } = (await request.json()) as { id: string }

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 })
  }

  const groups = loadGroups()
  const filtered = groups.filter((g) => g.id !== id)

  if (filtered.length === groups.length) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  saveGroups(filtered)
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/groups/route.ts
git commit -m "feat: add Facebook groups CRUD API route"
```

---

## Chunk 4: Custom Hooks

### Task 14: Create useDebounce hook

**Files:**
- Create: `hooks/use-debounce.ts`

- [ ] **Step 1: Create the debounce hook**

```typescript
// hooks/use-debounce.ts
"use client"

import { useEffect, useState } from "react"

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-debounce.ts
git commit -m "feat: add useDebounce hook"
```

---

### Task 15: Create useJobsSearch hook

**Files:**
- Create: `hooks/use-jobs-search.ts`

- [ ] **Step 1: Create the jobs search hook**

```typescript
// hooks/use-jobs-search.ts
"use client"

import { useQuery } from "@tanstack/react-query"
import type { SearchResponse } from "@/lib/scrapers/types"

export function useJobsSearch(keyword: string) {
  return useQuery<SearchResponse>({
    queryKey: ["jobs", keyword],
    queryFn: async () => {
      const res = await fetch(
        `/api/jobs/search?keyword=${encodeURIComponent(keyword)}`
      )
      if (!res.ok) throw new Error("Search failed")
      return res.json()
    },
    enabled: keyword.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-jobs-search.ts
git commit -m "feat: add useJobsSearch hook"
```

---

### Task 16: Create useFacebookGroups hooks

**Files:**
- Create: `hooks/use-facebook-groups.ts`

- [ ] **Step 1: Create the Facebook groups hooks**

```typescript
// hooks/use-facebook-groups.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { FacebookGroup } from "@/lib/scrapers/types"

export function useFacebookGroups() {
  return useQuery<FacebookGroup[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups")
      if (!res.ok) throw new Error("Failed to load groups")
      return res.json()
    },
  })
}

export function useAddGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (group: { name: string; url: string }) => {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(group),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add group")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })
}

export function useRemoveGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Failed to remove group")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add hooks/use-facebook-groups.ts
git commit -m "feat: add Facebook groups hooks"
```

---

## Chunk 5: UI Components

### Task 17: Create source badge color map

**Files:**
- Create: `lib/source-colors.ts`

- [ ] **Step 1: Create the source color mapping**

```typescript
// lib/source-colors.ts
import type { JobSource } from "@/lib/scrapers/types"

export const sourceColors: Record<JobSource, string> = {
  topcv: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  vietnamworks:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  itviec: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  topdev:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  facebook:
    "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
}

export const sourceLabels: Record<JobSource, string> = {
  topcv: "TopCV",
  vietnamworks: "VietnamWorks",
  itviec: "ITviec",
  topdev: "TopDev",
  facebook: "Facebook",
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/source-colors.ts
git commit -m "feat: add source badge color and label mappings"
```

---

### Task 18: Create JobCard component

**Files:**
- Create: `components/job-card.tsx`

- [ ] **Step 1: Create the job card component**

```tsx
// components/job-card.tsx
"use client"

import { ExternalLink, MapPin, Banknote } from "lucide-react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { JobPost } from "@/lib/scrapers/types"
import { sourceColors, sourceLabels } from "@/lib/source-colors"
import { cn } from "@/lib/utils"

function formatDate(iso: string | null): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

export function JobCard({ job }: { job: JobPost }) {
  return (
    <Card className="group flex h-full flex-col transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className={cn("text-xs", sourceColors[job.source])}
          >
            {sourceLabels[job.source]}
          </Badge>
          {job.postedAt && (
            <span className="text-xs text-muted-foreground">
              {formatDate(job.postedAt)}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {job.title}
        </h3>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 pb-3">
        {job.company && (
          <p className="text-sm text-muted-foreground">{job.company}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
          )}
          {job.salary && (
            <span className="flex items-center gap-1">
              <Banknote className="h-3 w-3" />
              {job.salary}
            </span>
          )}
        </div>
        {job.description && (
          <p className="line-clamp-3 text-xs text-muted-foreground">
            {job.description}
          </p>
        )}
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Xem chi tiet
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardFooter>
    </Card>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/job-card.tsx
git commit -m "feat: add JobCard component"
```

---

### Task 19: Create JobSearchBar component

**Files:**
- Create: `components/job-search-bar.tsx`

- [ ] **Step 1: Create the search bar component**

```tsx
// components/job-search-bar.tsx
"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface JobSearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  isLoading: boolean
}

export function JobSearchBar({
  value,
  onChange,
  onSearch,
  isLoading,
}: JobSearchBarProps) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Nhap tu khoa tim viec lam..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch()
          }}
          className="pl-9"
        />
      </div>
      <Button onClick={onSearch} disabled={isLoading || !value.trim()}>
        {isLoading ? "Dang tim..." : "Tim kiem"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/job-search-bar.tsx
git commit -m "feat: add JobSearchBar component"
```

---

### Task 20: Create JobGrid and loading skeleton

**Files:**
- Create: `components/job-grid.tsx`
- Create: `components/jobs-loading-skeleton.tsx`

- [ ] **Step 1: Create loading skeleton**

```tsx
// components/jobs-loading-skeleton.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function JobsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="mt-2 h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create job grid**

```tsx
// components/job-grid.tsx
"use client"

import type { JobPost } from "@/lib/scrapers/types"
import { JobCard } from "@/components/job-card"

export function JobGrid({ jobs }: { jobs: JobPost[] }) {
  if (jobs.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Khong tim thay ket qua nao.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/job-grid.tsx components/jobs-loading-skeleton.tsx
git commit -m "feat: add JobGrid and loading skeleton components"
```

---

### Task 21: Create FacebookGroupsDialog component

**Files:**
- Create: `components/facebook-groups-dialog.tsx`

- [ ] **Step 1: Create the dialog component**

```tsx
// components/facebook-groups-dialog.tsx
"use client"

import { useState } from "react"
import { Settings, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  useFacebookGroups,
  useAddGroup,
  useRemoveGroup,
} from "@/hooks/use-facebook-groups"

export function FacebookGroupsDialog() {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const { data: groups = [], isLoading } = useFacebookGroups()
  const addGroup = useAddGroup()
  const removeGroup = useRemoveGroup()

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) return
    addGroup.mutate(
      { name: name.trim(), url: url.trim() },
      {
        onSuccess: () => {
          setName("")
          setUrl("")
        },
      }
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Quan ly Groups
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Facebook Groups</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new group */}
          <div className="space-y-2">
            <Input
              placeholder="Ten nhom"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="https://facebook.com/groups/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              onClick={handleAdd}
              disabled={addGroup.isPending || !name.trim() || !url.trim()}
              size="sm"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addGroup.isPending ? "Dang them..." : "Them nhom"}
            </Button>
          </div>

          {/* Group list */}
          <div className="space-y-2">
            {isLoading && (
              <p className="text-sm text-muted-foreground">Dang tai...</p>
            )}
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{group.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {group.url}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeGroup.mutate(group.id)}
                  disabled={removeGroup.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {!isLoading && groups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Chua co nhom nao.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/facebook-groups-dialog.tsx
git commit -m "feat: add Facebook groups management dialog"
```

---

## Chunk 6: Jobs Page & Integration

### Task 22: Create the /jobs layout and page

**Files:**
- Create: `app/jobs/layout.tsx`
- Create: `app/jobs/page.tsx`

- [ ] **Step 0: Create jobs layout with metadata**

```tsx
// app/jobs/layout.tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tim viec lam - Job Aggregator",
  description: "Tong hop viec lam tu nhieu nguon tuyen dung",
}

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

- [ ] **Step 1: Create the main jobs page**

```tsx
// app/jobs/page.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import { toast } from "sonner"
import { useDebounce } from "@/hooks/use-debounce"
import { useJobsSearch } from "@/hooks/use-jobs-search"
import { JobSearchBar } from "@/components/job-search-bar"
import { JobGrid } from "@/components/job-grid"
import { JobsLoadingSkeleton } from "@/components/jobs-loading-skeleton"
import { FacebookGroupsDialog } from "@/components/facebook-groups-dialog"

export default function JobsPage() {
  const [keyword, setKeyword] = useState("")
  const debouncedKeyword = useDebounce(keyword, 500)
  const { data, isLoading, error } = useJobsSearch(debouncedKeyword)
  const prevErrorsRef = useRef("")

  // Show toast for partial errors (deduplicated)
  useEffect(() => {
    if (data?.errors && data.errors.length > 0) {
      const key = JSON.stringify(data.errors)
      if (key !== prevErrorsRef.current) {
        prevErrorsRef.current = key
        const sources = data.errors.map((e) => e.source).join(", ")
        toast.warning(`Khong the lay du lieu tu: ${sources}`)
      }
    }
  }, [data?.errors])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tim viec lam</h1>
          <p className="text-sm text-muted-foreground">
            Tong hop tu nhieu nguon tuyen dung
          </p>
        </div>
        <FacebookGroupsDialog />
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <JobSearchBar
          value={keyword}
          onChange={setKeyword}
          onSearch={() => {}} // debounce handles it
          isLoading={isLoading}
        />
      </div>

      {/* Results */}
      {!debouncedKeyword ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Search className="mb-4 h-12 w-12 opacity-20" />
          <p className="text-lg">Nhap tu khoa de tim viec lam...</p>
        </div>
      ) : isLoading ? (
        <JobsLoadingSkeleton />
      ) : error ? (
        <div className="py-12 text-center text-destructive">
          Co loi xay ra. Vui long thu lai.
        </div>
      ) : (
        <>
          {data && (
            <p className="mb-4 text-sm text-muted-foreground">
              Tim thay {data.results.length} ket qua
            </p>
          )}
          <JobGrid jobs={data?.results ?? []} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/jobs/page.tsx
git commit -m "feat: add /jobs page with search and results grid"
```

---

### Task 23: Update home page to redirect to /jobs

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update the home page**

Replace the default content with a redirect to `/jobs`:

```tsx
// app/page.tsx
import { redirect } from "next/navigation"

export default function Page() {
  redirect("/jobs")
}
```

- [ ] **Step 2: Verify in browser**

Run: `pnpm dev`
Open `http://localhost:3000` — should redirect to `/jobs`
The jobs page should show the search prompt initial state.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: redirect home page to /jobs"
```

---

### Task 24: Run full build check

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS (fix any issues)

- [ ] **Step 3: Run format**

Run: `pnpm format`

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 5: Commit any formatting/lint fixes**

```bash
git add -A
git commit -m "chore: lint and format fixes"
```

---

### Task 25: Manual smoke test

- [ ] **Step 1: Start dev server and test search**

Run: `pnpm dev`

1. Open `http://localhost:3000` — verify redirect to `/jobs`
2. See initial state with search prompt
3. Type a keyword (e.g., "react") — verify debounce triggers search
4. Verify loading skeletons appear
5. Verify results display in card grid (some scrapers may fail — that's OK, check toast notifications)
6. Verify "Xem chi tiet" links open in new tab
7. Test "Quan ly Groups" dialog — add/remove groups

- [ ] **Step 2: Fix any issues found during testing**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: address smoke test findings"
```
