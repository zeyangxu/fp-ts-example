import * as t from 'io-ts'
import { Fetch, Validate, Transform } from './util'
import { taskEither, either, task } from 'fp-ts'
import { error } from 'fp-ts/Console'
import { pipe } from 'fp-ts/function'

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

export const DmpReportResponseT = t.type({
  code: t.number,
  msg: t.string,
  data: t.type({
    stats: t.array(
      t.type({
        custom_audience_coverNum: t.string,
        custom_audience_cover_num_by_app_aweme: t.string,
        custom_audience_cover_num_by_app_hotsoon: t.string,
        custom_audience_cover_num_by_app_toutiao: t.string,
        custom_audience_cover_num_by_app_xigua: t.string,
        custom_audience_id: t.string,
        custom_audience_name: t.string,
        metrics: t.record(t.string, t.string),
      })
    ),
    statistics: t.record(t.string, t.string),
    pagination: t.type({
      page: t.number,
      limit: t.number,
      total_count: t.number,
      total_page: t.number,
    }),
  }),
})

export type DmpReportResponse = t.TypeOf<typeof DmpReportResponseT>

/** [mutable] update the repo with requested data */
export function getDataAndSetRepo(
  /** each param can be seen as a port */
  setRepo: (s: Stats) => void, // state / store / hooks / mock...
  fetch: Fetch<DmpReportResponse>, // axios / ajax
  filters: GlobalFilters, // can be global or local state
  fields: string[], // can be configurable or fixed
  validate: Validate<DmpReportResponse>, // io-ts / joi
  transform: Transform<DmpReportResponse, Stats> // can be different implementation
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
