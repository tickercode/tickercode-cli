import { z } from "zod"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { ensureOverviewLoaded } from "../../memory/overview"
import { ensureMiniLoaded, type StockItem } from "../../memory/mini"
import {
  searchOverview,
  type SearchMatchMode,
} from "../../lib/overview-search"
import { buildShortlist, generateSlug } from "../../lib/research-idea"
import type {
  FiscalYearStatus,
  SegmentDataStatus,
} from "../../memory/overview"
import type { NumericCondition } from "../../lib/screen"

type MCPInput = {
  theme: string
  keywords: string[]
  matchMode?: SearchMatchMode
  includeIndustry?: boolean
  includeSegmentNames?: boolean
  fiscalStatusAllow?: FiscalYearStatus[]
  segmentStatusAllow?: SegmentDataStatus[]
  sectorCodes?: string[]
  targetSize?: number
  screenConditions?: NumericCondition[]
  includeNull?: boolean
  slug?: string
  out?: string
  overwrite?: boolean
}

function indexMiniByCode(items: StockItem[]): Map<string, StockItem> {
  const map = new Map<string, StockItem>()
  for (const s of items) {
    if (s.display_code) map.set(s.display_code, s)
    if (s.code) map.set(s.code, s)
  }
  return map
}

function writeFile(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

export const researchIdeaTool = {
  name: "research_idea",
  config: {
    title: "Research Idea (theme → candidates)",
    description:
      "Orchestrate theme-driven candidate discovery. Given a theme + Agent-generated keywords, run keyword search over overview.json, join with mini.json metrics, apply optional screen filters, cap to target_size, and write 01-keywords.md / 02-hits.md / 03-shortlist.md / final.md (skeleton) + meta.json into research/idea/{slug}/. Returns counts + output path.",
    inputSchema: {
      theme: z.string().describe("Free-form investment theme"),
      keywords: z
        .array(z.string())
        .min(1)
        .describe("Keywords to search (Agent-generated)"),
      matchMode: z.enum(["any", "all"]).optional(),
      includeIndustry: z.boolean().optional(),
      includeSegmentNames: z.boolean().optional(),
      fiscalStatusAllow: z
        .array(z.enum(["current", "stale_2y+", "missing"]))
        .optional(),
      segmentStatusAllow: z
        .array(z.enum(["complete", "partial", "unavailable"]))
        .optional(),
      sectorCodes: z.array(z.string()).optional(),
      targetSize: z.number().int().positive().optional(),
      screenConditions: z
        .array(
          z.object({
            field: z.string(),
            op: z.enum(["gt", "lt", "gte", "lte", "eq"]),
            value: z.number(),
          }),
        )
        .optional()
        .describe(
          "Numeric filter conditions applied after keyword search. Example: [{field:'i_forward_per', op:'lt', value:30}]",
        ),
      includeNull: z.boolean().optional(),
      slug: z.string().optional(),
      out: z
        .string()
        .optional()
        .describe("Output root directory (default research/idea)"),
      overwrite: z.boolean().optional(),
    },
  },
  async handler(input: MCPInput) {
    const matchMode: SearchMatchMode = input.matchMode ?? "any"
    const targetSize = input.targetSize ?? 50
    const outRoot = resolve(input.out ?? "research/idea")
    const slug = generateSlug({ theme: input.theme, override: input.slug })
    const ideaDir = join(outRoot, slug)
    if (existsSync(ideaDir) && !input.overwrite) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: `Directory already exists: ${ideaDir}. Pass overwrite=true or a different slug.`,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      }
    }
    mkdirSync(ideaDir, { recursive: true })

    const [overview, mini] = await Promise.all([
      ensureOverviewLoaded(),
      ensureMiniLoaded(),
    ])

    const hits = searchOverview(overview.items, {
      keywords: input.keywords,
      matchMode,
      includeIndustry: input.includeIndustry,
      includeSegmentNames: input.includeSegmentNames,
      fiscalStatusAllow: input.fiscalStatusAllow ?? ["current"],
      segmentStatusAllow: input.segmentStatusAllow,
      sectorCodes: input.sectorCodes,
    })

    const miniByCode = indexMiniByCode(mini.items)
    const shortlist = buildShortlist({
      hits,
      miniByCode,
      numericConditions: input.screenConditions ?? [],
      includeNull: Boolean(input.includeNull),
      targetSize,
    })

    const manifest = {
      theme: input.theme,
      slug,
      keywords: input.keywords,
      match_mode: matchMode,
      counts: { hits: hits.length, shortlist: shortlist.length },
      overview_generated_at: overview.meta?.generated_at ?? null,
      out_dir: ideaDir,
      generated_at: new Date().toISOString(),
    }

    writeFile(join(ideaDir, "meta.json"), JSON.stringify({
      ...manifest,
      screen_conditions: input.screenConditions ?? [],
      target_size: targetSize,
      include_industry: input.includeIndustry ?? true,
      include_segments: input.includeSegmentNames ?? true,
      fiscal_status_allow: input.fiscalStatusAllow ?? ["current"],
      segment_status_allow: input.segmentStatusAllow ?? "all",
      sector_codes: input.sectorCodes ?? null,
    }, null, 2))

    writeFile(
      join(ideaDir, "hits.json"),
      JSON.stringify({ count: hits.length, items: hits }, null, 2),
    )
    writeFile(
      join(ideaDir, "shortlist.json"),
      JSON.stringify({ count: shortlist.length, items: shortlist }, null, 2),
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
