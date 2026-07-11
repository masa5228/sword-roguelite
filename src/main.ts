import Phaser from "phaser";
import "./styles.css";
import { BattleScene, GAME_HEIGHT, GAME_WIDTH } from "./game/scenes/BattleScene";
import { GameFlow } from "./game/GameFlow";
import { UIManager } from "./ui/UIManager";
import { unlockAudio } from "./services/audioService";
import { maintainLandscapeLock, requestLandscapePresentation } from "./services/displayService";

// §7.4 iOS Safariのスクロール・拡大・長押しメニュー抑止
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener(
  "touchmove",
  (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".screen")) e.preventDefault();
  },
  { passive: false }
);
document.addEventListener("dblclick", (e) => e.preventDefault());

// 初回タップでオーディオ起動（自動再生制限対策）
window.addEventListener(
  "pointerdown",
  () => {
    unlockAudio();
    void requestLandscapePresentation();
  },
  { once: true }
);
window.addEventListener("orientationchange", maintainLandscapeLock);
document.addEventListener("fullscreenchange", maintainLandscapeLock);
maintainLandscapeLock();

const flow = new GameFlow();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#0a0a16",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH, // §4.3 基準解像度 390×844 縦固定
    height: GAME_HEIGHT,
  },
  scene: [BattleScene],
  callbacks: {
    preBoot: (g) => {
      g.registry.set("flow", flow);
    },
  },
});

const battleScene = () => game.scene.getScene("battle") as BattleScene;

flow.battle = {
  startFloor: (enemy, bossHint) => battleScene().startFloor(enemy, bossHint),
  setPaused: (paused) => battleScene().setPaused(paused),
  stopBattle: () => battleScene().stopBattle(),
};
const ui = new UIManager(flow);
flow.ui = ui;

// 起動 → タイトル表示
game.events.once(Phaser.Core.Events.READY, () => {
  flow.ui.showTitle();
});

// §22.3 バックグラウンド化で自動ポーズ（階層開始時セーブ済みなので破棄されても再開可能）
// 報酬画面などのオーバーレイ表示中はゲームが止まっているためポーズしない
document.addEventListener("visibilitychange", () => {
  if (document.hidden && flow.run && flow.currentEnemy && !ui.hasOpenScreen()) {
    flow.pause();
  }
});

// PWA: Service Worker登録 (§23.2 オフライン動作)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* オフライン非対応環境でも動作継続 */
    });
  });
}
