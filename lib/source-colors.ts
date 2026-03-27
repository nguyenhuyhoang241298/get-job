import type { JobSource } from "@/lib/scrapers/types"

export const sourceColors: Record<JobSource, string> = {
  topcv: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  vietnamworks: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  itviec: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  topdev: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  facebook: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
}

export const sourceLabels: Record<JobSource, string> = {
  topcv: "TopCV",
  vietnamworks: "VietnamWorks",
  itviec: "ITviec",
  topdev: "TopDev",
  facebook: "Facebook",
}
