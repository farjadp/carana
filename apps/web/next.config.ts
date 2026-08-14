import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @charana/core ships raw TypeScript rather than a build step, so Next has
  // to compile it like first-party source.
  transpilePackages: ["@charana/core"],
};

export default nextConfig;
