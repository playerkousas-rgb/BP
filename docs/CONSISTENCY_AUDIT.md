# 一致性及規格對照 / Consistency audit

B-P Atlas v1.2 · © SCOUT SYSTEM · 2026-11-10

## 範圍與方法

以用戶本輪要求和根目錄 [`Readme`](../Readme) 為產品規格；基準為合併到 main 的 `e11f419`，檢視本分支相對該基準的工作樹。參考 [`playerkousas-rgb/readme`](https://github.com/playerkousas-rgb/readme/tree/c28d2d9dc3c06dab79fb66e1f9ad3e74f00d0788) 的 PLAYBOOK、[V1–V6 版本規則](https://github.com/playerkousas-rgb/readme/blob/c28d2d9dc3c06dab79fb66e1f9ad3e74f00d0788/docs/13-versioning.md)、[一致性審計](https://github.com/playerkousas-rgb/readme/blob/c28d2d9dc3c06dab79fb66e1f9ad3e74f00d0788/docs/32-consistency-audit.md)及設計 review 範本：**Standards、Spec、Mechanics 分開報告**，對照檔案及預期結果；以多寬度截圖找問題、修正、複檢，記錄不適用和未測項目。比較產品見 [RESEARCH.md](RESEARCH.md)，畫面修改見 [DESIGN_REVIEW.md](DESIGN_REVIEW.md)。

這是參考上述**方法**，不是聲稱已執行該庫的原生 `code-review`、`design-taste-frontend` skill、Chrome inspector 或完整通用 final checker；此環境沒有平行獨立 sub-agent，本產品亦有靜態免 build 的專案例外。沒有假設全部通用模板規則均適用。

## Spec：用戶意圖與實際交付

| 用戶要求 | 對照及證據 | 狀態／限制 |
|---|---|---|
| 保留貝登堡行跡 | `js/map.js`、`js/card.js` 保留站點、路線、說明與來源；`js/app.js` 在切換主題時保存本頁內的年份及相機；`tests/browser.e2e.mjs` 驗證切回行跡。 | 保留主要體驗；原大露營疊加層及人口小卡依要求拆走，改為獨立主題。 |
| 成員國／組織數目及版圖隨年份擴展 | `js/chronicles.js` 只按有來源的 `wosmMembership.year` 累積；`js/card.js` 把有年份的來源總數分開顯示及提供選單；地圖可選取逐欄來源。 | **研究示意，非已重建歷年會籍**：171 項現況名錄年份、5 項未知，前身／再加入／停會及已退出組織不能推斷；現代邊界不能當歷史國界。這是本軸最重要未完成項，不應聲稱完整歷史擴張。 |
| 世界大露營獨立時序 | `mode=jamborees` 按事件逐站、播放及分享；1979 取消可跳轉，虛線只連接已舉辦地點。 | 事件時間、座標及人數仍需逐項核實；2027 直到當年才可選。 |
| 世界童軍人口改為易瀏覽的獨立圖表 | `mode=population` 有大數字、圖表、來源年份選單、鍵盤、播放及逐點來源；`js/chart.js` 不連線、不插值。 | 只有疏落全球資料，不能真實製作國別排名動畫；1907 是營地、2025 是估算覆蓋，口徑不一致且部分來源待查。 |
| 借鑑江山時序及指定規則／審計 | `docs/RESEARCH.md`、本檔和設計 review 記錄借鑑與例外。 | 只借互動概念和檢查方法，沒有複製江山時序 GPL 程式／地圖，亦不冒稱執行了未跑的外部工具。 |

## Standards：版本、來源與專案規則

| 項目 | 實際處理 |
|---|---|
| V1 / V3 | HTML 原稿 `bp-atlas_v1.1.html`、`credits_v1.1.html` 從 v1.0 升版；v1.0 保留於 Git 基準 `e11f419`，版本記錄在 README。原規格指定的 `js/`、`css/`、`data/` 穩定路徑不加版本後綴，屬明示的 **V1 專案例外**。 |
| V2 | HTML 有 app-version meta、title、檔頭和可見 footer；runtime 常數在 `js/state.js`，自家 JS/CSS 有檔頭版號，`package.json` 和部署拷貝同步。固定路徑模組不各自新增獨立版本常數，以免多個真理來源；見設計 review 的例外。 |
| V4 / V6 | `scripts/sync-html.mjs` 將版本原稿同步至 `index.html`／`credits.html`；`scripts/guard.mjs` 檢查拷貝、版本、靜態引用、資產預算及疑似密鑰。守衛不驗史料或授權。 |
| V5 | 本產品沒有生成圖片、prompt、後端或 RECORDS，相關水印／backendVersion 規則不適用；版本與變更記錄在 README、檔頭和本審計。 |
| 來源與權利 | `data/sources.json`、欄位專屬來源、`CREDITS.md`、`vendor/LICENSES.txt` 及逐項 TSV 保留出處；專案程式與原創內容授權仍待擁有者決定。 |
| build／語言例外 | 原規格要求靜態免 build 及隨瀏覽器語言；不照搬通用 `dist` 和中文預設。具體例外見 [DESIGN_REVIEW.md](DESIGN_REVIEW.md#版本及規則例外)。 |

## Mechanics：發現、修正及複檢

| 發現／風險 | 修正與驗證 |
|---|---|
| 現有早期團體的 37 個年份不能當 WOSM 會籍。 | `chronicles.js` 分開兩欄；測試巴基斯坦在 WOSM 1948 有記錄但早期團體未知，哥斯達黎加主要會籍年份空白不着色。 |
| 同 ID 多個 map feature 原本被後一項覆蓋，澳洲本土不着色；小地區圓點需要與多邊形一致的年份視覺提示。 | `map.js` 保存同 ID 全部 feature；瀏覽器測試實測澳洲本土、離島、同色及單一鍵盤控制，以及香港／澳門類小地區的日期顏色和所選年描邊；2024 共 171 項均有相應圖形或標記。其他地圖拓撲仍待人手核實。 |
| 手機來源年份選單重建後保留焦點但抽屜捲動回頂，焦點移出視野。 | 重新繪製前保存位置；選單的替代節點確保在抽屜內。320×568 中英文 2018／2025 測試覆蓋焦點、視野及來源，另外驗證更換故事仍回到頂部。 |
| 短手機及 920–1000px 桌面表頭溢出、地圖計數與縮放鈕相撞；320px 人口首屏看不到數值。 | CSS 分斷點調整；用中英文、320／390／768／920／980／1024／1440px 量度並截圖複檢；測試短視窗 map controls 不相交。 |
| 成員播放若只走名錄日期，會跳過有來源總數的 2018／2025；人口年份稀疏不應線性補值。 | 年份序列採名錄日期與來源統計年份的聯集，來源總數仍獨立；人口只播放實際來源點，未有資料顯示「沒有統計」。單元及瀏覽器測試覆蓋。 |
| 舊連結的事件疊加和手機圖表被拆走。 | `js/state.js` 明確遷移 `jamboree`、`panel=chart`；`mode=spread`／裸 `nso` 保留早期團體語義。舊 `orgs`、`jamborees` 圖層開關不再作用，README 說明替代路徑；測試 URL、分享及重載。 |
| 卡片、來源、年份和可見版本容易不同步。 | `scripts/sync-html.mjs`、`scripts/guard.mjs`、`scripts/validate.js`、Node 與 Chromium 測試重跑；這些只驗程式和結構，不會判斷引用能否支持歷史聲稱。 |

## 未核實／未執行

- 未逐條復核歷史會籍、邊界、事件座標、人口定義、來源適切性或全部翻譯；詳見 [NSO_DATA.md](NSO_DATA.md) 及 [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)。
- 未在 iOS Safari、Android 實機、VoiceOver／TalkBack 作人工測試；axe 是自動規則，不是完整無障礙認證。截圖來自 headless Chromium，不代表所有裝置。
- 未執行上述外部原生 skill／inspector 或不適用於免 build 靜態站的通用 final checker，未把本地檢查稱作等價的完整審計。
- 本輪未部署、未推送或合併；上一次 main CI 成功不代表本輪或公開 Vercel 部署已驗證。


## v1.2 新增核對

| 項目 | 處理及限制 |
|---|---|
| 人口圖須改用柱形，不能把缺失年份當零或創造歷史數據。 | 只對有來源的人口年份畫比例柱；有資料年份等距，不是時間軸距離。選擇其他年份會顯示無資料；1907 柱極小但可用選單或整個類別點擊區選取。約數、下限、1907 營地、2025 估算覆蓋及出處均保留。 |
| 增加語言而不假裝已核譯全部歷史資料。 | 中、英、日、韓、法、西、印尼、葡萄牙、印地文介面和 20 站行跡均有譯文；現代地名利用瀏覽器 CLDR，詳細史料及部分來源標題回退英文／原文並提示。九語字串／佔位符、分享及窄螢幕有自動測試；翻譯品質仍需母語者審核。 |
| 版本與部署 | v1.1 保留於 Git 基準 `300e2f1`，現有 v1.2 原稿同步產生穩定 `index.html`／`credits.html`；仍為無建置的靜態部署。 |
