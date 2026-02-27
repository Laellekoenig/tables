import Papa from "papaparse"
import { err, ok, Result } from "neverthrow"

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

export function csvSampleLines(csvText: string, rowCount: number = 3): string {
  const lines = csvText.split("\n").filter(line => line.trim() !== "")
  return lines.slice(0, rowCount + 1).join("\n")
}

export function parseCsv(csvText: string): Result<ParsedCsv, string> {
  if (!csvText.trim()) {
    return err("CSV content is empty.")
  }

  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
  })

  if (result.errors.length > 0) {
    return err(`CSV parse error: ${result.errors[0].message}`)
  }

  const headers = result.meta.fields
  if (!headers || headers.length === 0) {
    return err("CSV has no headers.")
  }

  const rows = result.data.filter(
    row => !headers.every(h => !row[h] || row[h].trim() === ""),
  )

  if (rows.length === 0) {
    return err("CSV has no data rows.")
  }

  return ok({ headers, rows })
}
