import type { CharacterType, EnemyKind, SwordType } from "../types";

const asset = (path: string): string => `${import.meta.env.BASE_URL}game-assets/${path}`;

export type PlayerFrame = "idle" | "attack" | "charge" | "chargeRelease" | "hurt" | "dodge" | "defeat" | "victory";
export type EnemyFrame = "idle" | "idleStep" | "telegraph" | "attack" | "hurt" | "broken" | "defeat" | "defeatAfter";
export type BossFrame = "idle" | "telegraph" | "sweep" | "smash" | "rush" | "combo" | "hurt" | "defeat";

export const characterFrameKey = (type: CharacterType, frame: PlayerFrame): string => `character-${type}-${frame}`;
export const enemyFrameKey = (type: EnemyKind, frame: EnemyFrame | BossFrame): string => `enemy-${type}-${frame}`;
export const weaponKey = (type: SwordType): string => `weapon-${type}`;

export const characterFrameUrl = (type: CharacterType, frame: PlayerFrame): string => asset(`characters/${type}/frames/${frame}.png`);
export const enemyFrameUrl = (type: EnemyKind, frame: EnemyFrame | BossFrame): string => asset(`enemies/${type}/frames/${frame}.png`);
export const weaponUrl = (type: SwordType): string => asset(`weapons/${type}/icon.png`);
