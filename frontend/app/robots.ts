import { MetadataRoute } from 'next'
import { SEO_CONFIG } from '@/lib/constants/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/auth/callback'],
      },
      {
        userAgent: ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot'],
        disallow: '/',
      },
    ],
    sitemap: `${SEO_CONFIG.url}/sitemap.xml`,
    host: SEO_CONFIG.url,
  }
}