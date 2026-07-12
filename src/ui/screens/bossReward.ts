import type { GameFlow } from "../../game/GameFlow";
import type { Sword } from "../../types";
import { button, el, screenEl, swordCard } from "../components";

// SC-006 ボス報酬画面 (§13.3 剣3本を提示し1本を選択)
export function renderBossReward(flow: GameFlow, swords: Sword[]): HTMLElement {
  const s = screenEl(true);
  s.classList.add("intermission-screen", "boss-reward-screen");
  const run = flow.run;
  if (!run) return s;

  s.appendChild(el("h2", undefined, "👑 ボス撃破！"));
  s.appendChild(el("div", "subtitle", "報酬: HP30%回復 ＋ 剣を1本選択（装備すると前の剣は売却）"));

  for (const sword of swords) {
    const wrap = el("div");
    wrap.appendChild(swordCard(sword, run.equippedSword));
    const pick = button("この剣を装備する", "menu-btn primary", () => flow.equipSword(sword));
    pick.style.marginTop = "6px";
    wrap.appendChild(pick);
    s.appendChild(wrap);
  }

  s.appendChild(button("▣ ステータス", "menu-btn", () => flow.pause(() => flow.ui.showBossReward(swords))));
  s.appendChild(button("受け取らない（現在の剣を維持）", "menu-btn", () => flow.skipBossReward()));
  return s;
}
