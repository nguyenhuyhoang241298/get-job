import * as cheerio from "cheerio"
import type { JobPost } from "./types"
import {
  generateId,
  sanitizeKeyword,
  MAX_RESULTS_PER_SOURCE,
  SCRAPE_TIMEOUT,
} from "./utils"
import { createBrowserContext } from "./browser"

export async function scrapeViecoi(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const slug = encodeURIComponent(sanitized.replace(/\s+/g, "-"))
  const url = `https://viecoi.vn/tim-viec/key-${slug}.html`

  const context = await createBrowserContext()
  let html: string
  try {
    const page = await context.newPage()
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: SCRAPE_TIMEOUT })
    await page.waitForSelector("div.vo-jobs-item", { timeout: SCRAPE_TIMEOUT })
    html = await page.content()
  } finally {
    await context.close()
  }

  const $ = cheerio.load(html)
  const jobs: JobPost[] = []

  $("div.vo-jobs-item.item_job").each((_, el) => {
    if (jobs.length >= MAX_RESULTS_PER_SOURCE) return false
    const $el = $(el)
    const titleEl = $el.find("a.title_container").first()
    const title = $el.find(".job-title-name").first().text().trim()
    const jobUrl = titleEl.attr("href") || ""
    const fullUrl = jobUrl.startsWith("http")
      ? jobUrl
      : `https://viecoi.vn${jobUrl}`
    if (!title || !jobUrl) return

    const company = $el.find("a.a-company").first().text().trim() || null
    const salary =
      $el
        .find(".icon-hight-light .added-detail-information.hight-light-txt")
        .first()
        .text()
        .trim() || null
    const locations: string[] = []
    $el.find(".location-container a").each((_, a) => {
      const loc = $(a).text().trim()
      if (loc) locations.push(loc)
    })
    const location = locations.join(", ") || null

    const deadline =
      $el
        .find(".job_overflow:last-child .added-detail-information")
        .first()
        .text()
        .trim() || null

    const tags: string[] = []
    $el.find(".list-tag a.cp-tag").each((_, tagEl) => {
      const tag = $(tagEl).text().trim()
      if (tag) tags.push(tag)
    })

    jobs.push({
      id: generateId("viecoi", fullUrl),
      title,
      company,
      location,
      salary,
      description: deadline ? `Han nop: ${deadline}` : "",
      url: fullUrl,
      source: "viecoi",
      postedAt: null,
      updatedAt: null,
      tags,
    })
  })

  return jobs
}
