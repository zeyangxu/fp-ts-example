import { taskEither, either, task } from 'fp-ts'

export type Validate<Response> = (res: Response) => either.Either<any, Response>

export type Transform<Response, Data> = (res: Response) => Data
