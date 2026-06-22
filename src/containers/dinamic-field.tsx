import { Check, Copy, Grip, Trash } from 'lucide-react'
import React, { useRef } from 'react'
import { If, IModalController, ModalClose, ModalContext, ModalOpen } from 'react-base-components'
import Button from '../components/button'
import Card from '../components/card'
import Checkbox from '../components/checkbox'
import InputRoot from '../components/input-root'
import Text from '../components/input-text'
import Label from '../components/label'
import ModalRoot from '../components/modal-root'
import TextArea from '../components/text-area'
import { createDefaultValue, isObjectArray, resolveInputType } from '../services/openapi-normalizer'
import { OperationField } from '../types/operation'

export interface DinamicFieldForProps {
  field: OperationField
  fieldParent?: OperationField
  value: unknown
  onChange: (value: unknown) => void
}

export function DinamicFieldForEnum({ field, value, onChange }: DinamicFieldForProps) {
  return (
    <InputRoot>
      <Label>
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </Label>

      {field.description && (
        <div className="text-xs text-zinc-500 mb-2">{field.description}</div>
      )}

      <select
        className="w-full bg-transparent border border-zinc-700 text-white rounded p-2 text-sm"
        value={String(value ?? field.enumValues![0])}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.enumValues!.map(option => (
          <option key={String(option)} value={String(option)} className="bg-zinc-900">
            {String(option)}
          </option>
        ))}
      </select>
    </InputRoot>
  )
}

export function DinamicFieldForBoolean({ field, value, onChange }: DinamicFieldForProps) {
  return (
    <InputRoot variation="checkbox">
      <Label>
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </Label>

      {field.description && (
        <div className="text-xs text-zinc-500 mb-2">{field.description}</div>
      )}

      <Checkbox
        checked={Boolean(value)}
        data={'true'}
        onChange={(e) => onChange(e.target.checked)}
      >
        <Check size={16} />
      </Checkbox>
    </InputRoot>
  )
}

export function DinamicFieldForObject({ field, value, onChange }: DinamicFieldForProps) {
  const obj = (value as Record<string, unknown>) ?? {}

  const content = (
    <div className="flex flex-col gap-3">
      {field.children?.map((child) => (
        <DinamicField
          key={child.id}
          field={child}
          value={obj[child.name] ?? createDefaultValue(child)}
          onChange={(next) =>
            onChange({
              ...obj,
              [child.name]: next,
            })
          }
        />
      ))}
    </div>
  )

  if (!field.fieldset) {
    return content
  }

  return (
    <fieldset className="border border-zinc-800 rounded p-3 flex flex-col">
      <legend className="text-sm font-semibold text-zinc-300 px-1">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </legend>

      {field.description && (
        <p className="text-xs text-zinc-500 -mt-2">{field.description}</p>
      )}

      {content}
    </fieldset>
  )
}

export function DinamicFieldForArray({ field, value, onChange }: DinamicFieldForProps) {
  const modalActionsContext = useRef<IModalController>(null)
  let items: any[] = []
  let itemField: OperationField | null = null

  function createArrayItem(): unknown {
    if (!isObjectArray(field)) {
      return createDefaultValue(field.children?.[0])
    }

    return Object.fromEntries(
      field.children!.map(child => [child.name, createDefaultValue(child)])
    )
  }

  function renderItem(item: unknown, index: number) {
    return (
      <div key={index} className="flex gap-2 items-end">
        <div className="flex-1">
          {isObjectArray(field) ? (
            <DinamicField
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
        <button
          type="button"
          onClick={() => modalActionsContext.current?.open()}
          className="text-zinc-200 text-xs hover:underline rounded border border-zinc-800 w-12 h-12 flex items-center justify-center hover:bg-purple-600/15 transition-all"
        >
          <Grip className="w-5 h-5" />
        </button>

        <ModalContext ref={modalActionsContext}>
          <ModalRoot>
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-full max-h-full max-w-2xl bg-main-black-800 flex flex-col gap-6 rounded text-white">
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-purple-300 mb-3">
                      Filters
                    </h3>

                    <ModalClose>
                      <Button>Close</Button>
                    </ModalClose>
                  </div>

                  <button
                    type="button"
                    className="flex gap-3 items-center"
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                  >
                    <div className="text-red-400 text-xs hover:underline rounded border border-zinc-800 w-12 h-12 flex items-center justify-center hover:bg-red-500/15 transition-all">
                      <Trash className="w-5 h-5" />
                    </div>
                    <span className="font-semibold">Remove item</span>
                  </button>

                  <button
                    type="button"
                    className="flex gap-3 items-center"
                    onClick={() => {
                      const copy = [...items]
                      copy.splice(index + 1, 0, structuredClone(item))
                      onChange(copy)
                    }}
                  >
                    <div className="text-blue-400 text-xs rounded border border-zinc-800 w-12 h-12 flex items-center justify-center hover:bg-blue-500/15 transition-all">
                      <Copy className="w-5 h-5" />
                    </div>
                    <span className="font-semibold">Duplicate item</span>
                  </button>
                </Card>
              </div>
            </div>
          </ModalRoot>
        </ModalContext>
      </div>
    )
  }

  if (isObjectArray(field)) {
    itemField = { ...field, type: 'object' as const }
  }

  if (Array.isArray(value)) {
    items = value
  }

  const content = (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="text-violet-400 text-sm hover:underline w-fit"
        onClick={() => onChange([...items, createArrayItem()])}
      >
        + Adicionar item
      </button>
      <If conditional={items.length > 0}>
        <div className="flex flex-col gap-3">{items.map(renderItem)}</div>
      </If>
    </div>
  )

  if (!field.fieldset) {
    return <div className="flex flex-col gap-2">{content}</div>
  }

  return (
    <fieldset className="border border-zinc-800 rounded p-3 flex flex-col">
      <legend className="text-sm font-semibold text-zinc-300 px-1">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </legend>

      {field.description && (
        <p className="text-xs text-zinc-500 -mt-2">{field.description}</p>
      )}

      {content}
    </fieldset>
  )
}

export function DinamicFieldForString({ field, value, onChange }: DinamicFieldForProps) {
  const inputType = resolveInputType(field)

  const label = (
    <Label>
      {field.label}
      {field.required && <span className="text-red-400 ml-1">*</span>}
    </Label>
  )

  const description = field.description && (
    <div className="text-xs text-zinc-500 mb-2">{field.description}</div>
  )

  if ((field.maxLength ?? 0) > 200) {
    return (
      <InputRoot>
        <Label>
          {label}
          {description}
        </Label>
        <TextArea
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
          placeholder={field.placeholder ?? field.label}
        />
      </InputRoot>
    )
  }

  return (
    <InputRoot>
      <Label>
        {label}
        {description}
      </Label>
      <Text
        disabled={field.readOnly}
        type={inputType}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(v: React.ChangeEvent<HTMLInputElement>) => {
          const inputValue = v.target.value

          if (field.type === 'integer') {
            onChange(inputValue === '' ? '' : parseInt(inputValue, 10))

            return
          }

          if (field.type === 'number') {
            onChange(inputValue === '' ? '' : parseFloat(inputValue))

            return
          }

          onChange(inputValue)
        }}
        placeholder={field.placeholder ?? field.label}
      />
    </InputRoot>
  )
}

export function DinamicField({ field, value, onChange, fieldParent }: DinamicFieldForProps) {
  if (field.render === false) {
    return null
  }

  if (field.enumValues?.length) {
    return <DinamicFieldForEnum field={field} value={value} onChange={onChange} fieldParent={fieldParent} />
  }

  if (field.type === 'boolean') {
    return <DinamicFieldForBoolean field={field} value={value} onChange={onChange} fieldParent={fieldParent} />
  }

  if (field.type === 'object') {
    return <DinamicFieldForObject field={field} value={value} onChange={onChange} fieldParent={fieldParent} />
  }

  if (field.type === 'array') {
    return <DinamicFieldForArray field={field} value={value} onChange={onChange} fieldParent={fieldParent} />
  }

  return <DinamicFieldForString field={field} value={value} onChange={onChange} fieldParent={fieldParent} />
}