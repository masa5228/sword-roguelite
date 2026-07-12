import Phaser from "phaser";
import type { CharacterType, Enemy, EnemyKind, SwordType } from "../../types";
import type { GameFlow } from "../GameFlow";
import { dodgeChargesFor, DODGE_INVINCIBLE_SEC, DODGE_RECOVER_SEC } from "../GameFlow";
import {
  CHARGE_MAX_MS,
  CHARGE_START_MS,
  chargeMultiplier,
  dotDamagePerTick,
  lifestealRatio,
  playerDamageTaken,
  rollAttackDamage,
  rollStagger,
} from "../systems/CombatSystem";
import { ENEMY_BASES } from "../data/enemies";
import { BOSS_KNIGHT, type BossAttackPattern } from "../data/bosses";
import { playSfx, vibrate } from "../../services/audioService";
import { loadSave } from "../../services/saveService";
import { applyCharacterToSword, characterChargeMaxMs, characterChargeStartMs } from "../systems/CharacterSystem";
import { applyRelicsToSword, relicStatusDamageMultiplier } from "../systems/RelicSystem";
import { characterFrameKey, characterFrameUrl, enemyFrameKey, enemyFrameUrl, weaponKey, weaponUrl, type BossFrame, type EnemyFrame, type PlayerFrame } from "../assets";

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

const PLAYER_X = 195;
const PLAYER_Y = 560;
const ENEMY_X = 195;
const ENEMY_Y = 300;
const PLAYER_SWORD_OFFSET_X = 30;
const PLAYER_SWORD_OFFSET_Y = -14;
const ENEMY_TINTS: Partial<Record<EnemyKind, number>> = {
  bat: 0x6e5aa8,
  beetle: 0x4f8f8f,
  wolf: 0x9b6b4a,
  shaman: 0x4f78c9,
  wraith: 0x9c7cff,
  golem: 0x9a6b52,
};

// §7.4 誤操作対策
const SWIPE_THRESHOLD_PX = 42;
const SWIPE_MAX_MS = 280;

type BattleState = "idle" | "fighting" | "cleared" | "dead";
type EnemyPhase = "wait" | "telegraph" | "strike" | "recover" | "broken";

interface DotState {
  burnUntil: number;
  poisonUntil: number;
  nextTick: number;
}

export class BattleScene extends Phaser.Scene {
  private flow!: GameFlow;

  private state: BattleState = "idle";
  private clock = 0; // シーン内経過秒（ポーズ中は進まない）

  // プレイヤー表示
  private playerBody!: Phaser.GameObjects.Image;
  private playerSword!: Phaser.GameObjects.Image;
  private chargeBar!: Phaser.GameObjects.Graphics;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private floorLabel!: Phaser.GameObjects.Text;

  // 敵表示
  private enemyBody: Phaser.GameObjects.Image | null = null;
  private guardLabel: Phaser.GameObjects.Text | null = null;
  private warnRing!: Phaser.GameObjects.Graphics;

  // プレイヤー状態
  private attackCooldown = 0;
  private attackCooldownMax = 0;
  private invincibleUntil = 0;
  private dodgeRecoverTimer = 0;
  private dodging = false;

  // 入力状態
  private pointerDownAt = 0;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private pointerActive = false;
  private swipeConsumed = false;
  private charging = false;

  // 敵AI状態
  private enemyPhase: EnemyPhase = "wait";
  private phaseTimer = 0;
  private telegraphDuration = 1;
  private hitsRemaining = 0;
  private hitTimer = 0;
  private comboHitIndex = 0;
  private bossComboCooldown = 0;
  private lastBossPatternId: string | null = null;
  private currentPattern: BossAttackPattern | null = null;
  private guardHits = 0;
  private regenTimer = 0;
  private dot: DotState = { burnUntil: 0, poisonUntil: 0, nextTick: 0 };
  private strikeDamageMult = 1;

  constructor() {
    super("battle");
  }

  init(): void {
    this.flow = this.registry.get("flow") as GameFlow;
  }

  preload(): void {
    const characterTypes: CharacterType[] = ["renon", "hinata", "kanata", "rin"];
    const playerFrames: PlayerFrame[] = ["idle", "attack", "charge", "chargeRelease", "hurt", "dodge", "defeat", "victory"];
    for (const type of characterTypes) {
      for (const frame of playerFrames) this.load.image(characterFrameKey(type, frame), characterFrameUrl(type, frame));
    }

    const swordTypes: SwordType[] = ["longSword", "greatSword", "rapier", "katana", "twinBlade", "battleAxe", "warHammer", "spear", "whipBlade", "crystalSword", "cursedBlade", "sunBlade", "arcaneStaff"];
    for (const type of swordTypes) this.load.image(weaponKey(type), weaponUrl(type));

    const normalEnemies = [...new Set(Object.values(ENEMY_BASES).map((base) => base.spriteType))];
    const enemyFrames: EnemyFrame[] = ["idle", "idleStep", "telegraph", "attack", "hurt", "broken", "defeat", "defeatAfter"];
    for (const type of normalEnemies) {
      for (const frame of enemyFrames) this.load.image(enemyFrameKey(type, frame), enemyFrameUrl(type, frame));
    }

    const bossFrames: BossFrame[] = ["idle", "telegraph", "sweep", "smash", "rush", "combo", "hurt", "defeat"];
    for (const frame of bossFrames) this.load.image(enemyFrameKey("bossKnight", frame), enemyFrameUrl("bossKnight", frame));
  }

  create(): void {
    this.bgGraphics = this.add.graphics();
    this.drawBackground(1);

    this.floorLabel = this.add
      .text(GAME_WIDTH / 2, 112, "", { fontSize: "16px", color: "#c7d0d8", fontStyle: "bold", stroke: "#151210", strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(8);

    this.warnRing = this.add.graphics();

    this.playerBody = this.add.image(PLAYER_X, PLAYER_Y, characterFrameKey("renon", "idle")).setOrigin(0.5).setScale(1.35).setDepth(4).setFlipX(false);
    this.playerSword = this.add.image(PLAYER_X + PLAYER_SWORD_OFFSET_X, PLAYER_Y + PLAYER_SWORD_OFFSET_Y, weaponKey("longSword")).setOrigin(0.5).setScale(0.23).setDepth(5);
    this.playerSword.setAngle(-25);

    this.chargeBar = this.add.graphics().setDepth(9);

    // §7.2 入力: タップ=攻撃 / 長押し=溜め / 左右スワイプ=回避
    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
  }

  // ===== GameFlow から呼ばれる操作 (BattlePort) =====

  startFloor(enemy: Enemy, bossHint: boolean): void {
    this.clearEnemyVisuals();
    this.state = "fighting";
    this.enemyPhase = "wait";
    this.phaseTimer = Math.max(1.2, enemy.attackInterval * 0.7);
    this.attackCooldown = 0;
    this.attackCooldownMax = 0;
    this.invincibleUntil = 0;
    this.dodgeRecoverTimer = 0;
    this.charging = false;
    this.pointerActive = false;
    this.guardHits = enemy.type !== "bossKnight" && ENEMY_BASES[enemy.type].attackStyle === "guard" ? 3 : 0;
    this.regenTimer = 0;
    this.dot = { burnUntil: 0, poisonUntil: 0, nextTick: 0 };
    this.currentPattern = null;
    this.comboHitIndex = 0;
    this.bossComboCooldown = 0;
    this.lastBossPatternId = null;

    this.drawBackground(enemy.floor);
    this.floorLabel.setText(bossHint ? "⚔ BOSS ⚔" : `${enemy.floor}F`);
    this.floorLabel.setColor(bossHint ? "#e8443b" : "#c7d0d8");
    this.playerBody.setPosition(PLAYER_X, PLAYER_Y).setAlpha(1).setScale(1.35);
    this.playerSword.setPosition(PLAYER_X + PLAYER_SWORD_OFFSET_X, PLAYER_Y + PLAYER_SWORD_OFFSET_Y).setAngle(-25).setAlpha(1).setScale(0.23);
    this.setPlayerFrame("idle");
    this.playerSword.setTexture(weaponKey(this.flow.run!.equippedSword.type));

    const isGiant = enemy.eliteEffects.includes("giant");
    const scale = enemy.role === "boss" ? 1.32 : isGiant ? 1.7 : 1.35;
    const spriteType = enemy.type === "bossKnight" ? "bossKnight" : ENEMY_BASES[enemy.type].spriteType;
    this.enemyBody = this.add.image(ENEMY_X, ENEMY_Y - 40, enemyFrameKey(spriteType, "idle")).setOrigin(0.5).setScale(scale).setAlpha(0).setDepth(4).setFlipX(true);

    if (enemy.role === "elite") {
      this.enemyBody.setTint(0xffd0d0);
    } else if (ENEMY_TINTS[enemy.type]) {
      this.enemyBody.setTint(ENEMY_TINTS[enemy.type]);
    }

    // 登場演出
    this.tweens.add({
      targets: this.enemyBody,
      y: ENEMY_Y,
      alpha: 1,
      duration: 400,
      ease: "Back.easeOut",
    });

    if (this.guardHits > 0) this.updateGuardLabel();

    if (this.scene.isPaused()) this.scene.resume();
  }

  setPaused(paused: boolean): void {
    if (paused) {
      this.scene.pause();
    } else {
      this.scene.resume();
    }
  }

  stopBattle(): void {
    this.state = "idle";
    this.charging = false;
    this.pointerActive = false;
    this.clearEnemyVisuals();
    this.chargeBar.clear();
    this.warnRing.clear();
    if (this.scene.isPaused()) this.scene.resume();
  }

  private clearEnemyVisuals(): void {
    this.enemyBody?.destroy();
    this.enemyBody = null;
    this.guardLabel?.destroy();
    this.guardLabel = null;
    this.warnRing?.clear();
  }

  private setPlayerFrame(frame: PlayerFrame): void {
    const character = this.flow.run?.character.type ?? "renon";
    this.playerBody.setTexture(characterFrameKey(character, frame));
  }

  private setEnemyFrame(frame: EnemyFrame | BossFrame): void {
    const type = this.flow.currentEnemy?.type;
    if (!type || !this.enemyBody) return;
    const spriteType = type === "bossKnight" ? type : ENEMY_BASES[type].spriteType;
    this.enemyBody.setTexture(enemyFrameKey(spriteType, frame));
  }

  // ===== 背景 =====

  private drawBackground(floor: number): void {
    const tier = Math.floor((floor - 1) / 10) % 4;
    const palettes = [
      [0x151210, 0x25345d, 0x1a233d],
      [0x171116, 0x5b2b63, 0x382040],
      [0x101817, 0x28605d, 0x17393d],
      [0x1a120d, 0x6d4122, 0x3d2818],
    ];
    const [vaultColor, accent, floorColor] = palettes[tier];
    const cx = GAME_WIDTH / 2;
    const vanishY = 118;
    const floorTopY = 242;
    const floorBottomY = GAME_HEIGHT;
    this.bgGraphics.clear();
    this.bgGraphics.fillStyle(vaultColor, 1);
    this.bgGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.bgGraphics.fillStyle(accent, 0.16);
    this.bgGraphics.fillTriangle(0, 150, GAME_WIDTH, 150, cx, vanishY);
    this.bgGraphics.fillStyle(accent, 0.12);
    this.bgGraphics.fillRect(0, 150, GAME_WIDTH, floorTopY - 150);

    this.bgGraphics.fillStyle(floorColor, 0.64);
    this.bgGraphics.fillTriangle(16, floorBottomY, GAME_WIDTH - 16, floorBottomY, cx, floorTopY);
    this.bgGraphics.fillStyle(0x000000, 0.32);
    this.bgGraphics.fillTriangle(0, floorBottomY, 16, floorBottomY, cx, floorTopY);
    this.bgGraphics.fillTriangle(GAME_WIDTH, floorBottomY, GAME_WIDTH - 16, floorBottomY, cx, floorTopY);

    this.bgGraphics.lineStyle(2, 0xffffff, 0.08);
    this.bgGraphics.lineBetween(cx, vanishY, 16, floorBottomY);
    this.bgGraphics.lineBetween(cx, vanishY, GAME_WIDTH - 16, floorBottomY);
    this.bgGraphics.lineStyle(1, 0xffffff, 0.055);
    for (let i = -3; i <= 3; i++) {
      const x = cx + i * 34;
      const endX = cx + i * 84;
      this.bgGraphics.lineBetween(x, floorTopY, endX, floorBottomY);
    }
    for (let i = 0; i < 11; i++) {
      const t = i / 10;
      const y = Phaser.Math.Linear(floorTopY + 8, floorBottomY - 18, t * t);
      const halfW = Phaser.Math.Linear(20, GAME_WIDTH / 2 - 18, t);
      this.bgGraphics.lineStyle(i % 2 === 0 ? 2 : 1, 0xffffff, 0.05 + 0.035 * t);
      this.bgGraphics.lineBetween(cx - halfW, y, cx + halfW, y);
    }

    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const yTop = 174 + i * 86;
        const yBottom = yTop + 164;
        const innerTop = cx + side * (54 + i * 12);
        const innerBottom = cx + side * (134 + i * 22);
        const outerTop = cx + side * (90 + i * 16);
        const outerBottom = cx + side * (GAME_WIDTH / 2 + 18);
        this.bgGraphics.fillStyle(0xffffff, 0.045);
        this.bgGraphics.fillTriangle(innerTop, yTop, outerTop, yTop + 16, innerBottom, yBottom);
        this.bgGraphics.fillTriangle(outerTop, yTop + 16, outerBottom, yBottom, innerBottom, yBottom);
        this.bgGraphics.lineStyle(1, 0x000000, 0.22);
        this.bgGraphics.lineBetween(innerTop, yTop, innerBottom, yBottom);
      }
    }

    this.bgGraphics.lineStyle(2, 0xf4b740, 0.18);
    this.bgGraphics.lineBetween(112, ENEMY_Y + 46, GAME_WIDTH - 112, ENEMY_Y + 46);
    this.bgGraphics.lineStyle(2, 0xf26419, 0.16);
    this.bgGraphics.lineBetween(64, PLAYER_Y + 72, GAME_WIDTH - 64, PLAYER_Y + 72);
    this.bgGraphics.fillStyle(0xf26419, 0.08);
    this.bgGraphics.fillRect(0, GAME_HEIGHT - 92, GAME_WIDTH, 92);
    this.bgGraphics.fillStyle(0xf4b740, 0.05);
    this.bgGraphics.fillTriangle(0, GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT, cx, GAME_HEIGHT - 180);

    this.bgGraphics.fillStyle(0xffffff, 0.16);
    for (let i = 0; i < 16; i++) {
      const x = 36 + ((i * 47 + floor * 19) % (GAME_WIDTH - 72));
      const y = 154 + ((i * 67 + floor * 31) % 182);
      this.bgGraphics.fillRect(x, y, 2, 2);
    }
  }

  // ===== 入力処理 (§7) =====

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.state !== "fighting") return;
    this.pointerActive = true;
    this.swipeConsumed = false;
    this.charging = false;
    this.pointerDownAt = this.clock;
    this.pointerStartX = pointer.x;
    this.pointerStartY = pointer.y;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.pointerActive || this.swipeConsumed || this.state !== "fighting") return;
    if (this.charging) return; // §8.6 溜め中は回避できない
    const dx = pointer.x - this.pointerStartX;
    const dy = pointer.y - this.pointerStartY;
    const elapsedMs = (this.clock - this.pointerDownAt) * 1000;
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) && elapsedMs <= SWIPE_MAX_MS) {
      this.swipeConsumed = true; // §7.4 スワイプ判定中は攻撃しない
      this.tryDodge(dx > 0 ? 1 : -1);
    }
  }

  private onPointerUp(): void {
    if (!this.pointerActive) return;
    this.pointerActive = false;
    if (this.state !== "fighting" || this.swipeConsumed) {
      this.charging = false;
      this.chargeBar.clear();
      return;
    }
    const heldMs = (this.clock - this.pointerDownAt) * 1000;
    const chargeStart = this.flow.run ? characterChargeStartMs(CHARGE_START_MS, this.flow.run.character) : CHARGE_START_MS;
    if (this.charging) {
      this.releaseChargeAttack(heldMs);
    } else if (heldMs < chargeStart) {
      this.tryAttack(1.0, false);
    }
    this.charging = false;
    this.chargeBar.clear();
  }

  // ===== プレイヤーアクション =====

  private tryAttack(multiplier: number, charged: boolean): void {
    if (this.state !== "fighting" || this.attackCooldown > 0 || !this.flow.run || !this.flow.currentEnemy) return;
    const sword = applyRelicsToSword(applyCharacterToSword(this.flow.run.equippedSword, this.flow.run.character), this.flow.run.relics ?? []);
    this.attackCooldownMax = 1 / sword.attackSpeed;
    this.attackCooldown = this.attackCooldownMax;
    this.flow.ui.hudUpdateAttackCooldown(this.attackCooldown, this.attackCooldownMax);

    // 剣を振るアニメーション
    this.tweens.add({
      targets: this.playerSword,
      angle: { from: -80, to: 40 },
      duration: 120,
      yoyo: true,
      ease: "Cubic.easeOut",
      onComplete: () => this.playerSword.setAngle(-20),
    });
    this.tweens.add({
      targets: this.playerBody,
      y: PLAYER_Y - (charged ? 46 : 26),
      duration: 100,
      yoyo: true,
      ease: "Quad.easeOut",
    });

    const result = rollAttackDamage(sword, multiplier);
    this.setPlayerFrame(charged ? "chargeRelease" : "attack");
    this.time.delayedCall(170, () => {
      if (this.state === "fighting" && !this.charging && !this.dodging) this.setPlayerFrame("idle");
    });
    playSfx(result.isCritical ? "critical" : "attack");
    vibrate(result.isCritical ? "critical" : "hit");

    this.time.delayedCall(90, () => {
      this.applyHitToEnemy(result.damage, result.isCritical, charged);
    });
  }

  private releaseChargeAttack(heldMs: number): void {
    if (!this.flow.run) return;
    const character = this.flow.run.character;
    const sword = applyRelicsToSword(applyCharacterToSword(this.flow.run.equippedSword, character), this.flow.run.relics ?? []);
    const chargeTimeMultiplier = sword.chargeTimeMultiplier ?? 1;
    const maxMs = characterChargeMaxMs(CHARGE_MAX_MS * chargeTimeMultiplier, character);
    const startMs = characterChargeStartMs(CHARGE_START_MS * chargeTimeMultiplier, character);
    const mult = chargeMultiplier(sword, Math.min(heldMs, maxMs), startMs, maxMs);
    this.tryAttack(mult, true);
  }

  private applyHitToEnemy(damage: number, isCritical: boolean, charged: boolean): void {
    const enemy = this.flow.currentEnemy;
    if (!enemy || this.state !== "fighting" || !this.enemyBody || !this.flow.run) return;
    const sword = this.flow.run.equippedSword;

    // スケルトンのガード (§12.3)
    let actual = damage;
    if (enemy.type !== "bossKnight" && ENEMY_BASES[enemy.type].attackStyle === "guard" && this.guardHits > 0 && this.enemyPhase !== "broken") {
      this.guardHits -= 1;
      actual = Math.max(1, Math.round(damage * 0.15));
      this.spawnFloatText(ENEMY_X, ENEMY_Y - 70, "ガード!", "#88aaff", 16);
      if (this.guardHits <= 0) {
        this.enterBrokenPhase();
      }
      this.updateGuardLabel();
    }

    enemy.currentHp = Math.max(0, enemy.currentHp - actual);
    this.setEnemyFrame("hurt");
    this.time.delayedCall(140, () => {
      if (this.state === "fighting" && this.enemyPhase !== "telegraph" && this.enemyPhase !== "broken") this.setEnemyFrame("idle");
    });
    this.flow.recordDamage(actual);
    this.flow.ui.hudUpdate();
    playSfx("enemyHit");

    // 特殊効果 (§8.3)
    if (sword.effects.some((e) => e.type === "burn")) this.dot.burnUntil = this.clock + 3;
    if (sword.effects.some((e) => e.type === "poison")) this.dot.poisonUntil = this.clock + 3;
    const steal = lifestealRatio(sword);
    if (steal > 0) this.flow.healPlayer(Math.max(1, Math.round(actual * steal)));

    // ヒット演出: ダメージ数字 + フラッシュ + ヒットストップ (§8.5)
    this.spawnFloatText(
      ENEMY_X + Phaser.Math.Between(-30, 30),
      ENEMY_Y - 40,
      `${actual}`,
      isCritical ? "#f4b740" : "#ffffff",
      isCritical ? 30 : 22
    );
    if (isCritical) this.spawnFloatText(ENEMY_X, ENEMY_Y - 90, "会心!", "#f4b740", 18);

    const fxOn = loadSave().settings.graphicsQuality !== "low";
    this.enemyBody.setTintFill(0xffffff);
    this.time.delayedCall(60, () => {
      if (this.enemyBody) {
        this.enemyBody.clearTint();
        if (this.flow.currentEnemy?.role === "elite") this.enemyBody.setTint(0xffd0d0);
      }
    });
    if (fxOn) {
      this.hitStop(isCritical || charged ? 90 : 45);
      this.tweens.add({
        targets: this.enemyBody,
        x: ENEMY_X + Phaser.Math.Between(-8, 8),
        y: ENEMY_Y - 8,
        duration: 60,
        yoyo: true,
      });
    }

    // ひるみ (§8.3 ノックバック / §12.3 オークは溜めでひるむ)
    if (enemy.currentHp > 0 && this.enemyPhase === "telegraph" && this.currentPatternInterruptible()) {
      if (rollStagger(sword.knockback, enemy.staggerResistance, charged)) {
        this.enemyPhase = "wait";
        this.phaseTimer = enemy.attackInterval * 0.6;
        this.warnRing.clear();
        this.enemyBody.clearTint();
        this.spawnFloatText(ENEMY_X, ENEMY_Y - 70, "ひるみ!", "#aaddff", 16);
      }
    }

    if (enemy.currentHp <= 0) this.killEnemy();
  }

  private currentPatternInterruptible(): boolean {
    // ボスの突進など強力な攻撃ほど止めにくい設計だが、MVPでは一律に耐性値で処理
    return true;
  }

  private tryDodge(dir: 1 | -1): void {
    if (this.state !== "fighting" || !this.flow.run || this.dodging) return;
    const run = this.flow.run;
    if (run.dodgeCharges <= 0) {
      this.spawnFloatText(PLAYER_X, PLAYER_Y - 60, "回避不可", "#8888aa", 14);
      return;
    }
    run.dodgeCharges -= 1;
    this.dodging = true;
    this.setPlayerFrame("dodge");
    this.invincibleUntil = this.clock + DODGE_INVINCIBLE_SEC; // §26.1 無敵0.35秒
    playSfx("dodge");
    this.flow.ui.hudUpdate();

    const targets = [this.playerBody, this.playerSword];
    this.tweens.add({
      targets,
      x: `+=${dir * 64}`,
      duration: 140,
      yoyo: true,
      ease: "Quad.easeOut",
      onUpdate: () => {
        this.playerBody.setAlpha(this.clock < this.invincibleUntil ? 0.5 : 1);
      },
      onComplete: () => {
        this.playerBody.setX(PLAYER_X);
        this.playerSword.setX(PLAYER_X + PLAYER_SWORD_OFFSET_X);
        this.playerBody.setAlpha(1);
        this.setPlayerFrame("idle");
        this.dodging = false;
      },
    });
  }

  // ===== 敵AI =====

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.clock += dt;

    if (this.state !== "fighting" || !this.flow.run || !this.flow.currentEnemy) return;
    const enemy = this.flow.currentEnemy;
    this.bossComboCooldown = Math.max(0, this.bossComboCooldown - dt);

    // クールダウン・回避回復 (§8.7)
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.flow.ui.hudUpdateAttackCooldown(this.attackCooldown, this.attackCooldownMax);
    const run = this.flow.run;
    if (run.dodgeCharges < dodgeChargesFor(run.character.type)) {
      this.dodgeRecoverTimer += dt;
      if (this.dodgeRecoverTimer >= DODGE_RECOVER_SEC) {
        this.dodgeRecoverTimer = 0;
        run.dodgeCharges += 1;
        this.flow.ui.hudUpdate();
      }
    } else {
      this.dodgeRecoverTimer = 0;
    }

    // 溜め表示 (§8.6 300ms以上で溜め開始)
    if (this.pointerActive && !this.swipeConsumed) {
      const heldMs = (this.clock - this.pointerDownAt) * 1000;
      const chargeTimeMultiplier = run.equippedSword.chargeTimeMultiplier ?? 1;
      const startMs = characterChargeStartMs(CHARGE_START_MS * chargeTimeMultiplier, run.character);
      const maxMs = characterChargeMaxMs(CHARGE_MAX_MS * chargeTimeMultiplier, run.character);
      if (heldMs >= startMs && this.attackCooldown <= 0) {
        if (!this.charging) {
          this.charging = true;
          this.setPlayerFrame("charge");
          playSfx("charge");
        }
        this.drawChargeBar(Math.min(1, (heldMs - startMs) / (maxMs - startMs)));
      }
    }

    // 継続ダメージ (炎上・毒)
    if ((this.dot.burnUntil > this.clock || this.dot.poisonUntil > this.clock) && this.clock >= this.dot.nextTick) {
      this.dot.nextTick = this.clock + 1;
       const sword = applyRelicsToSword(applyCharacterToSword(run.equippedSword, run.character), run.relics ?? []);
      let dotDmg = 0;
       if (this.dot.burnUntil > this.clock) dotDmg += dotDamagePerTick(sword, "burn");
       if (this.dot.poisonUntil > this.clock) dotDmg += dotDamagePerTick(sword, "poison");
       dotDmg = Math.round(dotDmg * relicStatusDamageMultiplier(run.relics ?? []));
      if (dotDmg > 0) {
        enemy.currentHp = Math.max(0, enemy.currentHp - dotDmg);
        this.spawnFloatText(ENEMY_X + 40, ENEMY_Y - 44, `${dotDmg}`, "#f26419", 16);
        this.flow.ui.hudUpdate();
        if (enemy.currentHp <= 0) {
          this.killEnemy();
          return;
        }
      }
    }

    // エリート: 再生 (§12.4)
    if (enemy.eliteEffects.includes("regen")) {
      this.regenTimer += dt;
      if (this.regenTimer >= 1) {
        this.regenTimer = 0;
        const heal = Math.round(enemy.maxHp * 0.015);
        if (enemy.currentHp < enemy.maxHp) {
          enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + heal);
          this.spawnFloatText(ENEMY_X - 40, ENEMY_Y - 44, `+${heal}`, "#5dde8f", 14);
          this.flow.ui.hudUpdate();
        }
      }
    }

    this.updateEnemyPhase(dt, enemy);
  }

  private updateEnemyPhase(dt: number, enemy: Enemy): void {
    this.phaseTimer -= dt;

    switch (this.enemyPhase) {
      case "wait":
        if (this.phaseTimer <= 0) this.enterTelegraph(enemy);
        break;

      case "telegraph": {
        // §8.8 攻撃予告: 赤発光(パルス) + 攻撃範囲リング
        const progress = Phaser.Math.Clamp(1 - this.phaseTimer / this.telegraphDuration, 0, 1);
        const urgency = Phaser.Math.Clamp(progress * progress, 0, 1);
        const pulse = 0.5 + 0.5 * Math.sin(this.clock * (14 + 16 * urgency));
        this.enemyBody?.setTint(Phaser.Display.Color.GetColor(255, Math.round(190 - 90 * urgency + 45 * pulse), Math.round(150 - 90 * urgency)));
        this.drawWarnRing(progress, pulse);
        if (this.phaseTimer <= 0) {
          this.enemyPhase = "strike";
          this.hitTimer = 0;
          this.warnRing.clear();
          this.enemyBody?.clearTint();
          if (enemy.role === "elite") this.enemyBody?.setTint(0xffd0d0);
        }
        break;
      }

      case "strike":
        this.hitTimer -= dt;
        if (this.hitTimer <= 0 && this.hitsRemaining > 0) {
          this.hitsRemaining -= 1;
          this.executeStrike(enemy);
          this.hitTimer = this.currentPattern?.id === "combo" ? 0.55 : this.currentPattern?.hitInterval ?? 0.35;
        }
        if (this.hitsRemaining <= 0) {
          this.enemyPhase = "recover";
          this.phaseTimer = 0.6;
        }
        break;

      case "recover":
        if (this.phaseTimer <= 0) {
          this.enemyPhase = "wait";
          this.phaseTimer = enemy.attackInterval;
          this.setEnemyFrame("idle");
        }
        break;

      case "broken":
        // スケルトンのガード崩れ: 隙 (§12.3)
        if (this.phaseTimer <= 0) {
          this.guardHits = 3;
          this.updateGuardLabel();
          this.enemyPhase = "wait";
          this.phaseTimer = enemy.attackInterval * 0.5;
          this.enemyBody?.setAlpha(1);
          this.setEnemyFrame("idle");
        }
        break;
    }
  }

  private enterTelegraph(enemy: Enemy): void {
    this.enemyPhase = "telegraph";
    this.currentPattern = null;
    this.strikeDamageMult = 1;
    this.hitsRemaining = 1;
    this.setEnemyFrame("telegraph");

    if (enemy.type === "bossKnight") {
      const hpRatio = enemy.currentHp / enemy.maxHp;
      const available = BOSS_KNIGHT.patterns.filter(
        (p) => hpRatio <= p.minHpRatio && (p.id !== "combo" || (this.bossComboCooldown <= 0 && this.lastBossPatternId !== "combo"))
      );
      const pattern = available[Phaser.Math.Between(0, available.length - 1)];
      this.currentPattern = pattern;
      this.lastBossPatternId = pattern.id;
      this.comboHitIndex = 0;
      if (pattern.id === "combo") this.bossComboCooldown = 8;
      this.phaseTimer = pattern.id === "combo" ? 1.25 : pattern.telegraphTime;
      this.strikeDamageMult = pattern.damageMultiplier;
      this.hitsRemaining = pattern.hits;
      this.spawnFloatText(ENEMY_X, ENEMY_Y - 110, pattern.nameJa, "#f26419", 18);
      playSfx("bossWarn");
    } else {
      const base = ENEMY_BASES[enemy.type as Exclude<typeof enemy.type, "bossKnight">];
      this.phaseTimer = base.telegraphTime;
      if (base.attackStyle === "multi") this.hitsRemaining = 2;
      if (base.attackStyle === "heavy") this.strikeDamageMult = 1.3;
      playSfx("bossWarn");
    }
    this.telegraphDuration = Math.max(0.1, this.phaseTimer);
  }

  private executeStrike(enemy: Enemy): void {
    if (!this.enemyBody || !this.flow.run) return;
    const hitIndex = this.comboHitIndex++;
    const strikeDamageMult = this.currentPattern?.id === "combo" ? [0.7, 0.5, 0.3][hitIndex] ?? 0.3 : this.strikeDamageMult;
    const base = enemy.type !== "bossKnight" ? ENEMY_BASES[enemy.type] : null;
    const ranged = base?.attackStyle === "ranged";
    const bossFrame: BossFrame | null = this.currentPattern?.id === "sweep" ? "sweep" : this.currentPattern?.id === "smash" ? "smash" : this.currentPattern?.id === "rush" ? "rush" : this.currentPattern?.id === "combo" ? "combo" : null;
    this.setEnemyFrame(bossFrame ?? "attack");

    if (ranged) {
      // 魔術師: 弾を飛ばす (§12.3)
      const proj = this.add.text(ENEMY_X, ENEMY_Y + 22, "✦", { fontSize: "30px", color: "#f4b740" }).setOrigin(0.5);
      this.tweens.add({
        targets: proj,
        x: PLAYER_X,
        y: PLAYER_Y - 10,
        duration: 380,
        ease: "Quad.easeIn",
        onComplete: () => {
          proj.destroy();
          this.resolvePlayerHit(enemy, strikeDamageMult);
        },
      });
    } else {
      // 近接: 敵が突っ込む
      this.tweens.add({
        targets: this.enemyBody,
        x: PLAYER_X,
        y: PLAYER_Y - 70,
        duration: 160,
        yoyo: true,
        ease: "Quad.easeIn",
        onYoyo: () => this.resolvePlayerHit(enemy, strikeDamageMult),
      });
    }
  }

  private resolvePlayerHit(enemy: Enemy, strikeDamageMult = this.strikeDamageMult): void {
    if (this.state !== "fighting" || !this.flow.run) return;

    // 回避無敵 (§8.7) / 溜め中被弾で溜め解除 (§8.6)
    if (this.clock < this.invincibleUntil) {
      this.spawnFloatText(PLAYER_X, PLAYER_Y - 70, "回避!", "#6cf1ff", 18);
      return;
    }

    if (this.charging) {
      this.charging = false;
      this.pointerActive = false;
      this.chargeBar.clear();
      this.setPlayerFrame("idle");
      this.spawnFloatText(PLAYER_X, PLAYER_Y - 90, "溜め解除", "#ff9a7a", 14);
    }

    const rawDamage = playerDamageTaken(enemy.attack * strikeDamageMult, this.flow.run.defense);
    const isComboFinisher = this.currentPattern?.id === "combo" && this.comboHitIndex >= 3;
    const dmg = isComboFinisher ? Math.min(rawDamage, Math.ceil(this.flow.run.playerMaxHp * 0.3)) : rawDamage;
    this.spawnFloatText(PLAYER_X, PLAYER_Y - 60, `-${dmg}`, "#ff7a7a", 24);

    const fxOn = loadSave().settings.graphicsQuality !== "low";
    if (fxOn) this.cameras.main.shake(120, 0.012);
    this.setPlayerFrame("hurt");
    this.playerBody.setTintFill(0xff6060);
    this.time.delayedCall(140, () => {
      this.playerBody.clearTint();
      if (this.state === "fighting" && !this.charging && !this.dodging) this.setPlayerFrame("idle");
    });

    const died = this.flow.damagePlayer(dmg);
    if (died) {
      this.state = "dead";
    }
  }

  private enterBrokenPhase(): void {
    this.enemyPhase = "broken";
    this.phaseTimer = 2.5;
    this.warnRing.clear();
    this.enemyBody?.setAlpha(0.7);
    this.setEnemyFrame("broken");
    this.spawnFloatText(ENEMY_X, ENEMY_Y - 90, "ガードブレイク!", "#f4b740", 18);
  }

  private killEnemy(): void {
    if (this.state !== "fighting") return;
    this.state = "cleared";
    this.warnRing.clear();
    this.chargeBar.clear();
    this.charging = false;
    this.setEnemyFrame("defeat");
    this.flow.ui.hudUpdate();

    if (this.enemyBody) {
      const fxOn = loadSave().settings.graphicsQuality !== "low";
      if (fxOn) {
        for (let i = 0; i < 6; i++) {
          const star = this.add
            .text(ENEMY_X, ENEMY_Y, "✦", { fontSize: "20px", color: i % 2 === 0 ? "#f26419" : "#f4b740" })
            .setOrigin(0.5);
          this.tweens.add({
            targets: star,
            x: ENEMY_X + Phaser.Math.Between(-90, 90),
            y: ENEMY_Y + Phaser.Math.Between(-110, 46),
            alpha: 0,
            duration: 500,
            onComplete: () => star.destroy(),
          });
        }
      }
      this.tweens.add({
        targets: this.enemyBody,
        alpha: 0,
        scale: 0.4,
        angle: 40,
        duration: 450,
        ease: "Quad.easeIn",
      });
    }
    this.guardLabel?.destroy();
    this.guardLabel = null;

    this.time.delayedCall(650, () => this.flow.onEnemyDefeated());
  }

  // ===== 描画ヘルパー =====

  private drawChargeBar(ratio: number): void {
    this.chargeBar.clear();
    const w = 140;
    const h = 12;
    const x = PLAYER_X - w / 2;
    const y = PLAYER_Y - 112;
    this.chargeBar.fillStyle(0x000000, 0.5);
    this.chargeBar.lineStyle(2, 0xf4b740, 0.9);
    this.chargeBar.fillRoundedRect(x, y, w, h, 5);
    this.chargeBar.strokeRoundedRect(x, y, w, h, 5);
    const color = ratio >= 1 ? 0xf4b740 : 0xf26419;
    this.chargeBar.fillStyle(color, 1);
    this.chargeBar.fillRoundedRect(x + 2, y + 2, Math.max(8, (w - 4) * ratio), h - 4, 3);
  }

  private drawWarnRing(progress: number, pulse: number): void {
    // 攻撃範囲予告 (§8.8): プレイヤー周囲に赤リング
    this.warnRing.clear();
    const urgency = Phaser.Math.Clamp(progress * progress, 0, 1);
    const dangerColor = progress > 0.72 ? 0xe8443b : 0xf26419;
    const playerRadius = Phaser.Math.Linear(62, 34, progress) + 4 * pulse;
    const enemyRadius = Phaser.Math.Linear(46, 62, progress) + 4 * pulse;
    const alpha = 0.42 + 0.48 * urgency;

    this.warnRing.lineStyle(2, dangerColor, 0.18 + 0.24 * urgency);
    this.warnRing.lineBetween(ENEMY_X, ENEMY_Y + 38, PLAYER_X, PLAYER_Y - 46);

    this.warnRing.lineStyle(4, dangerColor, alpha);
    this.warnRing.strokeCircle(PLAYER_X, PLAYER_Y, playerRadius);
    this.warnRing.lineStyle(2, dangerColor, 0.35 + 0.35 * pulse);
    this.warnRing.strokeCircle(ENEMY_X, ENEMY_Y, enemyRadius);

    const barW = 134;
    const barH = 10;
    const barX = PLAYER_X - barW / 2;
    const barY = PLAYER_Y - 76;
    this.warnRing.fillStyle(0x000000, 0.58);
    this.warnRing.fillRoundedRect(barX, barY, barW, barH, 5);
    this.warnRing.fillStyle(dangerColor, 0.95);
    this.warnRing.fillRoundedRect(barX, barY, Math.max(8, barW * progress), barH, 5);
    this.warnRing.lineStyle(2, 0xffffff, 0.45 + 0.35 * urgency);
    this.warnRing.strokeRoundedRect(barX, barY, barW, barH, 5);

    const pipCount = this.hitsRemaining;
    for (let i = 0; i < pipCount; i++) {
      const x = PLAYER_X + (i - (pipCount - 1) / 2) * 18;
      this.warnRing.fillStyle(i === 0 && progress > 0.82 ? 0xffffff : dangerColor, i === 0 ? 0.95 : 0.65);
      this.warnRing.fillCircle(x, barY - 12, 4);
    }

    if (progress > 0.82) {
      const flashAlpha = Phaser.Math.Clamp((progress - 0.82) / 0.18, 0, 1) * (0.35 + 0.25 * pulse);
      this.warnRing.fillStyle(0xf26419, flashAlpha);
      this.warnRing.fillCircle(PLAYER_X, PLAYER_Y, 36);
    }
  }

  private updateGuardLabel(): void {
    if (!this.guardLabel) {
      this.guardLabel = this.add.text(ENEMY_X + 52, ENEMY_Y - 58, "", { fontSize: "18px" }).setOrigin(0.5);
    }
    this.guardLabel.setText(this.guardHits > 0 ? `🛡×${this.guardHits}` : "");
  }

  private spawnFloatText(x: number, y: number, text: string, color: string, size: number): void {
    const t = this.add
      .text(x, y, text, {
        fontSize: `${size}px`,
        color,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({
      targets: t,
      y: y - 46,
      alpha: 0,
      duration: 750,
      ease: "Quad.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  /** §8.5 ヒットストップ: 実時間タイマーで復帰する */
  private hitStop(ms: number): void {
    if (this.time.timeScale < 1) return;
    this.time.timeScale = 0.05;
    this.tweens.timeScale = 0.05;
    window.setTimeout(() => {
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
    }, ms);
  }
}
