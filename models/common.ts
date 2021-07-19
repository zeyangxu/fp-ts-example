import { taskEither, either, task } from 'fp-ts'

export type Fetch<Response> = (
  url: string,
  filter: any
) => taskEither.TaskEither<any, Response>

export type Validate<Response> = (res: Response) => either.Either<any, Response>

export type Transform<Response, Data> = (res: Response) => Data
