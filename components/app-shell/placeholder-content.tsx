import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

function StatCard() {
  return (
    <Card>
      <CardHeader className="gap-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-7 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

export function PlaceholderContent() {
  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCard key={i} />
        ))}
      </div>

      {/* Main split area */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Primary content area</CardTitle>
            <CardDescription>
              This region is reserved for charts, tables, or feature modules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
              <span className="text-sm text-muted-foreground">
                Placeholder region
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Side panel</CardTitle>
            <CardDescription>Supporting widgets live here.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-md" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-full max-w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                {i < 3 ? <Separator className="mt-4" /> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Lower cards row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>Content block</CardTitle>
              <CardDescription>
                Reusable card for lists and summaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-md" />
                    <Skeleton className="h-3.5 w-32" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
