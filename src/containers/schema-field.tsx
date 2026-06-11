import React, { useRef } from 'react'
import Label from '../components/label'
import Text from '../components/input-text'
import TextArea from '../components/text-area'
import Checkbox from '../components/checkbox'
import { OperationField } from '../services/openapi-normalizer'
import InputRoot from '../components/input-root'
import { Check, Copy, Grip, Trash } from 'lucide-react'
import { ModalClose, ModalContext, ModalOpen } from 'react-base-components'
import ModalRoot from '../components/modal-root'
import Card from '../components/card'
import Button from '../components/button'

interface SchemaFieldProps {
  field: OperationField
  fieldParent?: OperationField
  value: unknown
  onChange: (value: unknown) => void
}

export default function SchemaField({ field, value, onChange, }: SchemaFieldProps) {
  // console.log(new Date().toISOString() + ' - SchemaField - field, value:', JSON.stringify({ field, value }))

  const {
    label,
    description,
    required,
    type,
    enumValues,
    children,
    format,
    placeholder,
    maxLength,
    readOnly,
  } = field

  if (enumValues?.length) {
    return (
      <InputRoot>
        <Label>
          {label}

          {required && (
            <span className="text-red-400 ml-1">*</span>
          )}
        </Label>

        {description && (
          <div className="text-xs text-zinc-500 mb-2">
            {description}
          </div>
        )}
        <select
          className="w-full bg-transparent border border-zinc-700 text-white rounded p-2 text-sm"
          value={String(value ?? enumValues[0])}
          onChange={(e) => onChange(e.target.value)}
        >
          {enumValues.map(option => (
            <option
              key={String(option)}
              value={String(option)}
              className="bg-zinc-900"
            >
              {String(option)}
            </option>
          ))}
        </select>
      </InputRoot>
    )
  }

  if (type === 'boolean') {
    return (
      <InputRoot variation='checkbox'>
        <Label>
          {label}

          {required && (
            <span className="text-red-400 ml-1">*</span>
          )}
        </Label>

        {description && (
          <div className="text-xs text-zinc-500 mb-2">
            {description}
          </div>
        )}
        <Checkbox
          checked={Boolean(value)}
          data={'true'}
          onChange={(e) =>
            onChange(e.target.checked)
          }
        >
          <Check size={16} />
        </Checkbox>
      </InputRoot>
    )
  }

  if (type === 'object') {
    const obj = (value as Record<string, unknown>) ?? {}

    const content = <div className="flex flex-col gap-3">
      {
        children?.map((child, i) => {
          // console.log(new Date().toISOString() + ' - SchemaField.return - object - children?.map - field, child, i, obj:', JSON.stringify({ field, child, i, obj }))

          return < SchemaField
            key={child.id}
            field={child}
            value={
              obj[child.name] ??
              createDefaultValue(child)
            }
            onChange={(next) => {
              // console.log(new Date().toISOString() + ' - SchemaField.return - object - children?.map - onChange - next, obj:', JSON.stringify({ next, obj }))

              return onChange({
                ...obj,
                [child.name]: next,
              })
            }}
          />
        })
      }
    </div>

    if (!field?.fieldset) {
      return content
    }

    return (
      <fieldset className="border border-zinc-800 rounded p-3 flex flex-col">
        <legend className="text-sm font-semibold text-zinc-300 px-1">
          {label}

          {required && (
            <span className="text-red-400 ml-1">
              *
            </span>
          )}
        </legend>

        {description && (
          <p className="text-xs text-zinc-500 -mt-2">
            {description}
          </p>
        )}

        {content}
      </fieldset>
    )
  }

  if (type === 'array') {
    const items = Array.isArray(value) ? value : []

    const isObjectArray =
      children?.some(
        child => child.name !== '*'
      ) ?? false

    const itemField = isObjectArray
      ? {
        ...field,
        type: 'object' as const,
      }
      : undefined

    const createArrayItem = () => {
      if (!isObjectArray) {
        return createDefaultValue(
          children?.[0]
        )
      }

      return Object.fromEntries(
        children!.map(child => [
          child.name,
          createDefaultValue(child),
        ])
      )
    }

    const renderItem = (
      item: unknown,
      index: number
    ) => (
      <div
        key={index}
        className="flex gap-2 items-end"
      >
        <div className="flex-1">
          {isObjectArray ? (
            <SchemaField
              field={itemField!}
              value={item}
              onChange={(next) => {
                const copy = [...items]
                copy[index] = next
                onChange(copy)
              }}
            />
          ) : (
            <Text
              value={String(item ?? '')}
              onChange={(e) => {
                const copy = [...items]

                copy[index] =
                  field.children?.[0]?.type === 'integer'
                    ? Number(e.target.value)
                    : e.target.value

                onChange(copy)
              }}
            />
          )}
        </div>

        <ModalContext>
          <ModalOpen>
            <button
              type="button"
              className="text-zinc-400 text-xs hover:underline rounded border border-zinc-800 w-12 h-12 flex items-center justify-center hover:bg-purple-600/15 transition-all"
            >
              <Grip className="w-5 h-5" />
            </button>
          </ModalOpen>

          <ModalRoot>
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-full max-h-full max-w-2xl bg-main-black-800 flex flex-col gap-6 rounded text-white">
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-purple-300 mb-3">
                      Parameters
                    </h3>

                    <ModalClose>
                      <Button>Close</Button>
                    </ModalClose>
                  </div>

                  <button
                    type="button"
                    className="flex gap-3 items-center"
                    onClick={() =>
                      onChange(
                        items.filter(
                          (_, i) => i !== index
                        )
                      )
                    }
                  >
                    <div className="text-red-400 text-xs hover:underline rounded border border-zinc-800 w-12 h-12 flex items-center justify-center hover:bg-red-500/15 transition-all">
                      <Trash className="w-5 h-5" />
                    </div>

                    <span className="font-semibold">
                      Remove item
                    </span>
                  </button>

                  <button
                    type="button"
                    className="flex gap-3 items-center"
                    onClick={() => {
                      const copy = [...items]

                      copy.splice(
                        index + 1,
                        0,
                        structuredClone(item)
                      )

                      onChange(copy)
                    }}
                  >
                    <div className="text-blue-400 text-xs rounded border border-zinc-800 w-12 h-12 flex items-center justify-center hover:bg-blue-500/15 transition-all">
                      <Copy className="w-5 h-5" />
                    </div>

                    <span className="font-semibold">
                      Duplicate item
                    </span>
                  </button>
                </Card>
              </div>
            </div>
          </ModalRoot>
        </ModalContext>
      </div>
    )

    const content = (
      <>
        <button
          type="button"
          className="text-violet-400 text-sm hover:underline w-fit mb-3"
          onClick={() =>
            onChange([
              ...items,
              createArrayItem(),
            ])
          }
        >
          + Adicionar item
        </button>
        <div className="flex flex-col gap-3">
          {items.map(renderItem)}
        </div>
      </>

    )

    if (!field.fieldset) {
      return <div className="flex flex-col gap-2">
        {/* <Label>
          {label}
        </Label> */}
        {content}
      </div>
    }

    return (
      <fieldset className="border border-zinc-800 rounded p-3 flex flex-col">
        <legend className="text-sm font-semibold text-zinc-300 px-1">
          {label}

          {required && (
            <span className="text-red-400 ml-1">
              *
            </span>
          )}
        </legend>

        {description && (
          <p className="text-xs text-zinc-500 -mt-2">
            {description}
          </p>
        )}

        {content}
      </fieldset>
    )
  }

  const inputType = resolveInputType(field)

  if ((maxLength ?? 0) > 200) {
    return (
      <InputRoot>
        <Label>
          {label}

          {required && (
            <span className="text-red-400 ml-1">*</span>
          )}
        </Label>

        {description && (
          <div className="text-xs text-zinc-500 mb-2">
            {description}
          </div>
        )}
        <TextArea
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
          placeholder={
            placeholder ?? label
          }
        />
      </InputRoot>
    )
  }

  return (
    <InputRoot>
      <Label>
        {label}

        {required && (
          <span className="text-red-400 ml-1">*</span>
        )}
      </Label>

      {description && (
        <div className="text-xs text-zinc-500 mb-2">
          {description}
        </div>
      )}

      <Text
        disabled={readOnly}
        type={inputType}
        value={
          value === undefined || value === null
            ? ''
            : String(value)
        }
        onChange={(v: React.ChangeEvent<HTMLInputElement>) => {
          const inputValue = v.target.value

          if (type === 'integer') {
            onChange(
              inputValue === ''
                ? ''
                : parseInt(inputValue, 10)
            )
            return
          }

          if (type === 'number') {
            onChange(
              inputValue === ''
                ? ''
                : parseFloat(inputValue)
            )
            return
          }

          // CORREÇÃO: Enviando o valor do texto puro em vez do evento completo do React
          onChange(inputValue)
        }}
        placeholder={
          placeholder ?? label
        }
      />
    </InputRoot>
  )
}

function createDefaultValue(
  field?: OperationField
): unknown {
  if (!field) {
    return ''
  }

  if (
    field.defaultValue !== undefined
  ) {
    return field.defaultValue
  }

  switch (field.type) {
    case 'object':
      return Object.fromEntries(
        (field.children ?? []).map(
          child => [
            child.name,
            createDefaultValue(child),
          ]
        )
      )

    case 'array':
      return []

    case 'boolean':
      return false

    case 'integer':
    case 'number':
      return 0

    default:
      return ''
  }
}

function resolveInputType(
  field: OperationField
): string {
  if (field.format === 'password')
    return 'password'

  if (field.format === 'email')
    return 'email'

  if (field.format === 'date')
    return 'date'

  if (field.format === 'date-time')
    return 'datetime-local'

  if (
    field.type === 'integer' ||
    field.type === 'number'
  ) {
    return 'number'
  }

  return 'text'
}