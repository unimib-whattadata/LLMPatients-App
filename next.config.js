/**
 * Next.js Configuration
 * 
 * Configuration file for Next.js application settings.
 * Includes environment validation and Turbopack configuration.
 * 
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Set the workspace root to silence turbopack warnings
  turbopack: {
    root: process.cwd(),
  },
};

export default config;
