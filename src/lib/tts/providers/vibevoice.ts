/**
 * VibeVoice TTS Provider
 * 
 * Implementation of TTSProvider for VibeVoice local server
 * Uses persistent Python process via PythonBridge
 */

import path from "path";
import crypto from "crypto";
import { createLogger } from "~/lib/logger";
import type { TTSProvider, TTSParams } from "./types";
import { getVibeVoicePreset } from "./voice-mapping";
import { PythonBridge } from "../python-bridge";

const logger = createLogger("TTS:VibeVoice");

// Singleton bridge instance to ensure persistence across provider re-creations if they happen usually
// But since getTTSProvider forces singleton, we can keep it in the class or global.
// Global is safer if the provider is recreated unnecessarily.
let bridgeInstance: PythonBridge | null = null;

function getBridge(): PythonBridge {
  if (!bridgeInstance) {
    const scriptPath = path.join(process.cwd(), "services", "vibevoice", "bridge.py");
    const cwd = path.join(process.cwd(), "services", "vibevoice");
    bridgeInstance = new PythonBridge("vibevoice", scriptPath, cwd);
  }
  return bridgeInstance;
}

export class VibeVoiceProvider implements TTSProvider {
  name = "vibevoice" as const;
  type = "local" as const;

  /**
   * Check if VibeVoice is available (can start process)
   */
  async isAvailable(): Promise<boolean> {
    // We assume if files exist, it's available. 
    // Or we could try starting it.
    // For now, let's assume availability if the script exists.
    // Ideally we might want to check if python is available or just try starting.
    // Let's try ensuring started.
    try {
      const bridge = getBridge();
      await bridge.ensureStarted();
      return true;
    } catch (e) {
      logger.error("VibeVoice availability check failed", e);
      return false;
    }
  }

  /**
   * Get the voice preset to use for a patient
   */
  getVoiceId(patientVoiceId?: string): string {
    return getVibeVoicePreset(patientVoiceId);
  }

  /**
   * Generate audio from text using VibeVoice Python Bridge
   */
  async generateAudio(params: TTSParams): Promise<ArrayBuffer> {
    const bridge = getBridge();
    const voicePreset = this.getVoiceId(params.vibevoiceVoiceId);

    logger.info("Generating speech", { patient: params.patientName || "(unknown)", voice: voicePreset });

    try {
      const audioBuffer = await bridge.generateAudio({
        requestId: crypto.randomUUID(),
        text: params.text,
        voiceId: voicePreset
      });

      logger.info("Audio generated successfully", { bytes: audioBuffer.byteLength });
      return audioBuffer;
    } catch (error) {
      logger.error("VibeVoice generation failed", error);
      throw error;
    }
  }

  cleanup(): void {
    if (bridgeInstance) {
      bridgeInstance.stop();
      bridgeInstance = null;
    }
  }
}


