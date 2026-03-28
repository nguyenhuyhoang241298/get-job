import { createHash } from "crypto"

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

export function generateId(source: string, url: string): string {
  return createHash("md5").update(`${source}:${url}`).digest("hex")
}

export function sanitizeKeyword(keyword: string): string {
  return keyword.trim().slice(0, 100)
}

export async function fetchHtml(
  url: string,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal,
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  return res.text()
}

export function parseVietnameseDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  const cleaned = dateStr.trim().toLowerCase()
  const absMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (absMatch) {
    const [, day, month, year] = absMatch
    return new Date(
      `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`
    ).toISOString()
  }
  const now = new Date()
  // Normalize Vietnamese diacritics to ASCII equivalents for matching
  const normalized = cleaned
    .replace(/[áàảãạăắằẳẵặâấầẩẫậ]/g, "a")
    .replace(/[éèẻẽẹêếềểễệ]/g, "e")
    .replace(/[íìỉĩị]/g, "i")
    .replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, "o")
    .replace(/[úùủũụưứừửữự]/g, "u")
    .replace(/[ýỳỷỹỵ]/g, "y")
    .replace(/đ/g, "d")
  const relMatch = normalized.match(
    /(\d+)\s*(giay|phut|gio|ngay|tuan|thang|nam)/
  )
  if (relMatch) {
    const amount = parseInt(relMatch[1]!, 10)
    const unit = relMatch[2]!
    const offsets: Record<string, number> = {
      giay: 1000,
      phut: 60 * 1000,
      gio: 60 * 60 * 1000,
      ngay: 24 * 60 * 60 * 1000,
      tuan: 7 * 24 * 60 * 60 * 1000,
      thang: 30 * 24 * 60 * 60 * 1000,
      nam: 365 * 24 * 60 * 60 * 1000,
    }
    if (offsets[unit]) {
      return new Date(now.getTime() - amount * offsets[unit]).toISOString()
    }
  }
  const parsed = new Date(cleaned)
  if (!isNaN(parsed.getTime())) return parsed.toISOString()
  return null
}

export const MAX_RESULTS_PER_SOURCE = 20
export const SCRAPE_TIMEOUT = 15000

export function parseRelativeDate(text: string | null): string | null {
  if (!text) return null
  const cleaned = text.trim().toLowerCase()
  const now = new Date()

  // "Posted 2 days ago", "3 hours ago", etc.
  const match = cleaned.match(
    /(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/
  )
  if (match) {
    const amount = parseInt(match[1]!, 10)
    const unit = match[2]!
    const offsets: Record<string, number> = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    }
    if (offsets[unit]) {
      return new Date(now.getTime() - amount * offsets[unit]).toISOString()
    }
  }

  return parseVietnameseDate(cleaned)
}
