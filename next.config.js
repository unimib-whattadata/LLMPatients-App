import "./src/env.js";

const isDev = process.env.NODE_ENV === "development";
const assetCacheControl = isDev
  ? "public, max-age=0, must-revalidate"
  : "public, max-age=31536000, immutable";

const config = {
  
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      "~": "./src",
      "@": "./src",
    },
  },

  // Always enable React Strict Mode for better development practices
  reactStrictMode: true,

  
  serverExternalPackages: ["bcryptjs"],

  
  compiler: {
    
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
    
    styledComponents: true,
  },

  // Package import optimizations (no longer experimental in Next.js 15)
  optimizePackageImports: [
    '@radix-ui/react-icons',
    '@radix-ui/react-accordion',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-select',
    '@radix-ui/react-tabs',
    'lucide-react',
  ],

  
  images: {
    
    formats: ["image/webp", "image/avif"],
    
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.unimib.it",
      },
    ],
    
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          
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
        ],
      },
      {
        source: "/images/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: assetCacheControl,
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

  /** @type {(config: any, context: { dev: boolean; isServer: boolean }) => any} */
  webpack: (config, { dev, isServer }) => {
    
    if (dev) {
      
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    
    if (!dev && !isServer) {
      
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };

      
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }

    
    if (process.env.ANALYZE === "true") {
      try {
        
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
  }
};

export default config;
