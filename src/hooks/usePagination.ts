import { useState, useCallback } from 'react'

interface PaginationResult {
  offset: number
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  goNext: () => void
  goPrev: () => void
  reset: () => void
}

/**
 * Manages offset-based pagination state (used by list pages with limit/offset APIs).
 * Returns derived page info so components never recompute it inline.
 */
export function usePagination(pageSize: number, total: number): PaginationResult {
  const [offset, setOffset] = useState(0)

  const totalPages  = total > 0 ? Math.ceil(total / pageSize) : 1
  const currentPage = Math.floor(offset / pageSize) + 1
  const hasNext     = offset + pageSize < total
  const hasPrev     = offset > 0

  const goNext = useCallback(() => setOffset((p) => p + pageSize), [pageSize])
  const goPrev = useCallback(() => setOffset((p) => Math.max(0, p - pageSize)), [pageSize])
  const reset  = useCallback(() => setOffset(0), [])

  return { offset, currentPage, totalPages, hasNext, hasPrev, goNext, goPrev, reset }
}
