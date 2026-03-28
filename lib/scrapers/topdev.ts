import type { JobPost } from "./types"
import {
  generateId,
  MAX_RESULTS_PER_SOURCE,
  sanitizeKeyword,
  SCRAPE_TIMEOUT,
} from "./utils"

interface TopdevJob {
  title: string
  slug: string
  detail_url: string
  salary: { value: string } | null
  skills_str: string
  addresses: { address_region_array: string[] } | null
  company: { display_name: string } | null
  published: { datetime: string } | null
  refreshed: { datetime: string } | null
}

interface TopdevResponse {
  data: TopdevJob[]
  meta: { total: number }
}

export async function scrapeTopdev(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const params = new URLSearchParams({
    keyword: sanitized,
    page: "1",
    "fields[job]":
      "id,title,salary,slug,company,skills_str,addresses,detail_url,published,refreshed",
    "fields[company]": "tagline,addresses",
    locale: "vi_VN",
  })

  const res = await fetch(
    `https://api.topdev.vn/td/v2/jobs/search/v2?${params}`,
    {
      headers: {
        Accept: "application/json",
        Origin: "https://topdev.vn",
        Referer: "https://topdev.vn/",
      },
      signal: AbortSignal.timeout(SCRAPE_TIMEOUT),
    }
  )

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching topdev API`)
  }

  const json: TopdevResponse = await res.json()
  if (!json.data) return []

  return json.data.slice(0, MAX_RESULTS_PER_SOURCE).map((job) => {
    const url = job.detail_url || `https://topdev.vn/viec-lam/${job.slug}`
    return {
      id: generateId("topdev", url),
      title: job.title,
      company: job.company?.display_name || null,
      location: job.addresses?.address_region_array?.join(", ") || null,
      salary: job.salary?.value || null,
      description: "",
      url,
      source: "topdev" as const,
      postedAt: parseTopdevDate(job.published?.datetime),
      updatedAt: parseTopdevDate(job.refreshed?.datetime),
      tags: job.skills_str ? job.skills_str.split(", ") : [],
    }
  })
}

function parseTopdevDate(datetime: string | null | undefined): string | null {
  if (!datetime) return null
  // Format: "00:00:00 17-03-2026"
  const match = datetime.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (!match) return null
  const [, day, month, year] = match
  return new Date(`${year}-${month}-${day}`).toISOString()
}
