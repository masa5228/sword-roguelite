import type { Character, Sword, SwordRarity } from "../types";
import { EFFECT_INFO, RARITY_INFO } from "../game/data/swords";
import { estimateDps } from "../game/systems/CombatSystem";
import { maxLevel } from "../game/systems/UpgradeSystem";
import { playSfx } from "../services/audioService";
import { applyCharacterToSword } from "../game/systems/CharacterSystem";
import { weaponUrl } from "../game/assets";

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", className, label);
  b.addEventListener("click", () => {
    playSfx("ui");
    onClick();
  });
  return b;
}

/** レアリティ表示: 色+アイコン+文字 (§23.4 色だけで区別しない) */
export function rarityTag(rarity: SwordRarity): HTMLElement {
  const info = RARITY_INFO[rarity];
  return el("span", `rarity-tag rarity-${rarity}`, `${info.icon} ${info.nameJa}`);
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** §9.5 剣の比較表 */
export function swordStatsTable(sword: Sword, compareTo?: Sword, character?: Character): HTMLTableElement {
  const adjustedSword = character ? applyCharacterToSword(sword, character) : sword;
  const adjustedCompare = character && compareTo ? applyCharacterToSword(compareTo, character) : compareTo;
  const table = el("table", "stat-table");
  const rows: [string, number, number | undefined, (v: number) => string][] = [
    ["攻撃力", adjustedSword.attack, adjustedCompare?.attack, fmt],
    ["攻撃速度", adjustedSword.attackSpeed, adjustedCompare?.attackSpeed, (v) => `${fmt(v)}回/秒`],
    ["会心率", adjustedSword.criticalRate, adjustedCompare?.criticalRate, (v) => `${Math.round(v * 100)}%`],
    ["会心倍率", adjustedSword.criticalMultiplier, adjustedCompare?.criticalMultiplier, (v) => `×${fmt(v)}`],
    ["溜め倍率", adjustedSword.chargeMultiplier, adjustedCompare?.chargeMultiplier, (v) => `最大×${fmt(v)}`],
    ["強化レベル", sword.level, compareTo?.level, (v) => `Lv.${v} / ${maxLevel(sword)}`],
    ["推定DPS", estimateDps(adjustedSword), adjustedCompare ? estimateDps(adjustedCompare) : undefined, fmt],
  ];
  for (const [label, value, other, format] of rows) {
    const tr = el("tr");
    tr.appendChild(el("td", undefined, label));
    const td = el("td", undefined, format(value));
    if (other !== undefined && Math.abs(value - other) > 0.0001) {
      td.classList.add(value > other ? "stat-up" : "stat-down");
      td.textContent += value > other ? " ▲" : " ▼";
    }
    tr.appendChild(td);
    table.appendChild(tr);
  }
  // 特殊効果
  const tr = el("tr");
  tr.appendChild(el("td", undefined, "特殊効果"));
  const effText =
    sword.effects.length > 0
      ? sword.effects.map((e) => `${EFFECT_INFO[e.type].icon}${EFFECT_INFO[e.type].nameJa}Lv${e.level}`).join(" ")
      : "なし";
  tr.appendChild(el("td", undefined, effText));
  table.appendChild(tr);
  return table;
}

export function swordCard(sword: Sword, compareTo?: Sword): HTMLElement {
  const card = el("div", "card");
  const head = el("div");
  head.style.display = "flex";
  head.style.justifyContent = "space-between";
  head.style.alignItems = "center";
  head.style.marginBottom = "8px";
  const title = el("div", "sword-card-title");
  const icon = el("img", "card-weapon") as HTMLImageElement;
  icon.src = weaponUrl(sword.type);
  icon.alt = "";
  title.append(icon, document.createTextNode(sword.name));
  title.style.fontWeight = "700";
  title.style.fontSize = "15px";
  head.appendChild(title);
  head.appendChild(rarityTag(sword.rarity));
  card.appendChild(head);
  card.appendChild(swordStatsTable(sword, compareTo));
  return card;
}

export function screenEl(overlay = false): HTMLDivElement {
  const s = el("div", overlay ? "screen overlay" : "screen");
  return s;
}
