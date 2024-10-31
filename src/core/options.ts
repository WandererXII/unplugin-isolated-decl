import type { FilterPattern } from '@rollup/pluginutils'
import type { TranspileOptions } from 'typescript'

export type Options = {
  include?: FilterPattern
  exclude?: FilterPattern
  enforce?: 'pre' | 'post' | undefined
  ignoreErrors?: boolean
  /** An extra directory layer for output files. */
  extraOutdir?: string
  /** Automatically add `.js` extension to resolve in `Node16` + ESM mode. */
  autoAddExts?: boolean
  /** Patch `export default` in `.d.cts` to `export = ` */
  declarationMap?: boolean
  patchCjsDefaultExport?: boolean
} & (
  | {
      /**
       * `oxc-transform` or `@swc/core` should be installed yourself
       * if you want to use `oxc` or `swc` transformer.
       */
      transformer?: 'oxc' | 'swc'
    }
  | {
      /**
       * `typescript` should be installed yourself.
       * @default 'typescript'
       */
      transformer: 'typescript'
      /** Only for typescript transformer */
      transformOptions?: TranspileOptions
    }
)

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U

export type OptionsResolved = Overwrite<
  Required<Options>,
  Pick<Options, 'enforce' | 'extraOutdir'>
>

export function resolveOptions(options: Options): OptionsResolved {
  const transformer = options.transformer || 'typescript'
  const transformOptions: TranspileOptions | undefined =
    transformer === 'typescript' ? (options as any).transformOptions : undefined
  const resolved = {
    include: options.include || [/\.[cm]?tsx?$/],
    exclude: options.exclude || [/node_modules/],
    enforce: 'enforce' in options ? options.enforce : 'pre',
    transformer,
    ignoreErrors: options.ignoreErrors || false,
    extraOutdir: options.extraOutdir,
    autoAddExts: options.autoAddExts || false,
    patchCjsDefaultExport: options.patchCjsDefaultExport || false,
    transformOptions,
    declarationMap:
      options.declarationMap ||
      !!transformOptions?.compilerOptions?.declarationMap,
  }

  return resolved
}
