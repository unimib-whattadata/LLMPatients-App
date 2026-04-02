"use client";

import { useEffect, useState } from "react";

import { createLogger } from "~/lib/logger";

const logger = createLogger("usePdfHeaderAvatarDataUrl");

export function usePdfHeaderAvatarDataUrl(
  selectedPatientId: string | undefined,
  selectedPatientAvatarUrl: string | null,
) {
  const [pdfHeaderAvatarDataUrl, setPdfHeaderAvatarDataUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!selectedPatientId) {
      setPdfHeaderAvatarDataUrl(null);
      return;
    }

    const rawAvatarPath =
      selectedPatientAvatarUrl ?? "/images/patients/alex_carter/base.png";
    if (!rawAvatarPath) {
      setPdfHeaderAvatarDataUrl(null);
      return;
    }

    const avatarUrl = rawAvatarPath.startsWith("http")
      ? rawAvatarPath
      : rawAvatarPath.startsWith("/")
        ? `${window.location.origin}${rawAvatarPath}`
        : `${window.location.origin}/${rawAvatarPath}`;

    let cancelled = false;
    const image = new window.Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      if (cancelled) return;

      const minSide = Math.min(image.naturalWidth, image.naturalHeight);
      if (!minSide) {
        setPdfHeaderAvatarDataUrl(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = minSide;
      canvas.height = minSide;
      const context = canvas.getContext("2d");

      if (!context) {
        setPdfHeaderAvatarDataUrl(null);
        return;
      }

      const sourceX = Math.max((image.naturalWidth - minSide) / 2, 0);
      const sourceY = Math.max((image.naturalHeight - minSide) / 2, 0);
      context.drawImage(
        image,
        sourceX,
        sourceY,
        minSide,
        minSide,
        0,
        0,
        minSide,
        minSide,
      );

      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        if (!cancelled) {
          setPdfHeaderAvatarDataUrl(dataUrl);
        }
      } catch (error) {
        logger.warn("Unable to build avatar preview for PDF", error);
        if (!cancelled) {
          setPdfHeaderAvatarDataUrl(null);
        }
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setPdfHeaderAvatarDataUrl(null);
      }
    };

    image.src = avatarUrl;

    return () => {
      cancelled = true;
    };
  }, [selectedPatientAvatarUrl, selectedPatientId]);

  return pdfHeaderAvatarDataUrl;
}
