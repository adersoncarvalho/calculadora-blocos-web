/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Geração estática pura pronta para Vercel sem custo de runtime
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;
