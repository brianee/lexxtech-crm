import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LexxTech — Personal Workspace',
    short_name: 'LexxTech',
    description: 'Your personal CRM, task tracker, and network manager.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0d12',
    theme_color: '#0a0d12',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  }
}
