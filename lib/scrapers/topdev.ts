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

export async function scrapeTopdev(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const slug = sanitized.replace(/\s+/g, "-")
  const url = `https://topdev.vn/viec-lam-it/${encodeURIComponent(slug)}-kw`
  const html = await fetchHtml(url, AbortSignal.timeout(SCRAPE_TIMEOUT))
  const $ = cheerio.load(html)
  const jobs: JobPost[] = []

  $(".job-item, .job-card, [data-job-slug], .card-job").each((_, el) => {
    if (jobs.length >= MAX_RESULTS_PER_SOURCE) return false
    const $el = $(el)
    const titleEl = $el
      .find("h3 a, .job-title a, a[href*='/viec-lam/']")
      .first()
    const title = titleEl.text().trim()
    const jobUrl = titleEl.attr("href") || ""
    const fullUrl = jobUrl.startsWith("http")
      ? jobUrl
      : `https://topdev.vn${jobUrl}`
    if (!title || !jobUrl) return

    const company =
      $el
        .find(".company-name, a[href*='/cong-ty/'], .employer-name")
        .first()
        .text()
        .trim() || null
    const salary =
      $el.find(".salary, .job-salary").first().text().trim() || null
    const location =
      $el.find(".location, .address, .city").first().text().trim() || null
    const description =
      $el.find(".job-description, .description").first().text().trim() || ""
    const dateText =
      $el.find(".time, .date, .updated-at").first().text().trim() || null

    const tags: string[] = []
    $el.find(".skill-tag, .tag, .badge, .technology").each((_, tagEl) => {
      const tag = $(tagEl).text().trim()
      if (tag) tags.push(tag)
    })

    jobs.push({
      id: generateId("topdev", fullUrl),
      title,
      company,
      location,
      salary,
      description,
      url: fullUrl,
      source: "topdev",
      postedAt: parseVietnameseDate(dateText),
      updatedAt: null,
      tags,
    })
  })

  return jobs
}
