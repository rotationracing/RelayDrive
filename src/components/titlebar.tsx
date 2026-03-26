"use client";

import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';
import styles from '../styles/titlebar.module.css';

export default function TitleBar() {
  const [appWindow, setAppWindow] = useState<ReturnType<typeof getCurrentWindow> | null>(null);
  const [isMax, setIsMax] = useState(false);

  useEffect(() => {
    // Only access Tauri window API on client
    const w = getCurrentWindow();
    setAppWindow(w);

    let mounted = true;
    let off: (() => void) | undefined;

    (async () => {
      try {
        const m = await w.isMaximized();
        if (mounted) setIsMax(m);
      } catch {}
      try {
        const unlisten = await w.onResized(async () => {
          const m = await w.isMaximized();
          if (mounted) setIsMax(m);
        });
        off = unlisten;
      } catch {}
    })();

    return () => {
      mounted = false;
      try { off?.(); } catch {}
    };
  }, []);

  // Double-click to toggle maximize on the drag area
  const handleDoubleClick = async () => {
    if (!appWindow) return;
    await appWindow.toggleMaximize();
    setIsMax(await appWindow.isMaximized());
  };

  return (
    <div className={styles.titleBar} data-tauri-drag-region>
      <div
        className={styles.dragArea}
        data-tauri-drag-region
        onDoubleClick={handleDoubleClick}
      />
      <div className={styles.controlsContainer} data-tauri-drag-region={false as unknown as undefined}>
        <button
          className={styles.controlButton}
          id="titlebar-minimize"
          aria-label="Minimize"
          onClick={(e) => {
            e.stopPropagation();
            appWindow?.minimize();
          }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor" aria-hidden="true">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          className={styles.controlButton}
          id="titlebar-maximize"
          aria-label={isMax ? "Restore" : "Maximize"}
          onClick={async (e) => {
            e.stopPropagation();
            if (!appWindow) return;
            await appWindow.toggleMaximize();
            setIsMax(await appWindow.isMaximized());
          }}
        >
          {isMax ? (
            // Restore icon
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
              <path d="M2 3.5h5v4H2z" fill="transparent" stroke="currentColor"/>
              <path d="M3 2.5h5v4H6" fill="transparent" stroke="currentColor"/>
            </svg>
          ) : (
            // Maximize icon
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
              <rect width="9" height="9" x="0.5" y="0.5" stroke="currentColor" fill="transparent" />
            </svg>
          )}
        </button>
        <button
          className={`${styles.controlButton} ${styles.closeButton}`}
          id="titlebar-close"
          aria-label="Close"
          onClick={(e) => {
            e.stopPropagation();
            appWindow?.close();
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
            <path d="M0 0L10 10M10 0L0 10" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
