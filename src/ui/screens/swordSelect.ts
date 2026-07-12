import type { GameFlow } from "../../game/GameFlow";
import type { CharacterType, SwordType } from "../../types";
import { CHARACTERS } from "../../game/data/characters";
import { SWORD_BASES } from "../../game/data/swords";
import { createStarterSword } from "../../game/systems/DropSystem";
import { estimateDps } from "../../game/systems/CombatSystem";
import { weaponUrl } from "../../game/assets";
import { button, el, screenEl } from "../components";

const STARTER_SWORD_TYPES: SwordType[] = ["longSword", "greatSword", "rapier"];

// SC-002 初期剣選択画面
export function renderSwordSelect(flow: GameFlow, characterType: CharacterType = "renon"): HTMLElement {
  const s = screenEl();
  const character = CHARACTERS[characterType];
  s.appendChild(el("h2", undefined, "初期剣を選択"));
  s.appendChild(el("div", "subtitle", `${character.name} とともに冒険を始める`));

  const choices = el("div", "sword-select-grid");
  STARTER_SWORD_TYPES.forEach((type) => {
    const base = SWORD_BASES[type];
    const sword = createStarterSword(type);
    const card = el("div", "card sword-start-card");
    const head = el("div", "select-card-head");
    const icon = el("img", "select-weapon") as HTMLImageElement;
    icon.src = weaponUrl(type);
    icon.alt = "";
    const title = el("div", undefined, base.nameJa);
    title.style.fontWeight = "700";
    title.style.fontSize = "17px";
    title.style.marginBottom = "6px";
    head.append(icon, title);
    card.appendChild(head);
    const desc = el("div", "sword-start-description", base.description);
    desc.style.fontSize = "13px";
    desc.style.color = "var(--forge-steel-dim)";
    desc.style.marginBottom = "8px";
    card.appendChild(desc);
    const stats = el(
      "div",
      "sword-start-stats",
      `攻撃 ${sword.attack} ／ 速度 ${sword.attackSpeed}回/秒 ／ 会心 ${Math.round(sword.criticalRate * 100)}% ／ DPS ${estimateDps(sword)}`
    );
    stats.style.fontSize = "13px";
    stats.style.marginBottom = "10px";
    card.appendChild(stats);
    card.appendChild(button("この剣で始める", "menu-btn primary", () => flow.newRun(type, characterType)));
    choices.appendChild(card);
  });
  s.appendChild(choices);

  s.appendChild(button("← タイトルへ戻る", "menu-btn", () => flow.ui.showTitle()));
  return s;
}
