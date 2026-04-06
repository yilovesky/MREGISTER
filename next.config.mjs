/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🌟 核心：强制将 node:sqlite 视为外部原生模块，直接调用 Node 22 的能力
  serverExternalPackages: ["node:sqlite"],
};

export default nextConfig;
