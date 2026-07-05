import nextConfig from "eslint-config-next"

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["generated/**", ".next/**", "node_modules/**", ".local/**", ".claude/**"],
  },
]

export default eslintConfig
