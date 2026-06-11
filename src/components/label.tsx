import { componentSelector } from 'react-component-selector'

const labelVariations = {
  default: (props: React.HTMLAttributes<HTMLLabelElement>) => (
    <label {...props} className="mb-1 font-semibold px-1 text-zinc-100 text-sm block" />
  ),
}

const Label = componentSelector<keyof typeof labelVariations, React.HTMLAttributes<HTMLLabelElement>>(
  labelVariations,
)

export default Label
