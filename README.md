# Get Job

Ung dung tong hop viec lam tu nhieu nguon tuyen dung Viet Nam va bai dang tu nhom Facebook. Xay dung bang Next.js 16, React 19, Tailwind CSS v4 va shadcn/ui.

## Tinh nang

- **Tim kiem viec lam** — truy van dong thoi 7 trang tuyen dung: TopCV, VietnamWorks, ITviec, TopDev, JobsGo, ViecOi, CareerViet
- **Thu thap bai dang Facebook** — doc bai viet tu cac nhom Facebook da cau hinh, hien thi tac gia, noi dung, luot tuong tac
- **Loc theo thoi gian** — 3 ngay, 7 ngay, hoac tat ca
- **Giao dien tieng Viet** — ho tro dark/light mode

## Yeu cau

- **Node.js** >= 18
- **pnpm** (package manager)
- **Playwright Chromium** — mot so scraper can trinh duyet headless

## Cai dat

```bash
# 1. Clone repo
git clone <repo-url>
cd get-job

# 2. Cai dat dependencies
pnpm install

# 3. Cai dat trinh duyet cho Playwright
npx playwright install chromium

# 4. Tao file cau hinh moi truong
cp .env.local.example .env.local
# (Hoac tao thu cong — xem huong dan ben duoi)

# 5. Chay dev server
pnpm dev
```

Ung dung se chay tai [http://localhost:3000](http://localhost:3000).

## Cau hinh `.env.local`

Tao file `.env.local` o thu muc goc cua project voi noi dung sau:

```bash
# ============================================
# Facebook Cookies (BAT BUOC neu dung tinh nang Facebook)
# ============================================
# Tinh nang tim kiem viec lam khong can bien nay.
# Chi can thiet khi muon thu thap bai dang tu nhom Facebook.
#
# Cach lay cookies:
#   1. Mo Chrome, dang nhap vao facebook.com
#   2. Nhan F12 (hoac Cmd+Option+I tren Mac) de mo DevTools
#   3. Chuyen sang tab "Application"
#   4. O thanh ben trai, chon Cookies > https://www.facebook.com
#   5. Tim va sao chep gia tri cua 4 cookie sau: c_user, xs, fr, datr
#   6. Dan vao bien FB_COOKIES theo dinh dang ben duoi
#
# Luu y:
#   - Cookies het han sau khoang 30–90 ngay
#   - Khi scraper bao loi xac thuc, can lay lai cookies moi
#   - KHONG chia se file .env.local hoac cookies cua ban cho bat ky ai
#
FB_COOKIES="c_user=YOUR_C_USER; xs=YOUR_XS; fr=YOUR_FR; datr=YOUR_DATR"

# ============================================
# Cau hinh scraper Facebook (TUY CHON)
# ============================================
# So trang cuon toi da khi doc bai dang tu moi nhom
# Mac dinh: 2 (tang len de lay nhieu bai hon, nhung se cham hon)
SCRAPE_MAX_PAGES=10

# Thoi gian cho giua moi lan cuon trang (milliseconds)
# Mac dinh: 3000 (3 giay). Giam xuong co the bi Facebook chan
SCRAPE_DELAY_MS=3000
```

### Giai thich tung bien

| Bien               | Bat buoc?              | Gia tri mac dinh | Mo ta                                                                                               |
| ------------------ | ---------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `FB_COOKIES`       | Co (neu dung Facebook) | —                | Chuoi cookies xac thuc Facebook. Gom 4 gia tri: `c_user`, `xs`, `fr`, `datr`, ngan cach boi dau `;` |
| `SCRAPE_MAX_PAGES` | Khong                  | `2`              | So lan cuon trang de tai them bai viet trong moi nhom Facebook                                      |
| `SCRAPE_DELAY_MS`  | Khong                  | `3000`           | Thoi gian nghi giua cac lan cuon (ms). Tranh dat qua thap de khong bi chan                          |

### Huong dan lay Facebook Cookies chi tiet

1. Mo trinh duyet Chrome va dang nhap tai [facebook.com](https://www.facebook.com)
2. Mo DevTools: nhan `F12` (Windows/Linux) hoac `Cmd + Option + I` (Mac)
3. Chuyen sang tab **Application** (neu khong thay, nhan `>>` de mo rong menu)
4. O panel ben trai, mo rong muc **Cookies** va chon `https://www.facebook.com`
5. Tim cac cookie sau trong bang:

   | Cookie   | Vi du gia tri                  |
   | -------- | ------------------------------ |
   | `c_user` | `100009155735923`              |
   | `xs`     | `28%3ADkfJ1NAvqCXZQ%3A2%3A...` |
   | `fr`     | `13s6ueYoeHkkDIB4Ln.AWcan...`  |
   | `datr`   | `zqxFaHqG3DDcsgbWnwDf2PPn`     |

6. Ghep lai theo dinh dang:
   ```
   FB_COOKIES="c_user=...; xs=...; fr=...; datr=..."
   ```
   Moi cap `key=value` cach nhau boi `; ` (dau cham phay + khoang trang).

> **Bao mat:** File `.env.local` da duoc them vao `.gitignore`. Khong bao gio commit file nay len git.

## Cac lenh thuong dung

| Lenh                          | Mo ta                       |
| ----------------------------- | --------------------------- |
| `pnpm dev`                    | Chay dev server (Turbopack) |
| `pnpm build`                  | Build phien ban production  |
| `pnpm start`                  | Chay production server      |
| `pnpm lint`                   | Kiem tra loi voi ESLint     |
| `pnpm format`                 | Format code voi Prettier    |
| `pnpm typecheck`              | Kiem tra kieu TypeScript    |
| `npx shadcn@latest add <ten>` | Them component shadcn/ui    |

## Cau truc du an

```
get-job/
├── app/
│   ├── layout.tsx              # Layout goc (theme, query provider)
│   ├── page.tsx                # Trang chu (redirect sang /jobs)
│   ├── jobs/page.tsx           # Trang tim kiem viec lam
│   ├── facebook-post/page.tsx  # Trang bai dang Facebook
│   └── api/
│       ├── jobs/search/        # API tim kiem viec lam
│       ├── groups/             # API quan ly nhom Facebook
│       └── facebook/posts/     # API lay bai dang Facebook
├── lib/scrapers/               # Cac scraper
│   ├── topcv.ts                # TopCV (HTML parsing)
│   ├── vietnamworks.ts         # VietnamWorks (API)
│   ├── itviec.ts               # ITviec (Playwright)
│   ├── topdev.ts               # TopDev (API)
│   ├── jobsgo.ts               # JobsGo (HTML parsing)
│   ├── viecoi.ts               # ViecOi (Playwright)
│   ├── careerviet.ts           # CareerViet (API)
│   ├── facebook.ts             # Facebook Groups (Playwright)
│   ├── browser.ts              # Cau hinh Playwright chung
│   ├── utils.ts                # Ham tien ich chung
│   └── types.ts                # TypeScript interfaces
├── components/                 # React components
│   ├── ui/                     # shadcn/ui components
│   ├── job-card.tsx            # Card hien thi viec lam
│   ├── job-search-bar.tsx      # Thanh tim kiem
│   ├── facebook-post-card.tsx  # Card bai dang Facebook
│   └── app-sidebar.tsx         # Sidebar dieu huong
├── hooks/                      # Custom React hooks
├── data/
│   └── facebook-groups.json    # Danh sach nhom Facebook da luu
└── .env.local                  # Bien moi truong (khong commit)
```

## API Endpoints

| Endpoint                       | Method | Mo ta                            |
| ------------------------------ | ------ | -------------------------------- |
| `/api/jobs/search?keyword=...` | GET    | Tim kiem viec lam theo tu khoa   |
| `/api/groups`                  | GET    | Lay danh sach nhom Facebook      |
| `/api/groups`                  | POST   | Them nhom Facebook moi           |
| `/api/groups`                  | DELETE | Xoa nhom Facebook                |
| `/api/facebook/posts`          | GET    | Thu thap bai dang tu tat ca nhom |

## Cong nghe su dung

- [Next.js 16](https://nextjs.org/) — React framework voi App Router
- [React 19](https://react.dev/) — UI library
- [Tailwind CSS v4](https://tailwindcss.com/) — Utility-first CSS
- [shadcn/ui](https://ui.shadcn.com/) — Component library (Radix + Tailwind)
- [Playwright](https://playwright.dev/) — Browser automation cho scraping
- [Cheerio](https://cheerio.js.org/) — HTML parsing
- [TanStack Query](https://tanstack.com/query) — Server state management
- [next-themes](https://github.com/pacocoursey/next-themes) — Dark/light mode
