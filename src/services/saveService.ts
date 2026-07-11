import type { RunState, SaveData, Settings, SuspendData } from "../types";

// §22 セーブデータ (MVP: LocalStorage)

const SAVE_KEY = "sword-roguelite:save";
const SUSPEND_KEY = "sword-roguelite:suspend";

export const DEFAULT_SETTINGS: Settings = {
  bgmVolume: 1,
  seVolume: 1,
  vibration: true,
  graphicsQuality: "auto",
};

function defaultSave(): SaveData {
  return {
    highestFloor: 0,
    maxKills: 0,
    discoveredSwords: [],
    discoveredEnemies: [],
    achievements: [],
    settings: { ...DEFAULT_SETTINGS },
    tutorialCompleted: false,
  };
}

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      cache = { ...defaultSave(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) } };
      return cache;
    }
  } catch {
    // 壊れたデータは破棄して初期化
  }
  cache = defaultSave();
  return cache;
}

export function persistSave(): void {
  if (!cache) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(cache));
  } catch {
    // ストレージ不可でもゲームは継続 (§23.2 オフライン動作)
  }
}

export function updateSave(mutator: (save: SaveData) => void): SaveData {
  const save = loadSave();
  mutator(save);
  persistSave();
  return save;
}

/** 図鑑・記録の登録。新発見なら true */
export function discoverSword(key: string): boolean {
  const save = loadSave();
  if (save.discoveredSwords.includes(key)) return false;
  save.discoveredSwords.push(key);
  persistSave();
  return true;
}

export function discoverEnemy(key: string): boolean {
  const save = loadSave();
  if (save.discoveredEnemies.includes(key)) return false;
  save.discoveredEnemies.push(key);
  persistSave();
  return true;
}

export function unlockAchievement(id: string): boolean {
  const save = loadSave();
  if (save.achievements.includes(id)) return false;
  save.achievements.push(id);
  persistSave();
  return true;
}

// §22.3 プレイ中断（階層開始時に保存、階層開始時点から再開）
export function saveSuspend(run: RunState): void {
  try {
    const data: SuspendData = { run, savedAt: Date.now() };
    localStorage.setItem(SUSPEND_KEY, JSON.stringify(data));
  } catch {
    /* noop */
  }
}

export function loadSuspend(): SuspendData | null {
  try {
    const raw = localStorage.getItem(SUSPEND_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SuspendData;
    if (!data.run || !data.run.equippedSword) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSuspend(): void {
  try {
    localStorage.removeItem(SUSPEND_KEY);
  } catch {
    /* noop */
  }
}
