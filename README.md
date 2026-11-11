# 貝登堡行跡 · B-P Atlas v1.1

> © SCOUT SYSTEM · Research prototype / 研究草稿，**未達正式上線的資料核實標準**。

沿着世界地圖和時間軸探索貝登堡的旅程、成員版圖和世界大露營，並在獨立圖表瀏覽世界童軍人口。介面支援繁體中文和英文。玩法靈感來自 [江山時序](https://github.com/DeanChensj/jiangshan-map)；本專案的介面、程式和資料獨立製作。

This is an unofficial, mobile-first atlas of Baden-Powell and World Scouting. It is not affiliated with WOSM or any Scout association. All historical records remain **research drafts**, not verified publication-ready claims.

## 現況與限制 / Status

- **四個獨立主題**：保留 B-P 的地圖、逐站故事和播放；成員版圖按年份探索現行名錄；世界大露營有自己的逐站時序和地點；人口演變有獨立圖表、年份選單、播放和逐點來源。切換主題時保留本次頁面內各主題的年份和鏡頭；分享網址只保存目前主題。
- 20 個 B-P 行跡、26 屆世界大露營及 1979 年取消紀錄；2027 年資料已收錄，但只會在時間軸到達該年後顯示。大露營虛線只是按**已舉行**地點順序連接，不是實際旅行路線；取消的 1979 年以獨立標記表示。
- **成員版圖是名錄日期累積示意，不是歷年真實會員總數或歷史疆界**：在所選年以前，現時名錄中有 `wosmMembership.year` 的所在地着色，日期越早顏色越深；未知不着色。名錄中的 171 個年份可能涉及前身或重加入，未能表示停會或連續會籍。右側另列來源在特定年份報告的組織／國家數，兩者口徑不同、不能直接比較：例如 1922 年地圖累積 19 個現況名錄年份，歷史來源則記載 31；2024 年累積 171，而 8 月 10 日來源報 175、同年後來增至 176。可以從來源統計年份選單跳轉，播放會經過名錄及統計有記錄的年份。
- **現況名錄**有 176 項研究資料（參照 2026 年 11 月查閱的 WOSM 名錄與維基百科）；數目與 WOSM 公布的 176 相同，不代表每項已核實，也不能將組織數簡單等同國家數。加拿大特殊個案及跨地區組織另作說明。
- **早期團體地圖**可在成員版圖內切換，與 WOSM 會籍年份分開；暫有 37 個地區找到可指向早期童軍團／旅的來源並顯示暫定年份，個別年份只表示「最遲當年已有記錄」（例如菲律賓 1911），不一定是成立年，亦不保證該團是最早、活動或會籍持續至今。其餘 139 項沒有這類已採用的年份，未着色不等於沒有童軍；巴基斯坦亦未定。舊樣本中未有足夠依據的年份只保留為不着色的研究線索。
- **WOSM 會籍年份**優先呈現在名錄及資料卡：176 個所在地項目中 171 項有現行 WOSM 名錄或新聞的優先年份（169 項名錄年份欄、1 項名錄歷史、1 項 WOSM 新聞）。4 項名錄年份及歷史欄空白，蘇丹詳細頁未能開啟；這五項卡片另列 WOSM 舊存檔年份，但不將其冒充為現行名錄值，其中哥斯達黎加的存檔年份亦互有分歧。加拿大卡片另外說明 WOSM 特殊個案 Association des Scouts du Canada 未列獨立入會年，不把 Scouts Canada 的年份直接套用。WOSM 年份可能涉及前身或重新加入，並非必然首次入會；斯洛文尼亞等仍有未解矛盾。詳細方法及[逐項核對表](docs/research/wosm-directory-audit-2026-11.tsv)見 [NSO data notes](docs/NSO_DATA.md)。
- 31 條世界人口／成員組織紀錄仍待核實，圖表只畫來源數據點；沒有資料的年份留空，不連線或插值。1907 的 20 人是白浪島營地，早於 WOSM 成立。2025 年約 6,000 萬是**估算覆蓋人數**，不是登記普查；統計口徑會改變，並不包括 WAGGGS。個別組織人數暫未整理，不能把缺失當作零。詳見 [來源與口徑](CREDITS.md#membership-figures)。
- 擁有者的 [SCOUTWORLD](https://github.com/playerkousas-rgb/scoutworld/tree/bc645cf6fdd70043665f0bc7de277f8f8b14fbf5) 作為名稱和研究線索；沒有將該庫混用定義的 `founded` 或缺乏逐項出處的人口直接匯入，也沒有批量複製未明示授權的內容。
- 使用簡化後 Natural Earth **現代**邊界（示意用途，並不表示對邊界或地區地位的立場）；沒有歷史國界、地區中斷、搜尋或問答功能。
- 現行名稱參照 WOSM 名錄及維基百科；美國採用 Scouting America 對外名稱，法定名稱仍為 Boy Scouts of America。中文地名和組織名稱為暫譯，部分組織保留原文。組織成立、早期團體及入會／再認可年份分列，亦有欄位個別出處及衝突註記。
- 每張說明卡有雙語內容、出處和研究草稿標記。出處存在不等於已驗證其支持每一項聲稱；[上線清單](docs/RELEASE_CHECKLIST.md) 列明阻擋事項。
- 瀏覽器只載入本地 ES modules、SVG 和 JSON，沒有後端、CDN、外部字型或執行時建置。地圖互動包括拖動、滾輪、雙指縮放、時間軸、播放、圖表和可分享網址。

原始產品規格保留於 [`Readme`](Readme)。

## 本機啟動 / Run locally

需要 Python 3（或任何靜態檔案伺服器）；**不需要 npm 安裝或 build 才能使用網站**。請勿直接雙擊 HTML，因為瀏覽器通常不允許 `file://` 載入模組和資料。

```bash
python3 -m http.server 4173 --bind 0.0.0.0
# 開啟 http://localhost:4173/；手機測試可用同網絡設備的主機網址
```

網址例子：

- `?lang=en&mode=journey&year=1907&stop=brownsea`：B-P 的白浪島站。
- `?lang=en&mode=members&year=1948&nso=PAK`：依 WOSM 名錄年份選取巴基斯坦；選取會將年份推至該記錄年份或之後。
- `?lang=en&mode=jamborees&year=1979&jamboree=jamboree-1979-cancelled`：大露營取消紀錄。
- `?lang=en&mode=population&year=2025`：人口來源數字；缺數據年份會顯示沒有統計。
- `?lang=en&year=2020&mode=spread&nso=HKG`：**舊版早期團體連結仍有效**；`?nso=PAK&ref=1&year=1907` 是獨立於時間軸的現況參考，不改年、不選中／聚焦地圖。沒有明確 `mode=members` 的舊 `?nso=` 沿用早期團體日期，不把入會年當成起步年。

`lang` 可為 `zh`／`en`；未指定時跟隨瀏覽器語言。`stop`、`jamboree`、地圖鏡頭 `view` 和手機故事抽屜 `panel=story` 可分享；無效及未到的未來紀錄安全回退。舊 `panel=chart` 會帶年份開啟獨立人口圖表，舊的 `orgs`／`jamborees` 疊加開關已移除：大露營轉到獨立主題，組織數改在成員版圖的來源統計年份中查看。舊 `jamboree=<id>` 連結會開啟該獨立時序。

## 檢查 / Verification

Node.js 22+ is recommended. Structural validation and unit tests do not need installed dependencies:

```bash
npm run check             # static guard, data structure/source references, node:test
```

Optional end-to-end tests use **development-only** Playwright and axe dependencies and a local Chromium. They do not become part of the website and do not add a build step:

```bash
npm ci
npx playwright install chromium    # CI/Linux may need: npx playwright install --with-deps chromium
npm run test:browser
```

Set `CHROMIUM_EXECUTABLE=/path/to/chromium` to use an existing Chromium. In constrained environments, `CHROMIUM_SINGLE_PROCESS=1` adds the necessary headless flags. Tests cover all four views and playback, member dates versus sourced counts, multi-part map features, directory/reference isolation, field-specific citations, legacy and new share/reload links, keyboard focus, genuine two-finger touch input, mobile drawers, language, error recovery, source-page rendering and representative axe audits; physical-device, Safari and assistive-technology testing remain release tasks.

`npm run validate` checks structure, bilingual fields, coordinates, references, TopoJSON size/winding and record counts. **It does not fact-check history, source relevance, boundary accuracy, content rights or launch readiness.**

## 編輯及版本 / Editing and versioning

- **版本紀錄**：2026-11-10 從 v1.0 升至 v1.1，分離成員、大露營和人口體驗；v1.0 源檔保留於 Git 的 `e11f419` 歷史。
- `bp-atlas_v1.1.html` 和 `credits_v1.1.html` 是版本化 HTML 原稿；`index.html` 和 `credits.html` 是部署用固定檔名拷貝。修改原稿後執行 `node scripts/sync-html.mjs`；`node scripts/sync-html.mjs --check` 檢查同步。網站部署本身不執行此步驟。
- `js/`、`css/` 與 `data/` 保留原規格的穩定檔名，作為共享 V1 命名規則的項目特定例外；每個自家 JS／CSS 有版號註記，版本由 `js/state.js`、HTML meta/title/footer 和 `package.json` 對照。升版時同步版本化 HTML、程式常數、頁面文字、部署拷貝、測試及紀錄（見 [設計審視](docs/DESIGN_REVIEW.md#版本及規則例外)及[一致性審計](docs/CONSISTENCY_AUDIT.md)）。
- 出處主檔是 `data/sources.json`；`data/nso.json` 的 `wosmMembership` 標明年份、依據和欄位專屬來源，並保留舊的 `membershipYears`／`membershipSources`；`scoutingStartSources`、`organisationFoundedSources` 分別支持早期團體和現行組織成立欄位。在早期團體視圖中 `scoutingStart: null` 不上色；在成員版圖中只按 `wosmMembership.year` 着色，不以早期團體或舊存檔補值；`startLead` 和 `wikiFoundingLead` 只是待核實線索。不同會籍年份可能包括前身和再認可，也可能有未解矛盾，不等於連續會籍。資料方法及衝突見 [`docs/NSO_DATA.md`](docs/NSO_DATA.md)。網站來源頁另按 `data/membership.json` 列統計出處和各序列的精度。
- 可選維護腳本 `scripts/build_world.sh` 從 `world-atlas@2.0.2` 的 Natural Earth 1:50m 資料重新簡化並修正球面環方向。這不是部署步驟；mapshaper 曾提示有無法修復的相交，仍須人工檢查。`scripts/build_vendor.sh` 可重建已固定版本的本地地理程式庫，更新依賴時須同時檢查第三方授權。

## Vercel

此版本的 Vercel 設定是 **Other / 靜態根目錄**：`vercel.json` 明確跳過 install 及 build，沒有 output `dist`、環境變數、Supabase 或 API key。將 repo 匯入 Vercel 後，確認 Framework Preset 是 Other，Output Directory 使用根目錄，Build／Install Command 留空。`.vercelignore` 排除測試、維護腳本和版本原稿；`index.html`、`credits.html`、`css/`、`js/`、`data/`、`vendor/`、`icons/` 必須保留。

這是對共享範本「build 至 dist」的明確例外，因為產品規格要求無建置。尚未指定正式網域，故沒有寫死 `og:url` 或絕對 `og:image`；定域後可使用已準備的 `icons/og-image.png`。資料與授權核實前不要當作正式成品公開發佈。

## 授權及致謝 / Rights and credits

本專案程式及原創內容的授權**尚待擁有者確認**；原規格只是建議 MIT／CC BY 4.0，並非已經授權。見 [`LICENSE`](LICENSE)（僅為狀態說明，非授權條款）及 [`CREDITS.md`](CREDITS.md)。維基百科改編資料按 CC BY-SA 4.0，貢獻者及修訂歷史見致謝頁；Natural Earth 為公有領域；Unicode CLDR 和第三方程式庫授權見 [`vendor/LICENSES.txt`](vendor/LICENSES.txt)。沒有使用童軍徽章、各總會商標或未核實版權的歷史照片。
