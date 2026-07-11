import type { GameFlow } from "../../game/GameFlow";
import type { SwordRarity, SwordType } from "../../types";
import { RARITY_INFO, SWORD_BASES } from "../../game/data/swords";
import { ELITE_INFO, ENEMY_BASES } from "../../game/data/enemies";
import { BOSS_KNIGHT } from "../../game/data/bosses";
import { loadSave } from "../../services/saveService";
import { button, el, screenEl } from "../components";
import { enemyFrameUrl, weaponUrl } from "../../game/assets";

// SC-009 剣図鑑 / SC-010 敵図鑑 (§14.2 永続保存)
export function renderDexScreen(_flow: GameFlow, kind: "sword" | "enemy", onBack: () => void): HTMLElement {
  const s = screenEl();
  const save = loadSave();

  if (kind === "sword") {
    s.appendChild(el("h2", undefined, "📖 剣図鑑"));
    const types = Object.keys(SWORD_BASES) as SwordType[];
    const rarities = Object.keys(RARITY_INFO) as SwordRarity[];
    const total = types.length * rarities.length;
    const found = save.discoveredSwords.length;
    s.appendChild(el("div", "subtitle", `発見: ${found} / ${total}`));

    const grid = el("div", "dex-grid");
    for (const type of types) {
      for (const rarity of rarities) {
        const key = `${type}:${rarity}`;
        const discovered = save.discoveredSwords.includes(key);
        const cell = el("div", `dex-cell${discovered ? "" : " locked"}`);
        if (discovered) {
          const icon = el("img", "dex-sprite dex-weapon") as HTMLImageElement;
          icon.src = weaponUrl(type);
          icon.alt = "";
          cell.appendChild(icon);
        } else {
          cell.appendChild(el("div", "icon", "?"));
        }
        cell.appendChild(el("div", undefined, discovered ? SWORD_BASES[type].nameJa : "？？？"));
        const tag = el("span", `rarity-tag rarity-${rarity}`, `${RARITY_INFO[rarity].icon} ${RARITY_INFO[rarity].nameJa}`);
        cell.appendChild(tag);
        grid.appendChild(cell);
      }
    }
    s.appendChild(grid);
  } else {
    s.appendChild(el("h2", undefined, "👹 敵図鑑"));
    const bases = [...Object.values(ENEMY_BASES), BOSS_KNIGHT];
    const found = save.discoveredEnemies.length;
    s.appendChild(el("div", "subtitle", `発見: ${found}種`));

    const grid = el("div", "dex-grid");
    for (const base of bases) {
      const discovered = save.discoveredEnemies.includes(base.type);
      const cell = el("div", `dex-cell${discovered ? "" : " locked"}`);
      if (discovered) {
        const icon = el("img", "dex-sprite") as HTMLImageElement;
        icon.src = enemyFrameUrl(base.type, "idle");
        icon.alt = "";
        cell.appendChild(icon);
      } else {
        cell.appendChild(el("div", "icon", "?"));
      }
      cell.appendChild(el("div", undefined, discovered ? base.nameJa : "？？？"));
      if (discovered) {
        const d = el("div", undefined, base.description);
        d.style.fontSize = "11px";
        d.style.color = "var(--forge-steel-dim)";
        cell.appendChild(d);
      }
      grid.appendChild(cell);
    }
    s.appendChild(grid);

    // 発見済みエリート
    const elites = save.discoveredEnemies.filter((k) => k.includes(":elite-"));
    if (elites.length > 0) {
      s.appendChild(el("h2", undefined, "⭐ エリート"));
      const eliteGrid = el("div", "dex-grid");
      for (const key of elites) {
        const [type, eliteKey] = key.split(":elite-");
        const base = ENEMY_BASES[type as keyof typeof ENEMY_BASES];
        const info = ELITE_INFO[eliteKey as keyof typeof ELITE_INFO];
        if (!base || !info) continue;
        const cell = el("div", "dex-cell");
        const icon = el("img", "dex-sprite elite-sprite") as HTMLImageElement;
        icon.src = enemyFrameUrl(base.type, "idle");
        icon.alt = "";
        cell.appendChild(icon);
        cell.appendChild(el("div", undefined, `${info.nameJa}・${base.nameJa}`));
        eliteGrid.appendChild(cell);
      }
      s.appendChild(eliteGrid);
    }
  }

  s.appendChild(el("div", "spacer"));
  s.appendChild(button("← 戻る", "menu-btn", onBack));
  return s;
}
