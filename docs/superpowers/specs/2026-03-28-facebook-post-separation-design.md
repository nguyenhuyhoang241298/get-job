# Facebook Post Separation & Sidebar Navigation Design

## Overview

Tách Facebook scraper ra khỏi `/jobs`, tạo trang riêng `/facebook-post` hiển thị bài post đầy đủ, và thêm sidebar navigation với shadcn/ui.

## Sidebar

- Sử dụng shadcn/ui `sidebar` component (collapsible)
- 2 navigation items: **Jobs** (`/jobs`), **Facebook Posts** (`/facebook-post`)
- Section quản lý Facebook Groups nằm trong sidebar (thêm/xóa group) — di chuyển từ dialog hiện tại trong `/jobs`
- Collapsible: thu gọn thành icon khi user toggle
- Active state highlight cho trang hiện tại

## Trang `/facebook-post`

### Behavior

- Mặc định **load tất cả post** từ các Facebook groups đã config (không cần nhập keyword)
- Thanh search **filter client-side** — lọc theo keyword trong kết quả đã load
- Dropdown **filter theo group** cụ thể

### Facebook Post Card

Hiển thị đầy đủ thông tin:

- **Author** — tên người đăng
- **Nội dung** — không clamp, hiển thị toàn bộ
- **Reactions** — số lượng reactions
- **Media preview** — ảnh/media nếu có
- **Group name** — nhóm nào đăng
- **Thời gian đăng**
- **Link** — URL đến bài post gốc

### Layout

- Search bar + group filter ở trên
- Danh sách post dạng list (không grid — post dài hơn job card)

## API Changes

### Tạo mới: `GET /api/facebook/posts`

- Gọi Facebook scraper cho **tất cả groups** (không cần keyword param)
- Trả về danh sách post với đầy đủ thông tin (author, reactions, media, group info)
- Response type mới: `FacebookPost` (mở rộng từ `JobPost` hoặc type riêng)

### Sửa: `GET /api/jobs/search`

- Loại bỏ Facebook scraper — chỉ giữ 7 nguồn: topcv, vietnamworks, itviec, topdev, jobsgo, viecoi, careerviet

### Giữ nguyên: `/api/groups`

- CRUD Facebook groups — không thay đổi logic, chỉ di chuyển UI trigger vào sidebar

## Data Types

```typescript
interface FacebookPost {
  id: string
  author: string | null
  content: string
  url: string
  groupName: string
  groupUrl: string
  reactions: number
  mediaUrls: string[]
  postedAt: string | null
}
```

## Layout Changes

### `app/layout.tsx`

- Wrap content với `SidebarProvider` + `Sidebar` component
- Sidebar chứa navigation + Facebook groups management
- Main content area chứa page content

### File structure mới

```
app/
  layout.tsx              — thêm SidebarProvider wrapper
  page.tsx                — redirect /jobs (giữ nguyên)
  jobs/
    page.tsx              — loại bỏ Facebook groups dialog
    layout.tsx            — giữ nguyên
  facebook-post/
    page.tsx              — trang mới
    layout.tsx            — metadata
  api/
    jobs/search/route.ts  — loại bỏ Facebook scraper
    facebook/posts/route.ts — API mới
    groups/route.ts       — giữ nguyên

components/
  app-sidebar.tsx         — sidebar component mới
  facebook-post-card.tsx  — card component mới
  facebook-post-list.tsx  — list component mới
  facebook-search-bar.tsx — search + group filter

hooks/
  use-facebook-posts.ts   — React Query hook mới
```

## Migration

1. Di chuyển Facebook groups dialog UI vào sidebar
2. Loại bỏ Facebook import từ `/api/jobs/search`
3. Loại bỏ `facebook` khỏi `JobSource` type (hoặc giữ lại nếu cần backward compat)
4. Cập nhật `source-colors.ts` nếu cần
