import { err, ok, Result, ResultAsync } from "neverthrow"

export const MAX_CSV_SIZE = 1_000_000

export interface CreateProjectInput {
  name: string
  csvContent: string
}

export function validateCsvFile(file: File): Result<File, string> {
  if (file.size > MAX_CSV_SIZE) {
    return err("CSV file must be under 1 MB.")
  }

  const isCsvType =
    file.type === "text/csv" || file.type === "application/vnd.ms-excel"
  const isCsvExtension = file.name.toLowerCase().endsWith(".csv")

  if (!isCsvType && !isCsvExtension) {
    return err("File must be a CSV.")
  }

  return ok(file)
}

export function readFileAsText(file: File): ResultAsync<string, string> {
  return ResultAsync.fromPromise(file.text(), () => "Failed to read CSV file.")
}

export function validateCreateProjectInput(
  input: CreateProjectInput,
): Result<CreateProjectInput, string> {
  if (!input.name.trim()) {
    return err("Project name is required.")
  }

  if (!input.csvContent) {
    return err("CSV content is required.")
  }

  if (input.csvContent.length > MAX_CSV_SIZE) {
    return err("CSV content must be under 1 MB.")
  }

  return ok({ name: input.name.trim(), csvContent: input.csvContent })
}
