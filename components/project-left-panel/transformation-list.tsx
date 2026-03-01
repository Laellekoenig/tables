"use client"

import { CheckCircle2, CircleDashed, Loader2, Sparkles } from "lucide-react"
import {
  type ClientTransformation,
  useTransformations,
} from "@/components/providers/transformations-provider"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type TransformationStatus,
  transformationPhases,
} from "@/src/db/schemas/transformation-schema"
import { getTransformationPhaseIndex } from "@/src/lib/transformation-stream"

export function TransformationList() {
  const { transformations, isLoading, error } = useTransformations()

  return (
    <section className="-mx-6 flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-4">
      <TransformationListHeader count={transformations.length} />

      {error ?
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      : null}

      {isLoading && transformations.length === 0 ?
        <TransformationInfoState
          icon={
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          }
          title="Loading transformations..."
        />
      : transformations.length === 0 ?
        <TransformationInfoState
          icon={
            <div className="rounded-full border border-border/70 bg-background/90 p-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>
          }
          title="No transformations yet"
          description="Submit a prompt to create the first transformation card."
        />
      : <TransformationCards transformations={transformations} />}
    </section>
  )
}

function TransformationListHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Transformations
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Each submission appears here immediately and keeps streaming phase
          progress until completion.
        </p>
      </div>

      <Badge
        variant="outline"
        className="min-w-8 justify-center font-mono"
      >
        {count}
      </Badge>
    </div>
  )
}

function TransformationInfoState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5">
      <div className="flex items-center gap-3">
        {icon}

        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>

          {description ?
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          : null}
        </div>
      </div>
    </div>
  )
}

function TransformationCards({
  transformations,
}: {
  transformations: ClientTransformation[]
}) {
  return (
    <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="space-y-4">
        {transformations.map(transformationItem => {
          return (
            <TransformationCard
              key={transformationItem.id}
              transformation={transformationItem}
            />
          )
        })}
      </div>
    </div>
  )
}

function TransformationCard({
  transformation,
}: {
  transformation: ClientTransformation
}) {
  return (
    <Card className="border border-border/70 bg-gradient-to-br from-background via-background to-muted/30 shadow-sm">
      <CardHeader className="border-b border-border/60">
        <TransformationCardHeader transformation={transformation} />
      </CardHeader>

      <CardContent className="space-y-4">
        <TransformationProgress transformation={transformation} />

        <TransformationPhaseList transformation={transformation} />

        {transformation.errorMessage ?
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {transformation.errorMessage}
          </div>
        : null}
      </CardContent>
    </Card>
  )
}

function TransformationCardHeader({
  transformation,
}: {
  transformation: ClientTransformation
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-full border border-border/70 bg-background/90 p-2">
        {renderTransformationStatusIcon(transformation)}
      </div>

      <div className="min-w-0 flex-1">
        <CardTitle className="text-sm leading-6">
          {transformation.prompt}
        </CardTitle>

        <CardDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span>{formatTransformationTimestamp(transformation.createdAt)}</span>

          <span className="text-border">/</span>

          <span className="font-mono">
            {getTransformationLabel(transformation)}
          </span>
        </CardDescription>
      </div>

      <div>
        <Badge
          variant={getTransformationBadgeVariant(transformation)}
          className="capitalize"
        >
          {getTransformationStateLabel(transformation)}
        </Badge>
      </div>
    </div>
  )
}

function TransformationProgress({
  transformation,
}: {
  transformation: ClientTransformation
}) {
  const progress = getTransformationProgress(transformation)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progress</span>

        <span>{progress}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  )
}

function TransformationPhaseList({
  transformation,
}: {
  transformation: ClientTransformation
}) {
  return (
    <div className="grid gap-2">
      {transformationPhases.map(phase => {
        return (
          <TransformationPhaseRow
            key={phase}
            phase={phase}
            transformation={transformation}
          />
        )
      })}
    </div>
  )
}

function TransformationPhaseRow({
  phase,
  transformation,
}: {
  phase: TransformationStatus
  transformation: ClientTransformation
}) {
  const phaseState = getPhaseState(
    phase,
    transformation.phases,
    transformation.state === "streaming",
  )

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 px-3 py-2">
      <div className="flex items-center gap-3">
        {renderPhaseIcon(phaseState)}

        <span className="text-sm font-medium capitalize text-foreground">
          {phase}
        </span>
      </div>

      <Badge
        variant={phaseState === "complete" ? "default" : "outline"}
        className="capitalize"
      >
        {phaseState}
      </Badge>
    </div>
  )
}

function getPhaseState(
  phase: TransformationStatus,
  receivedPhases: TransformationStatus[],
  isStreaming: boolean,
): "complete" | "active" | "pending" {
  const highestPhase = receivedPhases[receivedPhases.length - 1]

  if (!highestPhase) {
    return "pending"
  }

  const phaseIndex = getTransformationPhaseIndex(phase)
  const highestPhaseIndex = getTransformationPhaseIndex(highestPhase)

  if (phaseIndex < highestPhaseIndex) {
    return "complete"
  }

  if (phaseIndex === highestPhaseIndex) {
    if (
      !isStreaming
      && highestPhase === transformationPhases[transformationPhases.length - 1]
    ) {
      return "complete"
    }

    return "active"
  }

  return "pending"
}

function renderPhaseIcon(state: "complete" | "active" | "pending") {
  if (state === "complete") {
    return <CheckCircle2 className="h-4 w-4 text-primary" />
  }

  if (state === "active") {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />
  }

  return <div className="h-4 w-4 rounded-full border border-border/80" />
}

function renderTransformationStatusIcon(
  transformationItem: ClientTransformation,
) {
  if (transformationItem.state === "error") {
    return <CircleDashed className="h-4 w-4 text-destructive" />
  }

  if (transformationItem.state === "complete") {
    return <CheckCircle2 className="h-4 w-4 text-primary" />
  }

  return <Loader2 className="h-4 w-4 animate-spin text-primary" />
}

function getTransformationBadgeVariant(
  transformationItem: ClientTransformation,
): "default" | "secondary" | "destructive" | "outline" {
  if (transformationItem.state === "error") {
    return "destructive"
  }

  if (transformationItem.state === "complete") {
    return "default"
  }

  return "secondary"
}

function getTransformationStateLabel(
  transformationItem: ClientTransformation,
): string {
  if (transformationItem.state === "error") {
    return "failed"
  }

  return transformationItem.status
}

function getTransformationProgress(
  transformationItem: ClientTransformation,
): number {
  if (transformationItem.phases.length === 0) {
    return 0
  }

  return Math.round(
    (transformationItem.phases.length / transformationPhases.length) * 100,
  )
}

function getTransformationLabel(
  transformationItem: ClientTransformation,
): string {
  if (transformationItem.optimisticId) {
    return "pending-id"
  }

  return shortenTransformationId(transformationItem.id)
}

function formatTransformationTimestamp(createdAt: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdAt)
}

function shortenTransformationId(id: string): string {
  return `${id.slice(0, 8)}...`
}
