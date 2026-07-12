import type { GameFlow } from "../../game/GameFlow";
import type { RelicId } from "../../types";
import { RELICS, RELIC_LIMIT } from "../../game/data/relics";
import { button, el, screenEl } from "../components";

export function renderRelicReward(flow: GameFlow, relicIds: RelicId[]): HTMLElement {
  const s = screenEl(true);
  s.classList.add("intermission-screen", "relic-reward-screen");
  const owned = flow.run?.relics ?? [];
  s.appendChild(el("h2", undefined, "◆ レリック"));
  s.appendChild(el("div", "subtitle", `ベース機能を強化するアイテム（${owned.length}/${RELIC_LIMIT}）`));

  const grid = el("div", "relic-grid");
  for (const id of relicIds) {
    const relic = RELICS[id];
    const card = button("", "relic-card", () => flow.obtainRelic(id));
    card.append(
      el("div", "relic-card-rarity", relic.rarity.toUpperCase()),
      el("div", "relic-card-name", relic.name),
      el("div", "relic-card-description", relic.description)
    );
    card.disabled = owned.length >= RELIC_LIMIT || owned.includes(id);
    grid.appendChild(card);
  }
  s.appendChild(grid);
  s.appendChild(button("今回は獲得しない", "menu-btn", () => flow.skipRelic()));
  return s;
}
