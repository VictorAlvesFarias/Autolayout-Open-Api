// pink-formatter.config.js
// Coloque este arquivo na raiz do seu projeto ou ao lado do formatter.js
// Todos os valores abaixo são os defaults.

/** @type {import('./src/script/types').PinkFormatterConfig} */
module.exports = {
  // ---------------------------------------------------------------------------
  // PARSER
  // ---------------------------------------------------------------------------
  parser: {
    // Plugins do @babel/parser. Ajuste se seu projeto usa sintaxe diferente.
    plugins: ["typescript", "jsx", "decorators-legacy", "classProperties"],
  },

  // ---------------------------------------------------------------------------
  // BLANK LINES — linhas em branco automáticas
  // ---------------------------------------------------------------------------
  blankLines: {
    beforeIf: true,          // blank line antes de `if (`
    beforeElseIf: true,      // blank line antes de `else if (`  (sempre false se beforeIf=false)
    beforeElse: true,        // blank line antes de `else {`     (idem)
    beforeConst: true,       // blank line antes de `const`
    beforeLet: true,         // blank line antes de `let`
    beforePropAssign: true,  // blank line antes de `obj.prop = `
    beforeVarAssign: true,   // blank line antes de `variable = `
    beforeSwitch: true
  },

  // ---------------------------------------------------------------------------
  // ARROW FUNCTIONS — converter para forma explícita
  // ---------------------------------------------------------------------------
  arrowFunctions: {
    // Converte `() => expr` para `() => { return expr; }`
    // Para arquivos .tsx, o return fica `() => { return (<...>) }`
    forceExplicitReturn: true,

    // Se true, .tsx wraps the return in parens: return (\n  ...\n)
    // Se false, return direto: return <...>
    tsxReturnParens: true,
  },

  // ---------------------------------------------------------------------------
  // BLOCOS — chaves obrigatórias
  // ---------------------------------------------------------------------------
  blocks: {
    // Garante chaves em todos if/else/for/while de uma linha
    // Ex: `if (x) doIt()` → `if (x) { doIt() }`
    requireBraces: true,
  },

  // ---------------------------------------------------------------------------
  // COLEÇÕES — objetos, arrays, parâmetros de função, argumentos de chamada
  // ---------------------------------------------------------------------------
  collections: {
    // Comportamento geral quando a coleção tem MUITOS itens (>= breakAt):
    //   "break"  → sempre quebra em múltiplas linhas
    //   "inline" → sempre mantém em linha (desativa a quebra automática)
    manyItemsBehavior: "break",

    // Comportamento geral quando a coleção tem POUCOS itens (< breakAt):
    //   "inline" → mantém em linha
    //   "break"  → quebra mesmo assim
    fewItemsBehavior: "inline",

    // A partir de quantos itens é considerado "muitos"
    breakAt: 4,   // ou seja: >= 4 itens quebra, < 4 fica inline

    // Overrides por tipo (se null, usa o comportamento geral acima)
    objects: {
      breakAt: null,          // null = herda de collections.breakAt
      manyBehavior: null,     // null = herda de collections.manyItemsBehavior
      fewBehavior: null,      // null = herda de collections.fewItemsBehavior
    },
    arrays: {
      breakAt: null,
      manyBehavior: null,
      fewBehavior: null,
    },
    functionParams: {
      breakAt: null,
      manyBehavior: null,
      fewBehavior: null,
    },
    callArgs: {
      breakAt: null,
      manyBehavior: null,
      fewBehavior: null,
    },
  },

  // ---------------------------------------------------------------------------
  // AVISOS — comentários de aviso inseridos no código
  // ---------------------------------------------------------------------------
  warnings: {
    // Avisa quando uma função (fora de objeto/classe) tem muitos params
    manyParams: {
      enabled: true,
      threshold: 3,   // avisa se params > threshold
      // Ignora funções que são métodos de objeto ou classe
      ignoreObjectMethods: true,
      message: "[WARNING] Function with many parameters: consider using an object or fewer params.",
    },

    // Avisa sobre ternários
    ternary: {
      enabled: true,
      message: "[WARNING] Ternary operator: prefer if/else for better readability.",
      // Inclui ternários aninhados (cada nível ganha um aviso próprio)
      includeNested: false,
    },
  }
};