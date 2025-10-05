import "./src/env.js";

const isDev = process.env.NODE_ENV === "development";
const assetCacheControl = isDev
  ? "public, max-age=0, must-revalidate"
  : "public, max-age=31536000, immutable";

const config = {
  
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
    
    ...(process.env.NODE_ENV === "development" && {
      resolveAlias: {
        
        "~": "./src",
        "@": "./src",
      },
    }),
  },

  
  serverExternalPackages: ["bcryptjs"],

  
  compiler: {
    
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
    
    styledComponents: true,
  },

  
  ...(process.env.NODE_ENV === "development" && {
    
    reactStrictMode: true,
    
    experimental: {
      optimizePackageImports: ['@radix-ui/react-icons'],
    },
  }),

  
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
            value: assetCacheControl,
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
      
      
      config.module.rules.push({
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  require('tailwindcss'),
                  require('autoprefixer'),
                ],
              },
            },
          },
        ],
      });
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
