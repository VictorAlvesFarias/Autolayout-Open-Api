import { AccordionContext, If } from 'react-base-components'
import { OperationField } from '../services/openapi-normalizer'
import AccordionRoot from '../components/accordion-root'
import Accordion from '../components/accordion'
import AccordionTitle from '../components/accordion-title'
import InputRoot from '../components/input-root'
import Label from '../components/label'
import Checkbox from '../components/checkbox'
import { Check } from 'lucide-react'
import Text from '../components/input-text'

export interface ResponsePanelProps {
  field: OperationField
  fieldParent?: OperationField
  value: unknown
}

export interface ResponsePanelTableValue {
  name: string
  value: unknown
}

export function ResponseSchema({ field, value, fieldParent }: ResponsePanelProps) {
  const data = normalizeValue(value)

  if (field.type === 'object') {
    const obj = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}

    if (field?.depth === 0 || field?.depth === undefined || field?.depth == null) {
      return (
        <div className="flex flex-col gap-3">
          {field.children?.map((child) => (
            <ResponseSchema
              key={child.id}
              field={child}
              value={obj[child.name]}
            />
          ))}
        </div>
      )
    }

    return (
      <fieldset className="border border-zinc-800 rounded p-3 flex flex-col gap-3">
        <legend className="text-sm font-semibold text-zinc-300 px-1">
          {field.label}
        </legend>

        {field.description && (
          <p className="text-xs text-zinc-500">
            {field.description}
          </p>
        )}

        {field.children?.map((child) => (
          <ResponseSchema
            key={child.id}
            field={child}
            value={obj[child.name]}
          />
        ))}
      </fieldset>
    )
  }

  if (field.type === 'array') {
    const items = Array.isArray(data) ? data : []

    const isObjectArray =
      field.children?.some(
        child => child.name !== '*'
      ) ?? false


    const labels = isObjectArray ? findResponsePanelTableLabel(field) : ['Value ']

    const renderContent = (item: unknown) => {
      if (isObjectArray) {
        return (
          <ResponseSchema
            field={{
              ...field,
              type: 'object',
            }}
            value={item}
          />
        )
      }

      return (
        <span className="text-sm">
          {formatValue(item)}
        </span>
      )
    }

    const renderHeader = () => {
      return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 w-full px-2 cursor-pointer pb-3">
          {labels.map((cell, index) => (
            <span
              key={index}
              className="text-sm text-white"
            >
              {cell}
            </span>
          ))}
        </div>
      )
    }

    const renderItem = (
      item: unknown,
      index: number
    ) => (
      <AccordionContext key={index}>
        <AccordionRoot variation="table">
          <AccordionTitle variation="table">
            {isObjectArray ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 w-full px-2 cursor-pointer">
                {findResponsePanelTableValues(
                  field,
                  item
                ).map((cell, i) => (
                  <span
                    key={i}
                    className="text-sm font-semibold"
                  >
                    {formatValue(cell)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="px-2">
                <span className="text-sm font-semibold">
                  {formatValue(item)}
                </span>
              </div>
            )}
          </AccordionTitle>

          <Accordion variation="transparent">
            <div className="py-3 flex flex-col gap-3">
              {renderContent(item)}
            </div>
          </Accordion>
        </AccordionRoot>
      </AccordionContext>
    )

    if (!field.fieldset) {
      return (
        <div>
          {/* <div className="font-semibold text-white text-base mb-6">
            {field.label}
          </div> */}

          {renderHeader()}

          <If conditional={items.length > 0}>
            {items.map(renderItem)}
          </If>

          <If conditional={items.length <= 0}>
            <p className="text-xs text-zinc-500">
              Array vazio
            </p>
          </If>
        </div>
      )
    }

    return (
      <fieldset className="border border-zinc-800 rounded p-3 flex flex-col">
        <legend className="text-sm font-semibold text-zinc-300 px-1">
          {field.label}
        </legend>

        {renderHeader()}

        <If conditional={items.length > 0}>
          {items.map(renderItem)}
        </If>

        <If conditional={items.length <= 0}>
          <p className="text-xs text-zinc-500">
            Array vazio
          </p>
        </If>
      </fieldset>
    )
  }

  if (field.type === 'boolean') {
    return (
      <InputRoot variation='checkbox'>
        <Label>
          {field.label}

          {field.required && (
            <span className="text-red-400 ml-1">*</span>
          )}
        </Label>

        {field.description && (
          <div className="text-xs text-zinc-500 mb-2">
            {field.description}
          </div>
        )}
        <Checkbox
          checked={Boolean(value)}
          data={'true'}
        >
          <Check size={16} />
        </Checkbox>
      </InputRoot>
    )
  }

  return (
    <InputRoot>
      <Label>
        {field.label}

        {field.required && (
          <span className="text-red-400 ml-1">*</span>
        )}
      </Label>

      {field.description && (
        <div className="text-xs text-zinc-500 mb-2">
          {field.description}
        </div>
      )}

      <Text
        disabled={true}
        type="text"
        value={formatValue(data)}
        placeholder={
          field.placeholder ?? field.label
        }
      />
    </InputRoot>
  )
}

function findResponsePanelTableValues(
  op?: OperationField,
  item?: any
): unknown[] {
  const isObjectArray =
    op?.children?.some(
      child => child.name !== '*'
    ) ?? false

  if (!isObjectArray) {
    return [item]
  }

  const values: unknown[] = []

  op?.children?.forEach((child) => {
    if (
      child.type !== 'object' &&
      child.type !== 'array'
    ) {
      values.push(item?.[child.name])
    }
  })

  return values
}

function findResponsePanelTableLabel(
  op?: OperationField
): string[] {
  const isObjectArray =
    op?.children?.some(
      child => child.name !== '*'
    ) ?? false

  if (!isObjectArray) {
    return []
  }

  return (
    op?.children?.filter(
      child =>
        child.type !== 'object' &&
        child.type !== 'array'
    ).map(child => child.label) ?? []
  )
}

function normalizeValue(value: unknown): unknown {
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function formatValue(value: unknown): string {
  if (value === undefined) {
    return '—'
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string') {
    return value
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value)
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}