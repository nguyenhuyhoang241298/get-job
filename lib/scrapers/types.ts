export type JobSource =
  | "topcv"
  | "vietnamworks"
  | "itviec"
  | "topdev"
  | "jobsgo"
  | "viecoi"
  | "careerviet"

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

export interface FacebookPost {
  id: string
  author: string | null
  content: string
  url: string
  groupName: string
  groupUrl: string
  reactions: string | null
  mediaUrls: string[]
  postedAt: string | null
}

export interface FacebookPostsResponse {
  results: FacebookPost[]
  errors: { source: string; message: string }[]
}

export interface SearchResponse {
  results: JobPost[]
  errors: { source: string; message: string }[]
}
