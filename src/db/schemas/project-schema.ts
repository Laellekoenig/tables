import { createSelectSchema } from "drizzle-zod"
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { z } from "zod"
import { user } from "./auth-schema"

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    csvContent: text("csv_content").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => [index("project_userId_idx").on(table.userId)],
)

export const projectSelectSchema = createSelectSchema(project)

export type Project = z.infer<typeof projectSelectSchema>
