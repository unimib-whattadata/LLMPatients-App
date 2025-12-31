/**
 * VibeVoice TTS Provider
 * 
 * Implementation of TTSProvider for VibeVoice local server
 * Uses WebSocket to connect to VibeVoice server and converts PCM16 to WAV
 */

import { env } from "~/env";
import { createLogger } from "~/lib/logger";
import type { TTSProvider, TTSParams } from "./types";
import { getVibeVoicePreset } from "./voice-mapping";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import type WS from "ws";

const logger = createLogger("TTS:VibeVoice");

// WebSocket module cache
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wsModule: { default?: typeof WS; WebSocket?: typeof WS } | null = null;

function getWebSocket(): typeof WS {
  if (wsModule) {
    return wsModule.default ?? wsModule.WebSocket ?? (wsModule as unknown as typeof WS);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    wsModule = require("ws") as { default?: typeof WS; WebSocket?: typeof WS };
    return wsModule.default ?? wsModule.WebSocket ?? (wsModule as unknown as typeof WS);
  } catch (error) {
    logger.error("Failed to load WebSocket module", error);
    throw new Error(
      "WebSocket library (ws) is required for VibeVoice provider. Please install it: pnpm add ws"
    );
  }
}

/**
 * Convert PCM16 audio data to WAV format
 */
function pcm16ToWav(pcmData: Buffer, sampleRate: number = 24000): Buffer {
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  const wavHeader = Buffer.alloc(44);
  
  // RIFF header
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(fileSize, 4);
  wavHeader.write("WAVE", 8);
  
  // fmt chunk
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16); // fmt chunk size
  wavHeader.writeUInt16LE(1, 20); // audio format (PCM)
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  
  // data chunk
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  return Buffer.concat([wavHeader, pcmData]);
}

export class VibeVoiceProvider implements TTSProvider {
  name = "vibevoice" as const;

  /**
   * Get the VibeVoice server URL
   */
  private getServerUrl(): string {
    return process.env.VIBEVOICE_URL || env.VIBEVOICE_URL || "http://localhost:3000";
  }

  /**
   * Convert HTTP URL to WebSocket URL
   */
  private getWebSocketUrl(): string {
    const url = this.getServerUrl();
    return url.replace(/^http/, "ws") + "/stream";
  }

  /**
   * Check if VibeVoice server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const WebSocket = getWebSocket();
      const wsUrl = this.getWebSocketUrl();
      
      return new Promise((resolve) => {
        const testUrl = wsUrl + "?text=test";
        const ws = new WebSocket(testUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 2000);

        ws.on("open", () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        });

        ws.on("error", () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });
    } catch {
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
   * Generate audio from text using VibeVoice WebSocket API
   */
  async generateAudio(params: TTSParams): Promise<ArrayBuffer> {
    const WebSocket = getWebSocket();
    const wsUrl = this.getWebSocketUrl();
    // Use provider-specific VibeVoice ID, fallback to mapping defaults.
    const voicePreset = this.getVoiceId(params.vibevoiceVoiceId);

    logger.info("Generating speech", { patient: params.patientName || "(unknown)", voice: voicePreset });

    return new Promise((resolve, reject) => {
      const url = new URL(wsUrl);
      url.searchParams.set("text", params.text);
      url.searchParams.set("voice", voicePreset);

      const ws = new WebSocket(url.toString());
      const audioChunks: Buffer[] = [];
      let hasReceivedAudio = false;
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("VibeVoice request timeout"));
      }, 30000);

      ws.on("message", (data: Buffer) => {
        // Filter out JSON log messages, keep only binary audio data
        try {
          const text = data.toString("utf-8");
          const logMessage = JSON.parse(text);
          if (logMessage.type === "log") return;
        } catch {
          // Not JSON = binary audio data
        }

        hasReceivedAudio = true;
        audioChunks.push(data);
      });

      ws.on("error", (error: Error) => {
        clearTimeout(timeout);
        reject(new Error(`VibeVoice connection error: ${error.message}`));
      });

      ws.on("close", () => {
        clearTimeout(timeout);
        
        if (!hasReceivedAudio || audioChunks.length === 0) {
          reject(new Error("VibeVoice server did not send audio data"));
          return;
        }

        try {
          const pcmData = Buffer.concat(audioChunks);
          const wavData = pcm16ToWav(pcmData, 24000);
          logger.info("Audio generated successfully", { bytes: wavData.length });
          // Convert to ArrayBuffer (not SharedArrayBuffer)
          // Create a new ArrayBuffer to ensure it's not a SharedArrayBuffer
          const arrayBuffer = new ArrayBuffer(wavData.length);
          const view = new Uint8Array(arrayBuffer);
          view.set(wavData);
          resolve(arrayBuffer);
        } catch (error) {
          reject(new Error(`Failed to convert audio: ${error instanceof Error ? error.message : "Unknown error"}`));
        }
      });
    });
  }
}

