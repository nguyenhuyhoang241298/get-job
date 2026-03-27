export type JobSource =
  | "topcv"
  | "vietnamworks"
  | "itviec"
  | "topdev"
  | "facebook"

export interface JobPost {
  id: string
  title: string
  company: string | null
  location: string | null
  salary: string | null
  description: string
  url: string
  source: JobSource
  postedAt: string | null
  updatedAt: string | null
  tags: string[]
}

export interface FacebookGroup {
  id: string
  name: string
  url: string
}

export interface SearchResponse {
  results: JobPost[]
  errors: { source: string; message: string }[]
}
