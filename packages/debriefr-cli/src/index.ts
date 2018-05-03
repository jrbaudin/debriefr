#!/usr/bin/env node
import * as _ from 'lodash'
import * as moment from 'moment'
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
    /* console.log('user', username)
    console.log('interval', interval)
    console.log('organization', organization) */
    try {
      const getUserStats = `
        query getUserStats($login: String!) {
          user(login: $login) {
            name
            avatarUrl
            url
            closedIssues: issues(first: 100, states: CLOSED, orderBy: { field:CREATED_AT, direction:DESC }) {
              nodes {
                ...issueFields
              }
            }
            openIssues: issues(first: 100, states: OPEN, orderBy: { field:CREATED_AT, direction:DESC }) {
              nodes {
                ...issueFields
              }
            }
            contributions: repositoriesContributedTo(first: 100, orderBy:{field: PUSHED_AT, direction: DESC}, contributionTypes: COMMIT) {
              nodes {
                owner {
                  login
                }
                refs(last: 100, refPrefix: "refs/heads/") {
                  nodes {
                    target {
                      ... on Commit {
                        history(first: 15) {
                          edges {
                            node {
                              pushedDate
                              author {
                                user {
                                  login
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        fragment issueFields on Issue {
          title
          author {
            login
          }
          repository {
            owner {
              login
            }
          }
          createdAt
          closedAt
          authorAssociation
        }`

      const data = await github.query(getUserStats, { login: username })

      if (data && data.user) {
        const { name, avatarUrl, url, closedIssues, openIssues, contributions } = data.user

        const filteredOpenIssues = _.filter(openIssues.nodes, function(issue) {
          let isWithinOrg = true
          if (organization) {
            const owner = issue && issue.repository && issue.repository.owner ? issue.repository.owner.login : ''
            isWithinOrg = _.isEqual(owner, organization)
          }
          const validDate = isWithinInterval(issue.createdAt, interval)

          return isWithinOrg && validDate
        })

        const filteredClosedIssues = _.filter(closedIssues.nodes, function(issue) {
          // console.log('closed issue', issue)
          let isWithinOrg = true
          if (organization) {
            const owner = issue && issue.repository && issue.repository.owner ? issue.repository.owner.login : ''
            isWithinOrg = _.isEqual(owner, organization)
          }
          const validDate = isWithinInterval(issue.closedAt, interval)

          return isWithinOrg && validDate
        })

        const commits = []
        _.forEach(contributions.nodes, repo => {
          const repoOwner = repo && repo.owner ? repo.owner.login : ''
          const refs = repo && repo.refs ? repo.refs.nodes : []
          _.forEach(refs, ref => {
            const history = ref && ref.target && ref.target.history ? ref.target.history.edges : []
            _.forEach(history, edge => {
              const node = edge ? edge.node : {}
              const loginUsername = node && node.author && node.author.user ? node.author.user.login : ''

              let isWithinOrg = true
              if (organization) {
                isWithinOrg = _.isEqual(repoOwner, organization)
              }

              const validDate = isWithinInterval(node.pushedDate, interval)

              if (_.isEqual(loginUsername, username) && isWithinOrg && validDate) {
                commits.push(node)
              }
            })
          })
        })
        /* console.log('getUserStats commits size', _.size(commits))
        console.log('getUserStats filteredOpenIssues size', _.size(filteredOpenIssues))
        console.log('getUserStats filteredClosedIssues size', _.size(filteredClosedIssues)) */

        slack.send({
          token: process.env.SLACK_BOT_TOKEN,
          as_user: true,
          channel: process.env.SLACK_CHANNEL,
          attachments: [
            {
                "fallback": `Here's my ${interval} summary for the ${organization} GitHub org. ${_.size(filteredClosedIssues)} closed issues, ${_.size(filteredOpenIssues)} opened issues and ${_.size(commits)} commits.`,
                "color": "#F46085",
                "pretext": `Here's my ${interval} summary for the ${organization} GitHub org`,
                "author_name": name,
                "author_link": url,
                "author_icon": avatarUrl,
                "title": `github.com/${organization}`,
                "title_link": `https://github.com/${organization}`,
                "fields": [
                    {
                        "title": "Closed issues",
                        "value": _.size(filteredClosedIssues),
                        "short": true
                    },
                    {
                        "title": "Opened issues",
                        "value": _.size(filteredOpenIssues),
                        "short": true
                    },
                    {
                        "title": "Commits",
                        "value": _.size(commits),
                        "short": true
                    }
                ],
                "footer": "🤖 Debriefr",
                "ts": moment().unix()
            }
          ]
        })
      }
    } catch (err) {
      if (err && err.response) {
        console.log(err.response.errors) // GraphQL response errors
        console.log(err.response.data) // Response data if available
      }
    }
  })

program.parse(process.argv)