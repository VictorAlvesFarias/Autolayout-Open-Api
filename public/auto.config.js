export const AUTO_CONFIG = {
  basePath: '/Autolayout',
  swaggerUrl: 'https://localhost:7187/swagger/v1/swagger.json',
}

export const ENDPOINT_CONFIG = [
  {
    operationId: 'get--users',
    rules: [
      {
        match: (field) => field.id === 'query.name',
        patch: (field) => ({ ...field, render: false }),
      },
    ],
    actions: [
      {
        type: 'request',
        postback: true,
        targetOperationId: 'delete--users--id-',
        label: 'Deletar usuário',
        path: 'responses.200',
        bind: [
          { from: 'id', to: 'path.id' },
          { to: 'query.reason', fallbackValue: 'none' },
        ],
      },
      {
        type: 'navigate',
        targetOperationId: 'get--users--id-',
        label: 'Ver detalhes',
        path: 'responses.200',
        bind: [{ from: 'id', to: 'path.id' }],
      },
      {
        type: 'navigate',
        targetOperationId: 'put--users--id-',
        label: 'Atualizar usuário',
        path: 'responses.200',
        bind: [{ from: 'id', to: 'path.id' }],
      },
    ],
  },
  {
    operationId: 'put--users--id-',
    render: false,
    rules: [
      {
        match: (field) => field.id === 'query.name',
        patch: (field) => ({ ...field, render: false }),
      },
    ],
    actions: [
      {
        type: 'init',
        targetOperationId: 'get--users--id-',
        label: '',
        path: '',
        bind: [{ from: 'id', to: 'path.id' }],
        returnBind: [
          { from: 'name', to: 'body.name' },
          { from: 'address', to: 'body.address' },
        ],
      },
    ],
  },
  {
    operationId: 'get--users--id-',
    render: false,
  },
  {
    operationId: 'delete--users--id-',
    render: false,
  },
  {
    operationId: 'get--user-types',
    searchInputId: 'query.SearchInput',
    runOnInit: true,
    rules: [
      {
        match: (field) => {
          const fields = [
            'responses.200.currentPage',
            'responses.200.pageSize',
            'responses.200.totalItems',
            'responses.200.totalItemsPage',
            'responses.200.totalPages'
          ]

          return fields.includes(field.id)
        },
        patch: (field) => {
          return { ...field, render: false }
        },
      },
      {
        match: (field) => {
          const fields = [
            'query.PageSize',
          ]

          return fields.includes(field.id)
        },
        patch: (field) => {
          return { ...field, defaultValue: 10 }
        },
      },
      {
        match: (field) => {
          const fields = [
            'query.CurrentPage',
          ]

          return fields.includes(field.id)
        },
        patch: (field) => {
          return { ...field, defaultValue: 1 }
        },
      },
      {
        match: (field, parent) => !((parent?.children?.filter(e => e.render).length ?? 0) > 1),
        patch: (field) => ({ ...field, fieldset: false }),
      },
    ],
    actions: [
      {
        type: 'request',
        postback: true,
        targetOperationId: 'delete--user-types--id-',
        label: 'Deletar usuário',
        path: 'responses.200.items',
        bind: [
          { from: 'id', to: 'path.id' },
          { to: 'query.reason', fallbackValue: 'none' },
        ],
      },
      {
        type: 'navigate',
        targetOperationId: 'get--user-types--id-',
        label: 'Ver detalhes',
        path: 'responses.200.items',
        bind: [{ from: 'id', to: 'path.id' }],
      },
      {
        type: 'navigate',
        targetOperationId: 'put--user-types--id-',
        label: 'Atualizar usuário',
        path: 'responses.200.items',
        bind: [{ from: 'id', to: 'path.id' }],
      },
    ],
    paginationFieldsConfigs: [
      {
        currentPageFieldId: 'query.CurrentPage',
        totalPagesFieldId: 'responses.200.totalPages',
        operationFieldId: 'responses.200.items',
      },
    ],
  },
  {
    operationId: 'get--user-types--id-',
    runOnInit: true
  },
  {
    operationId: 'put--user-types--id-',
    actions: [
      {
        type: 'init',
        targetOperationId: 'get--user-types--id-',
        label: '',
        path: '',
        bind: [{ from: 'id', to: 'path.id' }],
        returnBind: [{ from: 'name', to: 'body.name' }],
      },
    ],
  },
]
