import { option, either } from 'fp-ts'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'

interface Serializer {
  stringify: (target: any) => string
  parse: (encoded: string) => any
}

/** 类型检查后进行JSON序列化 */
export function stringify<A>(
  type: t.Mixed,
  val: A,
  serializer: Serializer = JSON
): option.Option<string> {
  return pipe(
    option.fromEither(type.decode(val)),
    option.chain((decoded) =>
      option.tryCatch(() => {
        return serializer.stringify(decoded)
      })
    )
  )
}

/** JSON反序列化之后进行类型检查 */
export function parse<A>(
  type: t.Mixed,
  val: string | null,
  serializer: Serializer = JSON
): option.Option<A> {
  return pipe(
    option.tryCatch(() => {
      if (val === null) return serializer.parse('')
      return serializer.parse(val)
    }),
    option.chain((parsed) => {
      return option.fromEither(
        type.decode(parsed) as either.Either<t.Errors, A>
      )
    })
  )
}
