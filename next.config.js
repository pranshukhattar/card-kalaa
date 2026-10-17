/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remotion's bundler/renderer ship native binaries and must not be bundled by webpack
  // (needed once server-side rendering is added; harmless for the skeleton).
  experimental: {
    serverComponentsExternalPackages: [
      "@remotion/bundler",
      "@remotion/renderer",
      "@remotion/compositor-darwin-arm64",
      "@remotion/compositor-darwin-x64",
      "@remotion/compositor-linux-x64-gnu",
      "@remotion/compositor-linux-arm64-gnu",
      "@remotion/compositor-win32-x64-msvc",
    ],
  },
};

module.exports = nextConfig;
