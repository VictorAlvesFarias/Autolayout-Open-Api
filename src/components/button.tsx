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
      className={` bg-main-violet-500 hover:bg-violet-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all px-4 rounded h-9`}
    />
  ),
  outline: (props: IButtonContainerProps, ref: React.LegacyRef<ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <ButtonContainer
      {...props}
      ref={ref}
      loadingComponent={
        <LucideLoaderCircle className="flex items-center justify-center w-6 h-6 rotating-div" />
      }
      className="text-zinc-200 ounded border border-zinc-800 w-full min-h-12 flex items-center justify-start gap-3 px-3 hover:bg-purple-600/15 transition-all cursor-pointer"
    />
  ),
  icon: (props: React.HTMLAttributes<HTMLButtonElement>, ref: React.Ref<HTMLButtonElement>) => (
    <ButtonContainer
      {...props}
      ref={ref}
      className="text-zinc-200 ounded border border-zinc-800 min-w-12 min-h-12 flex items-center justify-center hover:bg-purple-600/15 transition-all cursor-pointer"
    />
  ),
}

const Button = componentSelector<keyof typeof buttonVariations, IButtonContainerProps>(buttonVariations)

export default Button
