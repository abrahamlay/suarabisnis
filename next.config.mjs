/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  trailingSlash: true, // so /demo/ serves demo index directly (no 308 redirect)
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  // Keep these CJS/native modules out of bundling — they need runtime require()
  serverExternalPackages: ['@resvg/resvg-js', 'qrcode', 'firebase-admin'],
  // Use webpack to avoid turbopack native binding issues
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Allow native modules to be required at runtime
      config.externals = config.externals || [];
    }
    return config;
  },
};

export default nextConfig;
