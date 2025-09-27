"use client";

import SessionDebug from "./SessionDebug";

interface SessionDebugWrapperProps {
  enabled?: boolean;
}

export function SessionDebugWrapper({ enabled }: SessionDebugWrapperProps) {
  if (!enabled) return null;

  return <SessionDebug enabled={enabled} />;
}

export default SessionDebugWrapper;
