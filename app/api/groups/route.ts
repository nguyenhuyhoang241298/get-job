import { NextRequest, NextResponse } from "next/server"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import type { FacebookGroup } from "@/lib/scrapers/types"

const GROUPS_FILE = join(process.cwd(), "data", "facebook-groups.json")

function loadGroups(): FacebookGroup[] {
  try {
    return JSON.parse(readFileSync(GROUPS_FILE, "utf-8"))
  } catch {
    return []
  }
}

function saveGroups(groups: FacebookGroup[]) {
  writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2), "utf-8")
}

export async function GET() {
  return NextResponse.json(loadGroups())
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, url } = body as { name: string; url: string }
  if (!name?.trim() || !url?.trim()) {
    return NextResponse.json(
      { error: "Name and URL are required" },
      { status: 400 }
    )
  }
  if (!url.includes("facebook.com/groups/")) {
    return NextResponse.json(
      { error: "Must be a Facebook group URL" },
      { status: 400 }
    )
  }
  const groups = loadGroups()
  const newGroup: FacebookGroup = {
    id: Date.now().toString(),
    name: name.trim(),
    url: url.trim(),
  }
  groups.push(newGroup)
  saveGroups(groups)
  return NextResponse.json(newGroup, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { id } = (await request.json()) as { id: string }
  if (!id)
    return NextResponse.json({ error: "ID is required" }, { status: 400 })
  const groups = loadGroups()
  const filtered = groups.filter((g) => g.id !== id)
  if (filtered.length === groups.length) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }
  saveGroups(filtered)
  return NextResponse.json({ success: true })
}
