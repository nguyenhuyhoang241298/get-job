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

export async function scrapeVietnamworks(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const url = `https://www.vietnamworks.com/tim-viec-lam/tat-ca-viec-lam?q=${encodeURIComponent(sanitized)}`
  const html = await fetchHtml(url, AbortSignal.timeout(SCRAPE_TIMEOUT))
  const $ = cheerio.load(html)
  const jobs: JobPost[] = []

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

    const company =
      $el
        .find("a[href*='/nha-tuyen-dung/'], .company-name")
        .first()
        .text()
        .trim() || null
    const salary =
      $el.find("[class*='salary'], .salary").first().text().trim() || null
    const location =
      $el.find("[class*='location'], .location").first().text().trim() || null
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
