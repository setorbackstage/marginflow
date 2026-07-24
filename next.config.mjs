/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    swcPlugins: [['@swc/plugin-emotion', {}]],
    workerThreads: 2,
  },
  async headers() {
    // In production NEXT_PUBLIC_APP_URL must be set to the real origin.
    // Falling back to localhost prevents the wildcard "*" from ever reaching prod.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return [
      {
        // Security headers applied to every route (HTML pages + API)
        source: "/:path*",
        headers: [
          // Prevent MIME-type sniffing (e.g. serving JS as text/plain)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Block this site from being framed by other origins (clickjacking)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Limit referrer info sent to third parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Enforce HTTPS for 1 year once a browser has seen it
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Restrict access to browser features not used by the app
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
      {
        // CORS + API-specific headers
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: appUrl },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
  compress: true,
  productionBrowserSourceMaps: false,
};

export default nextConfig;