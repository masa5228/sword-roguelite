import type { GameFlow } from "../../game/GameFlow";
import {
  UPGRADE_LABELS,
  healCost,
  maxLevel,
  upgradeCost,
  type UpgradeKind,
} from "../../game/systems/UpgradeSystem";
import { button, el, rarityTag, screenEl } from "../components";
import { weaponUrl } from "../../game/assets";

// SC-004 戦闘報酬画面 (§11.1 強化タイミング)
export function renderReward(flow: GameFlow): HTMLElement {
  const s = screenEl(true);
  s.classList.add("intermission-screen", "reward-screen");
  const run = flow.run;
  if (!run) return s;

  const render = () => {
    s.innerHTML = "";
    const sword = run.equippedSword;

    s.appendChild(el("h2", undefined, `${run.floor}F クリア`));
    const coins = el("div", "coin-display", `💰 ${run.coins} コイン`);
    s.appendChild(coins);

    const swordHead = el("div", "card reward-summary");
    const headRow = el("div");
    headRow.style.display = "flex";
    headRow.style.justifyContent = "space-between";
    headRow.style.alignItems = "center";
    const name = el("span", "reward-sword-name");
    const icon = el("img", "card-weapon") as HTMLImageElement;
    icon.src = weaponUrl(sword.type);
    icon.alt = "";
    name.append(icon, document.createTextNode(`${sword.name}  Lv.${sword.level}/${maxLevel(sword)}`));
    name.style.fontWeight = "700";
    name.style.fontSize = "14px";
    headRow.append(name, rarityTag(sword.rarity));
    swordHead.appendChild(headRow);
    s.appendChild(swordHead);

    const cost = upgradeCost(sword);
    const atMax = sword.level >= maxLevel(sword);

    const kinds: UpgradeKind[] = ["attack", "attackSpeed", "criticalRate", "criticalMultiplier"];
    if (sword.effects.length > 0) kinds.push("effect");

    const list = el("div", "upgrade-grid");

    const currentValue = (kind: UpgradeKind): string => {
      switch (kind) {
        case "attack":
          return `${sword.attack}`;
        case "attackSpeed":
          return `${sword.attackSpeed}回/秒`;
        case "criticalRate":
          return `${Math.round(sword.criticalRate * 100)}%`;
        case "criticalMultiplier":
          return `×${sword.criticalMultiplier}`;
        case "effect":
          return `Lv${sword.effects[0]?.level ?? 0}`;
      }
    };

    for (const kind of kinds) {
      const b = el("button", "upgrade-item") as HTMLButtonElement;
      const label = el("span", undefined, `${UPGRADE_LABELS[kind]}（${currentValue(kind)}）`);
      const price = el("span", "price", atMax ? "上限" : `💰${cost}`);
      b.append(label, price);
      b.disabled = atMax || run.coins < cost;
      b.addEventListener("click", () => {
        if (flow.upgrade(kind)) render();
      });
      list.appendChild(b);
    }

    // HP回復
    const hCost = healCost(run.floor);
    const healBtn = el("button", "upgrade-item") as HTMLButtonElement;
    healBtn.append(
      el("span", undefined, `HP回復 +30%（HP ${run.playerHp}/${run.playerMaxHp}）`),
      el("span", "price", `💰${hCost}`)
    );
    healBtn.disabled = run.coins < hCost || run.playerHp >= run.playerMaxHp;
    healBtn.addEventListener("click", () => {
      if (flow.buyHeal()) render();
    });
    list.appendChild(healBtn);

    s.appendChild(list);
    s.appendChild(button("⏸ ポーズ", "menu-btn", () => flow.pause(() => flow.ui.showReward())));
    s.appendChild(el("div", "spacer"));
    s.appendChild(button("次の階層へ ▶", "menu-btn primary", () => flow.nextFloor()));
  };

  render();
  return s;
}
