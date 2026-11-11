# 資料來源及致謝 / Sources & credits

B-P Atlas v1.2 · © SCOUT SYSTEM · Research draft / 研究草稿

## 重要限制 / Important limitations

本站是獨立、非官方作品，與世界童軍運動組織（WOSM）或任何童軍總會沒有從屬關係。行跡、日期、地區名稱、參與人數、來源是否足以支持每項聲稱，仍須逐項核實。來源清單不代表事實已經得到確認。

The **present-day research directory** contains 176 provisional location entries assembled from the WOSM directory and Wikipedia as consulted on 10 November 2026. Although the number matches the 176 organisations reported by WOSM, this is not proof of complete or accurate one-to-one coverage: Canada is a special case, some entries cover multiple territories, and federations can contain several associations. Names, coverage and membership histories still need individual verification.

The separate **historical map** provisionally plots 37 locations with sources describing early local groups; 139 directory entries have no date adopted for the map. A date is not necessarily the first or the group's founding year, and is not evidence of continuous Scouting or WOSM membership. A blank area means missing or undated research, **not** absence of Scouting; Pakistan is undated. Chinese names are provisional translations, not necessarily official names. The US entry uses Scouting America, an authorised trade name of Boy Scouts of America according to its [2025 bylaws](https://filestore.scouting.org/filestore/about/2025_Charter_Bylaws.pdf). See the [data methods and conflict notes](docs/NSO_DATA.md) and [release checklist](docs/RELEASE_CHECKLIST.md).

## 地圖 / Map

- [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) 1:50m modern country boundaries are public domain. The map is illustrative, not a position on borders or territorial status. Small organisations are represented by points. The scale bar is approximate at the map centre; Equal Earth does not have one uniform global scale.
- The input is [`world-atlas` 2.0.2 countries-50m](https://github.com/topojson/world-atlas); see [`scripts/build_world.sh`](scripts/build_world.sh) for simplification and [`scripts/rewind_world.mjs`](scripts/rewind_world.mjs) for winding corrections. The mapshaper simplification reported unrepaired intersections; further topology review is required.
- Runtime geography is locally bundled from [`d3-geo` 3.1.2](https://github.com/d3/d3-geo) and [`topojson-client` 3.1.0](https://github.com/topojson/topojson-client), with their dependencies `d3-array` 3.2.5 and `internmap` 2.0.3. Complete third-party notices, including the GeographicLib notice, are in [`vendor/LICENSES.txt`](vendor/LICENSES.txt).
- All UI icons and line illustrations were created for this prototype. No Scout emblems, association logos, historical photos or B-P drawings are included.

## Membership figures

資料以 WOSM 的公開數字及其歷史資料為主，不包括世界女童軍協會（WAGGGS）。1907 年的 20 人是白浪島營地人數，**早於 WOSM 成立**，並非 WOSM 人口普查。早期數字主要記錄男童軍；現代數字包括女成員和成年義工。舊資料有時數國家、近年數成員組織，兩者不能直接等同。柱形是來源記錄、約數或下限；記錄年份等距排列，並非時間間距。缺資料年份省略，不插值或外推，也不將缺失視為零。1907 年 20 人的柱形在該線性尺度上小得看不見，可用年份選單選取。

The 2025 roughly **60 million is estimated reach**, not a registered census. WOSM later reported that its 2023 registered census exceeded 51.4 million, whereas a 2023 communication said over 57 million; the relationship between these figures needs clarification. Each record captures a claim made in that year, not necessarily a year-end total: for example the 2024 figure of 175 organisations comes from an [August 10 release](https://www.scout.org/news/news/world-scouting-and-unicef-sign-global-partnership), while WOSM's [2023–24 annual report](https://www.scout.org/sites/default/files/2026-01/wosm_annual_report_2024_en.pdf) describes Albania as the 176th member later in 2024. Some historical counts are secondary reports or rounded/lower-bound claims. The data file records member `precision`, separate `countriesPrecision`, and `kind` where applicable. The population bar chart places reported years at equal categorical intervals (not elapsed-time intervals), omits missing years rather than treating them as zero, and neither interpolates nor extrapolates. The very small 1907 bar is not visually discernible at this linear scale; use the year selector.

每一個年份的數值和出處見 [`data/membership.json`](data/membership.json)（出處 ID 對應 [`data/sources.json`](data/sources.json)），或開啟可讀的 [`credits.html#membership-figures`](credits.html#membership-figures)。重要研究線索：

- [WOSM: Scouting's History](https://www.scout.org/who-we-are/scout-movement/scoutings-history) — Brownsea camp and founding history.
- [WOSM: Milestones of World Scouting, archived](https://web.archive.org/web/20130530142922/http://www.scout.org/en/about_scouting/facts_figures/history/milestones_of_world_scouting) and [The Scout Association: The Passing Years](https://cms.scouts.org.uk/media/12901/fs295306-milestones-of-scouting.pdf) — historical milestone counts; check original definitions and editions.
- [World Scouting: 2025 membership and 2023 census](https://www.scout.org/news/news/world-scoutings-membership-reaches-historic-highs) and [2024–25 annual report](https://learn.scout.org/resource/wosm-annual-report-2024-2025) — estimated reach and membership.
- [WOSM census methodology](https://treehouse.scout.org/book-page/wosms-membership-census) — coverage and changing definitions.
- [2002 table](http://usscouts.org/usscouts/internat/wosmstats.asp) and [2013 secondary account](https://connect2dialogue.org/dkh_organization/world-organization-of-the-scout-movement/) are not primary WOSM reports; replace or corroborate them before release.

## 內容與資料 / Historical research

The complete current directory of sources is [`data/sources.json`](data/sources.json) and the website's [`credits.html`](credits.html). Cards link to their relevant entries. Of 176 provisional locations, 171 have a primary membership-year claim from the current WOSM directory or news. Four directory records are blank and Sudan's detail was unavailable; their cards separately cite historical WOSM archive claims rather than passing those off as current directory values. The [individual audit](docs/research/wosm-directory-audit-2026-11.tsv) records the primary source basis; a claim may refer to a predecessor, re-admission, or conflict with another source. None of the records is a declaration of complete historical verification. Selected starting points:

- [SCOUTWORLD](https://github.com/playerkousas-rgb/scoutworld/tree/bc645cf6fdd70043665f0bc7de277f8f8b14fbf5), the owner's repository, was consulted for organisation identity and research leads. Its `founded` values mix meanings, and many member counts lack year- and field-specific provenance; we did not import its table or code wholesale. No licence was declared at that revision, so reuse rights require confirmation.
- [World Scouting's member directory](https://www.scout.org/where-we-work/scouting-worldwide), [2007](https://web.archive.org/web/20071012184832/http://scout.org/en/around_the_world/countries/national_scout_organisations/some_statistics) and [2010](https://web.archive.org/web/20100402025708/http://www.scout.org/en/around_the_world/countries/national_scout_organisations/some_statistics) archived WOSM tables, the [2022–25 Africa report](https://treehouse.scout.org/system/files/2025-11/FR_AFR%20Triennial%20report%202022-2025-Web.pdf) and a [2010 BSA snapshot](https://filestore.scouting.org/filestore/pdf/210-032.pdf). The WOSM sources sometimes disagree; a snapshot's association founding, accreditation or rejoining dates are **not automatically the first local Scout troop dates**.
- Paul Kua's [Hong Kong history](https://www.researchgate.net/publication/361435385_Scouting_in_Hong_Kong_1910-2000) distinguishes early Scout training in 1910 from a formal troop in 1913. The exact date and details of the 1912 B-P visit need a stronger source; the current card is provisional.
- [Associação dos Escoteiros de Portugal (AEP): history](https://www.escoteiros.pt/escoteiros-de-portugal/historia/) records an early group in Macau in 1911 and one in Lisbon in 1912, while the AEP itself was founded in 1913 and claims founding membership in 1922. These are not dates for the founding of the present Portuguese federation; the early-group claims still need independent corroboration. WOSM separately records the [Macau association's 1983 founding](https://www.scout.org/node/3720) and its [2017 admission](https://www.scout.org/node/3726).
- [BSA's 1911 handbook](https://www.gutenberg.org/files/29558/29558-h/29558-h.htm) records Manila Scout patrols in a letter dated 1911. The map uses this as evidence of a group by that year, not proof of its founding. Wikipedia's 1910 claim requires corroboration; the [Boy Scouts of the Philippines](https://scouts.gov.ph/the-birth-of-the-boy-scouts-of-the-philippines/) identifies a first Filipino troop in 1914. WOSM and the Philippine association also differ on accession (1946 / 1947).
- [UK Scouts: The First Troops](https://cms.scouts.org.uk/media/12898/the-first-troops.pdf) — which 1908 regular troop was first is contested. The 1907 Brownsea camp is not used as a regular troop date in the spread map.
- [Scouting America: Waite Phillips](https://oa-scouting.org/history/waite-phillips) records a 1909 Pawhuska troop. [Scouting magazine](https://onscouting.org/2019/03/28/what-was-the-first-troop-in-the-united-states-the-answer-isnt-so-simple/) discusses competing first-troop claims; 1909 is not asserted here as the earliest possible US date.
- [World Jamboree Year 1979](https://www.jamboree2027.org/stories/world-scout-jamboree-year-1979/) — the planned event was cancelled. Other jamboree locations and participation counts remain drafts; the event listing includes secondary material.

## 維基百科與地名 / Wikipedia and place-name attribution

Membership-year data and some historical leads are adapted from articles by **Wikipedia contributors**, consulted 10 November 2026. We separated local group evidence, organisation founding and WOSM accession; some values have been corrected or conflicts identified using other sources. The adapted Wikipedia material is available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); linked revision histories identify contributors:

- [WOSM member list](https://en.wikipedia.org/wiki/List_of_World_Organization_of_the_Scout_Movement_members) · [history](https://en.wikipedia.org/w/index.php?title=List_of_World_Organization_of_the_Scout_Movement_members&action=history)
- [Oldest Scout groups](https://en.wikipedia.org/wiki/List_of_the_oldest_Scout_groups) · [history](https://en.wikipedia.org/w/index.php?title=List_of_the_oldest_Scout_groups&action=history)
- [History of Scouting in the Philippines](https://en.wikipedia.org/wiki/History_of_scouting_in_the_Philippines) · [history](https://en.wikipedia.org/w/index.php?title=History_of_scouting_in_the_Philippines&action=history)
- [Scouting and Guiding in Belgium](https://en.wikipedia.org/wiki/Scouting_and_Guiding_in_Belgium) · [history](https://en.wikipedia.org/w/index.php?title=Scouting_and_Guiding_in_Belgium&action=history)
- [Scautismo e guidismo in Italia](https://it.wikipedia.org/wiki/Scautismo_e_guidismo_in_Italia) · [history](https://it.wikipedia.org/w/index.php?title=Scautismo_e_guidismo_in_Italia&action=history)
- [Scouting and Guiding in Armenia](https://en.wikipedia.org/wiki/Scouting_and_Guiding_in_Armenia) · [history](https://en.wikipedia.org/w/index.php?title=Scouting_and_Guiding_in_Armenia&action=history)
- [Scout Association of Macau](https://en.wikipedia.org/wiki/Scout_Association_of_Macau) · [history](https://en.wikipedia.org/w/index.php?title=Scout_Association_of_Macau&action=history)
- [World Scout Jamboree](https://en.wikipedia.org/wiki/World_Scout_Jamboree) · [history](https://en.wikipedia.org/w/index.php?title=World_Scout_Jamboree&action=history)

Some English and Traditional Chinese region names were obtained using Node.js `Intl.DisplayNames` (ICU 78.2 / Unicode CLDR 48) and then reviewed or edited for the prototype. The Unicode CLDR 48 copyright and permission notice is reproduced in [`vendor/LICENSES.txt`](vendor/LICENSES.txt). Other names and translations remain research drafts.

## 靈感及授權 / Inspiration and rights

玩法靈感來自 [江山時序 / Chronicles of the Realm](https://github.com/DeanChensj/jiangshan-map)。沒有複製其程式碼或地圖資料。其他比較研究只作設計參考，見 [docs/RESEARCH.md](docs/RESEARCH.md)。

Project code and original-content licences remain **undecided**. MIT and CC BY 4.0 were proposed, not granted; [`LICENSE`](LICENSE) is a status notice, not a licence. Third-party licences, including CC BY-SA for adapted Wikipedia material, continue to apply independently. User-facing attribution and disclaimers appear in the app and the sources page.

## Language and translation / 語言及翻譯

Interface and the 20 journey stories are provided in Traditional Chinese, English, Japanese, Korean, French, Spanish, Indonesian, Portuguese and Hindi. Additional-language region names use the browser’s ICU / CLDR; the Curaçao entry retains all three territories. Some detailed historical notes, official names and source titles remain in English or their original language. English is the primary fallback for other languages, and relevant text is tagged for screen readers. These translations and research notes need human review; language coverage does not verify the underlying claims.
