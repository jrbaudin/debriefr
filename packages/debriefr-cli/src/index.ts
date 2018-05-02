#!/usr/bin/env node
import * as _ from 'lodash'
import * as program from 'commander'
import { slack, util, github } from 'debriefr-core'
import { isWithinInterval } from './validation'
import DB from './database'

const dev = process.env.NODE_ENV !== 'production'
const SLACK_ENV_FLAG = dev ? 'DEV' : 'PROD'
const LOG_PREFIX = 'cli ||'

program
  .command('user <username>')
  .option('-i --interval <interval>', 'Report interval', /^(daily|weekly|monthly|yearly)$/i, 'daily')
  .option('-o --organization <organization>', 'Filter by organization')
  .action(async (username, cmd) => {
    const interval = cmd.interval
    const organization = cmd.organization
    console.log('user', username)
    console.log('interval', interval)
    console.log('organization', organization)
    try {
      const getUserStats = `
        query getDailyUserStats($login: String!) {
          user(login: $login) {
            name
            commitComments(first: 100) {
              nodes {
                ...commitFields
              }
            }
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
        }

        fragment commitFields on CommitComment {
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
          commit {
            pushedDate
            authoredDate
            message
            messageBody
            repository {
              name
              owner {
                login
              }
            }
          }
        }`

      // const data = await github.query(getUserStats, { login: username })

      const data = {
        user: {
          openIssues: [
            {
              "title": "Support a subscription of Sale events",
              "author": {
                "login": "jrbaudin"
              },
              "repository": {
                "name": "Karma-Merchant-Web",
                "owner": {
                  "login": "karmadev"
                }
              },
              "createdAt": "2018-04-27T14:42:25Z",
              "closed": false,
              "closedAt": null
            },
            {
              "title": "Support a subscription of Item events",
              "author": {
                "login": "jrbaudin"
              },
              "repository": {
                "name": "Karma-Merchant-Web",
                "owner": {
                  "login": "karmadev2"
                }
              },
              "createdAt": "2018-04-27T14:42:46Z",
              "closed": false,
              "closedAt": null
            },
            {
              "title": "MW 2.0 version 2 - Release Checklist",
              "author": {
                "login": "jrbaudin"
              },
              "repository": {
                "name": "Karma-Merchant-Web",
                "owner": {
                  "login": "karmadev2"
                }
              },
              "createdAt": "2018-04-30T12:15:21Z",
              "closed": false,
              "closedAt": null
            },
            {
              "title": "MW 2.0 version 2 - Release Checklist (backend)",
              "author": {
                "login": "jrbaudin"
              },
              "repository": {
                "name": "Karma-Merchant-Web",
                "owner": {
                  "login": "karmadev"
                }
              },
              "createdAt": "2018-04-30T12:16:15Z",
              "closed": false,
              "closedAt": null
            }
          ]
        }
      }

      if (data && data.user) {
        // const { name, closedPrs, openPrs, closedIssues, openIssues } = data.user
        const { openIssues } = data.user
        const filteredOpenIssues = _.filter(openIssues, function(issue) {
          let isWithinOrg = true
          if (organization) {
            const owner = issue && issue.repository && issue.repository.owner ? issue.repository.owner.login : ''
            isWithinOrg = _.isEqual(owner, organization)
          }

          const validDate = isWithinInterval(issue.createdAt, interval)

          return isWithinOrg && validDate
        })

        // console.log('getUserStats name', name)
        // console.log('getUserStats closedIssues', JSON.stringify(closedIssues, null, 2))
        console.log('getUserStats openIssues', JSON.stringify(openIssues, null, 2))
        console.log('getUserStats filteredOpenIssues', JSON.stringify(filteredOpenIssues, null, 2))
        // console.log('getUserStats closedPullRequests', JSON.stringify(closedPullRequests, null, 2))
        /* console.log('getUserStats openPrs', JSON.stringify(openPrs, null, 2)) */
      }
    } catch (err) {
      if (err && err.response) {
        console.log(err.response.errors) // GraphQL response errors
        console.log(err.response.data) // Response data if available
      }
    }
  })

program.parse(process.argv)