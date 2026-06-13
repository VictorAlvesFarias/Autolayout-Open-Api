import { IMenuContainerProps, MenuContainer } from 'react-base-components'
import { componentSelector } from "react-component-selector"

const menuVariations = {
    default: (props: IMenuContainerProps) =>
        <MenuContainer
            {...props}
            className="flex-col rounded-lg gap-2 bg-fort w-full max-w-80 bg-zinc-950"
        />
}

const SidebarMenu = componentSelector<keyof typeof menuVariations, IMenuContainerProps, "className">(menuVariations)

export default SidebarMenu
