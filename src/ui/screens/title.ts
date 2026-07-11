import type { GameFlow } from "../../game/GameFlow";
import { loadSave } from "../../services/saveService";
import { button, el, screenEl } from "../components";
import { renderDexScreen } from "./dex";
import { renderSettings } from "./settings";
import { renderCharacterSelect } from "./characterSelect";

// SC-001 タイトル画面
export function renderTitle(flow: GameFlow, show: (el: HTMLElement) => void): HTMLElement {
  const s = screenEl();
  const save = loadSave();

  s.appendChild(el("h1", undefined, "⚔️ アンジョウ・ダンジョン"));
  s.appendChild(el("div", "subtitle", "剣を拾い、鍛え、より深い階層へ"));

  const menu = el("div");
  menu.style.display = "flex";
  menu.style.flexDirection = "column";
  menu.style.gap = "12px";
  menu.style.marginTop = "24px";

  if (flow.hasSuspend()) {
    menu.appendChild(
      button("▶ 続きから", "menu-btn primary", () => flow.resumeRun())
    );
    menu.appendChild(button("はじめから", "menu-btn", () => show(renderCharacterSelect(flow, show))));
  } else {
    menu.appendChild(button("▶ ゲーム開始", "menu-btn primary", () => show(renderCharacterSelect(flow, show))));
  }

  menu.appendChild(button("📖 剣図鑑", "menu-btn", () => show(renderDexScreen(flow, "sword", () => flow.ui.showTitle()))));
  menu.appendChild(button("👹 敵図鑑", "menu-btn", () => show(renderDexScreen(flow, "enemy", () => flow.ui.showTitle()))));
  menu.appendChild(button("⚙ 設定", "menu-btn", () => show(renderSettings(() => flow.ui.showTitle()))));
  s.appendChild(menu);

  s.appendChild(el("div", "spacer"));
  const records = el("div", "footnote");
  records.textContent =
    save.highestFloor > 0
      ? `最高到達階層: ${save.highestFloor}F ／ 最大撃破数: ${save.maxKills}体 ／ 実績: ${save.achievements.length}個`
      : "記録なし — 最初の冒険へ出よう";
  s.appendChild(records);
  return s;
}
