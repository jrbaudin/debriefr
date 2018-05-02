import { GraphQLClient } from 'graphql-request'
import * as _ from 'lodash'

const dev = process.env.NODE_ENV !== 'production'
const logPrefix = 'github ||'

export const query = (query: string, variables: object): Promise<any> => {
  if (query && process.env.GH_API_URL && process.env.GH_API_TOKEN) {
    const client = new GraphQLClient(process.env.GH_API_URL, {
      headers: { Authorization: `bearer ${process.env.GH_API_TOKEN}` },
    })
    return client.request(query, variables).then(data => {
      console.info(`${logPrefix} Query successfully sent!`)
      return data
    }).catch(err => {
      console.error(`${logPrefix} Error caught while running postMessage()`)
      console.error(err)
      return err
    })
  }
}