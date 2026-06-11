import { forwardRef } from 'react'

function componentSelector<T, K>(components: Record<string, (props: K, ref: unknown) => JSX.Element>) {
  type Selector = K & {
    variation?: T
    ref?: unknown
    locked?: boolean
  }

  const Data = forwardRef<unknown, Omit<Selector, 'className'>>((e, ref) =>
    components[(e.variation as string) ?? 'default'](e as K, ref),
  )

  Data.displayName = 'ComponentSelector'
  return Data
}

export { componentSelector }
