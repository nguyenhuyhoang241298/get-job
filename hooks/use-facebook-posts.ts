"use client"

import { useQuery } from "@tanstack/react-query"
import type { FacebookPostsResponse } from "@/lib/scrapers/types"

export function useFacebookPosts() {
  return useQuery<FacebookPostsResponse>({
    queryKey: ["facebook-posts"],
    queryFn: async () => {
      const res = await fetch("/api/facebook/posts")
      if (!res.ok) throw new Error("Failed to load Facebook posts")
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
