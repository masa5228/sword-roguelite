import type { GameFlow } from "../game/GameFlow";
import { DODGE_CHARGES } from "../game/GameFlow";
import { SWORD_BASES } from "../game/data/swords";
import { maxLevel } from "../game/systems/UpgradeSystem";
import { characterFrameUrl, weaponUrl } from "../game/assets";
import { el, button, swordStatsTable } from "./components";

// §18 戦闘画面レイアウト: 上=階層/コイン/敵HP、下=HP/回避/剣情報/ポーズ

export class Hud {
  private root: HTMLElement;
  private floorEl!: HTMLElement;
  private coinEl!: HTMLElement;
  private enemyNameEl!: HTMLElement;
  private enemyBarFill!: HTMLElement;
  private enemyBarLabel!: HTMLElement;
  private hpBarFill!: HTMLElement;
  private hpBarLabel!: HTMLElement;
  private dodgeDots!: HTMLElement;
  private swordMini!: HTMLElement;
  private swordIcon!: HTMLImageElement;
  private swordLabel!: HTMLElement;
  private playerPortrait!: HTMLImageElement;
  private cooldownFill!: HTMLElement;
  private cooldownLabel!: HTMLElement;
  private detailPop!: HTMLElement;
  private detailVisible = false;

  constructor(private flow: GameFlow) {
    this.root = document.getElementById("hud-root")!;
    this.build();
  }

  private build(): void {
    this.root.innerHTML = "";

    // 上部
    const top = el("div", "hud-top");
    const row1 = el("div", "hud-row");
    this.floorEl = el("span", undefined, "階層 1");
    this.coinEl = el("span", undefined, "💰 0");
    row1.append(this.floorEl, this.coinEl);
    top.appendChild(row1);

    this.enemyNameEl = el("div", "hud-row", "");
    this.enemyNameEl.style.fontSize = "13px";
    this.enemyNameEl.style.justifyContent = "center";
    top.appendChild(this.enemyNameEl);

    const enemyBar = el("div", "bar");
    this.enemyBarFill = el("div", "bar-fill enemy");
    this.enemyBarLabel = el("div", "bar-label");
    enemyBar.append(this.enemyBarFill, this.enemyBarLabel);
    top.appendChild(enemyBar);
    this.root.appendChild(top);

    // 下部
    const bottom = el("div", "hud-bottom");

    this.detailPop = el("div", "sword-detail-pop");
    this.detailPop.style.display = "none";
    bottom.appendChild(this.detailPop);

    const playerRow = el("div", "player-status-row");
    this.playerPortrait = el("img", "player-portrait") as HTMLImageElement;
    this.playerPortrait.alt = "";
    playerRow.appendChild(this.playerPortrait);

    const hpBar = el("div", "bar");
    hpBar.style.height = "20px";
    this.hpBarFill = el("div", "bar-fill hp");
    this.hpBarLabel = el("div", "bar-label");
    hpBar.append(this.hpBarFill, this.hpBarLabel);
    playerRow.appendChild(hpBar);
    bottom.appendChild(playerRow);

    const dodgeRow = el("div", "dodge-dots");
    dodgeRow.appendChild(el("span", undefined, "回避"));
    this.dodgeDots = el("span", "dodge-dots");
    dodgeRow.appendChild(this.dodgeDots);
    bottom.appendChild(dodgeRow);

    const cooldownBar = el("div", "bar cooldown-bar");
    this.cooldownFill = el("div", "bar-fill cooldown");
    this.cooldownLabel = el("div", "bar-label", "攻撃 READY");
    cooldownBar.append(this.cooldownFill, this.cooldownLabel);
    bottom.appendChild(cooldownBar);

    this.swordMini = el("div", "sword-mini");
    this.swordIcon = el("img", "hud-weapon-icon") as HTMLImageElement;
    this.swordIcon.alt = "";
    this.swordLabel = el("span");
    this.swordMini.append(this.swordIcon, this.swordLabel);
    bottom.appendChild(this.swordMini);

    const buttons = el("div", "hud-buttons");
    const swordBtn = button("⚔ 剣情報", "hud-btn", () => this.toggleDetail());
    const pauseBtn = button("⏸ ポーズ", "hud-btn", () => this.flow.pause());
    buttons.append(swordBtn, pauseBtn);
    bottom.appendChild(buttons);

    this.root.appendChild(bottom);
  }

  /** 剣の詳細数値はタップ時のみ展開 (§18.1) */
  private toggleDetail(): void {
    this.detailVisible = !this.detailVisible;
    if (this.detailVisible && this.flow.run) {
      this.detailPop.innerHTML = "";
      const sword = this.flow.run.equippedSword;
      const title = el("div", undefined, `${SWORD_BASES[sword.type].icon} ${sword.name}`);
      title.style.fontWeight = "700";
      this.detailPop.appendChild(title);
      this.detailPop.appendChild(swordStatsTable(sword, undefined, this.flow.run.character));
      this.detailPop.style.display = "block";
    } else {
      this.detailPop.style.display = "none";
    }
  }

  show(): void {
    this.root.classList.add("visible");
  }

  hide(): void {
    this.root.classList.remove("visible");
    this.detailVisible = false;
    this.detailPop.style.display = "none";
  }

  update(): void {
    const run = this.flow.run;
    if (!run) return;
    this.floorEl.textContent = `階層 ${run.floor}`;
    this.coinEl.textContent = `💰 ${run.coins}`;

    const enemy = this.flow.currentEnemy;
    if (enemy) {
      const roleTag = enemy.role === "boss" ? "👑 " : enemy.role === "elite" ? "⭐ " : "";
      this.enemyNameEl.textContent = `${roleTag}${enemy.name}`;
      const ratio = Math.max(0, enemy.currentHp / enemy.maxHp);
      this.enemyBarFill.style.transform = `scaleX(${ratio})`;
      this.enemyBarLabel.textContent = `${enemy.currentHp} / ${enemy.maxHp}`;
    } else {
      this.enemyNameEl.textContent = "";
      this.enemyBarFill.style.transform = "scaleX(0)";
      this.enemyBarLabel.textContent = "";
    }

    const hpRatio = Math.max(0, run.playerHp / run.playerMaxHp);
    this.hpBarFill.style.transform = `scaleX(${hpRatio})`;
    this.hpBarLabel.textContent = `HP ${run.playerHp} / ${run.playerMaxHp}`;

    this.dodgeDots.innerHTML = "";
    for (let i = 0; i < DODGE_CHARGES; i++) {
      this.dodgeDots.appendChild(el("span", `dodge-dot${i < run.dodgeCharges ? " full" : ""}`));
    }

    const sword = run.equippedSword;
    const swordMaxLevel = maxLevel(sword);
    const heat = sword.level <= 0 || swordMaxLevel <= 0 ? 0 : Math.min(3, Math.ceil((sword.level / swordMaxLevel) * 3));
    this.root.setAttribute("data-heat", String(heat));
    this.playerPortrait.src = characterFrameUrl(run.character.type, "idle");
    this.swordIcon.src = weaponUrl(sword.type);
    this.swordLabel.textContent = `${sword.name} Lv.${sword.level}`;
    if (this.detailVisible) {
      this.detailVisible = false;
      this.toggleDetail();
    }
  }

  updateAttackCooldown(remaining: number, total: number): void {
    const ratio = total > 0 ? Math.max(0, Math.min(1, 1 - remaining / total)) : 1;
    this.cooldownFill.style.transform = `scaleX(${ratio})`;
    const ready = remaining <= 0.001;
    this.cooldownLabel.textContent = ready ? "攻撃 READY" : `攻撃 ${(remaining).toFixed(1)}秒`;
    this.cooldownFill.classList.toggle("ready", ready);
  }
}
