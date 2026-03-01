import { createSelectSchema } from "drizzle-zod"
import { sql } from "drizzle-orm"
import {
  type AnyPgColumn,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { z } from "zod"
import { project } from "./project-schema"

export const transformationStatus = pgEnum("transformation_status", [
  "init",
  "generating",
  "running",
  "done",
])

export const transformationStatusSchema =
  createSelectSchema(transformationStatus)

export type TransformationStatus = z.infer<typeof transformationStatusSchema>

export const transformation = pgTable(
  "transformation",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references(
      (): AnyPgColumn => transformation.id,
      {
        onDelete: "cascade",
      },
    ),
    prompt: text("prompt").notNull(),
    csvContent: text("csv_content").notNull(),
    code: text("code").notNull(),
    status: transformationStatus("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => [
    index("transformation_projectId_idx").on(table.projectId),
    index("transformation_parentId_idx").on(table.parentId),
    check(
      "transformation_parent_not_self",
      sql`${table.parentId} is null or ${table.parentId} <> ${table.id}`,
    ),
  ],
)

export const transformationSelectSchema = createSelectSchema(transformation)

export type Transformation = z.infer<typeof transformationSelectSchema>
