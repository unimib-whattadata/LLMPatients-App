import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";
import readline from "readline";
import { createLogger } from "~/lib/logger";

const logger = createLogger("TTS:PythonBridge");

interface BridgeResponse {
    type: "response" | "error" | "ready";
    requestId?: string;
    audio?: string; // base64
    format?: string;
    error?: string;
}

interface BridgeRequest {
    requestId: string;
    text: string;
    [key: string]: unknown;
}

export class PythonBridge {
    private process: ChildProcessWithoutNullStreams | null = null;
    private scriptPath: string;
    private cwd: string;
    private isReady = false;
    private pendingRequests = new Map<
        string,
        { resolve: (data: ArrayBuffer) => void; reject: (err: Error) => void; timeout: NodeJS.Timeout }
    >();
    private serviceName: string;

    constructor(serviceName: string, scriptPath: string, cwd: string) {
        this.serviceName = serviceName;
        this.scriptPath = scriptPath;
        this.cwd = cwd;
    }

    async ensureStarted(): Promise<void> {
        if (this.process && this.isReady) return;
        if (this.process && !this.isReady) {
            // Already starting? Wait a bit? 
            // For simplicity, we just return and hope it connects or fails.
            // Better: return a promise defined by 'ready' event.
            // But for now, let's just spawn if null.
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                logger.info(`Starting Python bridge for ${this.serviceName}...`, { script: this.scriptPath });

                // (Logic moved below to check for venv before spawning)
                // Or better: use the 'python3' command and set PYTHONPATH?
                // "services/chatterbox/bridge.py"

                // Correction: The install script should probably create a venv.
                // Let's assume there's a venv in the service directory for isolation.
                // We can check with fs in a real app, here we will value-add by checking.

                // actually, let's just use "python3" for now and assume dependencies are there 
                // OR use the venv if we know it should be there. 
                // The implementation plan mentioned managing dependencies.
                // Let's stick to `python3` for now, but we can make it configurable.

                // Check for venv
                const venvPython = path.join(this.cwd, ".venv/bin/python");
                const pythonCommand = fs.existsSync(venvPython) ? venvPython : "python3";

                logger.info(`Using Python interpreter: ${pythonCommand}`);

                this.process = spawn(pythonCommand, [this.scriptPath], {
                    cwd: this.cwd,
                    stdio: ["pipe", "pipe", "pipe"],
                    env: { ...process.env, PYTHONUNBUFFERED: "1" } // Ensure unbuffered output
                });

                if (!this.process.stdout || !this.process.stderr || !this.process.stdin) {
                    throw new Error("Failed to spawn process with pipes");
                }

                const rl = readline.createInterface({ input: this.process.stdout });

                rl.on("line", (line) => {
                    if (!line.trim()) return;
                    try {
                        const data = JSON.parse(line) as BridgeResponse;
                        if (data.type === "ready") {
                            this.isReady = true;
                            logger.info(`${this.serviceName} bridge is ready.`);
                            resolve();
                        } else if (data.type === "response" && data.requestId) {
                            this.handleResponse(data);
                        } else if (data.type === "error" && data.requestId) {
                            this.handleErrorResponse(data);
                        } else {
                            logger.warn(`Unknown message from ${this.serviceName}:`, data);
                        }
                    } catch (e) {
                        logger.warn(`Failed to parse line from ${this.serviceName}: ${line.substring(0, 100)}...`, e);
                    }
                });

                this.process.stderr.on("data", (data) => {
                    const msg = data.toString();
                    // Log stderr as info/warn/error depending on content? 
                    // Python often prints logs to stderr.
                    logger.debug(`[${this.serviceName} STDERR] ${msg.trim()}`);
                });

                this.process.on("exit", (code) => {
                    this.isReady = false;
                    this.process = null;
                    logger.warn(`${this.serviceName} process exited with code ${code}`);
                    // Reject all pending
                    for (const [id, req] of this.pendingRequests) {
                        clearTimeout(req.timeout);
                        req.reject(new Error(`Service exited prematurely with code ${code}`));
                    }
                    this.pendingRequests.clear();

                    if (code !== 0) {
                        reject(new Error(`${this.serviceName} exited with code ${code}`));
                    }
                });

                // Set a timeout for startup
                setTimeout(() => {
                    if (!this.isReady) {
                        reject(new Error("Timeout waiting for service to be ready"));
                        // Kill?
                    }
                }, 60000); // 1 minute allowed for model loading (it can be slow)

            } catch (e) {
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        });
    }

    private handleResponse(data: BridgeResponse) {
        if (!data.requestId) return;
        const req = this.pendingRequests.get(data.requestId);
        if (!req) return;

        this.pendingRequests.delete(data.requestId);
        clearTimeout(req.timeout);

        if (data.audio) {
            const binaryString = atob(data.audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            req.resolve(bytes.buffer);
        } else {
            req.reject(new Error("No audio data in response"));
        }
    }

    private handleErrorResponse(data: BridgeResponse) {
        if (!data.requestId) return;
        const req = this.pendingRequests.get(data.requestId);
        if (!req) return;

        this.pendingRequests.delete(data.requestId);
        clearTimeout(req.timeout);

        req.reject(new Error(data.error || "Unknown error from service"));
    }

    async generateAudio(params: BridgeRequest): Promise<ArrayBuffer> {
        try {
            await this.ensureStarted();

            if (!this.process || !this.process.stdin) {
                throw new Error("Service not running");
            }

            return new Promise((resolve, reject) => {
                const requestId = params.requestId;

                const timeout = setTimeout(() => {
                    if (this.pendingRequests.has(requestId)) {
                        this.pendingRequests.delete(requestId);
                        reject(new Error("Request timeout"));
                    }
                }, 120000); // 2 minutes timeout for generation (might be long)

                this.pendingRequests.set(requestId, { resolve, reject, timeout });

                const payload = JSON.stringify(params) + "\n";
                this.process!.stdin.write(payload);
            });

        } catch (e) {
            logger.error(`Generation failed in ${this.serviceName}`, e);
            throw e;
        }
    }

    stop(): void {
        if (this.process) {
            logger.info(`Stopping ${this.serviceName} bridge...`);
            this.process.kill();
            this.process = null;
            this.isReady = false;
        }
    }
}
