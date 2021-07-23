import * as t from 'io-ts'
import { Validate, Transform } from './common'
import { taskEither, either, task } from 'fp-ts'
import { error } from 'fp-ts/Console'
import { pipe } from 'fp-ts/function'

// -----------------------------------------------------------------------------
// Entities
// -----------------------------------------------------------------------------

type Metrics = Record<string, string>

interface ItemStatAttributes {
  customAudienceCoverNum: string
  customAudienceCoverNumByAppAweme: string
  customAudienceCoverNumByAppHotsoon: string
  customAudienceCoverNumByAppToutiao: string
  customAudienceCoverNumByAppXigua: string
  customAudienceId: string
  customAudienceName: string
  statTimeDay?: string
}

interface ItemStat extends ItemStatAttributes {
  metrics: Metrics
}

export type TotalStat = Metrics

export interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPage: number
}

enum CustomAudienceType {
  EXCLUDE = -1,
  TARGET = 1,
}

interface FilterRange {
  st: number
  et: number
  isInt: boolean
}

interface DateRange {
  st: string
  et: string
  isCompare: boolean
}

interface CommonFilters {
  dateRange: DateRange
  cost?: FilterRange
  convertCnt?: FilterRange
  deliveryType?: string
}

export interface GlobalFilters extends CommonFilters {
  dmpIds: string[]
  adIds: string[]
  customAudienceType: CustomAudienceType
}

export interface Stats {
  stats: ItemStat[]
  statistics: TotalStat
  pagination: Pagination
}

export type Fetch<Response> = (params: {
  filters?: GlobalFilters
  fields?: string[]
  sortStat?: keyof Metrics
}) => taskEither.TaskEither<any, Response>

interface TableState {
  data: ItemStatAttributes & Metrics
}

// -----------------------------------------------------------------------------
// Use Cases
// -----------------------------------------------------------------------------

/**
 * 获取报表数据
 * @param fetch 报表数据获取的实现
 * @param validate 运行时类型检查
 * @param transform 将api返回数据转化成 model类型
 * @param params
 */
export const getData =
  <T>(fetch: Fetch<T>) =>
  (validate: Validate<T>) =>
  (transform: Transform<T, Stats>) =>
  (params: {
    filters?: GlobalFilters
    fields?: string[]
    sortStat?: keyof Metrics
  }) => {
    return pipe(
      fetch(params),
      taskEither.chainEitherKW(validate),
      taskEither.map(transform),
      taskEither.foldW(
        // error is handled here
        (e) => task.fromIO(error('Validation Error')),
        (res) => task.of(res)
      )
    )()
  }
