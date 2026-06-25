import { Settings } from 'lucide-react'
import { useContext, useEffect } from 'react'
import Button from '../components/button'
import Text from '../components/input-text'
import Label from '../components/label'
import { OpenApiContext } from '../context/openapi-context'

export default function SpecLoader() {
  const { specUrl, setSpecUrl, loading, loadSpec, loaded, error } = useContext(OpenApiContext)

  useEffect(() => {
    loadSpec()
  }, [])


  return (
    <div className="p-3 border-b border-zinc-800 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-white">
        <Settings className="w-5 h-5 text-violet-400" />
        <span className="font-semibold text-sm">Configuração</span>
      </div>

      <div>
        <Label>Documentation URL</Label>
        <Text
          value={specUrl}
          onChange={(e) => setSpecUrl(e.target.value)}
          placeholder="https://localhost:7187/swagger/v1/swagger.json"
        />
      </div>

      <Button onClick={loadSpec} loading={loading} className="w-full !rounded-lg gap-3">
        Load
      </Button>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {loaded && (
        <p className="text-zinc-500 text-xs">
          {loaded.title} · {loaded.operations.length} endpoints
        </p>
      )}
    </div>
  )
}
