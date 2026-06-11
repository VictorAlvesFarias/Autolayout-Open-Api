import { FormContainer, IFormContainerProps } from 'react-base-components'
import { componentSelector } from 'react-component-selector'

const formVariation = {
  default: (props: IFormContainerProps) => <FormContainer {...props} className="flex flex-col gap-4 w-full" />,
  compact: (props: IFormContainerProps) => <FormContainer {...props} className="flex flex-col gap-2 w-full" />,
}

const Form = componentSelector<keyof typeof formVariation, IFormContainerProps>(formVariation)

export default Form
