import type { OptionsResolved } from './options'
import type { TranspileOptions } from 'typescript'

export interface TransformResult {
  code: string
  map?: string
  errors: Array<string>
}

function tryImport<T>(pkg: string): Promise<T | null> {
  try {
    return import(pkg)
  } catch {
    return Promise.resolve(null)
  }
}

export async function oxcTransform(
  id: string,
  code: string,
  options: OptionsResolved,
): Promise<TransformResult> {
  const oxc = await tryImport<typeof import('oxc-transform')>('oxc-transform')
  if (!oxc) {
    return {
      code: '',
      errors: [
        'oxc-transform is required for transforming TypeScript, please install `oxc-transform`.',
      ],
    }
  }
  const result = oxc.isolatedDeclaration(id, code, {
    sourcemap: options.declarationMap,
  })

  return {
    code: result.code,
    map: result.map ? JSON.stringify(result.map) : undefined,
    errors: result.errors,
  }
}

export async function swcTransform(
  id: string,
  code: string,
  options: OptionsResolved,
): Promise<TransformResult> {
  const swc = await tryImport<typeof import('@swc/core')>('@swc/core')
  if (!swc) {
    return {
      code: '',
      errors: [
        'SWC is required for transforming TypeScript, please install `@swc/core`.',
      ],
    }
  }

  try {
    const result = await swc.transform(code, {
      filename: id,
      sourceMaps: options.declarationMap,
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: false,
        },
        experimental: {
          emitIsolatedDts: true,
        },
      },
    })
    // @ts-expect-error
    const output = JSON.parse(result.output)
    return {
      code: output.__swc_isolated_declarations__,
      map: result.map,
      errors: [],
    }
  } catch (error: any) {
    return {
      code: '',
      errors: [error.toString()],
    }
  }
}

export async function tsTransform(
  id: string,
  code: string,
  options: OptionsResolved,
): Promise<TransformResult> {
  const ts = await tryImport<typeof import('typescript')>('typescript')
  if (!ts) {
    return {
      code: '',
      errors: [
        'TypeScript is required for transforming TypeScript, please install `typescript`.',
      ],
    }
  }

  if (!ts.transpileDeclaration) {
    return {
      code: '',
      errors: [
        'TypeScript version is too low, please upgrade to TypeScript 5.5.2+.',
      ],
    }
  }

  const transformOptions: TranspileOptions =
    (options as any).transformOptions || {}
  transformOptions.compilerOptions = transformOptions.compilerOptions || {}
  transformOptions.compilerOptions.declarationMap = options.declarationMap

  const { outputText, sourceMapText, diagnostics } = ts.transpileDeclaration(
    code,
    {
      fileName: id,
      reportDiagnostics: true,
      ...transformOptions,
    },
  )

  const errors = diagnostics?.length
    ? [
        ts.formatDiagnostics(diagnostics, {
          getCanonicalFileName: (fileName) =>
            ts.sys.useCaseSensitiveFileNames
              ? fileName
              : fileName.toLowerCase(),
          getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
          getNewLine: () => ts.sys.newLine,
        }),
      ]
    : []
  return {
    code: outputText,
    map: sourceMapText,
    errors,
  }
}
