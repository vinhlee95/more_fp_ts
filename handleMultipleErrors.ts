import * as F from 'fp-ts/function'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as t from 'io-ts'

type LogicError = {errorCode: string}

const userT = t.type({
  id: t.string,
  name: t.string,
  // Enable following field for errorCode: 'decoding_db_output_error'
  // unexpected: t.string
})

const userRankT = t.type({
  name: t.string,
  rank: t.number,
  // Enable following field for errorCode: 'decoding_user_rank_api_response_error'
  // unexpected: t.string
})

const userDb = {
  fetchById: (id: string) => {
    // Change the value to something else for errorCode: 'db_error'
    const onlyAvailableId = '1'

    if(id === onlyAvailableId) return {id: onlyAvailableId, name: 'Foo'}
    throw new Error('not found')
  }
}

/**
 * Use case: execute a flow in multiple step.
 * Each step could throw an error.
 * Need to have a way to catch & differentiate each error at the end
 * 
 * - Get user data from DB
 * - Parse the data
 * - Make API call to a 3rd party service
 * - Parse response
 */
const fetchUserFromDb = (id: string): E.Either<LogicError, unknown> => {
  return E.tryCatch(
    () => userDb.fetchById(id),
    (_) => ({errorCode: 'db_error'})
  )
}

const parseDbUserOutput = (val: unknown): E.Either<LogicError, t.TypeOf<typeof userT>> => {
  return F.pipe(
    userT.decode(val),
    E.mapLeft((_: t.Errors) => ({errorCode: 'decoding_db_output_error'}))
  )
}

const fetchRankByUsername = (name: string): Promise<unknown> => {
  if(name.toLowerCase() === 'foo') return Promise.resolve({name, rank: Math.floor(Math.random() * 100)})
  throw new Error('failed to fetch rank by user name')
}

const parseUserRankFromApiResponse = (val: unknown): E.Either<LogicError, t.TypeOf<typeof userRankT>> => {
  return F.pipe(
    userRankT.decode(val),
    E.mapLeft((_: t.Errors) => ({errorCode: 'decoding_user_rank_api_response_error'}))
  )
}

const executeWholeFlow = (userId: string): TE.TaskEither<LogicError, t.TypeOf<typeof userRankT>> => {
  return F.pipe(
    fetchUserFromDb(userId),
    E.chain((maybeUser) => parseDbUserOutput(maybeUser)),
    E.fold(
      (error) => TE.left(error),
      (parsedUserDbOutput) => TE.right(parsedUserDbOutput)
    ),
    TE.chain((parsedUserDbOutput) => {
      return F.pipe(
        TE.tryCatch(
          () => fetchRankByUsername(parsedUserDbOutput.name),
          (_) => ({errorCode: 'fetch_rank_error'})
        ),
        TE.chain(userRankApiResponse => F.pipe(
          parseUserRankFromApiResponse(userRankApiResponse),
          E.fold(
            (decodingApiError) => TE.left(decodingApiError),
            (parsedUserRank) => TE.right(parsedUserRank)
          )
        ))
      )
    })
  )
}

(async () => {
  const result = await executeWholeFlow('1')()
  if(E.isRight(result)) {
    console.log('User rank', result.right)
  } else {
    console.error('Error', result.left)
  }
})()