import { defineConfig } from "tsup"

export default defineConfig({
  entry: { cli: "src/cli.ts" },
  format: ["esm", "cjs"],
  outExtension: ({ format }) => ({ js: format === "esm" ? ".mjs" : ".cjs" }),
  target: "node20",
  clean: true,
  sourcemap: true,
  minify: false,
  shims: true,
  banner: { js: "#!/usr/bin/env node" },
  dts: false,
})
