import { LucideLoaderCircle } from 'lucide-react'
import { ButtonHTMLAttributes } from 'react'
import { ButtonContainer, IButtonContainerProps } from 'react-base-components'
import { componentSelector } from 'react-component-selector'

const buttonVariations = {
  default: (props: IButtonContainerProps, ref: React.LegacyRef<ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <ButtonContainer
      {...props}
      ref={ref}
      loadingComponent={
        <LucideLoaderCircle className="flex items-center justify-center w-6 h-6 rotating-div" />
      }
      className={`${props.className || ''} bg-main-violet-500 hover:bg-violet-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all px-4 rounded h-9`}
    />
  ),
  outline: (props: IButtonContainerProps, ref: React.LegacyRef<ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <ButtonContainer
      {...props}
      ref={ref}
      loadingComponent={
        <LucideLoaderCircle className="flex items-center justify-center w-6 h-6 rotating-div" />
      }
      className={`${props.className || ''} border border-zinc-600 hover:border-violet-500 text-zinc-200 flex items-center justify-center transition-all px-4 rounded h-9`}
    />
  ),
}

const Button = componentSelector<keyof typeof buttonVariations, IButtonContainerProps>(buttonVariations)

export default Button
