import { defineCommand } from "citty"
import { listIssuesCommand } from "./list"
import { viewIssueCommand } from "./view"
import { createIssueCommand } from "./create"
import { commentIssueCommand } from "./comment"
import { resolveIssueCommand } from "./resolve"

export const issuesCommand = defineCommand({
  meta: {
    name: "issues",
    description: "Manage issues (list / view / create / comment / resolve)",
  },
  subCommands: {
    list: listIssuesCommand,
    view: viewIssueCommand,
    create: createIssueCommand,
    comment: commentIssueCommand,
    resolve: resolveIssueCommand,
  },
})
