import * as io from 'fp-ts/lib/Io'
import { IO } from 'fp-ts/lib/Io'

const log = <A>(info: A): IO<A> => () => {
  console.log(info)
  return info
}

const random: IO<number> = () => Math.random()

const chainLogToIo = <A>(m:IO<A>) => io.chain((info:A) => log(info))(m)

const logRandom = chainLogToIo(random)

const randomBool: IO<boolean> = io.map((n:number) => n < 0.5)(logRandom)

chainLogToIo(randomBool)()
