"use client"

import { JobGrid } from "@/components/job-grid"
import { JobSearchBar } from "@/components/job-search-bar"
import { JobsLoadingSkeleton } from "@/components/jobs-loading-skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDebounce } from "@/hooks/use-debounce"
import { useJobsSearch } from "@/hooks/use-jobs-search"
import type { JobPost } from "@/lib/scrapers/types"
import { Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

type DaysFilter = "3" | "7" | "all"

function filterByDays(jobs: JobPost[], days: DaysFilter): JobPost[] {
  if (days === "all") return jobs
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - Number(days))
  cutoff.setHours(0, 0, 0, 0)
  return jobs.filter((job) => {
    if (!job.postedAt) return false
    return new Date(job.postedAt) >= cutoff
  })
}

export default function JobsPage() {
  const [keyword, setKeyword] = useState("")
  const [daysFilter, setDaysFilter] = useState<DaysFilter>("3")
  const debouncedKeyword = useDebounce(keyword, 500)
  const { data, isLoading, error } = useJobsSearch(debouncedKeyword)
  const prevErrorsRef = useRef("")

  const filteredJobs = useMemo(
    () => filterByDays(data?.results ?? [], daysFilter),
    [data?.results, daysFilter]
  )

  useEffect(() => {
    if (data?.errors && data.errors.length > 0) {
      const key = JSON.stringify(data.errors)
      if (key !== prevErrorsRef.current) {
        prevErrorsRef.current = key
        const sources = data.errors.map((e) => e.source).join(", ")
        toast.warning(`Khong the lay du lieu tu: ${sources}`)
      }
    }
  }, [data?.errors])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Tim viec lam</h1>
        <p className="text-sm text-muted-foreground">
          Tong hop tu nhieu nguon tuyen dung
        </p>
      </div>

      <div className="mb-6">
        <JobSearchBar
          value={keyword}
          onChange={setKeyword}
          onSearch={() => {}}
          onReset={() => setKeyword("")}
          isLoading={isLoading}
        />
      </div>

      {!debouncedKeyword ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Search className="mb-4 h-12 w-12 opacity-20" />
          <p className="text-lg">Nhap tu khoa de tim viec lam...</p>
        </div>
      ) : isLoading ? (
        <JobsLoadingSkeleton />
      ) : error ? (
        <div className="py-12 text-center text-destructive">
          Co loi xay ra. Vui long thu lai.
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Tim thay {filteredJobs.length} ket qua
            </p>
            <Select
              value={daysFilter}
              onValueChange={(v) => setDaysFilter(v as DaysFilter)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 ngay gan nhat</SelectItem>
                <SelectItem value="7">7 ngay gan nhat</SelectItem>
                <SelectItem value="all">Tat ca</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <JobGrid jobs={filteredJobs} />
        </>
      )}
    </div>
  )
}
