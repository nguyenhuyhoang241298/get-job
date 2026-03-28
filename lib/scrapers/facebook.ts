import { createBrowserContext } from "./browser"
import type { FacebookPost, FacebookGroup } from "./types"
import { generateId } from "./utils"

const SCROLL_DELAY_MS = parseInt(process.env.SCRAPE_DELAY_MS || "3000", 10)
const SCROLL_COUNT = parseInt(process.env.SCRAPE_MAX_PAGES || "2", 10)

function parseCookieString(
  cookieStr: string
): { name: string; value: string; domain: string; path: string }[] {
  return cookieStr.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=")
    return {
      name: name!.trim(),
      value: rest.join("=").trim(),
      domain: ".facebook.com",
      path: "/",
    }
  })
}

interface RawPost {
  author: string
  content: string
  reactions: string
  groupName: string
  groupUrl: string
}

async function scrapeGroup(
  group: FacebookGroup,
  cookieStr: string
): Promise<FacebookPost[]> {
  const cookies = parseCookieString(cookieStr)
  const context = await createBrowserContext()

  try {
    await context.addCookies(cookies)
    const page = await context.newPage()

    await page.goto(group.url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    })
    await page.waitForTimeout(3000)

    // Scroll to load more posts
    for (let i = 0; i < SCROLL_COUNT; i++) {
      await page.evaluate(() => window.scrollBy(0, 2000))
      await page.waitForTimeout(SCROLL_DELAY_MS)
    }

    // Check for login redirect
    const currentUrl = page.url()
    if (currentUrl.includes("/login")) {
      throw new Error("Facebook cookies hết hạn, cần lấy lại")
    }

    // Extract posts from feed
    const groupInfo = { name: group.name, url: group.url }
    const rawPosts: RawPost[] = await page.evaluate(
      (info: { name: string; url: string }) => {
        const feed = document.querySelector('div[role="feed"]')
        if (!feed) return []

        const results: RawPost[] = []

        Array.from(feed.children).forEach((child) => {
          const el = child as HTMLElement

          // Content from data-ad-preview="message"
          const msgEl = el.querySelector('div[data-ad-preview="message"]')
          const content = msgEl?.textContent?.trim() || ""
          if (!content || content.length < 10) return

          // Author from h2 heading
          const heading = el.querySelector("h2, h3")
          const author = heading?.textContent?.trim() || ""

          // Reactions from aria-label
          let reactions = ""
          el.querySelectorAll("[aria-label]").forEach((el2) => {
            const label = el2.getAttribute("aria-label") || ""
            const match = label.match(
              /(Thích|Like):\s*(.+)/i
            )
            if (match) reactions = match[2]!
          })

          results.push({
            author,
            content,
            reactions,
            groupName: info.name,
            groupUrl: info.url,
          })
        })

        return results
      },
      groupInfo
    )

    if (rawPosts.length === 0) {
      console.warn(
        `facebook: 0 posts parsed from ${group.name} (${group.url}). Page structure may have changed.`
      )
    }

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
  } finally {
    await context.close()
  }
}

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
