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

  const containers = $("article, div[data-ft]")

  containers.each((_, el) => {
    const $el = $(el)

    const authorEl = $el.find("h3 a, strong a").first()
    const author = authorEl.text().trim()

    let content = ""
    const paragraphs = $el.find("p")
    if (paragraphs.length > 0) {
      content = paragraphs
        .map((_, p) => $(p).text().trim())
        .get()
        .join("\n")
    }
    if (!content) {
      const textDivs = $el.find("div > div > div")
      content = textDivs.first().text().trim()
    }

    const timestampEl = $el.find("abbr").first()
    const timestamp = timestampEl.text().trim() || null

    let postUrl: string | null = null
    $el.find("a[href]").each((_, a) => {
      const href = $(a).attr("href") || ""
      if (href.includes("/story.php") || href.includes("/permalink/")) {
        postUrl = href.startsWith("http")
          ? href
          : `https://mbasic.facebook.com${href}`
      }
    })

    let reactionCount = 0
    let commentCount = 0
    $el.find("a[href]").each((_, a) => {
      const text = $(a).text().trim()
      const reactionMatch = text.match(/^(\d+)$/)
      if (reactionMatch && !commentCount) {
        reactionCount = parseInt(reactionMatch[1]!, 10)
      }
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
  let nextUrl: string | null = null
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") || ""
    if (href.includes("bacr=")) {
      nextUrl = href.startsWith("http")
        ? href
        : `https://mbasic.facebook.com${href}`
      return false
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
  const storyMatch = rawUrl.match(/story_fbid=(\d+)/)
  const permalinkMatch = rawUrl.match(/\/permalink\/(\d+)/)
  const postId = storyMatch?.[1] || permalinkMatch?.[1]
  if (postId) {
    return `https://www.facebook.com/groups/${groupSlug}/posts/${postId}`
  }
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

    const $ = cheerio.load(html)
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

  const filtered = allPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(sanitized) ||
      post.description.toLowerCase().includes(sanitized)
  )

  return filtered.slice(0, MAX_RESULTS_PER_SOURCE)
}
