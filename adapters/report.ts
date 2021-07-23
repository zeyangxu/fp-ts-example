import * as ReportModel from '../models/report'
import axios from 'axios'
import * as t from 'io-ts'
import { either, taskEither } from 'fp-ts'
import { pipe } from 'fp-ts/function'
import { useState } from 'react'

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

export const DmpReportResponseT = t.type({
  code: t.number,
  msg: t.string,
  extra: t.union([t.UnknownRecord, t.undefined]),
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

function fetch(params: {
  filters?: ReportModel.GlobalFilters
  fields?: string[]
  sortStat?: string
}) {
  const { filters = {}, fields = [], sortStat = 'stat_cost' } = params
  return taskEither.tryCatch<Error, DmpReportResponse>(
    () =>
      axios.get('url', {
        method: 'post',
        params: { ...filters, fields, sort_stat: sortStat },
      }),
    (reason) => new Error(String(reason))
  )
}

function validate(res: DmpReportResponse) {
  return DmpReportResponseT.decode(res)
}

function transform(a: DmpReportResponse) {
  return {} as ReportModel.Stats
}

// -----------------------------------------------------------------------------
// Storage
// -----------------------------------------------------------------------------

const [repo, setRepo] = useState({} as ReportModel.Stats)

const [filters, setFilters] = useState({
  dmpIds: [],
  adIds: [],
  customAudienceType: 1,
  dateRange: {
    st: '2021-10-10',
    et: '2021-10-12',
    isCompare: false,
  },
})

ReportModel.getData(fetch)(validate)(transform)({
  filters,
  fields: [],
  sortStat: 'stat_cost',
}).then((res) => {
  if (res) {
    setRepo(res)
  }
})
