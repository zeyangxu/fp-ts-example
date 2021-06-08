import { option } from 'fp-ts'
import * as t from 'io-ts'
import { stringify, parse } from './json'
import { pipe, Lazy } from 'fp-ts/function'

interface MockLocalStorage {
  db: { [key: string]: string }
  setItem: (key: string, val: string) => void
  getItem: (key: string) => string
}

let mockLocalStorage: MockLocalStorage = {
  db: {
    test: JSON.stringify({ a: 1, b: 2 }),
  },
  setItem: function (key, val) {
    this.db[key] = val
  },
  getItem: function (key) {
    return this.db[key]
  },
}

let localStorage = mockLocalStorage

export function getStorageItem<T>(
  type: t.Mixed,
  key: string,
  storage = localStorage
) {
  return function (onNone: Lazy<void>, onSome: (data: T) => void) {
    option.fold(onNone, onSome)(parse<T>(type, storage.getItem(key)))
  }
}

export function setStorageItem<T>(
  type: t.Mixed,
  key: string,
  storage = localStorage
) {
  return function (val: any, onNone: Lazy<void>, onSome: (res: any) => void) {
    pipe(
      stringify<T>(type, val),
      option.chain((text) =>
        option.tryCatch(() => {
          storage.setItem(key, text)
        })
      ),
      option.fold(onNone, onSome)
    )
  }
}
