import * as t from 'io-ts'
import { Fetch, Validate, Transform } from './common'
import { taskEither, either, task } from 'fp-ts'
import { error } from 'fp-ts/Console'
import { pipe } from 'fp-ts/function'

// -----------------------------------------------------------------------------
// Type Definition
// -----------------------------------------------------------------------------

type Metrics = Record<string, string>

interface ItemStat {
  customAudienceCoverNum: string
  customAudienceCoverNumByAppAweme: string
  customAudienceCoverNumByAppHotsoon: string
  customAudienceCoverNumByAppToutiao: string
  customAudienceCoverNumByAppXigua: string
  customAudienceId: string
  customAudienceName: string
  metrics: Metrics
  statTimeDay?: string
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

/** 选中的指标 */
type SelectedFields = string[]

// -----------------------------------------------------------------------------
// Business Logic
// -----------------------------------------------------------------------------

/** [mutable] update the repo with requested data */
export function getDataAndSetRepo<T>(
  /** each param can be seen as a port */
  setRepo: (s: Stats) => void, // state / store / hooks / mock...
  fetch: Fetch<T>, // axios / ajax
  filters: GlobalFilters, // can be global or local state
  fields: string[], // can be configurable or fixed
  validate: Validate<T>, // io-ts / joi
  transform: Transform<T, Stats> // can be different implementation
) {
  pipe(
    fetch('api', { ...filters, fields }),
    taskEither.chainEitherKW(validate),
    taskEither.map(transform),
    taskEither.foldW(
      // error is handled here
      (e) => task.fromIO(error('Validation Error')),
      (res) => task.of(res)
    )
  )().then((res) => {
    // destruct the result after validation
    if (res) {
      setRepo(res)
    }
  })
}
