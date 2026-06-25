import { componentSelector } from 'react-component-selector'

const CardVariations = {
  default: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      {...props}
      className={`p-3 shadow-md rounded relative bg-black bg-opacity-30 flex-col gap-3 flex border border-zinc-800 overflow-auto max-h-full w-full transition-all ${props.className || ''}`}
    />
  ),
}

const Card = componentSelector<keyof typeof CardVariations, React.HTMLAttributes<HTMLDivElement>>(CardVariations)

export default Card
