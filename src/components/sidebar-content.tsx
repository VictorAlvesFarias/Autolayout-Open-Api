import React from "react"
import { componentSelector } from "react-component-selector"

const contentVariations = {
    default: (props: React.HTMLAttributes<HTMLDivElement>) =>
        <div {...props} className=" flex w-full bg-fort items-center justify-center flex-1 flex-col overflow-auto bg-gradient-to-t to-zinc-900 from from-zinc-800  relative" />
}

const SidebarContent = componentSelector<keyof typeof contentVariations, React.HTMLAttributes<HTMLDivElement>, "className">(contentVariations)

export default SidebarContent
