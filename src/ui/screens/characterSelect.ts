import type { GameFlow } from "../../game/GameFlow";
import { CHARACTERS } from "../../game/data/characters";
import { characterFrameUrl } from "../../game/assets";
import { button, el, screenEl } from "../components";
import { renderSwordSelect } from "./swordSelect";

export function renderCharacterSelect(flow: GameFlow, show: (element: HTMLElement) => void): HTMLElement {
  const s = screenEl();
  s.appendChild(el("h2", undefined, "キャラクターを選択"));
  s.appendChild(el("div", "subtitle", "能力の違いを見て、冒険を始める"));

  const choices = el("div", "character-select-grid");
  for (const character of Object.values(CHARACTERS)) {
    const card = el("div", "card");
    const head = el("div", "select-card-head");
    const portrait = el("img", "select-portrait") as HTMLImageElement;
    portrait.src = characterFrameUrl(character.type, "idle");
    portrait.alt = "";
    head.append(portrait, el("h3", undefined, character.name));
    card.appendChild(head);
    const role = character.type === "hinata" ? "軽量スピード特化型" : character.type === "kanata" ? "重量戦車型" : character.type === "rin" ? "溜め攻撃特化型" : "標準型";
    card.appendChild(el("div", "subtitle", role));
    const stats = el("div", undefined, `攻撃 ×${character.attackMultiplier} ／ 速度 ×${character.attackSpeedMultiplier} ／ HP ×${character.hpMultiplier}`);
    stats.style.fontSize = "13px";
    stats.style.marginBottom = "10px";
    card.appendChild(stats);
    if (character.type === "rin") {
      const chargeStats = el("div", "subtitle", `溜め時間 ×${character.chargeTimeMultiplier} ／ 溜め火力 ×${character.chargeMultiplier}`);
      chargeStats.style.marginBottom = "8px";
      card.appendChild(chargeStats);
    }
    card.appendChild(button("このキャラで進む", "menu-btn primary", () => show(renderSwordSelect(flow, character.type))));
    choices.appendChild(card);
  }
  s.appendChild(choices);

  s.appendChild(button("← タイトルへ戻る", "menu-btn", () => flow.ui.showTitle()));
  return s;
}
