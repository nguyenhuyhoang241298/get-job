# Facebook Scraper Redesign — mbasic.facebook.com + Cheerio

## Summary

Rewrite `lib/scrapers/facebook.ts` to replace Puppeteer with mbasic.facebook.com HTML scraping via Cheerio. The current Puppeteer-based scraper is non-functional due to Facebook's complex DOM on www.facebook.com. mbasic serves simple HTML that is stable and lightweight to parse.

## Approach

**mbasic.facebook.com + Cheerio** over Playwright because:

- Puppeteer on www.facebook.com already failed (current scraper is broken)
- mbasic HTML is simple, no JS rendering needed
- Lightweight — HTTP fetch + string parsing, no browser instance (~200-500MB RAM saved)
- Fast — scraping 4 groups x 3 pages takes ~10-15s vs 30-60s+ with browser
- Consistent with project patterns (TopCV, JobsGo also use Cheerio)
- Removes puppeteer dependency

## Scraper Core — `lib/scrapers/facebook.ts`

### Functions

```
scrapeGroup(groupUrl, cookies, maxPages)
  -> Fetch mbasic.facebook.com/groups/{slug} with cookies header
  -> Parse HTML with Cheerio
  -> Extract per post: author, content, timestamp, postUrl, reactions, comments
  -> If pagination link exists + pages < maxPages -> delay -> fetch next page
  -> Return JobPost[]

scrapeFacebook(keyword, groups)
  -> Promise.allSettled(groups.map(g => scrapeGroup(...)))
  -> Merge results, filter by keyword match in content
  -> Slice to MAX_RESULTS_PER_SOURCE (20)
```

### HTML Selectors (mbasic.facebook.com)

- **Post container:** `article` or `div[data-ft]`
- **Author:** `h3 a` or `strong a` (text = name)
- **Content:** main text div inside article
- **Timestamp:** `abbr` element or link containing `/story.php`
- **Post URL:** `a[href*="/story.php"]` or `a[href*="/permalink/"]` -> build `https://www.facebook.com/groups/{gid}/posts/{pid}`
- **Reactions/Comments:** parse text counts from reaction/comment summary elements

### Mapping to JobPost

```typescript
{
  id: generateId("facebook", postUrl),
  title: content.slice(0, 150),
  company: authorName,          // post author name
  location: groupName,          // group name as location
  salary: null,
  description: content.slice(0, 500),
  url: postUrl,
  source: "facebook",
  postedAt: parseRelativeDate(timestamp),
  updatedAt: null,
  tags: ["👍 12", "💬 5", groupName],
}
```

## Environment & Config

### `.env.local` (template for user)

```env
# Facebook cookies (REQUIRED)
# Get from DevTools > Application > Cookies > facebook.com
FB_COOKIES="c_user=xxx; xs=xxx; fr=xxx; datr=xxx"

# Facebook scraper config (optional)
SCRAPE_MAX_PAGES=2
SCRAPE_DELAY_MS=3000
```

### No changes needed to:

- `data/facebook-groups.json` — keep existing 4 groups + CRUD API
- `lib/scrapers/types.ts` — `JobSource` and `JobPost` already have `"facebook"`
- `app/api/jobs/search/route.ts` — already calls `scrapeFacebook()`, just match function signature
- `lib/source-colors.ts` — already configured for `"facebook"`

### Cleanup:

- Remove `puppeteer` from `package.json`
- Rewrite `lib/scrapers/facebook.ts` in-place

## Error Handling & Edge Cases

### Cookies expired

- Detect: response URL contains `/login` or HTML has login form
- Error message: `"Facebook cookies het han, can lay lai"`
- Collected by `Promise.allSettled` in route -> displayed as toast on UI (existing)

### Image/video-only posts (no text)

- Set title = `"[Bai dang co anh/video]"`
- Keep postUrl so user can view on Facebook

### mbasic HTML selector changes

- 0 posts parsed -> log warning with URL + status code
- No crash, return empty array + error message

### Rate limiting / blocking

- Configurable delay between pages (default 3000ms)
- Add random 0-2000ms jitter to avoid pattern detection
- Mobile User-Agent header

### Timeouts

- Use `SCRAPE_TIMEOUT` (15s) from utils for each fetch request
- Total max time = maxPages x (timeout + delay) per group, but groups run in parallel
