"use client"

import { useQuery } from "@tanstack/react-query"
import type { SearchResponse } from "@/lib/scrapers/types"

export function useJobsSearch(keyword: string) {
  return useQuery<SearchResponse>({
    queryKey: ["jobs", keyword],
    queryFn: async () => {
      const res = await fetch(
        `/api/jobs/search?keyword=${encodeURIComponent(keyword)}`
      )
      if (!res.ok) throw new Error("Search failed")
      return res.json()
    },
    enabled: keyword.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
