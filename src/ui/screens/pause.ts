import type { GameFlow } from "../../game/GameFlow";
import { RELICS, RELIC_RARITY_LABELS } from "../../game/data/relics";
import { applyCharacterToSword } from "../../game/systems/CharacterSystem";
import { applyRelicsToSwordForContext } from "../../game/systems/RelicSystem";
import { weaponUrl } from "../../game/assets";
import { button, el, screenEl, swordStatsTable } from "../components";
import { renderSettings } from "./settings";

// SC-007 ポーズ画面
export function renderPause(flow: GameFlow, show: (el: HTMLElement) => void, onResume = () => flow.resumeBattle()): HTMLElement {
  const s = screenEl(true);
  const run = flow.run;
  s.appendChild(el("h2", undefined, "▣ ステータス"));

  if (run) {
    const isBoss = flow.currentEnemy?.role === "boss";
    const sword = applyRelicsToSwordForContext(
      applyCharacterToSword(run.equippedSword, run.character),
      run.relics ?? [],
      isBoss,
      run.playerHp / run.playerMaxHp
    );
    const build = el("div", "pause-build-grid");

    const weaponPanel = el("section", "pause-build-panel");
    weaponPanel.appendChild(el("h3", undefined, "現在の武器"));
    const weaponHead = el("div", "pause-weapon-head");
    const icon = el("img", "pause-weapon-icon") as HTMLImageElement;
    icon.src = weaponUrl(sword.type);
    icon.alt = "";
    weaponHead.append(icon, el("strong", undefined, `${sword.name} Lv.${sword.level}`));
    weaponPanel.append(weaponHead, swordStatsTable(sword));

    const relicPanel = el("section", "pause-build-panel");
    relicPanel.appendChild(el("h3", undefined, `所持レリック（${run.relics.length}）`));
    const relicList = el("div", "pause-relic-list");
    if (run.relics.length === 0) {
      relicList.appendChild(el("div", "pause-empty", "レリックなし"));
    } else {
      for (const id of run.relics) {
        const relic = RELICS[id];
        const item = el("div", "pause-relic-item");
        const description = id === "bloodiedOil"
          ? `${relic.description} 現在の蓄積: +${(run.bloodiedOilStacks ?? 0) * 8}%。`
          : relic.description;
        item.append(
          el("div", "pause-relic-name", relic.name),
          el("div", "pause-relic-rarity", RELIC_RARITY_LABELS[relic.rarity]),
          el("div", "pause-relic-description", description)
        );
        relicList.appendChild(item);
      }
    }
    relicPanel.appendChild(relicList);
    build.append(weaponPanel, relicPanel);
    s.appendChild(build);
  }

  s.appendChild(button("戻る", "menu-btn primary", onResume));
  s.appendChild(
    button("⚙ 設定", "menu-btn", () => show(renderSettings(() => flow.ui.showPause(onResume))))
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
