import type { CharacterType, Enemy, RelicId, ResultData, RunState, Sword, SwordType } from "../types";
import { coinsForKill, createEnemyForFloor, enemyDexKey } from "./systems/DifficultySystem";
import { generateSword, calcSellPrice, createStarterSword, rollDrop } from "./systems/DropSystem";
import { applyUpgrade, healCost, HEAL_RATIO, type UpgradeKind } from "./systems/UpgradeSystem";
import { mulberry32, newSeed } from "./systems/rng";
import {
  clearSuspend,
  discoverEnemy,
  discoverSword,
  loadSave,
  loadSuspend,
  saveSuspend,
  unlockAchievement,
  updateSave,
} from "../services/saveService";
import { playSfx, vibrate } from "../services/audioService";
import { BOSS_HEAL_RATIO, BOSS_REWARD_SWORD_COUNT } from "./data/bosses";
import { CHARACTERS, DEFAULT_CHARACTER } from "./data/characters";
import { RELICS, RELIC_LIMIT, hasRelic, relicChoices } from "./data/relics";
import { relicDamageTakenMultiplier } from "./systems/RelicSystem";

// §26.1 プレイヤー初期値
export const PLAYER_MAX_HP = 100;
export const PLAYER_DEFENSE = 0;
export const DODGE_CHARGES = 2;
export const DODGE_INVINCIBLE_SEC = 0.35;
export const DODGE_RECOVER_SEC = 3.0;

export function dodgeChargesFor(characterType: CharacterType): number {
  return characterType === "hinata" ? 3 : DODGE_CHARGES;
}

export interface BattlePort {
  startFloor(enemy: Enemy, bossHint: boolean): void;
  setPaused(paused: boolean): void;
  stopBattle(): void;
}

export interface UiPort {
  showTitle(): void;
  showSwordSelect(): void;
  showReward(): void;
  showSwordPickup(sword: Sword): void;
  showBossReward(swords: Sword[]): void;
  showRelicReward(relics: RelicId[]): void;
  showPause(): void;
  showResult(result: ResultData): void;
  showRanking(): void;
  closeScreen(): void;
  hudShow(): void;
  hudHide(): void;
  hudUpdate(): void;
  hudUpdateAttackCooldown(remaining: number, total: number): void;
  toast(message: string, tutorial?: boolean): void;
}

const ACHIEVEMENTS: Record<string, string> = {
  "first-kill": "初撃破",
  "first-boss": "ボス撃破",
  "floor-10": "10階層到達",
  "floor-30": "30階層到達",
  "epic-get": "エピック剣入手",
  "kills-100": "累計100体撃破",
};

export class GameFlow {
  run: RunState | null = null;
  battle!: BattlePort;
  ui!: UiPort;
  currentEnemy: Enemy | null = null;
  private pendingDrop: Sword | null = null;
  private pendingRelicContinue: (() => void) | null = null;

  // ===== 開始・再開 =====

  hasSuspend(): boolean {
    return loadSuspend() !== null;
  }

  newRun(swordType: SwordType, characterType: CharacterType = DEFAULT_CHARACTER.type): void {
    const sword = createStarterSword(swordType);
    const character = CHARACTERS[characterType] ?? DEFAULT_CHARACTER;
    this.run = {
      floor: 1,
      playerHp: Math.round(PLAYER_MAX_HP * character.hpMultiplier),
      playerMaxHp: Math.round(PLAYER_MAX_HP * character.hpMultiplier),
      defense: PLAYER_DEFENSE,
      dodgeCharges: dodgeChargesFor(character.type),
      coins: 0,
      equippedSword: sword,
      character,
      defeatedEnemies: 0,
      defeatedBosses: 0,
      totalCoinsEarned: 0,
      maxDamage: 0,
      startedAt: Date.now(),
      bestRarityFound: null,
      relics: [],
      seed: newSeed(),
    };
    discoverSword(`${sword.type}:${sword.rarity}`);
    this.startFloor();
  }

  resumeRun(): void {
    const suspend = loadSuspend();
    if (!suspend) {
      this.ui.showTitle();
      return;
    }
    this.run = { ...suspend.run, character: suspend.run.character ?? DEFAULT_CHARACTER };
    this.startFloor();
  }

  /** §22.3 階層開始時に一時セーブし、敵を生成して戦闘開始 */
  startFloor(): void {
    const run = this.run;
    if (!run) return;
    run.dodgeCharges = dodgeChargesFor(run.character.type);
    saveSuspend(run);

    // 乱数シード + 階層 から敵を決定論的に生成（再開時に同じ敵が出る）
    const rand = mulberry32(run.seed + run.floor * 7919);
    const enemy = createEnemyForFloor(run.floor, rand);

    // §20.2 初回ボス撃破までは難易度を抑える
    if (!loadSave().tutorialCompleted) {
      enemy.maxHp = Math.round(enemy.maxHp * 0.75);
      enemy.currentHp = enemy.maxHp;
      enemy.attack = Math.round(enemy.attack * 0.75);
    }

    this.currentEnemy = enemy;
    this.ui.closeScreen();
    this.ui.hudShow();
    this.ui.hudUpdate();
    this.battle.startFloor(enemy, enemy.role === "boss");

    if (enemy.role === "boss") playSfx("bossWarn");
    this.tutorialHint();
  }

  // ===== チュートリアル (§20) =====

  private tutorialHint(): void {
    if (loadSave().tutorialCompleted || !this.run) return;
    const hints = [
      "タップで攻撃！",
      "長押しで溜め攻撃（離して発動）",
      "左右スワイプで回避（敵の赤い予告に注意）",
      "敵を倒すとコインを獲得。強化画面で剣を育てよう",
    ];
    if (this.run.floor <= hints.length) {
      this.ui.toast(hints[this.run.floor - 1], true);
    }
  }

  // ===== 戦闘からの通知 =====

  /** 敵にダメージを与えた（記録用） */
  recordDamage(damage: number): void {
    if (!this.run) return;
    if (damage > this.run.maxDamage) this.run.maxDamage = damage;
  }

  /** プレイヤー被弾。死亡したら true */
  damagePlayer(amount: number): boolean {
    const run = this.run;
    if (!run) return false;
    run.playerHp = Math.max(0, run.playerHp - Math.round(amount * relicDamageTakenMultiplier(run.relics ?? [])));
    playSfx("playerHit");
    vibrate("playerHit");
    this.ui.hudUpdate();
    if (run.playerHp <= 0) {
      this.endRun(false);
      return true;
    }
    return false;
  }

  healPlayer(amount: number): void {
    const run = this.run;
    if (!run) return;
    run.playerHp = Math.min(run.playerMaxHp, run.playerHp + amount);
    this.ui.hudUpdate();
  }

  onEnemyDefeated(): void {
    const run = this.run;
    const enemy = this.currentEnemy;
    if (!run || !enemy) return;

    playSfx("enemyDie");
    run.defeatedEnemies += 1;
    const coins = coinsForKill(enemy);
    run.coins += coins;
    run.totalCoinsEarned += coins;
    if ((run.relics ?? []).includes("bloodVial")) this.healPlayer(Math.ceil(run.playerMaxHp * 0.05));
    playSfx("coin");
    this.ui.toast(`💰 +${coins} コイン`);

    if (discoverEnemy(enemyDexKey(enemy))) {
      this.ui.toast(`📖 図鑑に「${enemy.name}」を登録`);
    }
    this.achieve("first-kill");
    const totalKills = Math.max(loadSave().maxKills, run.defeatedEnemies);
    if (totalKills >= 100) this.achieve("kills-100");
    updateSave((s) => {
      if (run.defeatedEnemies > s.maxKills) s.maxKills = run.defeatedEnemies;
    });

    this.ui.hudUpdate();

    if (enemy.role === "boss") {
      run.defeatedBosses += 1;
      this.achieve("first-boss");
      vibrate("bossKill");
      // §13.3 ボス撃破報酬: HP30%回復 + 剣3本から選択
      this.healPlayer(Math.round(run.playerMaxHp * BOSS_HEAL_RATIO));
      updateSave((s) => {
        if (!s.tutorialCompleted) s.tutorialCompleted = true;
      });
      const swords = Array.from({ length: BOSS_REWARD_SWORD_COUNT }, () => generateSword(run.floor));
      this.offerRelic(true, () => this.ui.showBossReward(swords));
      return;
    }

    // §9.3 剣ドロップ判定
    const continueReward = (): void => {
      if (rollDrop(enemy)) {
        const sword = generateSword(run.floor);
        this.pendingDrop = sword;
        const isRare = sword.rarity !== "common";
        playSfx(isRare ? "rareDrop" : "drop");
        if (isRare) vibrate("rareGet");
        this.ui.showSwordPickup(sword);
      } else {
        this.ui.showReward();
      }
    };
    if (enemy.role === "elite" || Math.random() < 0.015) this.offerRelic(false, continueReward);
    else continueReward();
  }

  onPlayerDied(): void {
    // damagePlayer内で処理済み（保険）
    if (this.run && this.run.playerHp <= 0) this.endRun(false);
  }

  // ===== 剣の取得・装備・売却 (§9.5, §11.4) =====

  private registerSwordDiscovery(sword: Sword): void {
    const run = this.run;
    if (!run) return;
    if (discoverSword(`${sword.type}:${sword.rarity}`)) {
      this.ui.toast(`📖 図鑑に新しい剣を登録`);
    }
    const order = { common: 0, rare: 1, epic: 2 } as const;
    if (!run.bestRarityFound || order[sword.rarity] > order[run.bestRarityFound]) {
      run.bestRarityFound = sword.rarity;
    }
    if (sword.rarity === "epic") this.achieve("epic-get");
  }

  /** 新しい剣を装備。前の剣は売却され、売却価格分のコインを得る (§11.4) */
  equipSword(sword: Sword): void {
    const run = this.run;
    if (!run) return;
    this.registerSwordDiscovery(sword);
    const old = run.equippedSword;
    const refund = calcSellPrice(old);
    run.coins += refund;
    run.totalCoinsEarned += refund;
    run.equippedSword = sword;
    this.pendingDrop = null;
    this.ui.toast(`⚔️ ${sword.name} を装備（前の剣を ${refund} コインで売却）`);
    this.ui.hudUpdate();
    this.ui.showReward();
  }

  /** ドロップした剣を売却 */
  sellDroppedSword(sword: Sword): void {
    const run = this.run;
    if (!run) return;
    this.registerSwordDiscovery(sword);
    run.coins += sword.sellPrice;
    run.totalCoinsEarned += sword.sellPrice;
    this.pendingDrop = null;
    playSfx("coin");
    this.ui.toast(`💰 ${sword.name} を ${sword.sellPrice} コインで売却`);
    this.ui.hudUpdate();
    this.ui.showReward();
  }

  /** 現在の剣を維持（ドロップ剣は消滅） */
  keepCurrentSword(): void {
    this.pendingDrop = null;
    this.ui.showReward();
  }

  /** ボス報酬を見送る */
  skipBossReward(): void {
    this.ui.showReward();
  }

  // ===== 強化 (§11) =====

  upgrade(kind: UpgradeKind): boolean {
    const run = this.run;
    if (!run) return false;
    const cost = applyUpgrade(run.equippedSword, kind, run.coins);
    if (cost <= 0) return false;
    run.coins -= cost;
    playSfx("upgrade");
    this.ui.hudUpdate();
    return true;
  }

  buyHeal(): boolean {
    const run = this.run;
    if (!run) return false;
    const cost = healCost(run.floor);
    if (run.coins < cost || run.playerHp >= run.playerMaxHp) return false;
    run.coins -= cost;
    this.healPlayer(Math.round(run.playerMaxHp * HEAL_RATIO));
    playSfx("upgrade");
    return true;
  }

  // ===== 進行 =====

  nextFloor(): void {
    const run = this.run;
    if (!run) return;
    run.floor += 1;
    updateSave((s) => {
      if (run.floor > s.highestFloor) s.highestFloor = run.floor;
    });
    if (run.floor >= 10) this.achieve("floor-10");
    if (run.floor >= 30) this.achieve("floor-30");
    this.startFloor();
  }

  pause(): void {
    this.battle.setPaused(true);
    this.ui.showPause();
  }

  resumeBattle(): void {
    this.ui.closeScreen();
    this.ui.hudShow();
    this.ui.hudUpdate();
    this.battle.setPaused(false);
  }

  obtainRelic(id: RelicId): void {
    const run = this.run;
    if (!run || (run.relics ?? []).length >= RELIC_LIMIT || hasRelic(run.relics ?? [], id)) return;
    run.relics = [...(run.relics ?? []), id];
    this.ui.toast(`レリック「${RELICS[id].name}」を獲得`);
    const next = this.pendingRelicContinue;
    this.pendingRelicContinue = null;
    next?.();
  }

  skipRelic(): void {
    const next = this.pendingRelicContinue;
    this.pendingRelicContinue = null;
    next?.();
  }

  private offerRelic(boss: boolean, continueWith: () => void): void {
    this.pendingRelicContinue = continueWith;
    const choices = relicChoices(3, boss, this.run?.relics ?? []);
    if (choices.length === 0) {
      this.pendingRelicContinue = null;
      continueWith();
      return;
    }
    this.ui.showRelicReward(choices.map((relic) => relic.id));
  }

  retire(): void {
    this.endRun(true);
  }

  /** §14 死亡とリザルト */
  private endRun(retired: boolean): void {
    const run = this.run;
    if (!run) return;
    this.battle.stopBattle();
    clearSuspend();

    const save = updateSave((s) => {
      if (run.floor > s.highestFloor) s.highestFloor = run.floor;
      if (run.defeatedEnemies > s.maxKills) s.maxKills = run.defeatedEnemies;
    });

    const result: ResultData = {
      floor: run.floor,
      kills: run.defeatedEnemies,
      bossKills: run.defeatedBosses,
      totalCoins: run.totalCoinsEarned,
      maxDamage: run.maxDamage,
      swordName: `${run.equippedSword.name} Lv.${run.equippedSword.level}`,
      swordBaseName: run.equippedSword.name,
      swordType: run.equippedSword.type,
      swordLevel: run.equippedSword.level,
      characterType: run.character.type,
      characterName: run.character.name,
      bestRarity: run.bestRarityFound,
      playTimeMs: Date.now() - run.startedAt,
      newRecord: run.floor >= save.highestFloor,
      retired,
    };
    this.run = null;
    this.currentEnemy = null;
    this.pendingDrop = null;
    this.ui.hudHide();
    this.ui.showResult(result);
  }

  backToTitle(): void {
    this.battle.stopBattle();
    this.run = null;
    this.currentEnemy = null;
    this.ui.hudHide();
    this.ui.showTitle();
  }

  private achieve(id: string): void {
    if (unlockAchievement(id)) {
      this.ui.toast(`🏆 実績解除：${ACHIEVEMENTS[id] ?? id}`);
    }
  }

  get pendingDropSword(): Sword | null {
    return this.pendingDrop;
  }
}
