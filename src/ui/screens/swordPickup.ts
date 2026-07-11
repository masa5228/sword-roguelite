import type { GameFlow } from "../../game/GameFlow";
import { estimateDps } from "../../game/systems/CombatSystem";
import { weaponUrl } from "../../game/assets";
import type { Sword } from "../../types";
import { el, rarityTag, screenEl } from "../components";

function comparisonValue(value: number, other: number, format: (n: number) => string): HTMLElement {
  const result = el("span", "weapon-stat-value", format(value));
  if (Math.abs(value - other) > 0.0001) result.classList.add(value > other ? "stat-up" : "stat-down");
  return result;
}

function weaponPanel(label: string, sword: Sword, other: Sword, featured: boolean, onSelect: () => void): HTMLButtonElement {
  const panel = document.createElement("button");
  panel.type = "button";
  panel.className = `weapon-panel${featured ? " featured" : ""}`;
  panel.addEventListener("click", onSelect);
  panel.appendChild(el("div", "weapon-panel-label", label));

  const head = el("div", "weapon-panel-head");
  const icon = el("img", "weapon-panel-icon") as HTMLImageElement;
  icon.src = weaponUrl(sword.type);
  icon.alt = "";
  const name = el("div", "weapon-panel-name", sword.name);
  const meta = el("div", "weapon-panel-meta", `Lv.${sword.level}`);
  head.append(icon, name, rarityTag(sword.rarity), meta);
  panel.appendChild(head);

  const stats = el("div", "weapon-stat-grid");
  const rows: Array<[string, number, number, (n: number) => string]> = [
    ["ATK", sword.attack, other.attack, String],
    ["SPD", sword.attackSpeed, other.attackSpeed, (n) => n.toFixed(2)],
    ["CRIT", sword.criticalRate, other.criticalRate, (n) => `${Math.round(n * 100)}%`],
    ["DPS", estimateDps(sword), estimateDps(other), (n) => n.toFixed(1)],
  ];
  for (const [labelText, value, otherValue, format] of rows) {
    const row = el("div", "weapon-stat-row");
    row.append(el("span", "weapon-stat-label", labelText), comparisonValue(value, otherValue, format));
    stats.appendChild(row);
  }
  panel.appendChild(stats);
  return panel;
}

// SC-005 Weapon drop comparison.
export function renderSwordPickup(flow: GameFlow, sword: Sword): HTMLElement {
  const s = screenEl(true);
  s.classList.add("intermission-screen", "pickup-screen");
  const run = flow.run;
  if (!run) return s;

  s.appendChild(el("h2", undefined, "武器を入手"));
  s.appendChild(el("div", "subtitle", "新しい武器と現在の武器を比較"));

  const comparison = el("div", "weapon-comparison");
  comparison.append(
    weaponPanel("NEW - EQUIP", sword, run.equippedSword, true, () => flow.equipSword(sword)),
    weaponPanel("CURRENT - KEEP", run.equippedSword, sword, false, () => flow.keepCurrentSword())
  );
  s.appendChild(comparison);
  return s;
}
