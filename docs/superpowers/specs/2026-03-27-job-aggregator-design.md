# Job Recruitment Aggregator — Design Spec

## Overview

A single page that scrapes job postings from Facebook recruitment groups and Vietnamese job sites (TopCV, VietnamWorks, ITviec, TopDev), displaying results in a unified card grid with keyword search.

## Architecture

```
Client (Browser)
  └── /jobs page (React Client Component)
        ├── Search bar (keyword input, debounce 500ms)
        ├── Job cards grid (responsive 1/2/3 columns)
        └── TanStack Query → calls API

Server (Next.js Route Handlers)
  ├── GET /api/jobs/search?keyword=xxx
  │     ├── Scrape 5 sources in parallel (Promise.allSettled)
  │     ├── Normalize to unified JobPost format
  │     └── Return merged results sorted by date
  │
  ├── Scrapers (lib/scrapers/)
  │     ├── topcv.ts        (Cheerio)
  │     ├── vietnamworks.ts (Cheerio)
  │     ├── itviec.ts       (Cheerio)
  │     ├── topdev.ts       (Cheerio)
  │     └── facebook.ts     (Puppeteer)
  │
  ├── GET /api/groups        — list Facebook groups
  ├── POST /api/groups       — add a group
  └── DELETE /api/groups     — remove a group
```

Each search request scrapes all 5 sources in parallel using `Promise.allSettled`. If one source fails, others still return results. No database — results are scraped realtime.

**Deployment target:** Node.js server (e.g., `next start` on a VPS). Not serverless — Puppeteer requires a full Chromium binary.

## Data Model

### JobPost

```typescript
interface JobPost {
  id: string                // hash of source + url (no cross-source dedup — same job on TopCV and VietnamWorks shows as separate cards)
  title: string             // job title or post title
  company: string | null    // company name (may be null for Facebook posts)
  location: string | null   // work location
  salary: string | null     // salary if available
  description: string       // short description / snippet
  url: string               // original post URL
  source: "topcv" | "vietnamworks" | "itviec" | "topdev" | "facebook"
  postedAt: string | null   // date posted
  updatedAt: string | null  // date updated
  tags: string[]            // skills, level, etc.
}
```

### FacebookGroup

```typescript
interface FacebookGroup {
  id: string
  name: string
  url: string
}
```

Groups stored in `data/facebook-groups.json` — ships with default groups, user can add/remove via UI which writes back to this file. This works for local/VPS deployment where the filesystem is writable.

### API Response Envelope

```typescript
interface SearchResponse {
  results: JobPost[]
  errors: { source: string; message: string }[]  // failed sources
}
```

## Scraping Strategy

### Job Sites (Cheerio)

Each scraper is an independent module in `lib/scrapers/`:
- Receives keyword → builds search URL for that site → fetches HTML → parses with Cheerio → returns `JobPost[]`
- Uses Node built-in `fetch()` with User-Agent header
- Each exports: `scrape(keyword: string): Promise<JobPost[]>`

Target sites:
- **TopCV:** `topcv.vn` search results page
- **VietnamWorks:** `vietnamworks.com` search results page
- **ITviec:** `itviec.com` search results page
- **TopDev:** `topdev.vn` search results page

### Facebook Groups (Puppeteer)

- Launches headless browser → navigates to each group URL
- Scrolls to load posts → parses DOM for post content
- Filters by keyword on the app side (Facebook groups have no public search URL)
- **Authentication:** Requires Facebook cookies stored in an env variable (`FB_COOKIES`) or a local `data/fb-cookies.json` file. User manually exports cookies from their logged-in browser session (e.g., via browser extension). The scraper injects these cookies before navigating.
- If cookies are missing or expired, the Facebook scraper is skipped gracefully with an error message

### Orchestration

```typescript
// In /api/jobs/search route handler
const results = await Promise.allSettled([
  scrapeTopcv(keyword),
  scrapeVietnamworks(keyword),
  scrapeItviec(keyword),
  scrapeTopdev(keyword),
  scrapeFacebook(keyword, groups),
])
// Collect fulfilled results, skip rejected
// Normalize dates → sort by postedAt descending (nulls last)
```

**Constraints:**
- Each scraper has a 15-second timeout via `AbortSignal.timeout(15000)`
- Max 20 results per source to keep response size manageable
- Keyword is sanitized (trim, max 100 chars) and URL-encoded before use in search URLs
- Date normalization: each scraper parses source-specific date formats (relative like "2 ngay truoc", absolute like "27/03/2026") into ISO 8601 strings. Null dates sort last.

## UI Design

### Page: `/jobs` (Client Component)

**Layout:**
- Search bar at top: input + button, debounce 500ms or Enter to search
- Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
- "Manage Groups" button opens dialog for Facebook group management

### Job Card

```
┌─────────────────────────────┐
│ [Source badge]    [postedAt] │
│                              │
│ Title (bold, max 2 lines)    │
│ Company name                 │
│ Location · Salary            │
│                              │
│ Description (max 3 lines)    │
│                              │
│ [tag] [tag] [tag]            │
│                              │
│ [Xem chi tiet →]  (ext link) │
└─────────────────────────────┘
```

- Source badge: different color per source
- "Xem chi tiet" opens original URL in new tab (`target="_blank"`)
- Hover effect (shadow/scale)

### States

- **Loading:** Skeleton cards (shadcn Skeleton)
- **Partial error:** Toast notification for failed sources, still show results from others
- **Empty:** Empty state message when no results
- **Initial:** Landing state before any search — shows a search prompt message ("Nhap tu khoa de tim viec lam...")

### Facebook Groups Dialog

- Shows current groups list
- Input to add new group URL
- Delete button per group

## TanStack Query Integration

### Setup

- Install `@tanstack/react-query`
- `QueryProvider` wrapper in `components/query-provider.tsx` (client component)
- Added to root layout

### Hooks

**`hooks/use-jobs-search.ts`:**
```typescript
export function useJobsSearch(keyword: string) {
  return useQuery({
    queryKey: ["jobs", keyword],
    queryFn: () => fetch(`/api/jobs/search?keyword=${encodeURIComponent(keyword)}`).then(r => r.json()),
    enabled: keyword.length > 0,
    staleTime: 5 * 60 * 1000,  // cache 5 minutes
    retry: 1,
  })
}
```

**`hooks/use-facebook-groups.ts`:**
```typescript
export function useFacebookGroups() {
  return useQuery({ queryKey: ["groups"], queryFn: fetchGroups })
}

export function useAddGroup() {
  return useMutation({ mutationFn: addGroup, onSuccess: invalidateGroups })
}

export function useRemoveGroup() {
  return useMutation({ mutationFn: removeGroup, onSuccess: invalidateGroups })
}
```

**`hooks/use-debounce.ts`:**
- Generic debounce hook, 500ms default

## File Structure

```
app/
  ├── layout.tsx              (add QueryProvider)
  ├── page.tsx                (redirect or link to /jobs)
  ├── jobs/
  │     └── page.tsx          (main page - search + grid)
  └── api/
        ├── jobs/
        │     └── search/
        │           └── route.ts   (GET - orchestrate scrapers)
        └── groups/
              └── route.ts         (GET/POST/DELETE - manage groups)

components/
  ├── ui/                     (shadcn components)
  ├── query-provider.tsx
  ├── job-card.tsx
  ├── job-search-bar.tsx
  ├── job-grid.tsx
  ├── jobs-loading-skeleton.tsx
  └── facebook-groups-dialog.tsx

hooks/
  ├── use-jobs-search.ts
  ├── use-facebook-groups.ts
  └── use-debounce.ts

lib/
  ├── utils.ts                (existing)
  └── scrapers/
        ├── types.ts           (JobPost, FacebookGroup interfaces)
        ├── topcv.ts
        ├── vietnamworks.ts
        ├── itviec.ts
        ├── topdev.ts
        └── facebook.ts

data/
  └── facebook-groups.json    (default + user-added groups)
```

## Dependencies to Install

**npm packages:**
- `@tanstack/react-query` — client-side data fetching and caching
- `cheerio` — HTML parsing for job sites
- `puppeteer` — headless browser for Facebook scraping

**shadcn/ui components:**
- `input`, `badge`, `card`, `skeleton`, `dialog`, `sheet`, `sonner`

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Facebook blocks scraping | Graceful fallback — show results from other sources, toast notification |
| Job sites change HTML structure | Each scraper is isolated — fix one without affecting others |
| Slow response (realtime scraping) | TanStack Query caching (5 min staleTime), loading skeletons for UX |
| Puppeteer heavy on deploy | Consider making Facebook scraping optional/toggleable |
