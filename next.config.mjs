/** @type {import('next').NextConfig} */
const config = {
  images: {
    localPatterns: [{ pathname: '/uploads/**' }],
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },
}

export default config
