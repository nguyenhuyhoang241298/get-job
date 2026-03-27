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

export async function scrapeTopcv(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const url = `https://www.topcv.vn/tim-viec-lam-${encodeURIComponent(sanitized.replace(/\s+/g, "-"))}`
  const html = await fetchHtml(url, AbortSignal.timeout(SCRAPE_TIMEOUT))
  const $ = cheerio.load(html)
  const jobs: JobPost[] = []

  $(".job-item-search-result, .job-list-item, [data-job-id]").each((_, el) => {
    if (jobs.length >= MAX_RESULTS_PER_SOURCE) return false
    const $el = $(el)
    const titleEl = $el.find("h3 a, .title a, a.job-title").first()
    const title = titleEl.text().trim()
    const jobUrl = titleEl.attr("href") || ""
    const fullUrl = jobUrl.startsWith("http")
      ? jobUrl
      : `https://www.topcv.vn${jobUrl}`
    if (!title || !jobUrl) return

    const company =
      $el.find(".company-name, a[href*='/cong-ty/']").first().text().trim() ||
      null
    const salary =
      $el.find(".salary, .job-salary, .muc-luong").first().text().trim() || null
    const location =
      $el.find(".location, .job-location, .dia-diem").first().text().trim() ||
      null
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
      id: generateId("topcv", fullUrl),
      title,
      company,
      location,
      salary,
      description,
      url: fullUrl,
      source: "topcv",
      postedAt: parseVietnameseDate(dateText),
      updatedAt: null,
      tags,
    })
  })

  return jobs
}
