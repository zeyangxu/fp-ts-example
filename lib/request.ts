import { either, taskEither } from 'fp-ts'
import { pipe } from 'fp-ts/function'
import axios, {  AxiosResponse } from 'axios'
import * as t from 'io-ts'

interface RequestConfig {
  url: string;
  params?: {
    [key: string]: string
  }
}

function _axiosGet<A> (config: RequestConfig) {
  return taskEither.tryCatch<Error, A>(
    () => axios.get(config.url, config.params),
    (reason) => new Error(String(reason))
  )
}

function _axiosPost<A> (config: RequestConfig) {
  return taskEither.tryCatch<Error, A>(
    () => axios.post(config.url, config.params),
    (reason) => new Error(String(reason))
  )
}

export const Response = (dataType: t.Mixed) => {
  return t.type({
    code: t.number,
    msg: t.string,
    extra: t.record(t.null, t.null),
    data: dataType
  })
}

export const axiosM = {
  get: _axiosGet,
  post: _axiosPost
}

export function isErrors (err: Error | t.Errors): err is t.Errors {
  if ((err as t.Errors).length) {
    return (err as t.Errors).every((e: t.ValidationError) => {
      return e.context !== undefined
    })
  }
  return false
}

/** 动态类型检查的 axios 请求函数 */
export function request<T>(
  type: t.Mixed,
  option: {
    url: string,
    method: 'post' | 'get',
    params?: { [key: string]: string },
  }) {
  const service = axiosM[option.method]<AxiosResponse>({ url: option.url, params: option.params })
  return pipe(
    service,
    taskEither.chainEitherKW(
      (res) => type.decode(res.data) as either.Either<t.Errors, T>
    )
  )()
}
