import { GraphQLClient } from 'graphql-request'
import * as _ from 'lodash'

const dev = process.env.NODE_ENV !== 'production'
const logPrefix = 'github ||'

/**
 * const client = new GraphQLClient(process.env.GQL_URL, {
      headers: { Authorization: `bearer ${wipAuthToken}` },
    })

    const variables = {
      input: {
        body: todoBody,
      },
    }

    return client.request(mutation, variables)
 */
