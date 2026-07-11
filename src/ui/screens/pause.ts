import type { GameFlow } from "../../game/GameFlow";
import { button, el, screenEl } from "../components";
import { renderSettings } from "./settings";

// SC-007 ポーズ画面
export function renderPause(flow: GameFlow, show: (el: HTMLElement) => void): HTMLElement {
  const s = screenEl(true);
  s.appendChild(el("h2", undefined, "⏸ ポーズ"));
  s.appendChild(el("div", "spacer"));

  s.appendChild(button("▶ 再開", "menu-btn primary", () => flow.resumeBattle()));
  s.appendChild(
    button("⚙ 設定", "menu-btn", () => show(renderSettings(() => flow.ui.showPause())))
  );

  let confirming = false;
  const retireBtn = button("🏳 リタイア", "menu-btn danger", () => {
    if (!confirming) {
      confirming = true;
      retireBtn.textContent = "本当にリタイアする？（もう一度タップ）";
      return;
    }
    flow.retire();
  });
  s.appendChild(retireBtn);
  s.appendChild(el("div", "spacer"));
  s.appendChild(el("div", "footnote", "リタイアするとコイン・剣・強化状態を失います"));
  return s;
}
