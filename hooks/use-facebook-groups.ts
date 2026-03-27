"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { FacebookGroup } from "@/lib/scrapers/types"

export function useFacebookGroups() {
  return useQuery<FacebookGroup[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups")
      if (!res.ok) throw new Error("Failed to load groups")
      return res.json()
    },
  })
}

export function useAddGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (group: { name: string; url: string }) => {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(group),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add group")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })
}

export function useRemoveGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Failed to remove group")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })
}
