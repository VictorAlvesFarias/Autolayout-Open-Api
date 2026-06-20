import { LegacyRef } from 'react'
import { AccordionTitleContainer, IAccordionTitleContainerProps } from 'react-base-components'
import { componentSelector } from 'react-component-selector'

const AccordionTitleVariations = {
  default: (props: IAccordionTitleContainerProps, ref: LegacyRef<HTMLDivElement>) => (
    <AccordionTitleContainer
      {...props}
      ref={ref}
      className="text-zinc-200 font-semibold text-sm py-2 transition-colors"
    />
  ),
  table: (props: IAccordionTitleContainerProps, ref: LegacyRef<HTMLDivElement>) => (
    <AccordionTitleContainer
      {...props}
      ref={ref}
      className="text-zinc-200 font-semibold text-sm transition-colors p-3 hover:bg-zinc-800 cursor-pointer"
    />
  ),
}

const AccordionTitle = componentSelector<keyof typeof AccordionTitleVariations, IAccordionTitleContainerProps>(AccordionTitleVariations)

export default AccordionTitle
