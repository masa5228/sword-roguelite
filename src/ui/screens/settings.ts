import { loadSave, persistSave } from "../../services/saveService";
import { playSfx } from "../../services/audioService";
import { button, el, screenEl } from "../components";

// SC-011 設定画面 (§21 サウンド・振動 / §23.4 演出無効化)
export function renderSettings(onBack: () => void): HTMLElement {
  const s = screenEl();
  const save = loadSave();

  s.appendChild(el("h2", undefined, "⚙ 設定"));

  const card = el("div", "card");

  // BGM音量
  const bgmRow = el("div", "setting-row");
  bgmRow.appendChild(el("span", undefined, "🎵 BGM音量"));
  const bgmSlider = el("input") as HTMLInputElement;
  bgmSlider.type = "range";
  bgmSlider.min = "0";
  bgmSlider.max = "1";
  bgmSlider.step = "0.1";
  bgmSlider.value = String(save.settings.bgmVolume);
  bgmSlider.addEventListener("input", () => {
    save.settings.bgmVolume = Number(bgmSlider.value);
    persistSave();
  });
  bgmRow.appendChild(bgmSlider);
  card.appendChild(bgmRow);

  // SE音量
  const seRow = el("div", "setting-row");
  seRow.appendChild(el("span", undefined, "🔊 効果音量"));
  const seSlider = el("input") as HTMLInputElement;
  seSlider.type = "range";
  seSlider.min = "0";
  seSlider.max = "1";
  seSlider.step = "0.1";
  seSlider.value = String(save.settings.seVolume);
  seSlider.addEventListener("change", () => {
    save.settings.seVolume = Number(seSlider.value);
    persistSave();
    playSfx("ui");
  });
  seRow.appendChild(seSlider);
  card.appendChild(seRow);

  // 振動
  const vibRow = el("div", "setting-row");
  vibRow.appendChild(el("span", undefined, "📳 振動"));
  const vibBtn = el("button", `toggle-btn${save.settings.vibration ? " on" : ""}`, save.settings.vibration ? "ON" : "OFF");
  vibBtn.addEventListener("click", () => {
    save.settings.vibration = !save.settings.vibration;
    persistSave();
    vibBtn.textContent = save.settings.vibration ? "ON" : "OFF";
    vibBtn.classList.toggle("on", save.settings.vibration);
    playSfx("ui");
  });
  vibRow.appendChild(vibBtn);
  card.appendChild(vibRow);

  // 画質（低: フラッシュ・画面振動などの演出を簡略化 §23.1/§23.4）
  const gqRow = el("div", "setting-row");
  gqRow.appendChild(el("span", undefined, "✨ 演出・画質"));
  const gqBtn = el("button", "toggle-btn");
  const gqLabel = () => (save.settings.graphicsQuality === "low" ? "低（演出OFF）" : save.settings.graphicsQuality === "high" ? "高" : "自動");
  gqBtn.textContent = gqLabel();
  gqBtn.style.minWidth = "110px";
  gqBtn.addEventListener("click", () => {
    const order: ("auto" | "high" | "low")[] = ["auto", "high", "low"];
    const next = order[(order.indexOf(save.settings.graphicsQuality) + 1) % order.length];
    save.settings.graphicsQuality = next;
    persistSave();
    gqBtn.textContent = gqLabel();
    playSfx("ui");
  });
  gqRow.appendChild(gqBtn);
  card.appendChild(gqRow);

  s.appendChild(card);

  // 操作説明 (§20.2 チュートリアルは後から再確認できる)
  const help = el("div", "card");
  help.appendChild(el("div", undefined, "📋 操作方法"));
  const helpText = el("div");
  helpText.style.fontSize = "13px";
  helpText.style.lineHeight = "1.9";
  helpText.style.color = "var(--forge-steel-dim)";
  helpText.innerHTML =
    "タップ … 通常攻撃<br>長押し（300ms以上）… 溜め攻撃、離して発動<br>左右スワイプ … 回避（短時間無敵）<br>敵の赤い予告が見えたら回避！<br>敵を倒すとコインを獲得、剣を強化できる<br>死亡するとコイン・剣・強化を失う";
  help.appendChild(helpText);
  s.appendChild(help);

  s.appendChild(el("div", "spacer"));
  s.appendChild(button("← 戻る", "menu-btn", onBack));
  return s;
}
