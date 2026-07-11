---
name: verify
description: このプロジェクト（剣育成ローグライト / Vite + Phaser 3）のビルド・起動・E2E検証手順
---

# 検証手順

## ビルドと起動

```powershell
npm run build                          # tsc --noEmit && vite build
npx vite preview --port 4173 --strictPort   # dist/ を配信（バックグラウンド推奨）
npm run dev                            # 開発サーバー（HMR）
```

## E2E検証（Playwright / devDependenciesに含まれる）

モバイルビューポート(390×844, hasTouch)でChromiumを起動し、実際にプレイして検証する。
スクリーンショット出力先ディレクトリを引数で渡す。

```powershell
node e2e\verify-run.mjs <shots-dir>    # タイトル→剣選択→戦闘→報酬→階層進行→中断再開→死亡/リタイア
node e2e\verify-boss.mjs <shots-dir>   # ボス報酬・剣ドロップ売却・リタイア（強い剣の中断セーブを注入）
```

- 終了コード非0 = ページ内JSエラーあり（console.error / pageerror を収集）
- verify-boss.mjs は `localStorage["sword-roguelite:suspend"]` に高火力の剣を持つRunStateを注入して
  10階層（ボス）から再開させるショートカットを使う。RunStateの形は `src/types/index.ts` 参照。

## 注意点

- 画面はDOMオーバーレイ（`#ui-root .screen`）、戦闘はPhaserキャンバス。戦闘操作は
  `page.mouse.click(195, 450)`（タップ攻撃）等でキャンバス座標を叩く。
- 初回ロードは `#ui-root .screen` の出現を waitForSelector で待つこと（固定sleepだと黒画面を撮る）。
- セーブは LocalStorage: `sword-roguelite:save`（永続） / `sword-roguelite:suspend`（中断、階層開始時に保存）。
- HUDの階層表示セレクタは `#hud-root .hud-row span`（複数一致するので .first()）。
