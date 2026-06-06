import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    localPatterns: [{ pathname: '/uploads/**' }],
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },
}

export default config
