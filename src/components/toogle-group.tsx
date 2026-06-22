import React, { LegacyRef } from 'react'
import { componentSelector } from 'react-component-selector'
import { IToggleGroupContextComponent, IToggleGroupItemProps, ToggleGroupContext, ToggleGroupItem } from 'react-base-components'


// ---------------------------------------------------------------------------
// ToggleGroup — container
// ---------------------------------------------------------------------------

const ToggleGroupVariations = {
    default: (props: React.HTMLAttributes<HTMLDivElement>, ref: LegacyRef<any>) => (
        <div
            {...props}
            ref={ref}
            // @ts-ignore — componentSelector passes className through; wrapper is a div
            className="flex gap-1 w-full"
        />
    ),
}

export const ToggleGroup = componentSelector<keyof typeof ToggleGroupVariations, React.HTMLAttributes<HTMLDivElement>>(ToggleGroupVariations)

// ---------------------------------------------------------------------------
// ToggleGroupButton — item
// ---------------------------------------------------------------------------

const ToggleGroupButtonVariations = {
    default: (props: IToggleGroupItemProps, ref: LegacyRef<HTMLButtonElement>) => (
        <ToggleGroupItem
            {...props}
            ref={ref}
            className="px-3 w-fit py-1 rounded text-xs font-medium transition-all text-zinc-400 hover:text-white aria-pressed:bg-main-violet-500 bg-zinc-800 aria-pressed:text-white"
        />
    ),
}

export const ToggleGroupButton = componentSelector<keyof typeof ToggleGroupButtonVariations, IToggleGroupItemProps>(ToggleGroupButtonVariations)