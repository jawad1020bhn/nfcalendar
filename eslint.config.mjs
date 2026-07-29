import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // TypeScript — warn on loose types but don't block builds
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Next 16 ships React Compiler rules that are very strict (e.g. setState
      // in effects is considered an error). We use effects to initialize state
      // from external sources (localStorage hydration, installed PWA status);
      // demote to warnings so devs see them but builds don't break.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",

      // Exhaustive-deps: warn on suspicious omissions; intentional omissions
      // (stable refs / event handlers) are common and safe.
      "react-hooks/exhaustive-deps": "warn",

      // Next.js / React
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",

      // General
      "prefer-const": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
