import * as t from 'io-ts'
import { Validate, Transform } from './common'
import { taskEither, either, task } from 'fp-ts'
import { error } from 'fp-ts/Console'
import { pipe } from 'fp-ts/function'

// -----------------------------------------------------------------------------
// Type Definition
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

export type Fetch<Response> = (
  filters: GlobalFilters,
  fields: string[]
) => taskEither.TaskEither<any, Response>

interface TableState {
  data: ItemStatAttributes & Metrics
}

// -----------------------------------------------------------------------------
// Business Logic
// -----------------------------------------------------------------------------

export const getData =
  <T>(fetch: Fetch<T>) =>
  (validate: Validate<T>) =>
  (transform: Transform<T, Stats>) =>
  (filters: GlobalFilters) =>
  (fields: string[]) => {
    return pipe(
      fetch(filters, fields),
      taskEither.chainEitherKW(validate),
      taskEither.map(transform),
      taskEither.foldW(
        // error is handled here
        (e) => task.fromIO(error('Validation Error')),
        (res) => task.of(res)
      )
    )
  }
