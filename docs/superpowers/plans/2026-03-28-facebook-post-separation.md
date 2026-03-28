# Facebook Post Separation & Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách Facebook scraper ra khỏi /jobs, tạo trang /facebook-post riêng với đầy đủ thông tin bài post, và thêm sidebar navigation collapsible với shadcn/ui.

**Architecture:** Thêm shadcn/ui sidebar vào root layout, tạo API endpoint riêng cho Facebook posts (load tất cả, không cần keyword), tạo trang /facebook-post với client-side filtering. Loại bỏ Facebook khỏi /api/jobs/search.

**Tech Stack:** Next.js 16, React 19, shadcn/ui sidebar, TanStack React Query, Playwright, Tailwind CSS v4

---

### Task 1: Install shadcn/ui sidebar component

**Files:**
- Create: `components/ui/sidebar.tsx` (via shadcn CLI)

- [ ] **Step 1: Install sidebar component**

Run: `npx shadcn@latest add sidebar`

- [ ] **Step 2: Verify installation**

Run: `ls components/ui/sidebar.tsx`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add components/ui/sidebar.tsx
git commit -m "chore: add shadcn/ui sidebar component"
```

---

### Task 2: Add FacebookPost type and FacebookPostsResponse

**Files:**
- Modify: `lib/scrapers/types.ts`

- [ ] **Step 1: Add FacebookPost interface and response type**

Add to `lib/scrapers/types.ts` after the existing `FacebookGroup` interface:

```typescript
export interface FacebookPost {
  id: string
  author: string | null
  content: string
  url: string
  groupName: string
  groupUrl: string
  reactions: string | null
  mediaUrls: string[]
  postedAt: string | null
}

export interface FacebookPostsResponse {
  results: FacebookPost[]
  errors: { source: string; message: string }[]
}
```

- [ ] **Step 2: Remove "facebook" from JobSource**

Change `JobSource` to:

```typescript
export type JobSource =
  | "topcv"
  | "vietnamworks"
  | "itviec"
  | "topdev"
  | "jobsgo"
  | "viecoi"
  | "careerviet"
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: Errors in files that still reference `"facebook"` source — this is expected, we fix them in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add lib/scrapers/types.ts
git commit -m "feat: add FacebookPost type, remove facebook from JobSource"
```

---

### Task 3: Refactor Facebook scraper to return FacebookPost[]

**Files:**
- Modify: `lib/scrapers/facebook.ts`

- [ ] **Step 1: Update scraper to return FacebookPost[]**

Replace the `scrapeGroup` return mapping and `scrapeFacebook` function. The scraper should:
- Export a new function `scrapeFacebookPosts(groups: FacebookGroup[]): Promise<FacebookPost[]>` that loads ALL posts (no keyword filtering)
- `scrapeGroup` should return `FacebookPost[]` instead of `JobPost[]`
- Keep the old `scrapeFacebook` export temporarily for backward compat (it will be removed in Task 5)

Update the return mapping in `scrapeGroup` (lines 114-135) to:

```typescript
return rawPosts.map((raw, i) => ({
  id: generateId("facebook", `${raw.groupUrl}#${i}#${raw.content.slice(0, 50)}`),
  author: raw.author || null,
  content: raw.content || "[Bài đăng có ảnh/video]",
  url: raw.groupUrl,
  groupName: raw.groupName,
  groupUrl: raw.groupUrl,
  reactions: raw.reactions || null,
  mediaUrls: [],
  postedAt: null,
}))
```

Change `scrapeGroup` return type from `Promise<JobPost[]>` to `Promise<FacebookPost[]>`.

Add export function:

```typescript
export async function scrapeFacebookPosts(
  groups: FacebookGroup[]
): Promise<FacebookPost[]> {
  const cookieStr = process.env.FB_COOKIES?.trim()
  if (!cookieStr) {
    console.warn("facebook: FB_COOKIES not configured, skipping")
    return []
  }

  if (groups.length === 0) {
    return []
  }

  const allPosts: FacebookPost[] = []

  for (const group of groups) {
    try {
      const posts = await scrapeGroup(group, cookieStr)
      allPosts.push(...posts)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`facebook: failed to scrape ${group.name}:`, message)
      if (message.includes("hết hạn")) {
        throw new Error("Facebook cookies hết hạn, cần lấy lại")
      }
    }
  }

  return allPosts
}
```

Remove the old `scrapeFacebook` function entirely (it will no longer be needed after Task 5).

- [ ] **Step 2: Update imports**

Replace `import type { JobPost, FacebookGroup } from "./types"` with:

```typescript
import type { FacebookPost, FacebookGroup } from "./types"
```

Remove unused imports (`sanitizeKeyword`, `MAX_RESULTS_PER_SOURCE`) if no longer needed.

- [ ] **Step 3: Commit**

```bash
git add lib/scrapers/facebook.ts
git commit -m "refactor: facebook scraper returns FacebookPost[], no keyword filtering"
```

---

### Task 4: Create /api/facebook/posts endpoint

**Files:**
- Create: `app/api/facebook/posts/route.ts`

- [ ] **Step 1: Create the API route**

Create `app/api/facebook/posts/route.ts`:

```typescript
import { scrapeFacebookPosts } from "@/lib/scrapers/facebook"
import type { FacebookGroup, FacebookPostsResponse } from "@/lib/scrapers/types"
import { readFileSync } from "fs"
import { NextResponse } from "next/server"
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

export async function GET() {
  const groups = loadGroups()

  if (groups.length === 0) {
    return NextResponse.json<FacebookPostsResponse>({
      results: [],
      errors: [],
    })
  }

  try {
    const results = await scrapeFacebookPosts(groups)
    return NextResponse.json<FacebookPostsResponse>({ results, errors: [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json<FacebookPostsResponse>({
      results: [],
      errors: [{ source: "facebook", message }],
    })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/facebook/posts/route.ts
git commit -m "feat: add /api/facebook/posts endpoint"
```

---

### Task 5: Remove Facebook scraper from /api/jobs/search

**Files:**
- Modify: `app/api/jobs/search/route.ts`
- Modify: `lib/source-colors.ts`

- [ ] **Step 1: Remove Facebook from jobs search API**

In `app/api/jobs/search/route.ts`:
- Remove `import { scrapeFacebook } from "@/lib/scrapers/facebook"`
- Remove `import type { FacebookGroup } from "@/lib/scrapers/types"` (keep JobPost, SearchResponse)
- Remove the `loadGroups()` function
- Remove `const groups = loadGroups()` line
- Remove `{ name: "facebook", fn: () => scrapeFacebook(keyword, groups) }` from scrapers array

- [ ] **Step 2: Remove facebook from source-colors**

In `lib/source-colors.ts`, remove the `facebook` entry from both `sourceColors` and `sourceLabels` records. Update the import type — `JobSource` no longer includes `"facebook"` so no code changes needed to the type.

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS (no more references to facebook in JobSource context)

- [ ] **Step 4: Commit**

```bash
git add app/api/jobs/search/route.ts lib/source-colors.ts
git commit -m "refactor: remove Facebook scraper from /api/jobs/search"
```

---

### Task 6: Create app-sidebar component

**Files:**
- Create: `components/app-sidebar.tsx`

- [ ] **Step 1: Create the sidebar component**

Create `components/app-sidebar.tsx`:

```tsx
"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Briefcase, Facebook, Plus, Trash2 } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  useFacebookGroups,
  useAddGroup,
  useRemoveGroup,
} from "@/hooks/use-facebook-groups"

const navItems = [
  { title: "Tim viec lam", href: "/jobs", icon: Briefcase },
  { title: "Facebook Posts", href: "/facebook-post", icon: Facebook },
]

export function AppSidebar() {
  const pathname = usePathname()
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
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Briefcase className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Get Job</span>
                  <span className="text-xs text-muted-foreground">
                    Tong hop viec lam
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Trang</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Facebook Groups</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 px-2">
              <Input
                placeholder="Ten nhom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="URL nhom Facebook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                onClick={handleAdd}
                disabled={addGroup.isPending || !name.trim() || !url.trim()}
                size="sm"
                className="w-full"
              >
                <Plus className="mr-1 h-3 w-3" />
                {addGroup.isPending ? "Dang them..." : "Them nhom"}
              </Button>

              <div className="space-y-1 pt-2">
                {isLoading && (
                  <p className="text-xs text-muted-foreground">Dang tai...</p>
                )}
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-md border p-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {group.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeGroup.mutate(group.id)}
                      disabled={removeGroup.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {!isLoading && groups.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Chua co nhom nao.
                  </p>
                )}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat: create AppSidebar with navigation and Facebook groups management"
```

---

### Task 7: Integrate sidebar into root layout

**Files:**
- Modify: `app/layout.tsx`
- Delete: `components/facebook-groups-dialog.tsx` (no longer needed)
- Modify: `app/jobs/page.tsx` (remove FacebookGroupsDialog import)

- [ ] **Step 1: Update root layout**

Replace `app/layout.tsx` content:

```tsx
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { Toaster } from "@/components/ui/sonner"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
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
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <ThemeProvider>
          <QueryProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="flex h-12 items-center border-b px-4">
                  <SidebarTrigger />
                </header>
                <main>{children}</main>
              </SidebarInset>
            </SidebarProvider>
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Remove FacebookGroupsDialog from jobs page**

In `app/jobs/page.tsx`:
- Remove `import { FacebookGroupsDialog } from "@/components/facebook-groups-dialog"`
- Remove `<FacebookGroupsDialog />` from the JSX (line 66)

The header section becomes:

```tsx
<div className="mb-8">
  <h1 className="text-2xl font-bold">Tim viec lam</h1>
  <p className="text-sm text-muted-foreground">
    Tong hop tu nhieu nguon tuyen dung
  </p>
</div>
```

- [ ] **Step 3: Delete facebook-groups-dialog.tsx**

Run: `rm components/facebook-groups-dialog.tsx`

- [ ] **Step 4: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/jobs/page.tsx
git rm components/facebook-groups-dialog.tsx
git commit -m "feat: integrate sidebar into root layout, remove FacebookGroupsDialog"
```

---

### Task 8: Create useFacebookPosts hook

**Files:**
- Create: `hooks/use-facebook-posts.ts`

- [ ] **Step 1: Create the hook**

Create `hooks/use-facebook-posts.ts`:

```typescript
"use client"

import { useQuery } from "@tanstack/react-query"
import type { FacebookPostsResponse } from "@/lib/scrapers/types"

export function useFacebookPosts() {
  return useQuery<FacebookPostsResponse>({
    queryKey: ["facebook-posts"],
    queryFn: async () => {
      const res = await fetch("/api/facebook/posts")
      if (!res.ok) throw new Error("Failed to load Facebook posts")
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-facebook-posts.ts
git commit -m "feat: add useFacebookPosts hook"
```

---

### Task 9: Create FacebookPostCard component

**Files:**
- Create: `components/facebook-post-card.tsx`

- [ ] **Step 1: Create the card component**

Create `components/facebook-post-card.tsx`:

```tsx
"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { FacebookPost } from "@/lib/scrapers/types"
import { ExternalLink, ThumbsUp, User, Users } from "lucide-react"
import Image from "next/image"

export function FacebookPostCard({ post }: { post: FacebookPost }) {
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className="bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200"
          >
            <Users className="mr-1 h-3 w-3" />
            {post.groupName}
          </Badge>
          {post.postedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(post.postedAt).toLocaleDateString("vi-VN")}
            </span>
          )}
        </div>
        {post.author && (
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <User className="h-4 w-4 text-muted-foreground" />
            {post.author}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {post.content}
        </p>

        {post.mediaUrls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {post.mediaUrls.slice(0, 4).map((url, i) => (
              <div
                key={i}
                className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-md"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}

        {post.reactions && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ThumbsUp className="h-3 w-3" />
            {post.reactions}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Xem tren Facebook <ExternalLink className="h-3 w-3" />
        </a>
      </CardFooter>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/facebook-post-card.tsx
git commit -m "feat: create FacebookPostCard component"
```

---

### Task 10: Create /facebook-post page

**Files:**
- Create: `app/facebook-post/page.tsx`
- Create: `app/facebook-post/layout.tsx`

- [ ] **Step 1: Create layout with metadata**

Create `app/facebook-post/layout.tsx`:

```tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Facebook Posts | Get Job",
  description: "Bai dang tu cac nhom Facebook",
}

export default function FacebookPostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

- [ ] **Step 2: Create the page**

Create `app/facebook-post/page.tsx`:

```tsx
"use client"

import { useMemo, useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FacebookPostCard } from "@/components/facebook-post-card"
import { useFacebookPosts } from "@/hooks/use-facebook-posts"
import { useFacebookGroups } from "@/hooks/use-facebook-groups"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useEffect, useRef } from "react"

export default function FacebookPostPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [groupFilter, setGroupFilter] = useState("all")
  const { data, isLoading, error, refetch, isFetching } = useFacebookPosts()
  const { data: groups = [] } = useFacebookGroups()
  const prevErrorsRef = useRef("")

  useEffect(() => {
    if (data?.errors && data.errors.length > 0) {
      const key = JSON.stringify(data.errors)
      if (key !== prevErrorsRef.current) {
        prevErrorsRef.current = key
        data.errors.forEach((e) => toast.error(e.message))
      }
    }
  }, [data?.errors])

  const filteredPosts = useMemo(() => {
    let posts = data?.results ?? []

    if (groupFilter !== "all") {
      posts = posts.filter((p) => p.groupName === groupFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      posts = posts.filter(
        (p) =>
          p.content.toLowerCase().includes(query) ||
          (p.author && p.author.toLowerCase().includes(query))
      )
    }

    return posts
  }, [data?.results, groupFilter, searchQuery])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Facebook Posts</h1>
        <p className="text-sm text-muted-foreground">
          Bai dang tu cac nhom Facebook
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tim kiem trong bai dang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tat ca nhom" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca nhom</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.name}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Tai lai"
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center text-destructive">
          Co loi xay ra. Vui long thu lai.
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {groups.length === 0
            ? "Chua co nhom Facebook nao. Them nhom trong sidebar de bat dau."
            : "Khong tim thay bai dang nao."}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {filteredPosts.length} bai dang
          </p>
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <FacebookPostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/facebook-post/page.tsx app/facebook-post/layout.tsx
git commit -m "feat: create /facebook-post page with client-side filtering"
```

---

### Task 11: Final cleanup and verification

**Files:**
- Verify all files

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Fix any issues found**

Address any typecheck/lint/build errors.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve typecheck and lint issues"
```
