"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

function fmtCurrency(n: number | undefined) {
  const v = typeof n === "number" ? n : 0
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(v)
}

function fmtDate(ts: number | undefined) {
  if (!ts) return ""
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return String(ts)
  }
}

export function HoldingsTable() {
  const [page, setPage] = React.useState(0)
  const pageSize = 20
  const data = useQuery(api.dashboard.getHoldings, { limit: pageSize, offset: page * pageSize }) || { rows: [], total: 0 }

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / pageSize))

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Holdings</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Page {page + 1} of {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(0)}>
                « First
              </Button>
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                ‹ Prev
              </Button>
              <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next ›
              </Button>
              <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage(totalPages - 1)}>
                Last »
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No holdings yet. Add cards from the Collections page.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product ID</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Market Price</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Last Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.productId}</TableCell>
                      <TableCell>{r.skuId ?? "-"}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>{r.collection}</TableCell>
                      <TableCell>{fmtCurrency(r.marketPrice)}</TableCell>
                      <TableCell>{fmtCurrency(r.totalValue)}</TableCell>
                      <TableCell>{fmtDate(r.addedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
