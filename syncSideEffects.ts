import { IO } from 'fp-ts/IO'
import * as O from 'fp-ts/Option'
import * as F from 'fp-ts/function'
import * as E from 'fp-ts/Either'
import * as t from 'io-ts'

const getItem = (key: string): IO<O.Option<string>> => {
  // return () => O.fromNullable(localStorage.getItem(key))
  
  // Error: not_found_error
  // return () => O.none

  // Error: parsing_error
  // return () => O.some(`foo:bar`)

  // Error: 'decoding_error'
  return () => O.fromNullable(JSON.stringify({bar: "foo"}))
}

const stateT = t.type({
  name: t.string
})

type PersistedState = t.TypeOf<typeof stateT>
type ParseError = {errorCode: string}

/**
 * Use case: get persisted state from localStorage
 * Parse the state to JSON
 */
const parsePersistedName = (): E.Either<ParseError, PersistedState> => {

  const parseToJson = (rawState: string): E.Either<ParseError, unknown> => {
    return E.tryCatch(
      () => JSON.parse(rawState),
      (err) => ({errorCode: "parsing_error"})
    )
  }

  return F.pipe(
    getItem("savedName")(),
    O.fold(
      () => E.left({errorCode: 'not_found_error'}),
      (rawState) => parseToJson(rawState)
    ),
    E.chain((stateInJson) => {
      return F.pipe(
        stateT.decode(stateInJson),
        E.mapLeft((errors: t.Errors) => ({errorCode: 'decoding_error'}))
      )
    })
  )
}

const name = parsePersistedName()
if(E.isLeft(name)) {
  console.log("Error", name.left)
} else {
  console.log("Name is: ", name.right)
}