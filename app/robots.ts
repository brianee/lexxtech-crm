import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/(protected)/', '/auth/', '/login/'],
    },
    sitemap: 'https://lexxtech.crm/sitemap.xml',
  }
}
