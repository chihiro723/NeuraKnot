// SEO設定
export const SEO_CONFIG = {
  siteName: 'BridgeSpeak',
  siteNameJa: 'ハイブリッドメッセージング',
  title: {
    default: 'BridgeSpeak - ハイブリッドメッセージング',
    template: '%s | BridgeSpeak'
  },
  description: {
    default: 'LINEライクなUIで人間とエージェントとチャットできる革新的なメッセージングアプリ。あなたのデジタル分身が誕生する。',
    short: '人間とAIの新しいコミュニケーションプラットフォーム'
  },
  keywords: [
    'BridgeSpeak',
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
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://bridgespeak.com',
  ogImage: '/og-image.png',
  twitterHandle: '@bridgespeak',
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
  name: 'BridgeSpeak',
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
    name: 'BridgeSpeak Team'
  }
}