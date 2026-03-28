"use client"

import { useMemo, useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FacebookPostCard } from "@/components/facebook-post-card"
import { useFacebookPosts } from "@/hooks/use-facebook-posts"
import { useFacebookGroups } from "@/hooks/use-facebook-groups"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useEffect, useRef } from "react"

export default function FacebookPostPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [groupFilter, setGroupFilter] = useState("all")
  const { data, isLoading, error, refetch, isFetching } = useFacebookPosts()
  const { data: groups = [] } = useFacebookGroups()
  const prevErrorsRef = useRef("")

  useEffect(() => {
    if (data?.errors && data.errors.length > 0) {
      const key = JSON.stringify(data.errors)
      if (key !== prevErrorsRef.current) {
        prevErrorsRef.current = key
        data.errors.forEach((e) => toast.error(e.message))
      }
    }
  }, [data?.errors])

  const filteredPosts = useMemo(() => {
    let posts = data?.results ?? []

    if (groupFilter !== "all") {
      posts = posts.filter((p) => p.groupName === groupFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      posts = posts.filter(
        (p) =>
          p.content.toLowerCase().includes(query) ||
          (p.author && p.author.toLowerCase().includes(query))
      )
    }

    return posts
  }, [data?.results, groupFilter, searchQuery])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Facebook Posts</h1>
        <p className="text-sm text-muted-foreground">
          Bai dang tu cac nhom Facebook
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tim kiem trong bai dang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tat ca nhom" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca nhom</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.name}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Tai lai"
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center text-destructive">
          Co loi xay ra. Vui long thu lai.
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {groups.length === 0
            ? "Chua co nhom Facebook nao. Them nhom trong sidebar de bat dau."
            : "Khong tim thay bai dang nao."}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {filteredPosts.length} bai dang
          </p>
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <FacebookPostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
