import { scrapeFacebookPosts } from "@/lib/scrapers/facebook"
import type { FacebookGroup, FacebookPostsResponse } from "@/lib/scrapers/types"
import { readFileSync } from "fs"
import { NextResponse } from "next/server"
import { join } from "path"

function loadGroups(): FacebookGroup[] {
  try {
    const data = readFileSync(
      join(process.cwd(), "data", "facebook-groups.json"),
      "utf-8"
    )
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function GET() {
  const groups = loadGroups()

  if (groups.length === 0) {
    return NextResponse.json<FacebookPostsResponse>({
      results: [],
      errors: [],
    })
  }

  try {
    const results = await scrapeFacebookPosts(groups)
    return NextResponse.json<FacebookPostsResponse>({ results, errors: [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json<FacebookPostsResponse>({
      results: [],
      errors: [{ source: "facebook", message }],
    })
  }
}
