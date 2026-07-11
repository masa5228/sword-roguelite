// E2E検証: タイトル → 剣選択 → 戦闘(タップ/スワイプ/長押し) → 報酬 → 階層進行 → 中断再開 → リタイア
import { chromium } from "playwright";

const SHOT_DIR = process.argv[2] ?? ".";
const URL = process.env.E2E_URL ?? "http://localhost:4173/";
const errors = [];
const log = (...a) => console.log("[verify]", ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

const shot = (name) => page.screenshot({ path: `${SHOT_DIR}/${name}.png` });
const canvasTap = async () => {
  // Phaser canvas 中央下寄り（UIボタンを避ける）をタップ
  await page.mouse.click(195, 430);
};
const swipe = async (dir) => {
  await page.mouse.move(195, 430);
  await page.mouse.down();
  await page.mouse.move(195 + dir * 90, 430, { steps: 3 });
  await page.mouse.up();
};
const longPress = async (ms) => {
  await page.mouse.move(195, 430);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
};
const screenOpen = () => page.locator("#ui-root .screen").count().then((c) => c > 0);
const hudText = (sel) => page.locator(sel).first().textContent();

// ===== 1. タイトル =====
await page.goto(URL);
await page.waitForSelector("#ui-root .screen", { timeout: 20000 });
await page.waitForTimeout(300);
await shot("01-title");
const titleVisible = await page.locator("#ui-root h1", { hasText: "アンジョウ・ダンジョン" }).first().isVisible();
log("title visible:", titleVisible);

// LocalStorage初期状態確認
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector("#ui-root .screen", { timeout: 20000 });
await page.waitForTimeout(300);

// ===== 2. キャラクター選択 → 剣選択 =====
await page.getByRole("button", { name: /ゲーム開始/ }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "このキャラで進む" }).first().click();
await page.waitForTimeout(300);
await shot("02-sword-select");
const cards = await page.getByRole("button", { name: "この剣で始める" }).count();
log("starter sword cards:", cards);
await page.getByRole("button", { name: "この剣で始める" }).first().click();
await page.waitForTimeout(800);
await shot("03-battle-floor1");
log("HUD floor:", await hudText("#hud-root .hud-row span"));

// ===== 3. 戦闘: タップ攻撃 + スワイプ回避 + 長押し溜め =====
let floorsCleared = 0;
let sawPickup = false;
let sawBossReward = false;
let died = false;
let step = 0;

outer: for (let floor = 1; floor <= 12; floor++) {
  // 戦闘ループ: 画面が出るまでタップ（時々スワイプ・溜め攻撃）
  for (let i = 0; i < 220; i++) {
    if (await screenOpen()) break;
    step++;
    if (step % 11 === 0) await swipe(step % 22 === 0 ? 1 : -1);
    else if (step % 7 === 0) await longPress(700);
    else await canvasTap();
    await page.waitForTimeout(220);
  }
  if (!(await screenOpen())) {
    log(`floor ${floor}: no screen appeared after battle loop — stuck?`);
    await shot(`stuck-floor${floor}`);
    break;
  }

  // 出た画面を判定して処理
  for (let guard = 0; guard < 6 && (await screenOpen()); guard++) {
    const text = await page.locator("#ui-root .screen").innerText();
    if (text.includes("力尽きた") || text.includes("リタイア")) {
      died = true;
      await shot("09-result-death");
      log("result screen reached (death). floors cleared:", floorsCleared);
      break outer;
    } else if (text.includes("武器を入手")) {
      sawPickup = true;
      await shot(`05-pickup-floor${floor}`);
      // 比較表確認のうえ維持を選択
      await page.locator(".weapon-panel:not(.featured)").first().click();
      await page.waitForTimeout(400);
    } else if (text.includes("ボス撃破")) {
      sawBossReward = true;
      await shot("07-boss-reward");
      await page.getByRole("button", { name: /この剣を装備する/ }).first().click();
      await page.waitForTimeout(400);
    } else if (text.includes("クリア")) {
      if (floor === 1) await shot("04-reward-floor1");
      // 攻撃力強化をできる限り購入
      for (let u = 0; u < 4; u++) {
        const up = page.locator(".upgrade-item", { hasText: "攻撃力強化" }).first();
        if ((await up.count()) > 0 && (await up.isEnabled())) {
          await up.click();
          await page.waitForTimeout(150);
        } else break;
      }
      // HP回復も可能なら1回
      const heal = page.locator(".upgrade-item", { hasText: "HP回復" }).first();
      if ((await heal.count()) > 0 && (await heal.isEnabled())) await heal.click();
      await page.waitForTimeout(150);
      await page.getByRole("button", { name: /次の階層へ/ }).click();
      floorsCleared = floor;
      await page.waitForTimeout(700);
      break;
    } else {
      log("unknown screen:", text.slice(0, 80));
      await shot(`unknown-floor${floor}`);
      break outer;
    }
  }

  // ===== 4. 中断→再開の検証（2階層クリア後に1回だけ） =====
  if (floor === 2 && !died) {
    log("testing suspend/resume via reload...");
    await page.reload();
    await page.waitForSelector("#ui-root .screen", { timeout: 20000 });
    await page.waitForTimeout(300);
    await shot("06-title-after-reload");
    const cont = page.getByRole("button", { name: /続きから/ });
    if ((await cont.count()) === 0) {
      log("ERROR: no continue button after reload");
      break;
    }
    await cont.click();
    await page.waitForTimeout(900);
    const floorText = await hudText("#hud-root .hud-row span");
    log("resumed at:", floorText);
    await shot("06b-resumed");
  }
}

if (!died) {
  // ===== 5. ポーズ → リタイア =====
  if (!(await screenOpen())) {
    await page.getByRole("button", { name: /ポーズ/ }).click();
    await page.waitForTimeout(400);
    await shot("08-pause");
    const retire = page.getByRole("button", { name: /リタイア/ });
    await retire.click();
    await page.waitForTimeout(200);
    await retire.click(); // 2度押し確認
    await page.waitForTimeout(600);
    await shot("09-result-retire");
    log("retire flow done");
  }
}

// ===== 6. リザルト → タイトル → 図鑑 =====
if (await page.getByRole("button", { name: /タイトルへ/ }).count()) {
  await page.getByRole("button", { name: /タイトルへ/ }).click();
  await page.waitForTimeout(400);
}
if (await page.getByRole("button", { name: /剣図鑑/ }).count()) {
  await page.getByRole("button", { name: /剣図鑑/ }).click();
  await page.waitForTimeout(300);
  await shot("10-sword-dex");
  await page.getByRole("button", { name: /戻る/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /敵図鑑/ }).click();
  await page.waitForTimeout(300);
  await shot("11-enemy-dex");
  await page.getByRole("button", { name: /戻る/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /設定/ }).click();
  await page.waitForTimeout(300);
  await shot("12-settings");
}

// 永続データ確認 (§14.2)
const saveData = await page.evaluate(() => localStorage.getItem("sword-roguelite:save"));
const suspendData = await page.evaluate(() => localStorage.getItem("sword-roguelite:suspend"));
log("save:", saveData);
log("suspend after run end (should be null):", suspendData);

log("=== SUMMARY ===");
log("floors cleared:", floorsCleared);
log("saw pickup screen:", sawPickup);
log("saw boss reward:", sawBossReward);
log("died:", died);
log("js errors:", errors.length ? errors : "none");

await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
