import * as t from 'io-ts'
import {
  io,
  random,
  semigroup,
  ord,
  number,
  task,
  date,
  monad,
  hkt,
  option,
  either,
  nonEmptyArray,
  apply,
  state,
} from 'fp-ts'
import { log } from 'fp-ts/Console'
import { pipe, identity, flow } from 'fp-ts/function'
import { concatAll, Monoid } from 'fp-ts/Monoid'
import { replicate } from 'fp-ts/ReadonlyArray'

import { isErrors } from './lib/request'
import storage from './services/storage'
import apis from './services/apis'
import { listen } from 'fp-ts/lib/Traced'

// ---------------------------------------------------
// Combinators
// ---------------------------------------------------

export function getMonoid<A>(M: Monoid<A>): Monoid<io.IO<A>> {
  return {
    concat: (x, y) => () => M.concat(x(), y()),
    empty: () => M.empty,
  }
}

/** a primitive `Monoid` instance for `void` */
export const monoidVoid: Monoid<void> = {
  concat: () => undefined,
  empty: undefined,
}

export function replicateIO(n: number, mv: io.IO<void>): io.IO<void> {
  return concatAll(getMonoid(monoidVoid))(replicate(n, mv))
}

function fib(n: number): number {
  return n <= 1 ? 1 : fib(n - 1) + fib(n - 2)
}

export const randomInt = (low: number, high: number): io.IO<number> => {
  return () => Math.floor((high - low + 1) * Math.random() + low)
}

/** calculates a random fibonacci and prints the result to the console */
const printFib: io.IO<void> = pipe(
  randomInt(30, 35),
  io.chain((n) => log(fib(n)))
)

export function time<A>(ma: io.IO<A>): io.IO<A> {
  return io.Monad.chain(date.now, (start) =>
    io.Monad.chain(ma, (a) =>
      io.Monad.chain(date.now, (end) =>
        io.Monad.map(log(`Elapsed: ${end - start}`), () => a)
      )
    )
  )
}

export function timeX<A>(ma: io.IO<A>): io.IO<[A, number]> {
  return io.Monad.chain(date.now, (start) =>
    io.Monad.chain(ma, (a) => io.Monad.map(date.now, (end) => [a, end - start]))
  )
}

// time(replicateIO(3, printFib))()
// time(replicateIO(3, time(printFib)))()

export function ignoreSnd<A>(ma: io.IO<[A, unknown]>): io.IO<A> {
  return io.Monad.map(ma, ([a]) => a)
}

export function fastest<A>(head: io.IO<A>, tail: Array<io.IO<A>>): io.IO<A> {
  // ord.Ord<number> -> ord.Ord<[A, number]> -> semigroup.Semigroup<[A, number]> -> semigroup.Semigroup<io.IO<[A, number]>>
  const ordTuple = ord.contramap(([, elapsed]: [A, number]) => elapsed)(
    number.Ord
  )
  const semigroupTuple = semigroup.min(ordTuple)
  const semigroupIO = io.getSemigroup(semigroupTuple)
  const fastest = semigroup.concatAll(semigroupIO)(timeX(head))(tail.map(timeX))
  return ignoreSnd(fastest)
}

// ---------------------------------------------------
// Tagless Final
// ---------------------------------------------------

export function time2<A>(ma: task.Task<A>): task.Task<[A, number]> {
  const now = task.fromIO(date.now)
  return task.Monad.chain(now, (start) =>
    task.Monad.chain(ma, (a) => task.Monad.map(now, (end) => [a, end - start]))
  )
}

export interface MonadIO<M extends hkt.URIS> extends monad.Monad1<M> {
  readonly fromIO: <A>(fa: io.IO<A>) => hkt.Kind<M, A>
}

export function time3<M extends hkt.URIS>(
  M: MonadIO<M>
): <A>(ma: hkt.Kind<M, A>) => hkt.Kind<M, [A, number]> {
  const now = M.fromIO(date.now) // lifting
  return (ma) =>
    M.chain(now, (start) =>
      M.chain(ma, (a) => M.map(now, (end) => [a, end - start]))
    )
}

/** program */

export const monadIOIO: MonadIO<io.URI> = {
  ...io.Monad,
  fromIO: identity,
}

// 可替换 monadIOIO
export const monadIOTask: MonadIO<task.URI> = {
  ...task.Monad,
  fromIO: task.fromIO,
}

export function withLogging<A>(ma: io.IO<A>): io.IO<A> {
  return io.Monad.chain(time3(monadIOIO)(ma), ([a, millis]) =>
    io.Monad.map(log(`Result: ${a}, Elapsed: ${millis}`), () => a)
  )
}

const program = withLogging(io.Monad.map(random.randomInt(30, 35), fib))

io.Monad.chain(fastest(program, [program, program]), (a) =>
  log(`Fastest result is: ${a}`)
)()

// -----------------------------------------------------
// smart constructor
// -----------------------------------------------------
export interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol // ensures uniqueness across modules / packages
}

export type NonEmptyString = string & NonEmptyStringBrand

// runtime check implemented as a custom type guard
function isNonEmptyString(s: string): s is NonEmptyString {
  return s.length > 0
}

// export function makeNonEmptyString(s: string): option.Option<NonEmptyString> {
//   return isNonEmptyString(s) ? option.some(s) : option.none
// }

// is equivalent to ...

const makeNonEmptyString = option.fromPredicate(isNonEmptyString)

export interface IntBrand {
  readonly Int: unique symbol
}

export type Int = number & IntBrand

function isInt(n: number): n is Int {
  return Number.isInteger(n) && n >= 0
}

export function makeInt(n: number): option.Option<Int> {
  return isInt(n) ? option.some(n) : option.none
}

interface Person {
  name: NonEmptyString
  age: Int
}

function person(name: NonEmptyString, age: Int): Person {
  return { name, age }
}

// person('', -1.2) // static error

const goodName = makeNonEmptyString('Giulio')
const badName = makeNonEmptyString('')
const goodAge = makeInt(45)
const badAge = makeInt(-1.2)

function logPerson(ma: option.Option<Person>): io.IO<void> {
  return option.fold<Person, io.IO<void>>(
    () => log('invalid name'),
    (person) => log(person.name)
  )(ma)
}

const person1 = option.Monad.chain(goodName, (name) =>
  option.Functor.map(goodAge, (age) => person(name, age))
)

const person2 = option.Monad.chain(badName, (name) =>
  option.Functor.map(goodAge, (age) => person(name, age))
) // none

const person3 = option.Monad.chain(goodName, (name) =>
  option.Functor.map(badAge, (age) => person(name, age))
) // none

const persons = [person1, person2, person3].map(logPerson)

concatAll(getMonoid(monoidVoid))(persons)()

// logPerson(person1)()
// logPerson(person2)()
// logPerson(person3)()

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

const minLength = (s: string): either.Either<string, string> =>
  s.length >= 6 ? either.right(s) : either.left('at least 6 characters')

const oneCapital = (s: string): either.Either<string, string> =>
  /[A-Z]/g.test(s)
    ? either.right(s)
    : either.left('at least one capital letter')

const oneNumber = (s: string): either.Either<string, string> =>
  /[0-9]/g.test(s) ? either.right(s) : either.left('at least one number')

function lift<E, A>(
  check: (a: A) => either.Either<E, A>
): (a: A) => either.Either<nonEmptyArray.NonEmptyArray<E>, A> {
  return (a) =>
    pipe(
      check(a),
      either.mapLeft((a) => [a])
    )
}

const minLengthV = lift(minLength)
const oneCapitalV = lift(oneCapital)
const oneNumberV = lift(oneNumber)

const validation = either.getApplicativeValidation(
  nonEmptyArray.getSemigroup<string>()
)

function validatePassword(
  s: string
): either.Either<nonEmptyArray.NonEmptyArray<string>, string> {
  return pipe(
    apply.sequenceT(validation)(minLengthV(s), oneCapitalV(s), oneNumberV(s)),
    either.map(() => s)
  )
}

either.match<nonEmptyArray.NonEmptyArray<string>, string, io.IO<void>>(
  (s) => log(s),
  () => log('validation pass')
)(validatePassword('abababA'))()

// -----------------------------------------------------------------------------
// localStorage setItem IO monad
// -----------------------------------------------------------------------------

// storage.setStorageData(
//   { a: 11, b: 22 },
//   () => {},
//   (text) => {
//     console.log('STORAGE-SET')
//   }
// )

// storage.getStorageData(
//   () => {},
//   (text) => {
//     console.log('STORAGE', text)
//   }
// )

// -----------------------------------------------------------------------------
// axios IO monad
// -----------------------------------------------------------------------------

export const fetchHackerNews = apis.getHackerNews

const vm = {
  hackerNewsRes: {},
}

// fetchHackerNews(
//   {},
//   (err) => {
//     if (isErrors(err)) {
//       // 后端不符合约定的返回
//       console.log(err.map((e) => [e.value, e.context.map((ctx) => ctx.key)[1]]))
//     } else {
//       // 请求错误
//       console.log(err)
//     }
//   },
//   (data) => {
//     // 经过类型检查后的合格数据
//     vm.hackerNewsRes = data
//     console.log(vm)
//   }
// )

interface ListState {
  isLoading: boolean
  list: string[]
  selected: string
}

// const getter = (field: keyof ListState) =>
//   state.gets<ListState, string>((s) => s[field])

const init = {
  isLoading: true,
  list: ['apple', 'banana', 'grape'],
  selected: 'apple',
}

const changeLoading = state.modify<ListState>((list) => {
  return {
    ...list,
    isLoading: false,
  }
})

const getSelected = state.gets<ListState, string>((s) => s.selected)

const setSelected = (val: string) =>
  state.modify<ListState>((list) => ({
    ...list,
    selected: val,
  }))

const getLoading = state.gets<ListState, boolean>((s) => s.isLoading)

const s = state.get<ListState>()

const mutation = pipe(
  state.get<ListState>(),
  state.chain(() => state.modify((list) => ({ ...list, isLoading: true }))),
  state.chain(() => getLoading),
  state.chain((isLoading) =>
    isLoading ? setSelected('wow') : state.gets<ListState, void>(() => {})
  ),
  state.chain(() => state.gets((s) => s.selected))
)

// const res = state.execute(init)(mutation)
const res = state.execute(init)(setSelected('haha'))

console.log(res)
