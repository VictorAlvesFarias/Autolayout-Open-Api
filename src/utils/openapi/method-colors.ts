import type { HttpMethod } from '../../types/operation'

export function methodClassName(method: HttpMethod): string {
  return `method-${method} font-bold uppercase text-xs`
}

export function methodBadgeClass(method: HttpMethod): string {
  const base = 'px-2 py-0.5 rounded text-xs font-bold uppercase'
  const colors: Record<HttpMethod, string> = {
    get: 'bg-green-500/20 text-green-400',
    post: 'bg-blue-500/20 text-blue-400',
    put: 'bg-amber-500/20 text-amber-400',
    patch: 'bg-purple-500/20 text-purple-400',
    delete: 'bg-red-500/20 text-red-400',
    head: 'bg-zinc-500/20 text-zinc-400',
    options: 'bg-zinc-500/20 text-zinc-400',
  }
  return `${base} ${colors[method]}`
}
