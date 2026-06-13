import { ITextContainerProps, TextContainer } from 'react-base-components'
import { componentSelector } from 'react-component-selector'

const textAreaVariations = {
  default: (props: ITextContainerProps, ref: unknown) => (
    <TextContainer
      {...props}
      ref={ref}
      className="min-h-[120px] rounded border bg-transparent border-zinc-600 text-white p-2 w-full flex outline-2 focus-within:outline focus-within:border-transparent outline-violet-500 cursor-text font-mono text-sm"
    />
  ),
}

const TextArea = componentSelector<keyof typeof textAreaVariations, ITextContainerProps>(textAreaVariations)

export default TextArea
