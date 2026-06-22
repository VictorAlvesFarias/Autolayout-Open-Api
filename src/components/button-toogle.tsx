import { LegacyRef } from 'react'
import { componentSelector } from 'react-component-selector'
import { IToggleButtonProps, ToggleButton } from 'react-base-components'

const ToggleButtonVariations = {
    default: (props: IToggleButtonProps, ref: LegacyRef<HTMLButtonElement>) => (
        <ToggleButton
            {...props}
            ref={ref}
            className="px-3 py-1 rounded text-xs transition-all aria-pressed:bg-main-violet-500 aria-pressed:text-white bg-zinc-800 text-zinc-400 hover:text-white"
        />
    ),
    outline: (props: IToggleButtonProps, ref: LegacyRef<HTMLButtonElement>) => (
        <ToggleButton
            {...props}
            ref={ref}
            className="px-3 py-1 rounded text-xs transition-all border border-zinc-700 aria-pressed:border-violet-500 aria-pressed:text-violet-400 text-zinc-400 hover:text-white"
        />
    ),
    icon: (props: IToggleButtonProps, ref: LegacyRef<HTMLButtonElement>) => (
        <ToggleButton
            {...props}
            ref={ref}
            className="w-12 h-12 flex items-center justify-center rounded border border-zinc-800 transition-all aria-pressed:bg-violet-600/20 aria-pressed:border-violet-500 aria-pressed:text-violet-400 text-zinc-400 hover:text-white"
        />
    ),
}

const Toggle = componentSelector<keyof typeof ToggleButtonVariations, IToggleButtonProps>(ToggleButtonVariations)

export default Toggle