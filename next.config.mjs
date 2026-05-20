/** @type {import('next').NextConfig} */

// GitHub Pages 프로젝트 사이트: https://USER.github.io/REPO_NAME/
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
