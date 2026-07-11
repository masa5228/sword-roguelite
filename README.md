# ソード・ダイバー（剣育成ローグライト）

`mobile_sword_roguelite_design.md` の設計書に基づくMVP実装。
縦画面モバイルブラウザ向けの2Dアクション・ローグライト。

## 起動方法

```bash
npm install
npm run dev        # 開発サーバー（スマホ実機からは同一LANのIPでアクセス可）
npm run build      # 型チェック + 本番ビルド → dist/
npm run preview    # dist/ をローカル配信
```

スマホ実機で試す場合は `npm run dev` 後、表示される Network の URL を
スマホのブラウザ（iOS Safari / Android Chrome）で開く。

## 実装範囲（設計書 §27.1 MVP）

- タップ攻撃 / 長押し溜め攻撃（300ms〜1.5s）/ 左右スワイプ回避
- 敵5種（スライム・ゴブリン・スケルトン・オーク・魔術師）+ ボス「大剣の騎士」
- 5階層ごとにエリート（巨大化・狂乱・再生）、10階層ごとにボス
- 剣3種 × レアリティ3段階（コモン・レア・エピック）、特殊効果（炎上・毒・吸血）
- 剣ドロップ・比較・装備・売却、コイン獲得、剣強化（価格 = 15 × 1.35^強化回数）
- 死亡時リセット、リザルト画面、剣図鑑・敵図鑑・実績
- LocalStorage永続保存 + 階層開始時の中断セーブ（タイトルの「続きから」で再開）
- PWA（ホーム画面追加・オフライン動作）、WebAudio合成SFX/BGM、振動、演出簡略化設定

## 設計書からの変更点

- UI画面（タイトル・図鑑・設定等）は React ではなく素のTypeScript + DOMで実装
  （依存削減のため。設計書 §24.1 は「推奨構成」であり機能要件は満たす）
- Reward/Result等はPhaserシーンではなくDOMオーバーレイ（§24.2のscenes構成を一部簡略化）
- 剣持ち替え時、前の剣は自動的に売却価格（基本価格 + 累計強化費用×0.3 §11.4）で換金される

## ディレクトリ構成

```
src/
├─ game/
│  ├─ scenes/BattleScene.ts   # 戦闘（Phaser）: 入力・敵AI・演出
│  ├─ systems/                # 純ロジック: ダメージ計算・ドロップ・強化・難易度
│  ├─ data/                   # 剣・敵・ボスの定義データ
│  └─ GameFlow.ts             # 進行管理（ゲームループ・画面遷移の中核）
├─ ui/                        # DOMオーバーレイ（HUD・各画面）
├─ services/                  # LocalStorage保存・WebAudio/振動
└─ types/                     # データモデル（設計書 §25）
e2e/                          # Playwright実機フロー検証スクリプト
```

## E2E検証

```bash
npm run build
npx vite preview --port 4173 --strictPort &
node e2e/verify-run.mjs ./shots    # 通常プレイ一周
node e2e/verify-boss.mjs ./shots   # ボス報酬・ドロップ売却・リタイア
```
