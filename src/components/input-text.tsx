import { LegacyRef } from 'react'
import { ITextContainerProps, TextContainer } from 'react-base-components'
import { componentSelector } from 'react-component-selector'

const inputTextVariations = {
  default: (props: ITextContainerProps, ref: LegacyRef<HTMLInputElement>) => (
    <TextContainer
      {...props}
      ref={ref}
      className={`${props.className || ''} text-white bg-transparent flex items-center border px-3 w-full h-12 border-zinc-700 rounded outline-1 focus-within:outline focus-within:border-transparent outline-white cursor-text`}
    />
  ),
}

const Text = componentSelector<keyof typeof inputTextVariations, ITextContainerProps>(inputTextVariations)

export default Text
