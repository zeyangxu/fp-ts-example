import { io, random, semigroup, ord, number, task, date, monad, hkt, option, readonlyArray, either, nonEmptyArray, apply, array, show, string, ioEither, json, taskEither } from 'fp-ts'
import { log } from 'fp-ts/Console'
import { pipe, identity, flow } from 'fp-ts/function'
import { concatAll, Monoid } from 'fp-ts/Monoid'
import { replicate } from 'fp-ts/ReadonlyArray'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/PathReporter'
import { request, isErrors } from './lib/request'
import format from 'pretty-format'

// ---------------------------------------------------
// Combinators
// ---------------------------------------------------

export function getMonoid<A>(M: Monoid<A>): Monoid<io.IO<A>> {
  return {
    concat: (x, y) => () => M.concat(x(), y()),
    empty: () => M.empty
  }
}

/** a primitive `Monoid` instance for `void` */
export const monoidVoid: Monoid<void> = {
  concat: () => undefined,
  empty: undefined
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
  return io.Monad.chain(date.now, start => io.Monad.chain(ma, a => io.Monad.map(date.now, end => [a, end - start])))
}

// time(replicateIO(3, printFib))()
// time(replicateIO(3, time(printFib)))()

export function ignoreSnd<A>(ma: io.IO<[A, unknown]>): io.IO<A> {
  return io.Monad.map(ma, ([a]) => a)
}

export function fastest<A>(head: io.IO<A>, tail: Array<io.IO<A>>): io.IO<A> {
  // ord.Ord<number> -> ord.Ord<[A, number]> -> semigroup.Semigroup<[A, number]> -> semigroup.Semigroup<io.IO<[A, number]>>
  const ordTuple = ord.contramap(([, elapsed]: [A, number]) => elapsed)(number.Ord)
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
  return task.Monad.chain(now, start => task.Monad.chain(ma, a => task.Monad.map(now, end => [a, end - start])))
}

export interface MonadIO<M extends hkt.URIS> extends monad.Monad1<M> {
  readonly fromIO: <A>(fa: io.IO<A>) => hkt.Kind<M, A>
}

export function time3<M extends hkt.URIS>(
  M: MonadIO<M>
): <A>(ma: hkt.Kind<M, A>) => hkt.Kind<M, [A, number]> {
  const now = M.fromIO(date.now) // lifting
  return ma => M.chain(now, start => M.chain(ma, a => M.map(now, end => [a, end - start])))
}

/** program */

export const monadIOIO: MonadIO<io.URI> = {
  ...io.Monad,
  fromIO: identity
}

// 可替换 monadIOIO
export const monadIOTask: MonadIO<task.URI> = {
  ...task.Monad,
  fromIO: task.fromIO
}

export function withLogging<A>(ma: io.IO<A>): io.IO<A> {
  return io.Monad.chain(time3(monadIOIO)(ma), ([a, millis]) =>
    io.Monad.map(log(`Result: ${a}, Elapsed: ${millis}`), () => a)
  )
}

const program = withLogging(io.Monad.map(random.randomInt(30, 35), fib))

io.Monad.chain(fastest(program, [program, program]), a => log(`Fastest result is: ${a}`))()

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

const person1 = option.Monad.chain(goodName, name => option.Functor.map(goodAge, age => person(name, age)))

const person2 = option.Monad.chain(badName, name => option.Functor.map(goodAge, age => person(name, age))) // none

const person3 = option.Monad.chain(goodName, name => option.Functor.map(badAge, age => person(name, age))) // none

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
  /[A-Z]/g.test(s) ? either.right(s) : either.left('at least one capital letter')

const oneNumber = (s: string): either.Either<string, string> =>
  /[0-9]/g.test(s) ? either.right(s) : either.left('at least one number')

function lift<E, A>(check: (a: A) => either.Either<E, A>): (a: A) => either.Either<nonEmptyArray.NonEmptyArray<E>, A> {
  return a =>
    pipe(
      check(a),
      either.mapLeft(a => [a])
    )
}

const minLengthV = lift(minLength)
const oneCapitalV = lift(oneCapital)
const oneNumberV = lift(oneNumber)

const validation = either.getApplicativeValidation(nonEmptyArray.getSemigroup<string>())

function validatePassword(s: string): either.Either<nonEmptyArray.NonEmptyArray<string>, string> {
  return pipe(
    apply.sequenceT(validation)(
      minLengthV(s),
      oneCapitalV(s),
      oneNumberV(s)
    ),
    either.map(() => s)
  )
}

either.fold((s) => log(s), () => log('validation pass'))(validatePassword('abababA1'))()

// -----------------------------------------------------------------------------
// localStorage setItem IO monad
// -----------------------------------------------------------------------------
interface StorageItem<A> {
  key: string;
  value: A;
}

const setItem = (key: string, value: string): io.IO<void> => () => localStorage.setItem(key, value)

function setStorageItem(storageItem: StorageItem<any>):io.IO<void> {
  const valueEither = ioEither.fromEither(json.stringify(storageItem.value))
  return ioEither.fold<unknown, string, void>(
    () => () => {},
    (val) => setItem(storageItem.key, val)
  )(valueEither)
}

// -----------------------------------------------------------------------------
// axios IO monad
// -----------------------------------------------------------------------------
interface UrlBrand {
  readonly Url: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/

const Url = t.brand(
  t.string, // a codec representing the type to be refined
  (n): n is t.Branded<string, UrlBrand> => urlPattern.test(n), // a custom type guard using the build-in helper `Branded`
  'Url' // the name must match the readonly field in the brand
)

type Url = t.TypeOf<typeof Url>

const HackerNewsRes = t.type({
  by: t.string,
  descendants: t.number,
  id: t.number,
  kids: t.array(t.number),
  score: t.number,
  time: t.number,
  title: t.string,
  type: t.string,
  url: Url,
})

type HackerNewsRes = t.TypeOf<typeof HackerNewsRes>

const url = 'https://hacker-news.firebaseio.com/v0/item/8863.json?print=pretty'

const url2 = 'https://hacker-news.firebaseio.com/v0/user/jl.json?print=pretty'

const url3 = ''

export const fetchHackerNews = request<HackerNewsRes>(HackerNewsRes, { url: url2, method: 'get' })

const vm = {
  hackerNewsRes: {}
}

fetchHackerNews.then(
  (resEither) => {
    pipe(
      resEither,
      either.fold(
        (err) => {
          if(isErrors(err)) {
            console.log(PathReporter.report(resEither as t.Validation<any>))
          } else {
            console.log(err)
          }
        },
        (data) => {
          vm.hackerNewsRes = data 
        }
      )
    )
    console.log(vm)
  }
)
