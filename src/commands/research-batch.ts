import { defineCommand } from "citty"
import pc from "picocolors"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { ensureOverviewLoaded } from "../memory/overview"
import { ensureMiniLoaded } from "../memory/mini"
import {
  generateBatchSlug,
  parseBatchConfig,
  runBatch,
} from "../lib/research-batch"

export const researchBatchCommand = defineCommand({
  meta: {
    name: "research-batch",
    description:
      "Run multiple tc research-idea themes in parallel from a JSON config. Generates per-theme idea/ dirs + cross-theme summary.md.",
  },
  args: {
    config: {
      type: "positional",
      description: "Path to batch config JSON",
      required: true,
    },
    out: {
      type: "string",
      description: "Output root (default: research)",
      default: "research",
    },
    "batch-slug": {
      type: "string",
      description: "Override auto-generated batch slug",
    },
    overwrite: {
      type: "boolean",
      description: "Allow overwriting existing idea slugs",
    },
  },
  async run({ args }) {
    const configPath = resolve(String(args.config))
    if (!existsSync(configPath)) {
      process.stderr.write(pc.red(`Config not found: ${configPath}\n`))
      process.exit(1)
    }
    let configJson: unknown
    try {
      configJson = JSON.parse(readFileSync(configPath, "utf8"))
    } catch (err) {
      process.stderr.write(
        pc.red(`Failed to parse JSON: ${(err as Error).message}\n`),
      )
      process.exit(1)
    }

    let config
    try {
      config = parseBatchConfig(configJson)
    } catch (err) {
      process.stderr.write(
        pc.red(`Config schema invalid:\n${(err as Error).message}\n`),
      )
      process.exit(1)
    }

    const outRoot = resolve(String(args.out))
    const batchSlug = generateBatchSlug({
      hashSeed: JSON.stringify(config.themes.map((t) => t.theme)),
      override: args["batch-slug"] ? String(args["batch-slug"]) : undefined,
    })

    process.stdout.write(
      `${pc.dim(`[1/3] Loading overview.json + mini.json…`)}\n`,
    )
    const [overview, mini] = await Promise.all([
      ensureOverviewLoaded(),
      ensureMiniLoaded(),
    ])

    process.stdout.write(
      `${pc.dim(`[2/3] Running ${config.themes.length} themes in parallel…`)}\n`,
    )
    const { manifest, batchDir } = await runBatch(
      {
        config,
        outRoot,
        batchSlug,
        overwrite: Boolean(args.overwrite),
      },
      overview,
      mini,
    )

    process.stdout.write(`${pc.dim(`[3/3] Done.`)}\n\n`)
    process.stdout.write(
      `${pc.green("✓")} research-batch  ${pc.cyan(batchSlug)}\n`,
    )
    for (const t of manifest.themes) {
      process.stdout.write(
        `  ${pc.cyan(t.theme)}  hits=${t.hits}  shortlist=${t.shortlist}  ${pc.dim(`→ ${t.idea_dir}`)}\n`,
      )
    }
    if (manifest.overlaps.length > 0) {
      process.stdout.write(
        `  ${pc.yellow(`overlaps`)}: ${manifest.overlaps.length} stocks in multiple shortlists\n`,
      )
    }
    process.stdout.write(
      `  ${pc.dim(`summary: ${batchDir}/summary.md`)}\n`,
    )
  },
})
