"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type { JobPost } from "@/lib/scrapers/types"
import { sourceColors, sourceLabels } from "@/lib/source-colors"
import { cn } from "@/lib/utils"
import { Banknote, ExternalLink, MapPin } from "lucide-react"

function formatDate(iso: string | null): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

export function JobCard({ job }: { job: JobPost }) {
  return (
    <Card className="group flex h-full flex-col transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className={cn("text-xs", sourceColors[job.source])}
          >
            {sourceLabels[job.source]}
          </Badge>
          {job.postedAt && (
            <span className="text-xs text-muted-foreground">
              {formatDate(job.postedAt)}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold">
          {job.title}
        </h3>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pb-3">
        {job.company && (
          <p className="text-sm text-muted-foreground">{job.company}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
          )}
          {job.salary && (
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-3 w-3" />
              {job.salary}
            </span>
          )}
        </div>
        {job.description && (
          <p className="line-clamp-3 text-xs text-muted-foreground">
            {job.description}
          </p>
        )}
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.tags.slice(0, 5).map((tag, i) => (
              <Badge
                key={`${tag}-${i}`}
                variant="outline"
                className="text-[10px]"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Xem chi tiet <ExternalLink className="h-3 w-3" />
        </a>
      </CardFooter>
    </Card>
  )
}
