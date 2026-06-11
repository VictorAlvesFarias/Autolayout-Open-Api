import { componentSelector } from 'react-component-selector'

const AccordionRootVariations = {
  default: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props} className="flex-col flex w-full gap-1" />
  ),
  table: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props} className="flex-col flex w-full border-t border-zinc-800" />
  ),
}

const AccordionRoot = componentSelector<
  keyof typeof AccordionRootVariations,
  React.HTMLAttributes<HTMLDivElement>
>(AccordionRootVariations)

export default AccordionRoot
