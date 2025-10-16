// SEO設定
export const SEO_CONFIG = {
  siteName: 'NeuraKnot',
  siteNameJa: 'ハイブリッドメッセージング',
  title: {
    default: 'NeuraKnot - ハイブリッドメッセージング',
    template: '%s | NeuraKnot'
  },
  description: {
    default: 'LINEライクなUIで人間とエージェントとチャットできる革新的なメッセージングアプリ。あなたのデジタル分身が誕生する。',
    short: '人間とAIの新しいコミュニケーションプラットフォーム'
  },
  keywords: [
    'NeuraKnot',
    'ハイブリッドメッセージング',
    'AIチャット',
    'メッセージングアプリ',
    'デジタル分身',
    'AI革命',
    'LINEライク',
    'チャットボット',
    'AI agent',
    'messaging app'
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://neuraKnot.com',
  ogImage: '/og-image.png',
  twitterHandle: '@neuraKnot',
  locale: 'ja_JP',
  type: 'website',
  themeColor: '#6366f1',
  backgroundColor: '#ffffff',
  manifest: '/manifest.json'
}

// 構造化データ（JSON-LD）
export const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'NeuraKnot',
  applicationCategory: 'CommunicationApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'JPY'
  },
  description: SEO_CONFIG.description.default,
  url: SEO_CONFIG.url,
  inLanguage: 'ja',
  author: {
    '@type': 'Organization',
    name: 'NeuraKnot Team'
  }
}