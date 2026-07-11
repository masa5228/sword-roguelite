import { loadSave } from "./saveService";

// §21 サウンド・振動
// アセット不要のWebAudio合成SFX。初回タップでAudioContextを起動する。

type SfxName =
  | "attack"
  | "critical"
  | "enemyHit"
  | "enemyDie"
  | "drop"
  | "rareDrop"
  | "playerHit"
  | "bossWarn"
  | "ui"
  | "coin"
  | "charge"
  | "dodge"
  | "upgrade";

let ctx: AudioContext | null = null;
let bgmGain: GainNode | null = null;
let bgmTimer: number | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** ユーザー操作起点で呼ぶ（iOS Safariの自動再生制限対策） */
export function unlockAudio(): void {
  ensureCtx();
  startBgm();
}

function tone(freq: number, durMs: number, type: OscillatorType, vol: number, delayMs = 0, slideTo?: number): void {
  const c = ensureCtx();
  if (!c) return;
  const seVol = loadSave().settings.seVolume;
  if (seVol <= 0) return;
  const t0 = c.currentTime + delayMs / 1000;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + durMs / 1000);
  gain.gain.setValueAtTime(vol * seVol * 0.28, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

export function playSfx(name: SfxName): void {
  switch (name) {
    case "attack":
      tone(320, 80, "square", 0.5, 0, 180);
      break;
    case "critical":
      tone(520, 70, "square", 0.7);
      tone(780, 120, "square", 0.7, 50);
      break;
    case "enemyHit":
      tone(150, 90, "sawtooth", 0.5, 0, 90);
      break;
    case "enemyDie":
      tone(400, 200, "sawtooth", 0.6, 0, 60);
      tone(200, 260, "square", 0.4, 60, 40);
      break;
    case "drop":
      tone(660, 100, "sine", 0.6);
      tone(880, 160, "sine", 0.6, 90);
      break;
    case "rareDrop":
      tone(660, 100, "sine", 0.7);
      tone(830, 100, "sine", 0.7, 90);
      tone(990, 220, "sine", 0.7, 180);
      break;
    case "playerHit":
      tone(120, 200, "sawtooth", 0.8, 0, 60);
      break;
    case "bossWarn":
      tone(220, 300, "square", 0.7);
      tone(220, 300, "square", 0.7, 380);
      break;
    case "ui":
      tone(500, 50, "sine", 0.4);
      break;
    case "coin":
      tone(900, 60, "square", 0.4);
      tone(1200, 100, "square", 0.4, 50);
      break;
    case "charge":
      tone(200, 350, "sine", 0.4, 0, 600);
      break;
    case "dodge":
      tone(700, 90, "sine", 0.4, 0, 350);
      break;
    case "upgrade":
      tone(440, 80, "sine", 0.5);
      tone(660, 140, "sine", 0.5, 70);
      break;
  }
}

// 控えめなアンビエントBGMループ
const BGM_NOTES = [220, 262, 330, 262, 294, 220, 175, 196];
let bgmStep = 0;

export function startBgm(): void {
  const c = ensureCtx();
  if (!c || bgmTimer !== null) return;
  bgmGain = c.createGain();
  bgmGain.connect(c.destination);
  const step = () => {
    const vol = loadSave().settings.bgmVolume;
    if (vol > 0 && c && bgmGain) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "triangle";
      osc.frequency.value = BGM_NOTES[bgmStep % BGM_NOTES.length];
      g.gain.setValueAtTime(0.045 * vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.1);
      osc.connect(g).connect(bgmGain);
      osc.start();
      osc.stop(c.currentTime + 1.2);
    }
    bgmStep++;
  };
  bgmTimer = window.setInterval(step, 1200);
  step();
}

// §21.2 振動（設定で無効化可能）
type VibePattern = "hit" | "critical" | "playerHit" | "bossKill" | "rareGet";

export function vibrate(pattern: VibePattern): void {
  if (!loadSave().settings.vibration) return;
  if (!("vibrate" in navigator)) return;
  const patterns: Record<VibePattern, number | number[]> = {
    hit: 12,
    critical: 35,
    playerHit: 70,
    bossKill: [50, 60, 50, 60, 50],
    rareGet: [30, 40, 30, 40, 80],
  };
  try {
    navigator.vibrate(patterns[pattern]);
  } catch {
    /* noop */
  }
}
