/**
 * Chatterbox TTS Provider
 * 
 * Implementation of TTSProvider for Chatterbox (Turbo)
 * Uses persistent Python process via PythonBridge
 */

import path from "path";
import fs from "fs";
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

        // Prioritize specific chatterbox voice ID, then generic voice ID
        const targetVoiceId = params.chatterboxVoiceId || params.voiceId;

        let audioPromptPath: string | undefined;

        const voicesDir = path.join(process.cwd(), "services", "chatterbox", "voices");
        const extensions = [".wav", ".mp3", ".flac", ".ogg"];

        // Helper to find voice file
        const findVoiceFile = (name: string): string | undefined => {
            for (const ext of extensions) {
                const attempt = path.join(voicesDir, name + ext);
                if (fs.existsSync(attempt)) {
                    return attempt;
                }
            }
            return undefined;
        };

        if (targetVoiceId && targetVoiceId !== "default") {
            audioPromptPath = findVoiceFile(targetVoiceId);

            if (!audioPromptPath) {
                logger.warn(`Voice ID '${targetVoiceId}' not found in ${voicesDir}, attempting fallback based on gender.`);
            }
        }

        // Fallback if no specific voice found or provided
        if (!audioPromptPath) {
            const gender = params.gender?.toLowerCase();
            if (gender === 'female' || gender === 'f' || gender === 'donna') {
                audioPromptPath = findVoiceFile('female') || findVoiceFile('woman');
            } else {
                // Default to male or generic 'default'
                audioPromptPath = findVoiceFile('male') || findVoiceFile('man') || findVoiceFile('default');
            }
        }

        logger.info("Generating speech", { text: params.text, voice: targetVoiceId, audioPrompt: audioPromptPath });

        try {
            const audioBuffer = await bridge.generateAudio({
                requestId: crypto.randomUUID(),
                text: params.text,
                audioPromptPath,
            });

            logger.info("Audio generated successfully", { bytes: audioBuffer.byteLength });
            return audioBuffer;
        } catch (error) {
            logger.error("Chatterbox generation failed", error);
            throw error;
        }
    }
}
