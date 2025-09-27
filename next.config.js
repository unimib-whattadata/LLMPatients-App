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
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  // Performance optimizations
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      "@heroicons/react",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "@tanstack/react-query",
      "@trpc/client",
      "@trpc/react-query",
    ],
    // Enable modern JavaScript features
    esmExternals: true,
  },

  // Server external packages
  serverExternalPackages: ["bcryptjs"],

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
    // Enable SWC optimizations
    styledComponents: true,
  },

  // Image optimization
  images: {
    // Enable image optimization
    formats: ["image/webp", "image/avif"],
    // Add domains for external images if needed
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.unimib.it",
      },
    ],
    // Optimize image loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Security headers
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          // Performance headers
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      {
        source: "/images/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:all*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Bundle analyzer and optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize for production
    if (!dev) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };

      // Optimize chunks
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }

    // Bundle analyzer (optional)
    if (process.env.ANALYZE === "true") {
      try {
        // Dynamic import to avoid type errors
        const { BundleAnalyzerPlugin } = eval('require')("webpack-bundle-analyzer");
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: "static",
            openAnalyzer: false,
          })
        );
      } catch (error) {
        console.warn("webpack-bundle-analyzer not available, skipping bundle analysis");
      }
    }
    return config;
  },
};

export default config;
