import * as t from 'io-ts'
import { Fetch, Validate, Transform, validateResponse } from './util'

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
  statTimeDay: string
}

type TotalStat = Metrics

interface Pagination {
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

interface GlobalFilters extends CommonFilters {
  dmpIds: string[]
  adIds: string[]
  customAudienceType: CustomAudienceType
}

interface Stats {
  stats: ItemStat[]
  statistics: TotalStat
  pagination: Pagination
}

const DmpReportResponse = t.type({
  code: t.number,
  msg: t.string,
  data: t.type({
    stats: t.record(t.string, t.string),
    statistics: t.record(t.string, t.string),
    pagination: t.type({
      page: t.number,
      limit: t.number,
      total_count: t.number,
      total_page: t.number,
    }),
  }),
})

type DmpReportResponse = t.TypeOf<typeof DmpReportResponse>

/** [mutable] update the repo with requested data */
export function getData(
  repo: Stats,
  fetch: Fetch<DmpReportResponse, GlobalFilters>,
  filters: GlobalFilters,
  validate: Validate<DmpReportResponse>,
  transform: Transform<DmpReportResponse, Stats>
) {
  validateResponse(fetch, filters, validate, transform)().then((res) => {
    if (res) {
      repo = res
    }
  })
}
