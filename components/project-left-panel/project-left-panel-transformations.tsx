"use client"

import { Loader2 } from "lucide-react"
import { TransformationCard } from "./transformation-card"
import { useProjectLeftPanel } from "./project-left-panel-provider"

export function ProjectLeftPanelTransformations() {
  const {
    renderedTransformations,
    approvalLoadingById,
    acceptExecution,
    declineExecution,
  } = useProjectLeftPanel()

  if (renderedTransformations.length === 0) {
    return null
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-44 scrollbar-hide [scrollbar-gutter:stable]">
      {renderedTransformations.map(item => {
        let approval:
          | {
              isLoading: boolean
              onAccept: () => void
              onDecline: () => void
            }
          | undefined

        if (item.needsApproval) {
          approval = {
            isLoading: Boolean(approvalLoadingById[item.transformation.id]),
            onAccept: () => {
              void acceptExecution(item.transformation)
            },
            onDecline: () => {
              void declineExecution(item.transformation)
            },
          }
        }

        return (
          <div
            key={item.transformation.id}
            className="flex flex-col gap-2"
          >
            <TransformationCard
              transformation={item.transformation}
              approval={approval}
            />

            {item.showSpinner && (
              <div className="text-muted-foreground flex items-center gap-2 pl-2 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />

                <p>{item.phase}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
