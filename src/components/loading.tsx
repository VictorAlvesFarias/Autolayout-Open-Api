import { LoaderCircle } from 'lucide-react'
import { componentSelector } from 'react-component-selector'

const loadingVariations = {
  default: (props: React.HTMLAttributes<SVGElement>) => (
    <LoaderCircle {...props} className="rotating-div text-violet-400 w-8 h-8" />
  ),
}

const Loading = componentSelector<keyof typeof loadingVariations, React.HTMLAttributes<SVGElement>>(
  loadingVariations,
)

export default Loading
