import React from 'react'
import { getValueByFieldId } from '../services/openapi-normalizer'
import type { FieldGroup, PaginationFieldsConfig } from '../types/operation'

export interface PaginationPanelItemProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}

export interface PaginationPanelProps {
    config: PaginationFieldsConfig
    values: Record<FieldGroup, Record<string, unknown>>
    onPageChange: (fieldId: string, value: unknown) => void
}

export function getPages(cur: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (cur <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (cur >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', cur - 1, cur, cur + 1, '...', total]
}

export function PaginationPanelItem({ currentPage, totalPages, onPageChange }: PaginationPanelItemProps) {
    const pages = getPages(currentPage, totalPages)

    return (
        <div className="flex items-center gap-1 flex-wrap">
            <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                aria-label="Página anterior"
                className="min-w-8 h-8 px-2 rounded border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
            >
                {'<'}
            </button>

            {pages.map((p, i) =>
                p === '...' ? (
                    <span key={`dots-${i}`} className="min-w-8 h-8 flex items-center justify-center text-zinc-500 text-sm">
                        ...
                    </span>
                ) : (
                    <button
                        key={p}
                        type="button"
                        onClick={() => onPageChange(p as number)}
                        className={`min-w-8 h-8 px-2 rounded border text-sm transition-all ${p === currentPage ? 'border-violet-500 bg-violet-600/20 text-violet-400' : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'}`}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                aria-label="Próxima Página"
                className="min-w-8 h-8 px-2 rounded border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
            >
                {'>'}
            </button>
        </div>
    )
}

export function PaginationPanel({ config, values, onPageChange }: PaginationPanelProps) {
    const currentPage = Number(getValueByFieldId(values, config.currentPageFieldId) ?? 1)
    const totalPages = Number(getValueByFieldId(values, config.totalPagesFieldId) ?? 1)

    function handlePageChange(page: number) {
        onPageChange(config.currentPageFieldId, page)
    }

    return (
        <div className="sticky top-0 w-full">
            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">
                    Página {currentPage} de {totalPages}
                </span>
                <PaginationPanelItem currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
        </div>
    )
}
