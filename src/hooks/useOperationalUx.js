import { useCallback, useEffect, useMemo, useState } from "react";

function readStoredBoolean(key, fallback = false) {
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    return value === "true";
  } catch {
    return fallback;
  }
}

export function useOperationalUx({
  storageKey = "easymenu-operational",
  onRefresh,
  onPrimaryView,
  onSecondaryView,
  onToggleUrgent,
  onEnableAudio,
} = {}) {
  const [darkMode, setDarkMode] = useState(() => readStoredBoolean(`${storageKey}:dark`, true));
  const [soundEnabled, setSoundEnabled] = useState(() => readStoredBoolean(`${storageKey}:sound`, false));
  const [fullscreenActive, setFullscreenActive] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(`${storageKey}:dark`, String(darkMode));
    } catch {}
    document.documentElement.classList.toggle("easy-operational-dark", darkMode);
  }, [darkMode, storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`${storageKey}:sound`, String(soundEnabled));
    } catch {}
    if (soundEnabled) onEnableAudio?.();
  }, [soundEnabled, onEnableAudio, storageKey]);

  useEffect(() => {
    const handleFullscreen = () => setFullscreenActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  const toggleDarkMode = useCallback(() => setDarkMode((value) => !value), []);

  const enableSound = useCallback(() => {
    setSoundEnabled(true);
    onEnableAudio?.();
  }, [onEnableAudio]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      document.documentElement.classList.toggle("easy-fullscreen-fallback");
      setFullscreenActive(document.documentElement.classList.contains("easy-fullscreen-fallback"));
    }
  }, []);

  useEffect(() => {
    const handler = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(tagName)) return;

      const key = event.key.toLowerCase();
      if (key === "f") {
        event.preventDefault();
        toggleFullscreen();
      }
      if (key === "d") {
        event.preventDefault();
        toggleDarkMode();
      }
      if (key === "s") {
        event.preventDefault();
        enableSound();
      }
      if (key === "r") {
        event.preventDefault();
        onRefresh?.();
      }
      if (key === "1") {
        event.preventDefault();
        onPrimaryView?.();
      }
      if (key === "2") {
        event.preventDefault();
        onSecondaryView?.();
      }
      if (key === "u") {
        event.preventDefault();
        onToggleUrgent?.();
      }
      if (key === "escape" && document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enableSound, onPrimaryView, onRefresh, onSecondaryView, onToggleUrgent, toggleDarkMode, toggleFullscreen]);

  const rootClassName = useMemo(() => {
    const classes = ["operational-screen"];
    if (darkMode) classes.push("operational-dark");
    if (fullscreenActive) classes.push("operational-fullscreen");
    return classes.join(" ");
  }, [darkMode, fullscreenActive]);

  return {
    darkMode,
    soundEnabled,
    fullscreenActive,
    rootClassName,
    toggleDarkMode,
    toggleFullscreen,
    enableSound,
  };
}
