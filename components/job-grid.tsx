"use client"

import type { JobPost } from "@/lib/scrapers/types"
import { JobCard } from "@/components/job-card"

export function JobGrid({ jobs }: { jobs: JobPost[] }) {
  if (jobs.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">Khong tim thay ket qua nao.</div>
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  )
}
