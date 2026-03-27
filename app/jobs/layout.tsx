import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tim viec lam - Job Aggregator",
  description: "Tong hop viec lam tu nhieu nguon tuyen dung",
}

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
