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
  if (process.env.FB_COOKIES) {
    try {
      return JSON.parse(process.env.FB_COOKIES)
    } catch {
      return null
    }
  }
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
  groups: FacebookGroup[],
): Promise<JobPost[]> {
  const cookies = loadCookies()
  if (!cookies)
    throw new Error(
      "Facebook cookies not configured. Set FB_COOKIES env var or create data/fb-cookies.json",
    )
  return Promise.race([
    scrapeFacebookInner(keyword, groups, cookies),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Facebook scraper timed out")),
        SCRAPE_TIMEOUT,
      ),
    ),
  ])
}

async function scrapeFacebookInner(
  keyword: string,
  groups: FacebookGroup[],
  cookies: Cookie[],
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
        await page.evaluate(() => {
          window.scrollBy(0, 2000)
        })
        await new Promise((r) => setTimeout(r, 2000))

        const posts = await page.evaluate(() => {
          const items: {
            text: string
            url: string
            date: string
            author: string
          }[] = []
          document
            .querySelectorAll('[role="article"], [data-ad-preview="message"]')
            .forEach((el) => {
              const text = el.textContent || ""
              const linkEl = el.querySelector(
                'a[href*="/posts/"], a[href*="/permalink/"]',
              )
              const url = linkEl?.getAttribute("href") || ""
              const timeEl = el.querySelector("abbr, [data-utime], time")
              const date = timeEl?.textContent || ""
              const authorEl = el.querySelector("strong a, h4 a")
              const author = authorEl?.textContent || ""
              if (text && url) items.push({ text, url, date, author })
            })
          return items
        })

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
            postedAt: null,
            updatedAt: null,
            tags: [],
          })
        }
      } catch {
        continue
      }
    }
  } finally {
    await browser.close()
  }

  return jobs
}
