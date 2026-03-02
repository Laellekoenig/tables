import { err, ok, type Result } from "neverthrow"

const DEFAULT_ROW_COUNT = 5

export function createCsvHeadPreview(
  csvText: string,
  rowCount: number = DEFAULT_ROW_COUNT,
): Result<string, string> {
  const lines = csvText.split("\n").filter(line => line.trim() !== "")

  if (lines.length === 0) {
    return err("CSV content is empty.")
  }

  if (lines.length === 1) {
    return err("CSV has no data rows.")
  }

  return ok(lines.slice(0, rowCount + 1).join("\n"))
}
