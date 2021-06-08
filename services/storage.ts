import * as t from 'io-ts'
import { Url } from '../brands'
import { getStorageItem, setStorageItem } from '../lib/local-storage'

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

const MockStorageData = t.type({
  a: t.number,
  b: t.number,
})

type MockStorageData = t.TypeOf<typeof MockStorageData>

export default {
  getStorageData: getStorageItem(MockStorageData, 'test'),
  setStorageData: setStorageItem(MockStorageData, 'test'),
}
