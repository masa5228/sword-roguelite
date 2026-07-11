import type { GameFlow } from "../../game/GameFlow";
import type { ResultData } from "../../types";
import { RARITY_INFO } from "../../game/data/swords";
import { RANKING_ENABLED } from "../../services/rankingConfig";
import { fetchRanking, getPlayerName, setPlayerName, submitScore } from "../../services/rankingService";
import { button, el, screenEl } from "../components";
import { renderSwordSelect } from "./swordSelect";

function buildRankMessage(rank: number | null): string {
  return rank ? `🏆 ランキング ${rank}位付近にランクイン！` : "🏆 ランキングに登録しました";
}

// SC-008 リザルト画面 (§14.3 表示項目)
export function renderResult(flow: GameFlow, result: ResultData, show: (el: HTMLElement) => void): HTMLElement {
  const s = screenEl();
  let submitted = false;
  let sending = false;

  s.appendChild(el("h2", undefined, result.retired ? "🏳 リタイア" : "💀 力尽きた…"));
  if (result.newRecord && result.floor > 1) {
    const rec = el("div", "subtitle", "🎉 自己ベスト更新！");
    rec.style.color = "#ffd76a";
    s.appendChild(rec);
  }

  const mins = Math.floor(result.playTimeMs / 60000);
  const secs = Math.floor((result.playTimeMs % 60000) / 1000);

  const table = el("table", "result-table");
  const rows: [string, string][] = [
    ["到達階層", `${result.floor}F`],
    ["撃破した敵", `${result.kills}体`],
    ["撃破したボス", `${result.bossKills}体`],
    ["獲得コイン総額", `💰${result.totalCoins}`],
    ["最大ダメージ", `${result.maxDamage}`],
    ["使用した剣", result.swordName],
    ["最高レアリティ", result.bestRarity ? `${RARITY_INFO[result.bestRarity].icon} ${RARITY_INFO[result.bestRarity].nameJa}` : "─"],
    ["プレイ時間", `${mins}分${secs}秒`],
  ];
  for (const [label, value] of rows) {
    const tr = el("tr");
    tr.appendChild(el("td", undefined, label));
    tr.appendChild(el("td", undefined, value));
    table.appendChild(tr);
  }
  s.appendChild(table);

  const rankingBox = el("div", "ranking-submit-box");
  s.appendChild(rankingBox);

  const findSubmittedRank = async (): Promise<number | null> => {
    const rows = await fetchRanking(undefined, 100);
    const index = rows.findIndex(
      (row) =>
        row.player_name === getPlayerName() &&
        row.floor === result.floor &&
        row.character_name === result.characterName &&
        row.sword_name === result.swordBaseName &&
        row.sword_type === result.swordType &&
        row.sword_level === result.swordLevel
    );
    return index >= 0 ? index + 1 : null;
  };

  const renderRankingAction = (message: string, retry = false): void => {
    rankingBox.innerHTML = "";
    rankingBox.appendChild(el("div", "ranking-submit-status", message));
    if (submitted) {
      const viewButton = button("ランキングを見る", "menu-btn", () => flow.ui.showRanking());
      viewButton.classList.add("compact");
      rankingBox.appendChild(viewButton);
    } else if (retry) {
      const retryButton = button("再送信", "menu-btn", () => void attemptSubmit());
      retryButton.classList.add("compact");
      rankingBox.appendChild(retryButton);
    }
  };

  const attemptSubmit = async (): Promise<void> => {
    if (!RANKING_ENABLED || submitted || sending) return;
    const playerName = getPlayerName();
    if (!playerName) {
      renderNamePrompt();
      return;
    }

    sending = true;
    renderRankingAction("ランキングに登録中…");
    const ok = await submitScore({
      player_name: playerName,
      character_type: result.characterType,
      character_name: result.characterName,
      sword_name: result.swordBaseName,
      sword_type: result.swordType,
      sword_level: result.swordLevel,
      floor: result.floor,
    });
    sending = false;

    if (!ok) {
      renderRankingAction("ランキング登録に失敗（オフラインかも）", true);
      return;
    }

    submitted = true;
    let rank: number | null = null;
    try {
      rank = await findSubmittedRank();
    } catch {
      rank = null;
    }
    renderRankingAction(buildRankMessage(rank));
  };

  const renderNamePrompt = (): void => {
    rankingBox.innerHTML = "";
    rankingBox.appendChild(el("div", "ranking-submit-status", "名前を入力してランキングに登録"));
    const row = el("div", "ranking-name-row");
    const input = el("input", "player-name-input") as HTMLInputElement;
    input.type = "text";
    input.maxLength = 12;
    input.placeholder = "プレイヤー名";
    input.value = getPlayerName();
    const submit = button("登録", "menu-btn", () => {
      setPlayerName(input.value);
      void attemptSubmit();
    });
    submit.classList.add("compact");
    row.append(input, submit);
    rankingBox.appendChild(row);
  };

  if (!RANKING_ENABLED) {
    rankingBox.appendChild(el("div", "ranking-submit-status muted", "ランキングは準備中です"));
  } else if (getPlayerName()) {
    void attemptSubmit();
  } else {
    renderNamePrompt();
  }

  s.appendChild(el("div", "spacer"));
  s.appendChild(el("div", "footnote", "コイン・剣・強化状態は失われた。図鑑と記録は残る。"));
  s.appendChild(button("⚔ もう一度挑戦", "menu-btn primary", () => show(renderSwordSelect(flow))));
  s.appendChild(button("タイトルへ", "menu-btn", () => flow.backToTitle()));
  return s;
}
