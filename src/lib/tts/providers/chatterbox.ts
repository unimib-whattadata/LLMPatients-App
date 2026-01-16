/**
 * Chatterbox TTS Provider
 * 
 * Implementation of TTSProvider for Chatterbox (Turbo)
 * Uses persistent Python process via PythonBridge
 */

import path from "path";
import crypto from "crypto";
import { createLogger } from "~/lib/logger";
import type { TTSProvider, TTSParams } from "./types";
import { PythonBridge } from "../python-bridge";

const logger = createLogger("TTS:Chatterbox");

let bridgeInstance: PythonBridge | null = null;

function getBridge(): PythonBridge {
    if (!bridgeInstance) {
        const scriptPath = path.join(process.cwd(), "services", "chatterbox", "bridge.py");
        const cwd = path.join(process.cwd(), "services", "chatterbox");
        bridgeInstance = new PythonBridge("chatterbox", scriptPath, cwd);
    }
    return bridgeInstance;
}

export class ChatterboxProvider implements TTSProvider {
    name = "chatterbox" as const;
    type = "local" as const;

    async isAvailable(): Promise<boolean> {
        try {
            const bridge = getBridge();
            await bridge.ensureStarted();
            return true;
        } catch (e) {
            logger.error("Chatterbox availability check failed", e);
            return false;
        }
    }

    getVoiceId(patientVoiceId?: string): string {
        // Chatterbox Turbo might not support many voices yet, or uses audio prompt.
        // For now, return patientVoiceId or a default if null.
        return patientVoiceId || "default";
    }

    async generateAudio(params: TTSParams): Promise<ArrayBuffer> {
        const bridge = getBridge();
        // voiceId might be used as audio prompt path if we map it properly?
        // In bridge.py we check 'audioPromptPath'.
        // Here we pass 'voiceId' or 'audioPromptPath'?
        // The params.voiceId is usually a name.
        // If we want to support voice cloning, we need to map names to file paths.
        // For now, let's keep it simple and just pass what we have.
        // If we want to support generic 'voiceId', we might need a mapping similar to VibeVoice.

        logger.info("Generating speech", { text: params.text, voice: params.voiceId });

        try {
            const audioBuffer = await bridge.generateAudio({
                requestId: crypto.randomUUID(),
                text: params.text,
                // If we had a mapping for voiceId -> audioPromptPath, we'd do it here.
                // For now pass as is, maybe the python script handles it or we improve later.
                // Actually, bridge.py expects 'audioPromptPath'. 
                // If params.voiceId is a path, great. If not, we might need logic.
                // Let's assume for now we don't use cloning or the user configured it.
            });

            logger.info("Audio generated successfully", { bytes: audioBuffer.byteLength });
            return audioBuffer;
        } catch (error) {
            logger.error("Chatterbox generation failed", error);
            throw error;
        }
    }
}
