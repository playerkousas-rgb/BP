# 設計參考 / Comparative research

B-P Atlas v1.2 · © SCOUT SYSTEM · Reviewed 2026-11-10

只研究公開介紹和互動概念，沒有複製以下網站的程式、地圖資料或視覺素材。以下是適合本規格的取捨，不代表功能或資料已得到歷史驗證。

| 參考 | 觀察 | 本專案決定 |
|---|---|---|
| [江山時序 / Chronicles of the Realm](https://github.com/DeanChensj/jiangshan-map) | 以時間滑桿配合地圖、地點和人物行跡；可逐站、播放、用鍵盤及深連結探索。 | 借鑑「時間＋地圖＋故事」與獨立主題時序，保留逐站、播放、多語和網址；本版不複製其 GPL 程式或地圖資料，底圖只顯示現代邊界。 |
| [Pastlas](https://pastlas.com/) | 讓地圖和時間同步，資料不足時說明缺口，並將敘述與證據相連。 | 說明卡附來源；圖表只顯示有來源的點，缺資料年份留空，不連線或插值；部分地區未收錄不等於沒有童軍。歷史國界和因果分析不在此版範圍。 |
| [Age of Events](https://www.ageofevents.com/) | 以時間導覽、圖層與策展故事讓使用者從大地圖進入事件。 | 用「逐站」行跡及獨立大露營時序；軍旅敘述按 WOSM 的公開介紹，不加入額外戰役或論述。 |
| [Flourish bar chart race](https://flourish.studio/visualisations/bar-chart-race/) | 用時間動畫瀏覽多組連續數值和名次，適合有足夠時序資料的比較。 | 借鑑大數字、播放、選年和可見的變化；本資料只有疏落的全球來源點，**不製作國別排名、插值或偽造連續數值**。 |
| [Our World in Data: population growth](https://ourworldindata.org/population-growth) / [Grapher](https://ourworldindata.org/grapher/population-unwpp) | 人口視覺化結合時間選擇、來源和方法／定義。 | 人口獨立頁提供散點、精度、逐年來源及統計口徑；不引入其人口資料。 |
| [OpenHistory](https://github.com/kdhillon/openhistory) | 說明地理資料、事件來源與歷史邊界資料來源，將不同資料集分開。 | 分離現代底圖、事件、地區和出處 JSON；本版以靜態檔案運作，不引入其伺服器或資料管線。 |

### 資料研究備註

- 成員版圖累積目前名錄日期而不是重建歷史會籍；歷史來源的組織／國家數單獨列出，不把兩者相加或直接比較。早期團體圖仍是獨立資料集。
- 圖表早期計數、現代普查、估算覆蓋和歷史「國家數」口徑不同，見 [CREDITS](../CREDITS.md#membership-figures)。只畫來源所載點，缺數據年份留空，不連線或推算。
- 香港的 1910 非正式訓練、1913 正式旅與來源提及的其他年份不可混為一談；澳門的 1911 草稿、1983 總會成立、2017 加入 WOSM 是不同事件。
- 英國 1907 是實驗營；擴散圖暫用 1908 早期常設旅，哪一支最早仍有爭議。巴基斯坦的未知年份不從英屬印度整體日期推算。
- WOSM 現況名錄和維基百科成員表提供現行名稱及會籍研究線索，但「組織成立」、前身入會及當地早期團體是不同問題。亦參考擁有者的 [SCOUTWORLD](https://github.com/playerkousas-rgb/scoutworld/tree/bc645cf6fdd70043665f0bc7de277f8f8b14fbf5) 作身份比對線索；沒有批量複製該庫的資料或程式，其 `founded` 和未註明日期／欄位來源的人口數字不能直接視為入會年或現時人口。菲律賓暫用 1911 年手冊記載的小隊作「最遲當年已有團體」證據，1910 年說法仍待佐證；不把有爭議的年份默當首支旅成立年。
- 比對 WOSM 的 [2007](https://web.archive.org/web/20071012184832/http://scout.org/en/around_the_world/countries/national_scout_organisations/some_statistics)／[2010](https://web.archive.org/web/20100402025708/http://www.scout.org/en/around_the_world/countries/national_scout_organisations/some_statistics) 統計存檔、[2022–25 年非洲區報告](https://treehouse.scout.org/system/files/2025-11/FR_AFR%20Triennial%20report%202022-2025-Web.pdf)及現行名錄後，發現部分會籍年份互異。資料卡分別引用，保留認證、正式會籍、前身和重加入可能不同的限制；舊表不會填作現行名錄欄值。
- 資料模型、來源及衝突見 [NSO data notes](NSO_DATA.md)，正式上線前研究追蹤見 [release checklist](RELEASE_CHECKLIST.md)；自動驗證只驗欄位與引用，不能取代史料核對。
