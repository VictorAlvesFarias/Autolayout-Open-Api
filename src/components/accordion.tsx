import { LegacyRef } from 'react'
import { AccordionContainer, IAccordionContainerProps } from 'react-base-components'
import { componentSelector } from 'react-component-selector'

const AccordionVariations = {
  default: (props: IAccordionContainerProps, ref: LegacyRef<HTMLDivElement>) => (
    <AccordionContainer
      {...props}
      ref={ref}
      className="bg-black bg-opacity-20 rounded aria-hidden:mt-1 w-full"
    />
  ),
  transparent: (props: IAccordionContainerProps, ref: LegacyRef<HTMLDivElement>) => (
    <AccordionContainer
      {...props}
      ref={ref}
      className="rounded aria-hidden:mt-1 w-full flex flex-col"
    />
  ),
}

const Accordion = componentSelector<keyof typeof AccordionVariations, IAccordionContainerProps>(AccordionVariations)

export default Accordion
