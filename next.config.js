/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable WASM support
  webpack: (config, { isServer }) => {
    // Add WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/chunks/[hash].wasm',
      },
    });

    // Prevent WASM from being processed on server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '../../lib/wasm/bitcoin_starknet_bridge.js': 'commonjs ../../lib/wasm/bitcoin_starknet_bridge.js',
      });
    }

    // Fix for "Can't resolve 'fs'" error
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      
      tls: false,
    };

    return config;
  },

  // Disable static optimization for pages using WASM
  experimental: {
    webpackBuildWorker: true,
  },

  // Ensure client-side rendering for WASM pages
  reactStrictMode: true,
};

module.exports = nextConfig;