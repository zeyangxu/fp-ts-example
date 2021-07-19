import { taskEither, either, task } from 'fp-ts'
import { error } from 'fp-ts/Console'
import { pipe } from 'fp-ts/function'

export type Fetch<Response, Filter> = (
  filter: Filter
) => taskEither.TaskEither<string, Response>

export type Validate<Response> = (
  res: Response
) => either.Either<string, Response>

export type Transform<Response, Data> = (res: Response) => Data

export interface Repository<T> {
  storage: T
}

export function validateResponse<T, F, S>(
  fetch: Fetch<T, F>,
  filters: F,
  validate: Validate<T>,
  transform: Transform<T, S>
) {
  return pipe(
    fetch(filters),
    taskEither.chainEitherKW(validate),
    taskEither.map(transform),
    taskEither.foldW(
      (e) => task.fromIO(error(e)),
      (res) => task.of(res)
    )
  )
}
