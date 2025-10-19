/** @type {import('next').NextConfig} */
const nextConfig = {
  // 開発環境ではstandaloneを無効化
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  serverExternalPackages: [],
  
  // ホットリロード設定（Docker環境用）
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000, // 1秒ごとにファイル変更をチェック
        aggregateTimeout: 300,
      }
    }
    return config
  },
  
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
}

export default nextConfig