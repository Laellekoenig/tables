import { relations } from "drizzle-orm"
import { pgTable, pgEnum, text, timestamp, index } from "drizzle-orm/pg-core"

import { project } from "./project-schema"

export const transformationStatusEnum = pgEnum("transformation_status", [
  "pending",
  "running",
  "completed",
  "error",
  "stale",
])

export const transformation = pgTable(
  "transformation",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    prompt: text("prompt").notNull(),
    codeSnippet: text("code_snippet"),
    outputCsv: text("output_csv"),
    status: transformationStatusEnum("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    lastExecutedAt: timestamp("last_executed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => [
    index("transformation_projectId_idx").on(table.projectId),
    index("transformation_parentId_idx").on(table.parentId),
  ],
)

export const transformationRelations = relations(
  transformation,
  ({ one, many }) => ({
    project: one(project, {
      fields: [transformation.projectId],
      references: [project.id],
    }),
    parent: one(transformation, {
      fields: [transformation.parentId],
      references: [transformation.id],
      relationName: "parentChild",
    }),
    children: many(transformation, {
      relationName: "parentChild",
    }),
  }),
)
