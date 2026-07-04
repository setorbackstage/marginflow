import nextConfig from "eslint-config-next"

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["generated/**", ".next/**", "node_modules/**"],
  },
]

export default eslintConfig
