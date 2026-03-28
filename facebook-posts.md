# Facebook Group Job Aggregator — Requirements

## TL;DR

App Next.js chạy localhost, scrape bài tuyển dụng từ các nhóm Facebook (mbasic.facebook.com + Cheerio), hiển thị dạng feed, có search/filter, click vào link về bài gốc FB. **Không database, không deploy, không auth** — chỉ scrape real-time rồi hiển thị.

---

## 1. Bối cảnh

- Facebook **đã xóa toàn bộ Groups API** (04/2024) — không còn cách chính thức nào
- Phương pháp: **Scrape `mbasic.facebook.com`** — HTML thuần, parse bằng Cheerio, dùng cookies từ browser
- Chỉ chạy localhost, một mình dùng, không cần bảo mật phức tạp

---

## 2. Tech Stack

```
Next.js 15+ (App Router) + TypeScript
Tailwind CSS + shadcn/ui
TanStack Query v5
Cheerio (parse HTML)
```

---

## 3. Luồng hoạt động

```
User mở app
    │
    ▼
GET /api/posts ──► Scrape mbasic.facebook.com (tất cả groups trong config)
    │                  │
    │                  ├── Fetch HTML (với FB cookies)
    │                  ├── Parse bằng Cheerio
    │                  └── Extract: content, author, time, postUrl
    │
    ▼
Trả về JSON posts[] ──► Client render feed
    │
    ├── Search box (filter client-side trên data đã có)
    ├── Group filter (client-side)
    └── Reload button → invalidate query → gọi lại /api/posts
```

**Không database** — mỗi lần gọi API là scrape mới. TanStack Query cache phía client để tránh scrape lặp khi chưa cần.

---

## 4. Cấu trúc thư mục

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      # Trang chính
│   ├── api/
│   │   └── posts/
│   │       └── route.ts              # GET — scrape + trả JSON
│   └── globals.css
├── components/
│   ├── job-feed.tsx                  # Client component — list bài đăng
│   ├── job-card.tsx                  # Card mỗi bài
│   ├── search-bar.tsx                # Input search + debounce
│   ├── group-filter.tsx              # Filter theo group
│   └── reload-button.tsx             # Nút reload
├── lib/
│   ├── scraper/
│   │   ├── facebook-scraper.ts       # Fetch + parse mbasic.facebook.com
│   │   ├── html-parser.ts            # Cheerio selectors & extract logic
│   │   └── types.ts                  # Types
│   ├── hooks/
│   │   ├── use-posts.ts              # TanStack Query hook
│   │   └── use-debounce.ts
│   └── utils.ts                      # Helpers
├── providers/
│   └── query-provider.tsx
└── config/
    └── groups.ts                     # Danh sách group IDs
```

---

## 5. Config Groups

```typescript
// config/groups.ts
export const FACEBOOK_GROUPS = [
  {
    id: '123456789',
    name: 'Tuyển dụng IT',
    url: 'https://www.facebook.com/groups/123456789',
  },
  // thêm group ở đây...
] as const;
```

---

## 6. API Route

### GET /api/posts

```typescript
// app/api/posts/route.ts
//
// Flow:
// 1. Đọc FB_COOKIES từ env
// 2. Với mỗi group trong config → scrape mbasic.facebook.com/groups/{id}
// 3. Scrape SONG SONG tất cả groups (Promise.allSettled)
// 4. Mỗi group: fetch 1-3 trang (configurable), delay 3-5s giữa mỗi trang
// 5. Merge tất cả posts, sort theo thời gian mới nhất
// 6. Trả về JSON
//
// Response type:
// {
//   posts: {
//     id: string;            // fbPostId (dùng cho React key)
//     groupId: string;
//     groupName: string;
//     authorName: string;
//     content: string;
//     postUrl: string;       // https://www.facebook.com/groups/{gid}/posts/{pid}
//     postedAt: string;      // ISO string hoặc relative text
//     reactionCount: number;
//     commentCount: number;
//   }[];
//   scrapedAt: string;       // Thời điểm scrape
//   errors: string[];        // Errors nếu có group nào fail
// }
```

---

## 7. Scraper Module

### facebook-scraper.ts

```typescript
// lib/scraper/facebook-scraper.ts
//
// CORE FUNCTION:
// async function scrapeGroup(groupId: string, cookies: string, maxPages?: number): Promise<Post[]>
//
// STEPS:
// 1. Fetch `https://mbasic.facebook.com/groups/${groupId}`
//    Headers: { Cookie: cookies, 'User-Agent': randomMobileUA() }
// 2. Parse HTML bằng Cheerio
// 3. Extract posts (xem html-parser.ts)
// 4. Nếu có pagination link + chưa đạt maxPages → fetch trang tiếp (delay 3-5s)
// 5. Return Post[]
//
// PARALLEL FUNCTION:
// async function scrapeAllGroups(groups: Group[], cookies: string): Promise<ScrapeResult>
//   - Dùng Promise.allSettled để scrape song song
//   - Collect errors riêng, không để 1 group fail ảnh hưởng group khác
```

### html-parser.ts

```typescript
// lib/scraper/html-parser.ts
//
// Cheerio selectors cho mbasic.facebook.com:
//
// Post containers (thử theo thứ tự, dùng cái nào match):
//   1. '#m_group_stories_container article'
//   2. 'div[data-ft] article'
//   3. 'article[data-ft]'
//   4. '#structured_composer_async_container ~ div article'
//
// Trong mỗi article:
//   - Author: 'h3 a' hoặc 'strong a' (text = tên, href = profile link)
//   - Content: 'div[data-ft] > div > div' (text content chính)
//              Nếu có "See more" / "Xem thêm": follow link để lấy full text (optional)
//   - Timestamp: 'abbr' element hoặc link chứa '/story.php' → text
//   - Post link: 'a[href*="/story.php"]' hoặc 'a[href*="/permalink/"]'
//     → Extract post ID từ href, build URL: https://www.facebook.com/groups/{gid}/posts/{pid}
//   - Reactions: text match "Like" count hoặc reaction summary span
//   - Comments: text match "comment" count
//
// Pagination:
//   - 'a[href*="bacr="]' (link "See more posts" / "Xem thêm bài viết")
//   - Prepend 'https://mbasic.facebook.com' nếu href là relative
//
// CHÚ Ý QUAN TRỌNG:
//   - mbasic HTML CÓ THỂ thay đổi — code cần handle gracefully khi selector không match
//   - Luôn check null/undefined trước khi extract
//   - Log warning khi parse được 0 posts (có thể HTML đã thay đổi hoặc cookies hết hạn)
//   - Một số post chỉ có ảnh không có text → skip hoặc hiển thị "[Bài đăng có ảnh/video]"
```

### types.ts

```typescript
// lib/scraper/types.ts

export interface FacebookGroup {
  id: string;
  name: string;
  url: string;
}

export interface Post {
  id: string;           // Facebook post ID
  groupId: string;
  groupName: string;
  authorName: string;
  content: string;
  postUrl: string;
  postedAt: string;     // Raw text từ FB (e.g. "2 hrs" / "Yesterday")
  reactionCount: number;
  commentCount: number;
}

export interface ScrapeResult {
  posts: Post[];
  scrapedAt: string;
  errors: string[];
}
```

---

## 8. Frontend

### page.tsx (Server Component)

- Render layout tĩnh: header, search bar, filter, reload button
- Wrap `<JobFeed />` client component

### job-feed.tsx (Client Component)

```typescript
// Dùng TanStack Query:
// const { data, isLoading, error, refetch } = useQuery({
//   queryKey: ['posts'],
//   queryFn: () => fetch('/api/posts').then(r => r.json()),
//   staleTime: 5 * 60 * 1000,    // Cache 5 phút — tránh scrape lặp
//   refetchOnWindowFocus: false,  // Không tự động refetch
// });
//
// Search & Group filter: client-side filter trên data.posts
//   const filtered = posts.filter(p =>
//     p.content.toLowerCase().includes(searchTerm) &&
//     (!selectedGroup || p.groupId === selectedGroup)
//   );
//
// Reload button: onClick={() => refetch()}
```

### job-card.tsx

```
Mỗi card hiển thị:
┌─────────────────────────────────────────┐
│ [Group Badge]            2 giờ trước    │
│ Nguyễn Văn A                            │
│                                         │
│ Tuyển Frontend Developer, lương 20-30M  │
│ Yêu cầu: React, TypeScript, 2 năm...   │
│                                         │
│ 👍 12   💬 5        [Xem trên Facebook] │
└─────────────────────────────────────────┘

- Click card hoặc "Xem trên Facebook" → window.open(postUrl, '_blank')
- Content truncate 500 ký tự, hiện "..." nếu dài hơn
- Group badge: chip nhỏ có màu khác nhau mỗi group
```

### search-bar.tsx

- Input với debounce 300ms
- Tìm kiếm client-side trong `content` của posts đã fetch
- Hiện số kết quả: "Tìm thấy 15 bài"

### group-filter.tsx

- shadcn/ui Select hoặc ToggleGroup
- Options từ danh sách groups trong config
- "Tất cả" option mặc định

### reload-button.tsx

- Icon refresh (lucide-react RotateCw)
- Click → `refetch()` từ TanStack Query
- Loading state: icon spin
- Hiển thị "Cập nhật lần cuối: {scrapedAt}" bên cạnh

---

## 9. Environment Variables

```env
# .env.local

# Facebook cookies (BẮT BUỘC)
# Lấy từ DevTools > Application > Cookies > facebook.com
# Cần: c_user, xs, fr, datr
FB_COOKIES="c_user=xxx; xs=xxx; fr=xxx; datr=xxx"

# Scraper config (optional)
SCRAPE_MAX_PAGES=3
SCRAPE_DELAY_MIN=3000
SCRAPE_DELAY_MAX=5000
```

---

## 10. Hướng dẫn lấy Facebook Cookies

```
1. Mở Chrome, đăng nhập Facebook
2. F12 → Application → Cookies → https://www.facebook.com
3. Copy value của: c_user, xs, fr, datr
4. Paste vào .env.local:
   FB_COOKIES="c_user=12345; xs=abc123; fr=xyz789; datr=qwe456"
5. Cookies hết hạn sau ~30-90 ngày → cần lấy lại khi scraper báo lỗi
```

---

## 11. Lưu ý & Edge Cases

- **Cookies hết hạn** → API trả redirect/HTML login page → detect và trả error rõ ràng: "Cookies hết hạn, cần refresh"
- **Group HTML thay đổi** → Parser trả 0 posts → log warning chi tiết (URL, status code, HTML snippet)
- **Scrape chậm** → Nhiều groups + nhiều pages = vài chục giây → Client cần loading state tốt
- **Rate limit** → Delay 3-5s giữa mỗi request, tối đa 3 pages/group
- **Bài chỉ có ảnh** → Hiển thị "[Bài đăng có ảnh/video] — Xem trên Facebook"
- **Encoding** → mbasic có thể trả UTF-8 không chuẩn → handle với Cheerio `decodeEntities: true`
- **Dùng account phụ** → Tránh rủi ro bị lock account chính

---

## 12. Thứ tự triển khai

### Phase 1: Scraper hoạt động

1. Setup Next.js + TypeScript + Tailwind + shadcn/ui
2. Tạo config/groups.ts với 1-2 group test
3. Implement scraper: fetch mbasic + Cheerio parse
4. API route GET /api/posts
5. Test bằng curl/browser: `http://localhost:3000/api/posts`

### Phase 2: UI cơ bản

6. Job feed + Job card components
7. TanStack Query integration
8. Reload button

### Phase 3: Search & Filter

9. Search bar (client-side filter)
10. Group filter
11. Loading states + empty states + error handling
