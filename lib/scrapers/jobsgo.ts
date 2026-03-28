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

export async function scrapeJobsgo(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const slug = encodeURIComponent(sanitized.replace(/\s+/g, "-"))
  const url = `https://jobsgo.vn/viec-lam-${slug}-tai-ha-noi.html`
  const html = await fetchHtml(url, AbortSignal.timeout(SCRAPE_TIMEOUT))
  const $ = cheerio.load(html)
  const jobs: JobPost[] = []

  $("div.job-card[data-id]").each((_, el) => {
    if (jobs.length >= MAX_RESULTS_PER_SOURCE) return false
    const $el = $(el)
    const linkEl = $el.find("> a[href]").first()
    const titleEl = $el.find("h3.job-title").first()
    const title = titleEl.text().trim()
    const jobUrl = linkEl.attr("href") || ""
    const fullUrl = jobUrl.startsWith("http")
      ? jobUrl
      : `https://jobsgo.vn${jobUrl}`
    if (!title || !jobUrl) return

    const company = $el.find(".company-title").first().text().trim() || null

    const infoRow = $el.find(".text-primary.fw-semibold").first()
    const spans = infoRow.find("> span")
    const salary = spans.eq(0).text().trim() || null
    const location = spans.eq(2).text().trim() || null

    const dateText =
      $el
        .find('span.badge-custom[title="Thời gian cập nhật"]')
        .first()
        .text()
        .trim() || null

    const tags: string[] = []
    $el
      .find('span.badge-custom[title="Loại hình"]')
      .each((_, tagEl) => {
        const tag = $(tagEl).text().trim()
        if (tag) tags.push(tag)
      })
    $el
      .find('span.badge-custom[title="Yêu cầu kinh nghiệm"]')
      .each((_, tagEl) => {
        const tag = $(tagEl).text().trim()
        if (tag) tags.push(tag)
      })

    jobs.push({
      id: generateId("jobsgo", fullUrl),
      title,
      company,
      location,
      salary,
      description: "",
      url: fullUrl,
      source: "jobsgo",
      postedAt: parseVietnameseDate(dateText),
      updatedAt: null,
      tags,
    })
  })

  return jobs
}
