import * as t from 'io-ts'

interface UrlBrand {
  readonly Url: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

const urlPattern =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/

export const Url = t.brand(
  t.string, // a codec representing the type to be refined
  (n): n is t.Branded<string, UrlBrand> => urlPattern.test(n), // a custom type guard using the build-in helper `Branded`
  'Url' // the name must match the readonly field in the brand
)

export type Url = t.TypeOf<typeof Url>
