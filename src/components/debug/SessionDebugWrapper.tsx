"use client";

import dynamic from "next/dynamic";

const SessionDebug = dynamic(() => import("@/components/debug/SessionDebug"), {
  ssr: false,
  loading: () => null,
});

interface SessionDebugWrapperProps {
  enabled?: boolean;
}

export function SessionDebugWrapper({ enabled }: SessionDebugWrapperProps) {
  if (!enabled) return null;

  return <SessionDebug enabled={enabled} />;
}

export default SessionDebugWrapper;
