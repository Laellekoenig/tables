"use client"

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { useMemo } from "react"

interface DataTableProps {
  headers: string[]
  rows: Record<string, string>[]
}

export function DataTable({ headers, rows }: DataTableProps) {
  const columns = useMemo<ColumnDef<Record<string, string>>[]>(
    () =>
      headers.map(header => ({
        id: header,
        header: () => header,
        accessorFn: (row: Record<string, string>) => row[header],
      })),
    [headers],
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-auto scrollbar-hide rounded-lg border border-border min-h-0 flex-1">
      <table className="w-full text-sm">
        <thead className="bg-muted sticky top-0 z-10">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  draggable={!header.isPlaceholder}
                  onDragStart={e => {
                    e.dataTransfer.setData(
                      "application/x-column",
                      header.column.id,
                    )
                    e.dataTransfer.setData(
                      "text/plain",
                      `{${header.column.id}}`,
                    )
                    e.dataTransfer.effectAllowed = "copy"
                  }}
                  className="px-4 py-2 text-left font-medium text-muted-foreground cursor-grab active:cursor-grabbing select-none"
                >
                  {header.isPlaceholder ? null : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr
              key={row.id}
              className="border-t border-border hover:bg-muted/50 transition-colors"
            >
              {row.getVisibleCells().map(cell => (
                <td
                  key={cell.id}
                  className="px-4 py-2"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
