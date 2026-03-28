import type { JobPost } from "./types"
import {
  generateId,
  MAX_RESULTS_PER_SOURCE,
  sanitizeKeyword,
  SCRAPE_TIMEOUT,
} from "./utils"

interface CareerVietJob {
  job_id: string
  job_title: string
  emp_name: string
  job_salary_string: string | null
  job_active_date: string | null
  location_name: string[]
  job_link: string
  benefit_name_vn: string[]
}

interface CareerVietResponse {
  success: boolean
  data: CareerVietJob[]
}

export async function scrapeCareerViet(keyword: string): Promise<JobPost[]> {
  const sanitized = sanitizeKeyword(keyword)
  const url = `https://internal-api.careerviet.vn/api/v1/js/jsk/jobs/public?keyword=${encodeURIComponent(sanitized)}&limit=${MAX_RESULTS_PER_SOURCE}`

  const res = await fetch(url, {
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching CareerViet API`)
  }

  const json = (await res.json()) as CareerVietResponse
  if (!json.success || !Array.isArray(json.data)) return []

  return json.data.map((job) => ({
    id: generateId("careerviet", job.job_id),
    title: job.job_title,
    company: job.emp_name || null,
    location: job.location_name?.join(", ") || null,
    salary: job.job_salary_string || null,
    description: "",
    url: job.job_link?.replace(/\/en\b/, "/vi") || "",
    source: "careerviet" as const,
    postedAt: job.job_active_date || null,
    updatedAt: null,
    tags: job.benefit_name_vn || [],
  }))
}
