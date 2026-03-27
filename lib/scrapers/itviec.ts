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

export async function scrapeItviec(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const url = `https://itviec.com/it-jobs?query=${encodeURIComponent(sanitized)}`
  const html = await fetchHtml(url, AbortSignal.timeout(SCRAPE_TIMEOUT))
  const $ = cheerio.load(html)
  const jobs: JobPost[] = []

  $(".job_content, .job-card, [data-search-result]").each((_, el) => {
    if (jobs.length >= MAX_RESULTS_PER_SOURCE) return false
    const $el = $(el)
    const titleEl = $el.find("h3 a, .job-title a, a[href*='/it-jobs/']").first()
    const title = titleEl.text().trim()
    const jobUrl = titleEl.attr("href") || ""
    const fullUrl = jobUrl.startsWith("http")
      ? jobUrl
      : `https://itviec.com${jobUrl}`
    if (!title || !jobUrl) return

    const company =
      $el.find(".company-name, a[href*='/companies/']").first().text().trim() ||
      null
    const salary =
      $el.find(".salary, .job-salary, .text-it-red").first().text().trim() ||
      null
    const location =
      $el.find(".city, .location, .job-city").first().text().trim() || null
    const description =
      $el.find(".job-description, .description").first().text().trim() || ""
    const dateText =
      $el.find(".time, .date, .updated-at").first().text().trim() || null

    const tags: string[] = []
    $el.find(".skill-tag, .tag, .badge").each((_, tagEl) => {
      const tag = $(tagEl).text().trim()
      if (tag) tags.push(tag)
    })

    jobs.push({
      id: generateId("itviec", fullUrl),
      title,
      company,
      location,
      salary,
      description,
      url: fullUrl,
      source: "itviec",
      postedAt: parseVietnameseDate(dateText),
      updatedAt: null,
      tags,
    })
  })

  return jobs
}
