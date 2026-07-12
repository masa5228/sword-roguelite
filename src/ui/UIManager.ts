import type { GameFlow, UiPort } from "../game/GameFlow";
import type { ResultData, Sword } from "../types";
import { Hud } from "./hud";
import { renderTitle } from "./screens/title";
import { renderSwordSelect } from "./screens/swordSelect";
import { renderReward } from "./screens/reward";
import { renderSwordPickup } from "./screens/swordPickup";
import { renderBossReward } from "./screens/bossReward";
import { renderPause } from "./screens/pause";
import { renderResult } from "./screens/result";
import { renderRanking } from "./screens/ranking";
import { renderRelicReward } from "./screens/relicReward";

// §19 画面遷移を担うDOMオーバーレイ管理
export class UIManager implements UiPort {
  private root: HTMLElement;
  private toastRoot: HTMLElement;
  private hud: Hud;

  constructor(private flow: GameFlow) {
    this.root = document.getElementById("ui-root")!;
    this.toastRoot = document.getElementById("toast-root")!;
    this.hud = new Hud(flow);
  }

  private show = (el: HTMLElement): void => {
    this.hudHide();
    this.root.innerHTML = "";
    this.root.appendChild(el);
  };

  showTitle(): void {
    this.hudHide();
    this.show(renderTitle(this.flow, this.show));
  }

  showSwordSelect(): void {
    this.show(renderSwordSelect(this.flow));
  }

  showReward(): void {
    this.hudHide();
    this.show(renderReward(this.flow));
  }

  showSwordPickup(sword: Sword): void {
    this.show(renderSwordPickup(this.flow, sword));
  }

  showBossReward(swords: Sword[]): void {
    this.show(renderBossReward(this.flow, swords));
  }

  showRelicReward(relics: import("../types").RelicId[]): void {
    this.show(renderRelicReward(this.flow, relics));
  }

  showPause(): void {
    this.show(renderPause(this.flow, this.show));
  }

  showResult(result: ResultData): void {
    this.show(renderResult(this.flow, result, this.show));
  }

  showRanking(): void {
    this.hudHide();
    this.show(renderRanking(this.flow));
  }

  closeScreen(): void {
    this.root.innerHTML = "";
  }

  /** 報酬・ポーズなどのオーバーレイ画面が開いているか */
  hasOpenScreen(): boolean {
    return this.root.children.length > 0;
  }

  hudShow(): void {
    this.hud.show();
  }

  hudHide(): void {
    this.hud.hide();
  }

  hudUpdate(): void {
    this.hud.update();
  }

  hudUpdateAttackCooldown(remaining: number, total: number): void {
    this.hud.updateAttackCooldown(remaining, total);
  }

  toast(message: string, tutorial = false): void {
    const t = document.createElement("div");
    t.className = tutorial ? "toast tutorial" : "toast";
    t.textContent = message;
    this.toastRoot.appendChild(t);
    // 表示過多を防ぐ
    while (this.toastRoot.children.length > 3) {
      this.toastRoot.removeChild(this.toastRoot.firstChild!);
    }
    const life = tutorial ? 3800 : 2000;
    window.setTimeout(() => t.classList.add("fade-out"), life);
    window.setTimeout(() => t.remove(), life + 450);
  }
}
