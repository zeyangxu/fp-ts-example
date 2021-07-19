import {
  getDataAndSetRepo,
  DmpReportResponse,
  Stats,
  TotalStat,
  Pagination,
  GlobalFilters,
  DmpReportResponseT,
} from '../models/report'
import axios from 'axios'
import * as t from 'io-ts'
import { either, taskEither } from 'fp-ts'
import { pipe } from 'fp-ts/function'
import { useState } from 'react'

function fetch(url: string, filters: GlobalFilters) {
  return taskEither.tryCatch<Error, DmpReportResponse>(
    () =>
      axios.get(url, {
        method: 'post',
        params: filters,
      }),
    (reason) => new Error(String(reason))
  )
}

function validate(res: DmpReportResponse) {
  return DmpReportResponseT.decode(res) as either.Either<
    Error | t.Errors,
    DmpReportResponse
  >
}

function transform(a: DmpReportResponse) {
  return {} as Stats
}

export function getDataAndSetState() {
  const [repo, setRepo] = useState({} as Stats)
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
  getDataAndSetRepo(setRepo, fetch, filters, [], validate, transform)
}
