let requested = false;

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "portrait") => Promise<void>;
};

async function lockPortrait(): Promise<void> {
  const orientation = screen.orientation as LockableOrientation | undefined;
  if (!orientation?.lock) return;

  try {
    await orientation.lock("portrait");
  } catch {
    // The orientation guard keeps the game hidden when platform policy blocks locking.
  }
}

/** Request the browser's portrait game presentation from a user gesture. */
export async function requestPortraitPresentation(): Promise<void> {
  if (requested) return;
  requested = true;

  const root = document.documentElement;
  if (!document.fullscreenElement && root.requestFullscreen) {
    try {
      await root.requestFullscreen({ navigationUI: "hide" });
    } catch {
      // Fullscreen is optional on browsers that do not expose it to web apps.
    }
  }

  await lockPortrait();
}

/** Reassert portrait after browser chrome or device orientation changes. */
export function maintainPortraitLock(): void {
  void lockPortrait();
}
