import { chromium, type Browser, type BrowserContext } from "playwright"

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) return browserInstance
  browserInstance = await chromium.launch({
    args: ["--disable-blink-features=AutomationControlled"],
  })
  return browserInstance
}

export async function createBrowserContext(): Promise<BrowserContext> {
  const browser = await getBrowser()
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "vi-VN",
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false })
  })
  return context
}
