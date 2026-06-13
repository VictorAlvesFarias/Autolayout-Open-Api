import { Zap } from "lucide-react";
import { Route, Routes, useNavigate } from "react-router-dom";
import Accordion from "../components/accordion";
import AccordionRoot from "../components/accordion-root";
import AccordionTitle from "../components/accordion-title";
import SidebarContent from "../components/sidebar-content";
import SidebarHamburguer from "../components/sidebar-hamburguer";
import SidebarItem from "../components/sidebar-item";
import SidebarMenu from "../components/sidebar-menu";
import SidebarRoot from "../components/sidebar-root";
import { ModalClose, ModalContext, ModalOpen, SidebarContext } from 'react-base-components';
import { AccordionContext } from 'react-base-components';
import { OpenApiContext } from "../context/openapi-context";
import { methodBadgeClass } from "../utils/openapi/method-colors";
import { EndpointForm } from "./endpoint-form";
import SpecLoader from "./spec-loader";
import ModalRoot from "../components/modal-root";
import Button from "../components/button";
import { useContext } from "react";

function UserRouters() {
    const navigate = useNavigate()
    const { loaded } = useContext(OpenApiContext)

    function redirect(path: string): string {
        const session = crypto.randomUUID()

        navigate(`${path}?session=${session}`)

        return path
    }

    function logout(e: any) {
        throw new Error("Function not implemented.");
    }

    return (
        <SidebarContext>
            <SidebarRoot>
                <SidebarMenu>
                    <SpecLoader />
                    <div className="flex flex-col gap-3 overflow-y-auto p-3" >
                        {loaded && (
                            loaded.tagGroups.map((group) => (
                                <AccordionContext key={group.name}>
                                    <AccordionRoot>
                                        <div className="mb-1">
                                            <AccordionTitle>
                                                <div className="flex items-center justify-between w-full px-2 cursor-pointer">
                                                    <span>{group.name}</span>
                                                    <span className="text-zinc-500 text-xs">{group.operations.length}</span>
                                                </div>
                                            </AccordionTitle>
                                            <Accordion>
                                                <div className="flex flex-col gap-0.5 py-1">
                                                    {group.operations.map((op) => {
                                                        return (
                                                            <SidebarItem key={op.id} redirect={() => redirect(`${op.path}_${op.method}`)}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={methodBadgeClass(op.method)}>{op.method}</span>
                                                                    <span className="truncate font-mono">{op.path}</span>
                                                                </div>

                                                                {op.summary && (
                                                                    <span className="text-zinc-500 truncate pl-1">{op.summary}</span>
                                                                )}
                                                            </SidebarItem>
                                                        )
                                                    })}
                                                </div>
                                            </Accordion>
                                        </div>
                                    </AccordionRoot>
                                </AccordionContext>
                            ))
                        )}
                    </div>
                    <ModalContext>
                        <div className="flex-1 flex items-end w-full">
                            <ModalOpen className="w-full h-fit">
                                <SidebarItem unselectable disable href="" >
                                    <div >Exit </div>
                                </SidebarItem>
                            </ModalOpen>
                        </div>
                        <ModalRoot>
                            <div className='shadow-lg p-6 bg-main-black-800 flex flex-col gap-3 rounded text-white'>
                                <p>Are you sure you want to leave?</p>
                                <div className='flex justify-between w-full mt-6 gap-3'>
                                    <ModalClose callback={logout} className='flex justify-between flex-1'>
                                        <Button>Exit</Button>
                                    </ModalClose>
                                    <ModalClose className='flex justify-between flex-1'>
                                        <Button>Cancel</Button>
                                    </ModalClose>
                                </div>
                            </div>
                        </ModalRoot>
                    </ModalContext>
                </SidebarMenu>
                <SidebarHamburguer>
                    <header className="flex items-center gap-2 px-6 py-4 border-b border-zinc-800 shrink-0 w-full">
                        <Zap className="w-6 h-6 text-violet-400" />
                        <div>
                            <h1 className="text-lg font-bold text-white">Autolayout</h1>
                            <p className="text-xs text-zinc-500">Interface de uso da API — não é documentação</p>
                        </div>
                    </header>
                </SidebarHamburguer>
                <SidebarContent>
                    <header className="flex items-center gap-2 px-6 py-4 border-b border-zinc-800 shrink-0 w-full">
                        <Zap className="w-6 h-6 text-violet-400 " />
                        <div>
                            <h1 className="text-lg font-bold text-white">Autolayout</h1>
                            <p className="text-xs text-zinc-500">Geração automática de interfaces para API</p>
                        </div>
                    </header>
                    <Routes>
                        {
                            loaded?.tagGroups.map((group) =>
                                group.operations.map((op) =>
                                    <Route path={`${op.path}_${op.method}`} element={
                                        <div about={op.path} className="flex px-6 h-full overflow-y-auto w-full justify-center ">
                                            <div className="max-w-4xl w-full flex flex-col gap-6">
                                                <div className="max-w-4xl w-full flex-1 flex flex-col gap-6 py-6">
                                                    <EndpointForm operation={op} />
                                                </div>
                                            </div>
                                        </div>
                                    } />
                                )
                            )
                        }
                        <Route path="/" element={
                            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                                <p className="text-zinc-400 text-lg">Selecione um endpoint na barra lateral</p>
                                <p className="text-zinc-600 text-sm max-w-md">
                                    Carregue uma especificação OpenAPI e escolha um método para montar e enviar requisições com
                                    formulários gerados automaticamente.
                                </p>
                            </div>
                        } />
                    </Routes>
                </SidebarContent>
            </SidebarRoot >
        </SidebarContext>
    );
}

export default UserRouters;