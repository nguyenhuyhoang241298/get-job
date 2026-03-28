import type { JobPost } from "./types"
import { generateId, MAX_RESULTS_PER_SOURCE, sanitizeKeyword, SCRAPE_TIMEOUT } from "./utils"

interface VietnamworksJob {
  jobId: number
  jobTitle: string
  jobUrl: string
  companyName: string
  prettySalary: string
  locations: string[]
  skills: { skillId: number; skillName: string }[]
  approvedOn: string | null
  lastUpdatedOn: string | null
  summary: string
}

interface VietnamworksResponse {
  meta: { code: number }
  data: VietnamworksJob[]
}

export async function scrapeVietnamworks(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const res = await fetch("https://ms.vietnamworks.com/job-search/v1.0/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: sanitized, offset: 0, limit: MAX_RESULTS_PER_SOURCE }),
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching vietnamworks API`)
  }

  const json: VietnamworksResponse = await res.json()
  if (json.meta.code !== 200 || !json.data) return []

  return json.data.slice(0, MAX_RESULTS_PER_SOURCE).map((job) => ({
    id: generateId("vietnamworks", job.jobUrl),
    title: job.jobTitle,
    company: job.companyName || null,
    location: job.locations?.join(", ") || null,
    salary: job.prettySalary || null,
    description: job.summary || "",
    url: job.jobUrl,
    source: "vietnamworks" as const,
    postedAt: job.approvedOn ? new Date(job.approvedOn).toISOString() : null,
    updatedAt: job.lastUpdatedOn ? new Date(job.lastUpdatedOn).toISOString() : null,
    tags: job.skills?.map((s) => s.skillName) || [],
  }))
}
