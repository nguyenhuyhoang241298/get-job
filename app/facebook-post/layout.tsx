import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Facebook Posts | Get Job",
  description: "Bai dang tu cac nhom Facebook",
}

export default function FacebookPostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
