let requested = false;

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

async function lockLandscape(): Promise<void> {
  const orientation = screen.orientation as LockableOrientation | undefined;
  if (!orientation?.lock) return;

  try {
    await orientation.lock("landscape");
  } catch {
    // The portrait guard keeps the game hidden when platform policy blocks locking.
  }
}

/** Request the browser's landscape game presentation from a user gesture. */
export async function requestLandscapePresentation(): Promise<void> {
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

  await lockLandscape();
}

/** Reassert landscape after browser chrome or device orientation changes. */
export function maintainLandscapeLock(): void {
  void lockLandscape();
}
