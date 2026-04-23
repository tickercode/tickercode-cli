import { z } from "zod"
import { resolve } from "node:path"
import { ensureOverviewLoaded } from "../../memory/overview"
import { ensureMiniLoaded } from "../../memory/mini"
import {
  generateBatchSlug,
  parseBatchConfig,
  runBatch,
  type BatchConfig,
} from "../../lib/research-batch"

export const researchBatchTool = {
  name: "research_batch",
  config: {
    title: "Research Batch (multi-theme parallel)",
    description:
      "Run multiple tc research-idea themes in parallel from a config object. Writes per-theme idea/ dirs + cross-theme batch/<slug>/summary.md. Returns manifest with counts, top sectors, cross-theme overlaps.",
    inputSchema: {
      config: z
        .record(z.string(), z.unknown())
        .describe(
          "Batch config object matching BatchConfig schema: { defaults?, themes: [{theme, keywords, ...}] }",
        ),
      out: z
        .string()
        .optional()
        .describe("Output root directory (default 'research')"),
      batchSlug: z.string().optional(),
      overwrite: z.boolean().optional(),
    },
  },
  async handler(input: {
    config: unknown
    out?: string
    batchSlug?: string
    overwrite?: boolean
  }) {
    let config: BatchConfig
    try {
      config = parseBatchConfig(input.config)
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { error: `Invalid batch config: ${(err as Error).message}` },
              null,
              2,
            ),
          },
        ],
        isError: true,
      }
    }

    const outRoot = resolve(input.out ?? "research")
    const batchSlug = generateBatchSlug({
      hashSeed: JSON.stringify(config.themes.map((t) => t.theme)),
      override: input.batchSlug,
    })

    const [overview, mini] = await Promise.all([
      ensureOverviewLoaded(),
      ensureMiniLoaded(),
    ])

    const { manifest } = await runBatch(
      {
        config,
        outRoot,
        batchSlug,
        overwrite: Boolean(input.overwrite),
      },
      overview,
      mini,
    )

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(manifest, null, 2),
        },
      ],
    }
  },
} as const
