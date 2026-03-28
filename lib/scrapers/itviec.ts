import type { JobPost } from "./types"
import { createBrowserContext } from "./browser"
import {
  generateId,
  MAX_RESULTS_PER_SOURCE,
  parseRelativeDate,
  sanitizeKeyword,
  SCRAPE_TIMEOUT,
} from "./utils"

export async function scrapeItviec(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const url = `https://itviec.com/it-jobs?query=${encodeURIComponent(sanitized)}`

  const context = await createBrowserContext()
  try {
    const page = await context.newPage()
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: SCRAPE_TIMEOUT,
    })
    await page.waitForSelector(".job-card", { timeout: SCRAPE_TIMEOUT })

    const raw = await page.evaluate((max: number) => {
      return Array.from(document.querySelectorAll(".job-card"))
        .slice(0, max)
        .map((card) => {
          const h3 = card.querySelector("h3")
          const titleUrl = h3?.getAttribute("data-url") || ""
          const title = h3?.textContent?.trim() || ""

          const companyEl = card.querySelector('a[href*="/companies/"]')
          const company =
            companyEl?.textContent?.trim() ||
            card
              .querySelector(".text-rich-grey")
              ?.textContent?.trim() ||
            ""

          const salaryEl = card.querySelector(".salary")
          const salaryText = salaryEl?.textContent?.trim() || ""
          const salary = salaryText.includes("Sign in") ? null : salaryText

          const dateEl = card.querySelector(".small-text.text-dark-grey")
          const dateText = dateEl?.textContent?.trim() || ""

          const tags = Array.from(card.querySelectorAll(".itag"))
            .map((t) => t.textContent?.trim() || "")
            .filter(Boolean)

          return { title, titleUrl, company, salary, dateText, tags }
        })
    }, MAX_RESULTS_PER_SOURCE)

    return raw
      .filter((j) => j.title && j.titleUrl)
      .map((job) => {
        const jobUrl = job.titleUrl.startsWith("http")
          ? job.titleUrl
          : `https://itviec.com${job.titleUrl}`
        // Strip tracking params
        const cleanUrl = jobUrl.split("?")[0]!

        return {
          id: generateId("itviec", cleanUrl),
          title: job.title,
          company: job.company || null,
          location: null,
          salary: job.salary,
          description: "",
          url: cleanUrl,
          source: "itviec" as const,
          postedAt: parseRelativeDate(job.dateText),
          updatedAt: null,
          tags: job.tags,
        }
      })
  } finally {
    await context.close()
  }
}
