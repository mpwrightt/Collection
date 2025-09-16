"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAction } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function DecksPage() {
  const analyze = useAction(api.ai.analyzeDeck)
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<any | null>(null)

  async function onAnalyze() {
    setBusy(true)
    try {
      const res = await analyze({
        tcg: "mtg",
        format: "standard",
        deck: {
          name: "Sample Deck",
          cards: [
            { productId: 123, quantity: 4, section: "main" },
            { productId: 456, quantity: 2, section: "main" },
          ],
        },
        holdings: [],
      })
      setResult(res)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 lg:px-6 grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Deck Builder (Preview)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="text-sm text-muted-foreground">
            This is a scaffold for the deck builder. Next iterations will add deck editing,
            format validation, and recommendations. For now, try a sample AI analysis.
          </div>
          <Button disabled={busy} onClick={onAnalyze}>
            {busy ? "Analyzing..." : "Run Sample Analysis"}
          </Button>
          {result && (
            <pre className="rounded-md bg-muted p-3 text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
