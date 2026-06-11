import { Send, RotateCcw } from 'lucide-react'
import type { ApiOperation, EndpointFormValues } from '../../types/operation'
import { buildRequestUrl } from '../../utils/openapi/build-url'
import { methodBadgeClass } from '../../utils/openapi/method-colors'
import Button from '../button'
import Text from '../input-text'
import Label from '../label'

interface RequestSetupProps {
  operation?: ApiOperation | null
  values: EndpointFormValues
  baseUrl: string
  onBaseUrlChange: (url: string) => void
  onSend: () => void
  onReset: () => void
  sending: boolean
}

export default function RequestSetup({
  operation,
  values,
  baseUrl,
  onBaseUrlChange,
  onSend,
  onReset,
  sending,
}: RequestSetupProps) {
  const previewUrl = baseUrl ? buildRequestUrl(baseUrl, operation, values) : operation?.path

  return (
    <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4">
      <div className="flex items-start gap-3 flex-wrap">
        <span className={methodBadgeClass(operation?.method)}>{operation?.method}</span>
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-lg font-semibold text-white">
            {operation?.summary ?? `${operation?.method.toUpperCase()} ${operation?.path}`}
          </h2>
          {operation?.description && (
            <p className="text-sm text-zinc-400 mt-1">{operation?.description}</p>
          )}
        </div>
      </div>

      <div>
        <Label>Base URL</Label>
        <Text value={baseUrl} onChange={onBaseUrlChange} placeholder="https://localhost:447" />
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 rounded p-3 font-mono text-sm text-zinc-300 break-all">
        {previewUrl}
      </div>

      <div className="flex gap-2">
        <Button onClick={onSend} loading={sending} className="gap-2 !rounded-lg min-w-[140px]">
          <Send className="w-4 h-4" />
          Enviar
        </Button>
        <Button variation="outline" onClick={onReset} className="gap-2 !rounded-lg">
          <RotateCcw className="w-4 h-4" />
          Limpar
        </Button>
      </div>
    </div>
  )
}
