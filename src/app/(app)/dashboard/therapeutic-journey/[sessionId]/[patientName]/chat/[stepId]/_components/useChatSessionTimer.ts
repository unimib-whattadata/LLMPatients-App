"use client";

import { useEffect, useState } from "react";

import { readStorageValue, writeStorageValue } from "~/lib/utils";

export function useChatSessionTimer(
  timerStorageKey: string,
  isPaused: boolean,
) {
  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    const storedTimer = readStorageValue(timerStorageKey);
    if (!storedTimer) {
      setSessionTime(0);
      return;
    }

    const parsedTimer = Number.parseInt(storedTimer, 10);
    setSessionTime(
      Number.isFinite(parsedTimer) && parsedTimer >= 0 ? parsedTimer : 0,
    );
  }, [timerStorageKey]);

  useEffect(() => {
    if (isPaused) return;

    const interval = window.setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isPaused]);

  useEffect(() => {
    void writeStorageValue(timerStorageKey, String(sessionTime));
  }, [sessionTime, timerStorageKey]);

  return {
    sessionTime,
    setSessionTime,
  };
}
