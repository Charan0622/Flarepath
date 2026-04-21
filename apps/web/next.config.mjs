/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Transpile workspace TS packages (no build step of their own) so Next.js
  // Webpack picks them up on Vercel and during pnpm deploy.
  transpilePackages: ["@flarepath/core"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
};

export default nextConfig;
