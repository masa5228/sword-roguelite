import type { CharacterType, RankingEntry, SwordType } from "../types";
import { RANKING_ENABLED, SUPABASE_ANON_KEY, SUPABASE_URL } from "./rankingConfig";

const PLAYER_NAME_KEY = "sword-roguelite:playerName";
const MAX_PLAYER_NAME_LENGTH = 12;
const DEFAULT_RANKING_LIMIT = 100;

export interface ScoreSubmission {
  player_name: string;
  character_type: CharacterType;
  character_name: string;
  sword_name: string;
  sword_type: SwordType;
  sword_level: number;
  floor: number;
}

export function getPlayerName(): string {
  try {
    return sessionStorage.getItem(PLAYER_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setPlayerName(name: string): void {
  const normalized = name.trim().slice(0, MAX_PLAYER_NAME_LENGTH);
  try {
    if (normalized) {
      sessionStorage.setItem(PLAYER_NAME_KEY, normalized);
    } else {
      sessionStorage.removeItem(PLAYER_NAME_KEY);
    }
  } catch {
    // Storage can fail in private modes. Ranking remains optional.
  }
}

function baseUrl(): string {
  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1`;
}

function headers(extra?: HeadersInit): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  };
}

export async function submitScore(score: ScoreSubmission): Promise<boolean> {
  const playerName = score.player_name.trim();
  if (!RANKING_ENABLED || !playerName) return false;

  const payload: ScoreSubmission = {
    ...score,
    player_name: playerName.slice(0, MAX_PLAYER_NAME_LENGTH),
    character_name: score.character_name.slice(0, 12),
    sword_name: score.sword_name.slice(0, 40),
    sword_level: Math.max(0, Math.min(40, Math.trunc(score.sword_level))),
    floor: Math.max(1, Math.min(10000, Math.trunc(score.floor))),
  };

  try {
    const response = await fetch(`${baseUrl()}/scores`, {
      method: "POST",
      headers: headers({
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      }),
      body: JSON.stringify(payload),
    });
    return response.status === 201;
  } catch {
    return false;
  }
}

export async function fetchRanking(type?: SwordType, limit = DEFAULT_RANKING_LIMIT): Promise<RankingEntry[]> {
  if (!RANKING_ENABLED) {
    throw new Error("ranking-disabled");
  }

  const cappedLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const params = new URLSearchParams();
  params.set("select", "player_name,character_name,sword_name,sword_type,sword_level,floor,created_at");
  if (type) params.set("sword_type", `eq.${type}`);
  params.set("order", "floor.desc,created_at.asc,id.asc");
  params.set("limit", String(cappedLimit));

  const response = await fetch(`${baseUrl()}/scores?${params.toString()}`, {
    headers: headers(),
  });
  if (!response.ok) {
    throw new Error(`ranking-fetch-failed:${response.status}`);
  }
  return (await response.json()) as RankingEntry[];
}
