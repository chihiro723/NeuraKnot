import { MetadataRoute } from 'next'
import { SEO_CONFIG } from '@/lib/constants/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SEO_CONFIG.url
  const currentDate = new Date()

  // 静的ページ
  const staticPages = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/auth/login`,
      lastModified: currentDate,
      changeFrequency: 'yearly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified: currentDate,
      changeFrequency: 'yearly' as const,
      priority: 0.8,
    },
  ]

  // 動的ページ（将来的に追加する場合）
  // const dynamicPages = await fetchDynamicPages()

  return [...staticPages]
}

// 代替言語のサイトマップ（将来的に多言語対応する場合）
export function alternates(): MetadataRoute.Sitemap {
  const baseUrl = SEO_CONFIG.url
  const currentDate = new Date()

  return [
    {
      url: `${baseUrl}/en`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ]
}