import * as t from 'io-ts'
import { option } from 'fp-ts'
import { pipe, Lazy } from 'fp-ts/function'
import { request } from './lib/request'
import { Url } from './brands'
import { getStorageItem, setStorageItem } from './lib/local-storage'

const HackerNewsRes = t.type({
  by: t.string,
  descendants: t.number,
  id: t.number,
  kids: t.array(t.number),
  score: t.number,
  time: t.number,
  // title: t.string,
  title: Url,
  type: t.string,
  url: Url,
})

export type HackerNewsRes = t.TypeOf<typeof HackerNewsRes>

const MockData = t.type({
  a: t.number,
  b: t.number
})

type MockData = t.TypeOf<typeof MockData>

const apis = {
  // hackerNews: 'https://hacker-news.firebaseio.com/v0/item/8863.json?print=pretty'
  hackerNews: 'https://hacker-news.firebaseio.com/v0/user/jl.json?print=pretty'
  // hackerNews: ''
}


export default {
  getHackerNews: request<HackerNewsRes>(HackerNewsRes, { url: apis.hackerNews, method: 'get' }),
  getStorageData: getStorageItem(MockData, 'test'),
  setStorageData: setStorageItem(MockData, 'test')
}
