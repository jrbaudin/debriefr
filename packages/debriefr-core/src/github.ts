import { GraphQLClient } from 'graphql-request'
import * as _ from 'lodash'

const dev = process.env.NODE_ENV !== 'production'
const logPrefix = 'github ||'

export const query = (query: string, variables: object, credentials: { token: string, url: string}): Promise<any> => {
  if (query && credentials.url && credentials.token) {
    const client = new GraphQLClient(credentials.url, {
      headers: { Authorization: `bearer ${credentials.token}` },
    })
    return client.request(query, variables).then(data => {
      console.info(`${logPrefix} Query successfully sent!`)
      return data
    }).catch(err => {
      console.error(`${logPrefix} Error caught while querying Github API v4`)
      console.error(err)
      return err
    })
  }
}