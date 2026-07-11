# アンジョウ・ダンジョン UI刷新 詳細設計書
## A案「鍛冶場（Forge & Ember）」 × 縦持ち（portrait）全面化

対象リポジトリ: `C:\Users\murase\Documents\sword`（Vite + Phaser 3 + 素TS/DOM UI, GitHub Pages）
上位提案: `artifacts/ui_redesign_proposal.md`（A案採用）

---

## 0. 本書の位置づけ・スコープ・不変条件

本書はCodexへの実装契約。曖昧さを残さない。実装は隔離worktreeで行い **mainへpush禁止**。

### 変更してよい層
- DOM UI（`src/ui/**`）、CSS（`src/styles.css`）
- HUD（`src/ui/hud.ts`）
- BattleScene の**表示・入力レイアウト**（`src/game/scenes/BattleScene.ts`）
- `index.html`、`src/main.ts`（Phaser scale と向き）、`src/services/displayService.ts`（向きロック）
- `public/manifest.webmanifest`、`public/sw.js`（キャッシュ名バージョンのみ）
- E2E（`e2e/**`）
- フォント新規追加（`src/fonts/**`、OFL）

### 変更してはいけない層（ゲームロジック不変）
- `src/game/systems/**`、`src/game/data/**`、`src/game/GameFlow.ts` の**数値・進行・確率・状態遷移**
- `src/types/index.ts`（型の破壊的変更禁止。追加のみ可、原則触らない）
- `src/services/saveService.ts` / `rankingService.ts` / `rankingConfig.ts` / `audioService.ts` の**ロジック**（呼び出しはそのまま維持）
- セーブキー（`sword-roguelite:save` / `:suspend` / `playerName`）、ランキングI/O、PWAオフライン挙動

BattleScene は「表示座標・入力座標・演出」のみ変更し、ダメージ計算・AI状態機械・タイミング定数（`ENEMY_BASES`, `BOSS_KNIGHT`, cooldown等）には触れない。

---

## 1. デザイントークン（Forge & Ember）

`src/styles.css` 先頭の `:root` に CSS custom properties を定義し、既存のハードコード色を**全て**トークン参照へ置換する。コンセプトは「冷たい鉄床（アンビル）＋熔けた金属の熱」。剣を鍛える＝コアループを色温度で語る。

### 1.1 カラートークン
```css
:root {
  /* 地・面 */
  --forge-anvil:      #151210; /* 最背面（鉄床の黒） */
  --forge-plate:      #201A16; /* パネル面（鉄板） */
  --forge-plate-2:    #2A2320; /* 一段明るい面 */
  --forge-line:       #3C332C; /* 罫・枠 */
  /* 熱（主役アクセント。単色でなくグラデで使う） */
  --forge-ember:      #F26419; /* 燠火 */
  --forge-molten:     #F4B740; /* 熔金（ハイライト） */
  --forge-ember-deep: #B23A12; /* 熱の陰 */
  /* 刃・文字 */
  --forge-steel:      #C7D0D8; /* 刃・主要文字 */
  --forge-steel-dim:  #8A8F94; /* 副次文字 */
  --forge-ash:        #6E6862; /* 補助・無効 */
  /* 唯一の寒色（操作/選択の合図に限定使用＝柄頭のサファイア由来） */
  --forge-sapphire:   #3F7CFF;
  /* 機能色（可読性のため温存。トーンのみForge寄せ） */
  --hp-green:         #43C46B;
  --enemy-red:        #E8443B;
  --warn-amber:       #F2A03C;
  --danger:          #9E2B25;
  /* レアリティ＝火花の温度 */
  --rarity-common:    #9AA0A6; /* 鈍色 */
  --rarity-rare:      #5FA8FF; /* 青熱 */
  --rarity-epic:      #F4B740; /* 白熱→熔金 */
}
```
既存の `#101827 / #edf5ff / #f1c65a / #526b91 …` 等の直値は上記トークンへ機械置換する。特に primary の金 `#f1c65a` は文脈で `--forge-molten`（見出し・選択枠）または `--forge-ember`（primaryボタン）へ振り分ける。

### 1.2 タイポグラフィ・トークン
```css
:root {
  --font-display: "DotGothic16", "Hiragino Kaku Gothic ProN", system-ui, sans-serif;
  --font-body:    "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif;
  --font-mono:    ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
}
```
- **表示（display＝DotGothic16, ピクセル日本語）**: `h1 / h2` と各セクションの固定ラベルのみに適用。戦闘スプライトのドット感とUIを地続きにする（本案のシグネチャの一つ）。
- **本文（body）**: 動的な日本語（剣名・敵名・説明・数値ラベル）は既存のシステム日本語スタックを維持し、**新規の本文用日本語フォントは同梱しない**（初回ロード容量を抑えるエンジニアリング判断。§2参照）。
- **数値（mono, tabular-nums）**: ステータス表・DPS・階層・コイン・ダメージ等は等幅で桁揃え。既存 `font-variant-numeric: tabular-nums` を踏襲しつつ `--font-mono` を当てる。

### 1.3 質感・形状トークン（画像レスを優先）
- 鉄板グラデ: `linear-gradient(180deg, var(--forge-plate-2), var(--forge-plate))`。
- 熱グロー: `box-shadow` / `radial-gradient` の橙。primaryボタン押下で一瞬赤熱（`:active` で ember→molten）。
- 打痕テクスチャ: 微細な `repeating-linear-gradient` か低不透明のノイズ（画像を足す場合も1枚・軽量に限る）。
- 角丸: 現状 4px と 12px が混在。**鍛冶＝シャープ寄りに 2–4px へ統一**（`--radius: 3px` トークン化、丸い 12px 系は撤廃）。
- レアリティ表示は「色＋アイコン＋文字」を維持（§9 アクセシビリティ）。色は火花温度トークンへ。

---

## 2. フォントのセルフホスト（OFL・ライセンス同梱）

### 方針
- 追加するのは **DotGothic16（display用・SIL OFL 1.1）1書体のみ**。本文用日本語は同梱しない（システムスタック）。数値は monospace（システム）。→ 新規ネットワーク依存・容量を最小化。
- 配置: `src/fonts/DotGothic16-Subset.woff2`（Viteがハッシュ付与＋`base:"./"`解決を行うため、`public/`でなく`src/`配下に置き、`styles.css`から相対 `url()` で参照する）。
- `@font-face` を `styles.css` 冒頭に定義。`font-display: swap`。可能なら `unicode-range` と**サブセット化**でJPグリフを絞る（下記）。

```css
@font-face {
  font-family: "DotGothic16";
  src: url("./fonts/DotGothic16-Subset.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### サブセット範囲（容量対策・必須）
display は **固定の見出し文字のみ**に使う設計なので、以下に限定してサブセットする:
- 基本ラテン・数字・記号
- ひらがな・カタカナ全域（見出しにカナが出るため）
- 見出しで使う漢字（例: 剣 育 成 選 択 初 期 図 鑑 設 定 報 酬 撃 破 力 尽 階 層 挑 戦 続 …）＋余裕を見て常用漢字の一部
- 使用する絵文字（⚔ 👑 💀 🏳 📖 👹 ⚙ 🏆 等）は絵文字フォント側で描画されるため display サブセットに含めない
- ※動的テキスト（剣名・敵名）は body（システム）で描画するので display に含めなくてよい。もし見出しに動的日本語が出る箇所があれば body へ回す。

サブセット手順（どちらか）:
1. `fonttools`（`pyftsubset`）で Google Fonts 配布の DotGothic16 TTF から woff2 サブセットを生成、または
2. サブセットが難しい環境ではフル woff2 を同梱（容量増を許容）。**ビルド後に `dist` サイズと初回ロードを計測し、体感を検証**（受け入れ基準§11）。

### ライセンス同梱
- `src/fonts/OFL.txt`（DotGothic16 の SIL Open Font License 1.1 全文）を同梱。
- リポジトリ `README.md` の「ライセンス/クレジット」節に、フォント名・作者・OFL・入手元URLを明記。
- ダウンロード元と生成コマンドを `src/fonts/README.md` に残す（再現性）。

### オフライン
- フォントはハッシュ付きアセットとして SW の runtime-cache（キャッシュ優先分岐）に自然に乗るため追加設定不要。ただし **`public/sw.js` の `CACHE_NAME` を `sword-roguelite-v7` へ更新**し、旧キャッシュ破棄を促す。

---

## 3. 縦持ち化：全体構造

### 3.1 Phaser / main.ts
- `src/game/scenes/BattleScene.ts`: `GAME_WIDTH = 390`, `GAME_HEIGHT = 844`（現行の 844×390 を swap）。
- `src/main.ts`: `scale` は `FIT` + `CENTER_BOTH` を維持（width/height が新定数を参照）。`backgroundColor` を `#151210`（`--forge-anvil`相当）へ。コメントの「§4.3 基準解像度 390×844」を実体に一致させる。

### 3.2 向きロックの反転
- `src/services/displayService.ts`:
  - `lockLandscape` → `lockPortrait`（`orientation.lock("portrait")`）。型 `LockableOrientation` の引数を `"portrait"` に。
  - `requestLandscapePresentation` → `requestPortraitPresentation`（フルスクリーン要求は任意で残す）。
  - `maintainLandscapeLock` → `maintainPortraitLock`。
- `src/main.ts`: 上記の新名へ呼称変更（`requestPortraitPresentation` / `maintainPortraitLock`）。
- `index.html`: `#orientation-lock` の文言「横向きで遊んでね」→「縦向きで遊んでね」。`<meta name="theme-color">` を `#151210` へ。
- `src/styles.css`: `@media (orientation: portrait){ #orientation-lock{display:flex} }` を **`@media (orientation: landscape)`** に反転（縦が既定なので通常は非表示）。`#orientation-lock` の色は `--forge-molten`。
- `public/manifest.webmanifest`: `"orientation": "landscape"` → `"portrait"`。`background_color` `#151210`、`theme_color` `#151210`。description は既存「縦画面ローグライト」のまま（実体と一致するようになる）。

---

## 4. BattleScene 縦レイアウト（座標契約）

現行は横並び（プレイヤー左・敵右）。縦の対峙（**敵＝中央上／奥**、**プレイヤー＝中央下／手前**）へ再構成する。下表の新座標を**起点**とし、プレイフィール確認で微調整してよい（`±数十px`）。ただし**制約**: 戦闘要素（キャラ・warnRing・chargeBar・floatText）は y∈[150, 650] に収め、上部HUD帯(0–140)・下部HUD帯(≈660–844)と重ならないこと。

### 4.1 主要座標定数（新旧対応）
| 定数 | 現行(844×390) | 新(390×844) | 備考 |
|---|---|---|---|
| `GAME_WIDTH` | 844 | **390** | |
| `GAME_HEIGHT` | 390 | **844** | |
| `PLAYER_X` | 210 | **195** | 中央 |
| `PLAYER_Y` | 252 | **560** | 手前・下 |
| `ENEMY_X` | 634 | **195** | 中央（真上に対峙） |
| `ENEMY_Y` | 190 | **300** | 奥・上 |
| floorLabel | (422, 28) | **(195, 112)** | 上部中央・HUD階層表示の下 |
| playerSword offset | (+32, −12) | 縦向きに再設定（例 +30, −14、角度 −25°維持） | 見た目調整 |

### 4.2 挙動・演出の座標再計算（指針）
- **敵登場tween**（`startFloor`）: 上方からフェードイン（`y: ENEMY_Y-40 → ENEMY_Y`, alpha 0→1, Back.easeOut）。
- **近接ストライク**（`executeStrike` の突進）: 敵が**下方のプレイヤーへ降下**して戻る。移動先を `(PLAYER_X, PLAYER_Y-70)` 付近へ（横方向の `PLAYER_X+92` を廃し縦方向へ）。
- **遠隔（mage ✦）**: 弾の始点 `(ENEMY_X, ENEMY_Y+22)` → 終点 `(PLAYER_X, PLAYER_Y-10)`（上から下へ）。
- **回避ダッシュ**（`tryDodge`）: **水平移動を維持**（左右スワイプ＝左右回避は縦持ちでも自然）。移動量を `±92` → **`±64`**（画面幅390内: 195±64=131〜259で安全）。
- **warnRing / 危険バー / ヒット数pip**（`drawWarnRing`）: プレイヤー中心の円は据え置き（半径ロジック維持）。敵→プレイヤーの警告ラインを**縦**に。危険バー `barX=PLAYER_X-barW/2`, `barY=PLAYER_Y-76`（=484）で HUD と非干渉。
- **chargeBar**（`drawChargeBar`）: `x=PLAYER_X-62`, `y=PLAYER_Y+58`（=618）。下部HUD帯(≈660)の手前に収める。
- **floatText**: プレイヤー系は `PLAYER_Y-60〜-90`、敵系は `ENEMY_Y-40〜-110`。いずれも上へ46px上昇（既存tween）。範囲がHUDと重ならないこと。
- **guardLabel**（skeleton）: `(ENEMY_X+58, ENEMY_Y-42)` を縦構図で再配置（敵の右上、例 `(ENEMY_X+52, ENEMY_Y-58)`）。
- **背景 `drawBackground`**: 横回廊→**縦回廊パース**へ再描画。奥行き＝上方向へ収束（消失点は上部中央）。既存4tier配色（10階層ごと）を維持しつつ Forge へ寄せる（炉の残照＝下辺に橙のにじみ）。地面/柱/星屑の座標式を縦構図に合わせる。`GAME_WIDTH/HEIGHT` 依存の数値を全面見直し。
- **floorLabel**: y=112、色は通常 `--forge-steel`、ボスは `--enemy-red`。

### 4.3 入力（変更最小）
`onPointerDown/Move/Up` のロジック・`SWIPE_THRESHOLD_PX(42)`・`SWIPE_MAX_MS(280)`・チャージ判定は**据え置き**。スワイプ回避は水平判定のまま。タップ＝攻撃・長押し＝溜め・左右スワイプ＝回避の仕様不変。

### 4.4 Forge演出（表示層のみ）
- ヒットフラッシュ・撃破の `✦` パーティクルを熱色（`--forge-ember`/`--forge-molten`）へ。会心は白熱＋molten。
- `hitStop` / camera shake は維持（設定 `graphicsQuality:"low"` で抑止する既存分岐も維持）。
- **熱ゲージ（シグネチャ）は Phaser でなく DOM 側（§5）で実装**（画面周縁グロー）。BattleScene は剣levelをHUD更新経由で反映するのみ。

---

## 5. HUD（#hud-root）縦回帰＋Forge

### 5.1 CSS
- **`src/styles.css` の巨大な `@media (orientation: landscape) and (max-height: 600px){…}` ブロック（現行 約795–1236行）を丸ごと削除**。基本の縦フレックス（`.hud-top` 上／`.hud-bottom` 下、`max-width:480; margin:auto`）へ回帰する。基本HUD CSSは元来縦画面設計のため、削除で縦レイアウトが復活する。
- Forge適用:
  - バー（`.bar`）: 枠を `--forge-line`、地を `--forge-anvil`。`.bar-fill.hp` は `--hp-green`系グラデ、`.enemy` は `--enemy-red`系、`.cooldown` は ember→molten、`.cooldown.ready` は sapphire寄り。
  - `.hud-btn`: 焼き入れ鉄（`--forge-plate`グラデ＋`--forge-line`枠）、`:active` で赤熱（ember）。
  - ラベル・数値は `--font-mono`／`--font-body`、影は控えめに。
  - `.sword-mini` の左ボーダーを `--forge-molten`。

### 5.2 熱ゲージ（画面周縁グロー）
- `#hud-root::before`（`position:absolute; inset:0; pointer-events:none;`）で周縁 `box-shadow: inset 0 0 Npx …ember`。強度を `#hud-root[data-heat="0|1|2|3"]` で段階化。
- `src/ui/hud.ts` の `update()` で、装備剣 `level`（または `level/maxLevel` 比）を段階に写像して `hud-root` の `data-heat` を設定する（**表示のみ。ロジック不変**）。
- `@media (prefers-reduced-motion: reduce)` ではグローのアニメーションを無効化し静的表示に。

### 5.3 hud.ts
DOM構造は概ね維持。クラス名・要素は温存し、`data-heat` 反映処理の追加と、必要なクラスの微修正のみ。ロジック（`update/updateAttackCooldown/toggleDetail`）は不変。

---

## 6. DOM画面（10画面）Forge再スタイル＋landscape撤去

### 6.1 共通
- **`styles.css` の landscape `@media` 内にある画面グリッド上書き**（`.reward-screen` / `.pickup-screen` / `.boss-reward-screen` / `.character-select-grid` / `.sword-select-grid` / `.weapon-*` / `.dex-grid` 等の再定義）を**削除**し、基本 `.screen`（縦スクロール, `max-width:480`, `min-width:320`）へ回帰。
- 共通スタイル:
  - `.screen` 背景を鉄床グラデ（`--forge-anvil→--forge-plate`）＋微打痕。
  - `h1/h2` を `--font-display`、刻印風 text-shadow（emboss: 暗い下影＋わずかな上ハイライト）、色 `--forge-steel`、要所に `--forge-molten`。
  - `.menu-btn`: 焼き入れ鉄。`.primary` は熱（ember→molten グラデ＋molten枠）、`.danger` は `--danger`（朱）。`:active` で赤熱＋`scale(0.98)`。
  - `.card`: 鉄プレート（`--forge-plate`＋`--forge-line`枠＋内側1pxハイライト）。`.selected` は molten枠＋熱グロー。
  - `.rarity-*` を火花温度トークンへ（common/rare/epic）。
  - インラインstyle（title/characterSelect/swordSelect/reward/dex/settings 等で多用）は、**見た目に関わるものを可能な範囲でCSSクラスへ移設**しトークン統一。ただし `*.ts` の**ロジック・DOM構造・文言・イベントは変えない**（クラス付与とCSS側で表現）。

### 6.2 画面別ポイント（現状クラス → Forge適用 → 崩れ注意）
| 画面 (ファイル) | 主な要素/クラス | Forge適用 | 崩れ注意 |
|---|---|---|---|
| タイトル `title.ts` | h1, `.subtitle`, `.player-name-box`, メニュー(inline flex), `.footnote` | h1を炉ロゴ化（下辺emberグロー＋刻印）、メニューを鉄ボタン列。inline styleのmenuをクラス化 | 縦1列、記録行が下に収まること |
| キャラ選択 `characterSelect.ts` | `.character-select-grid`, `.card`, `.select-portrait` | カード鉄板、portrait枠molten | 縦1列 or 2列。4キャラがスクロールで収まる |
| 初期剣選択 `swordSelect.ts` | `.sword-select-grid`(13種), `.sword-start-card`, `.select-weapon` | カード密度高→**最も崩れやすい**。2列グリッド＋縦スクロール | 13枚の折返し・ボタン44px・アイコン潰れ無し |
| 報酬 `reward.ts` | `.reward-screen`, `.coin-display`, `.reward-summary`, `.upgrade-grid`, `.upgrade-item` | upgrade-itemを鉄ボタン、価格を molten。coinを熱色 | 縦積み、`次の階層へ`が最下部固定的に見えること |
| 剣拾得 `swordPickup.ts` | `.pickup-screen`, `.weapon-comparison`, `.weapon-panel`(NEW/CURRENT) | 比較2枚を**縦に上下**配置（NEW上/CURRENT下）、featured=molten枠 | 2枚が重ならず、statグリッド溢れ無し |
| ボス報酬 `bossReward.ts` | `.boss-reward-screen`, `swordCard`×3 | 剣カード3枚縦積み、選択ボタン鉄 | 3枚＋末尾ボタンがスクロールで収まる |
| ポーズ `pause.ts` | h2, `.menu-btn`(再開/設定/リタイア), `.footnote` | 鉄ボタン、danger朱、二段確認文言維持 | 中央寄せ・spacer動作 |
| リザルト `result.ts` | h2, `.result-table`, `.ranking-submit-box`, ボタン | 表を鉄罫、自己ベストを molten | 表＋登録ボックス＋2ボタンの縦収まり |
| 図鑑 `dex.ts` | `.dex-grid`, `.dex-cell`, `.rarity-tag` | セル鉄板、スプライト枠。未発見はロック表現維持 | グリッド列数（縦で2–3列）、大量セルのスクロール |
| 設定 `settings.ts` | `.setting-row`, `.toggle-btn`, スライダー, help card | トグル鉄、range を Forge化、help可読 | range 44px・トグル収まり |
| ランキング `ranking.ts` | `.ranking-filter`, `.ranking-select`, `.ranking-table-wrap`(横スクロール) | select鉄、表を鉄罫、自己行 molten帯 | **表は横スクロール温存**（`min-width:520`）＝画面自体の横溢れは出さない |

---

## 7. レイアウト崩れ防止 検証（機械アサート）＝ `e2e/verify-layout.mjs`（新規）

「重なり・崩れを絶対に起こさない」を機械で担保する新規E2E。Playwright（既存依存）で実装。

### 7.1 ビューポート行列（全て portrait, `isMobile:true, hasTouch:true, deviceScaleFactor:2`）
`360×640` / `360×740` / `390×844` / `412×915` / `414×896` / `430×932`

### 7.2 巡回する画面状態
title / characterSelect / swordSelect / battle(HUD表示) / reward / swordPickup / bossReward / pause / result / dex(sword) / dex(enemy) / settings / ranking。
- 報酬・ボス・拾得・リザルト等は `localStorage` の `:suspend` 注入（`verify-boss.mjs` の注入パターン流用）＋操作で到達させる。到達が難しい状態は、その画面の render を直接呼べる最小フック経由でも可（ただしゲームロジックは変更しない範囲で）。

### 7.3 各状態で実行するプローブ（`page.evaluate` 内で `getBoundingClientRect` 一括採取 → 違反配列を返す）
1. **ビューポートはみ出し**: 可視要素の `rect.right ≤ innerWidth + ε` かつ `rect.left ≥ -ε`。スクロール画面は縦オーバーフロー許容だが、**横溢れ禁止**: `document.scrollingElement.scrollWidth ≤ clientWidth + ε` かつ各要素 `scrollWidth ≤ clientWidth + ε`（省略記号許容要素＝`.weapon-panel-name` 等は除外リスト化）。
2. **兄弟インタラクティブ要素の非交差**: 対象セレクタ `button, .card, .upgrade-item, .weapon-panel, input, select, .hud-btn, .toggle-btn, .bar` の矩形 AABB 交差面積 `> ε` を違反とする（`display:none`/`visibility:hidden`/`rect面積0` は除外）。
3. **HUD非干渉**: `.hud-top` と `.hud-bottom` が交差しない。かつ両者がステージ中央帯（x: 中央±80, y: 150–650）を覆わない。
4. **タップ44px**: `button, input[type=range], select, .hud-btn, .weapon-panel, .upgrade-item, .toggle-btn` は `width ≥ 44 && height ≥ 44`。
5. **要素はみ出しテキスト**: 上記除外リスト以外で `scrollWidth ≤ clientWidth + ε`。
- ε = 1.5px。違反時は当該画面/VPのスクショを保存し `console.error` に要素セレクタ＋rectを出力。

### 7.4 合否
違反が1件でもあれば `process.exit(1)`。0件かつ `pageerror`/`console.error` 無しで `exit(0)`。

---

## 8. 既存E2E 縦書き換え＋セレクタ再同期

### 8.1 ビューポート／座標
- `e2e/verify-run.mjs` / `e2e/verify-boss.mjs`: `viewport: {width:390, height:844}` へ。
- canvas操作座標: `page.mouse.click(422, 210)` → **`(195, 430)`**（ステージ中央・HUD回避）。`swipe` の基準 `(422,210)` → `(195,430)`、移動は水平 `±90`。`longPress` も同座標。

### 8.2 セレクタ再同期（現状ずれの是正・必須）
現行E2Eは旧文言・旧UIを参照している箇所があり、縦化と同時に**実DOM文言へ合わせる**（ロジックは変えない）:
- `verify-run.mjs` の `getByText("ソード・ダイバー")` → 実タイトル **「アンジョウ・ダンジョン」**（または `#ui-root h1` テキスト検証）。
- 拾得画面分岐: `text.includes("剣を発見")` は**誤り** → **「武器を入手」**。装備/維持は `.weapon-panel.featured`（装備）／`.weapon-panel:not(.featured)`（維持）クリックへ（現行 `swordPickup.ts` は weapon-panel の2択。テキストボタン「現在の剣を維持」「売却する」は存在しない）。
- `verify-boss.mjs` の拾得分岐「売却する」も現行UIに無いため、**維持（keep）選択**に置換（売却導線が無い前提で検証フローを組み替え。GameFlowの `keepCurrentSword`/`equipSword` は不変）。
- 報酬の強化ボタンは `UPGRADE_LABELS`（`src/game/systems/UpgradeSystem.ts`）の**実値**に一致させる（`.upgrade-item` の hasText）。
- その他ボタン文言は現行実装が正: `▶ ゲーム開始`/`▶ 続きから`/`このキャラで進む`/`この剣で始める`/`次の階層へ`/`この剣を装備する`/`受け取らない（現在の剣を維持）`/`⏸ ポーズ`/`🏳 リタイア`→`本当にリタイアする？（もう一度タップ）`/`⚔ もう一度挑戦`/`タイトルへ`/`← 戻る`/`← タイトルへ戻る`。

### 8.3 合否・回帰対象
`pageerror`/`console.error` 0件で合格（既存基準踏襲）。回帰フロー: タイトル→キャラ選択→剣選択→戦闘(タップ/スワイプ/長押し)→報酬→拾得(装備/維持)→ボス報酬→中断再開→ポーズ→リタイア→リザルト→図鑑(剣/敵)→設定→ランキング。PWA/セーブ/ランキングの副作用が壊れていないこと（save/suspend の期待値ログを維持）。

---

## 9. アクセシビリティ／品質フロア

- **`prefers-reduced-motion: reduce`**: 火花・熱ゲージのアニメ、toast/画面遷移アニメを無効化し静的表現に。BattleScene 側の任意演出も過剰なら抑制（既存 `graphicsQuality:"low"` 分岐と整合）。
- **フォーカス可視**: `:focus-visible` で明確なリング（`--forge-sapphire` か molten）を `menu-btn / input / select / .hud-btn / .weapon-panel / .toggle-btn` に。
- **色以外の区別**: レアリティ＝色＋アイコン＋文字（既存 `rarityTag` 踏襲）。HP緑/敵赤/警告アンバーは機能色として温存。
- **タップ44px** 維持。既存の `touch-action`/gesture 抑止・`user-select` 制御は維持（入力欄の `user-select:text` も維持）。

---

## 10. ファイル別 実装指示（Codex着手粒度）

| ファイル | 変更種別 | 具体指示 | 触れない |
|---|---|---|---|
| `src/styles.css` | 大改修 | §1トークン定義、直値→トークン置換、landscape `@media` ブロック削除（§5/§6）、Forge共通スタイル、`@font-face`、focus-visible、reduced-motion | ─ |
| `src/fonts/**` | 新規 | DotGothic16サブセット woff2＋`OFL.txt`＋`README.md`（入手/生成手順） | ─ |
| `index.html` | 小 | orientation-lock文言、theme-color、（必要なら）app構造は現状維持 | `#app`の要素構成 |
| `src/main.ts` | 小 | scale width/height参照更新、backgroundColor、displayService新名呼称 | Phaser以外のGameFlow配線 |
| `src/services/displayService.ts` | 小 | landscape→portrait（関数名・lock引数） | ─ |
| `public/manifest.webmanifest` | 小 | orientation:portrait、色 | name/icons |
| `public/sw.js` | 極小 | `CACHE_NAME` を v7 へ | fetch戦略ロジック |
| `src/game/scenes/BattleScene.ts` | 中〜大 | §4 座標契約（定数・tween・背景・warnRing・chargeBar・floatText）、Forge演出色 | ダメージ計算/AI状態機械/タイミング定数/入力ロジック |
| `src/ui/hud.ts` | 中 | Forge化、`data-heat` 反映追加 | update系ロジック |
| `src/ui/components.ts` | 小 | rarityTag色、card/button表現をトークン化（クラス付与） | swordStatsTable等の算出ロジック |
| `src/ui/screens/*.ts`（10） | 中 | §6 各画面のクラス付与・inline style移設・Forge適用 | 文言/DOM構造/イベント/GameFlow呼び出し |
| `e2e/verify-run.mjs` | 中 | §8 縦化＋セレクタ再同期 | 合否基準（JSエラー0） |
| `e2e/verify-boss.mjs` | 中 | §8 縦化＋注入＋セレクタ再同期 | 注入するRunStateの意味 |
| `e2e/verify-layout.mjs` | 新規 | §7 プローブ | ─ |

---

## 11. 受け入れ基準

1. `npm run build`（`tsc --noEmit && vite build`）が成功（型エラー0・未使用0）。
2. `node e2e/verify-run.mjs` / `verify-boss.mjs` / `verify-layout.mjs` が全て終了コード0（`E2E_URL` で preview を差し替え可能な既存流儀を維持）。
3. 6ビューポート×全画面で、重なり・はみ出し・横溢れ・タップ44px違反が**0件**。
4. 縦持ちで全画面が崩れず、Forge のビジュアル（トークン・ピクセル見出し・熱ゲージ・鉄ボタン・火花レアリティ）が適用されている。
5. ゲームロジック・セーブ（save/suspend/playerName）・ランキング・PWAオフラインが**不変**（回帰E2Eで担保）。
6. **新規npm依存ゼロ**。フォントは DotGothic16 のみOFLセルフホスト＋ライセンス同梱。
7. ビルド後 `dist` の総量と初回ロードが実用域（フォント同梱による極端な肥大が無い＝サブセット済み）。

---

## 12. 実装順序（Codexセッション分割の推奨）

各段の完了ごとに `npm run build` ＋該当E2Eを通し、diffをarchitectがレビューする。

1. **基盤**: §1トークン＋§2フォント＋§3向き反転＋Phaser 390×844＋manifest/sw。→「縦で起動し崩れず動く器」。
2. **BattleScene 縦座標リワーク**（§4）＝本案の最重量・プレイフィール調整の核。
3. **HUD 縦回帰＋Forge＋熱ゲージ**（§5）。
4. **DOM 10画面 Forge再スタイル＋landscape撤去**（§6）。
5. **検証**（§7 新規 verify-layout ＋ §8 既存E2E縦書換・セレクタ再同期）。

> 実装フェーズは本設計書の承認後。隔離worktree＋Codex（`-m gpt-5.5` 明示、実行前ガードa〜d実施）＋**mainへpush禁止**。段階ごとにdiff全文をレビューし、承認後 git-hub 係へ引渡す。
