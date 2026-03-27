"use client"

import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import { toast } from "sonner"
import { useDebounce } from "@/hooks/use-debounce"
import { useJobsSearch } from "@/hooks/use-jobs-search"
import { JobSearchBar } from "@/components/job-search-bar"
import { JobGrid } from "@/components/job-grid"
import { JobsLoadingSkeleton } from "@/components/jobs-loading-skeleton"
import { FacebookGroupsDialog } from "@/components/facebook-groups-dialog"

export default function JobsPage() {
  const [keyword, setKeyword] = useState("")
  const debouncedKeyword = useDebounce(keyword, 500)
  const { data, isLoading, error } = useJobsSearch(debouncedKeyword)
  const prevErrorsRef = useRef("")

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tim viec lam</h1>
          <p className="text-sm text-muted-foreground">
            Tong hop tu nhieu nguon tuyen dung
          </p>
        </div>
        <FacebookGroupsDialog />
      </div>

      <div className="mb-6">
        <JobSearchBar
          value={keyword}
          onChange={setKeyword}
          onSearch={() => {}}
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
          {data && (
            <p className="mb-4 text-sm text-muted-foreground">
              Tim thay {data.results.length} ket qua
            </p>
          )}
          <JobGrid jobs={data?.results ?? []} />
        </>
      )}
    </div>
  )
}
