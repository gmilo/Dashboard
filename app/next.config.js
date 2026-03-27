/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.dashify.com.au",
        pathname: "/**"
      }
    ]
  }
};

export default nextConfig;
