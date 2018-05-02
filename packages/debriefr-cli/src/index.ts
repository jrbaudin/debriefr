#!/usr/bin/env node
import * as _ from 'lodash'
import * as program from 'commander'
import { slack, util, github } from 'debriefr-core'
import DB from './database'

const dev = process.env.NODE_ENV !== 'production'
const SLACK_ENV_FLAG = dev ? 'DEV' : 'PROD'
const LOG_PREFIX = 'cli ||'

program
  .command('user <username>')
  .option('-i --interval <interval>', 'Report interval', /^(daily|weekly|monthly|yearly)$/i, 'daily')
  .action(async (username, cmd) => {
    console.log('user ' + username + ' ' + cmd.interval)
    try {
      const getUserStats = `
      query getUserStats($login: String!) {
        user(login: $login) {
          name
          closedPrs: pullRequests(first: 100, states: CLOSED) {
            nodes {
              ...pullRequestFields
            }
          }
          openPrs: pullRequests(first: 100, states: OPEN) {
            nodes {
              ...pullRequestFields
            }
          }
          closedIssues: issues(first: 100, states: CLOSED) {
            nodes {
              ...issueFields
            }
          }
          openIssues: issues(first: 100, states: OPEN) {
            nodes {
              ...issueFields
            }
          }
        }
      }

      fragment pullRequestFields on PullRequest {
        title
        author {
          login
        }
        repository {
          name
          owner {
            login
          }
        }
        createdAt
        closed
        closedAt
      }

      fragment issueFields on Issue {
        title
        author {
          login
        }
        repository {
          name
          owner {
            login
          }
        }
        createdAt
        closed
        closedAt
      }`

    const data = await github.query(getUserStats, { login: username })
    if (data && data.user) {
      const { name, closedPrs, openPrs, closedIssues, openIssues } = data.user
      console.log('getUserStats name', name)
      console.log('getUserStats closedIssues', JSON.stringify(closedIssues, null, 2))
      console.log('getUserStats openIssues', JSON.stringify(openIssues, null, 2))
      console.log('getUserStats closedPrs', JSON.stringify(closedPrs, null, 2))
      console.log('getUserStats openPrs', JSON.stringify(openPrs, null, 2))
    }
    } catch (err) {
      console.log(err.response.errors) // GraphQL response errors
      console.log(err.response.data) // Response data if available
    }
  })

program.parse(process.argv)