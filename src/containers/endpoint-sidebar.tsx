import { AccordionContext } from 'react-base-components'
import { useOpenApi } from '../context/openapi-context'
import Accordion from '../components/accordion'
import AccordionRoot from '../components/accordion-root'
import AccordionTitle from '../components/accordion-title'
import { methodBadgeClass } from '../utils/openapi/method-colors'
import type { ApiOperation } from '../types/operation'
import SpecLoader from './spec-loader'

export default function EndpointSidebar() {
  const { loaded, selectedOperation, selectOperation, loading } = useOpenApi()

  return (
    <aside className="w-80 min-w-[280px] max-w-[360px] h-full flex flex-col bg-tertiary-solid border-r border-zinc-800">
      <SpecLoader />

      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <p className="text-zinc-500 text-sm text-center py-8">Carregando...</p>
        )}

        {!loading && !loaded && (
          <p className="text-zinc-500 text-sm text-center py-8 px-4">
            Informe a URL da especificação e clique em Carregar API.
          </p>
        )}

        {loaded && (
          loaded.tagGroups.map((group) => (
            <AccordionContext>
              <AccordionRoot>
                <div key={group.name} className="mb-1">
                  <AccordionTitle>
                    <div className="flex items-center justify-between w-full px-2 cursor-pointer">
                      <span>{group.name}</span>
                      <span className="text-zinc-500 text-xs">{group.operations.length}</span>
                    </div>
                  </AccordionTitle>
                  <Accordion>
                    <div className="flex flex-col gap-0.5 py-1">
                      {group.operations.map((op) => (
                        <EndpointItem
                          key={op.id}
                          operation={op}
                          selected={selectedOperation?.id === op.id}
                          onSelect={() => selectOperation(op)}
                        />
                      ))}
                    </div>
                  </Accordion>
                </div>
              </AccordionRoot>
            </AccordionContext>
          ))
        )}
      </div>
    </aside>
  )
}

function EndpointItem({
  operation,
  selected,
  onSelect,
}: {
  operation: ApiOperation
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-2 py-2 rounded text-xs transition-all flex flex-col gap-1 ${selected
          ? 'bg-violet-600/30 border border-violet-500/50 text-white'
          : 'hover:bg-white/5 text-zinc-400 border border-transparent'
        }`}
    >
      <div className="flex items-center gap-2">
        <span className={methodBadgeClass(operation.method)}>{operation.method}</span>
        <span className="truncate font-mono">{operation.path}</span>
      </div>
      {operation.summary && (
        <span className="text-zinc-500 truncate pl-1">{operation.summary}</span>
      )}
    </button>
  )
}
