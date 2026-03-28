import { scrapeCareerViet } from "@/lib/scrapers/careerviet"
import { scrapeItviec } from "@/lib/scrapers/itviec"
import { scrapeJobsgo } from "@/lib/scrapers/jobsgo"
import { scrapeTopcv } from "@/lib/scrapers/topcv"
import { scrapeTopdev } from "@/lib/scrapers/topdev"
import type { JobPost, SearchResponse } from "@/lib/scrapers/types"
import { scrapeViecoi } from "@/lib/scrapers/viecoi"
import { scrapeVietnamworks } from "@/lib/scrapers/vietnamworks"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword")?.trim() || ""
  if (!keyword || keyword.length > 100) {
    return NextResponse.json(
      { results: [], errors: [{ source: "api", message: "Invalid keyword" }] },
      { status: 400 }
    )
  }

  const scrapers = [
    { name: "topcv", fn: () => scrapeTopcv(keyword) },
    { name: "vietnamworks", fn: () => scrapeVietnamworks(keyword) },
    { name: "itviec", fn: () => scrapeItviec(keyword) },
    { name: "topdev", fn: () => scrapeTopdev(keyword) },
    { name: "jobsgo", fn: () => scrapeJobsgo(keyword) },
    { name: "viecoi", fn: () => scrapeViecoi(keyword) },
    { name: "careerviet", fn: () => scrapeCareerViet(keyword) },
  ]

  const settled = await Promise.allSettled(scrapers.map((s) => s.fn()))
  const results: JobPost[] = []
  const errors: SearchResponse["errors"] = []

  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      results.push(...result.value)
    } else {
      errors.push({
        source: scrapers[i]!.name,
        message: result.reason?.message || "Unknown error",
      })
    }
  })

  results.sort((a, b) => {
    if (!a.postedAt && !b.postedAt) return 0
    if (!a.postedAt) return 1
    if (!b.postedAt) return -1
    return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  })

  const response: SearchResponse = { results, errors }
  return NextResponse.json(response)
}
