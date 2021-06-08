import * as t from 'io-ts'
import { request } from '../lib/request'
import { Url } from '../brands'

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

const apis = {
  // hackerNews: 'https://hacker-news.firebaseio.com/v0/item/8863.json?print=pretty'
  hackerNews: 'https://hacker-news.firebaseio.com/v0/user/jl.json?print=pretty',
  // hackerNews: ''
}

export default {
  getHackerNews: request<HackerNewsRes>(HackerNewsRes, {
    url: apis.hackerNews,
    method: 'get',
  }),
}
