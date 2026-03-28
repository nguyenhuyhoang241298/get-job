import type { JobSource } from "@/lib/scrapers/types"

export const sourceColors: Record<JobSource, string> = {
  topcv: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  vietnamworks: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  itviec: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  topdev:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  jobsgo:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  viecoi: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  careerviet:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
}

export const sourceLabels: Record<JobSource, string> = {
  topcv: "TopCV",
  vietnamworks: "VietnamWorks",
  itviec: "ITviec",
  topdev: "TopDev",
  jobsgo: "JobsGo",
  viecoi: "ViecOi",
  careerviet: "CareerViet",
}
