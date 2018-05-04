#!/usr/bin/env node
import * as rc from 'rc'
import * as _ from 'lodash'
import * as moment from 'moment'
import * as program from 'commander'
import { slack, util, github } from 'debriefr-core'
import { isWithinInterval } from './validation'
import DB from './database'

const conf = rc('debriefr', {
  github: {
    url: "https://api.github.com/graphql"
  }
})

const LOG_PREFIX = 'cli ||'

const SLACK_TOKEN = conf && conf.slack && conf.slack.token ? conf.slack.token : null
const SLACK_CHANNEL = conf && conf.slack && conf.slack.channel ? conf.slack.channel : null
const GITHUB_API_URL = conf && conf.github && conf.github.url ? conf.github.url : null
const GITHUB_API_TOKEN = conf && conf.github && conf.github.token ? conf.github.token : null

if (!SLACK_TOKEN || !SLACK_CHANNEL || !GITHUB_API_TOKEN || !GITHUB_API_URL) {
  console.error(`${LOG_PREFIX} Missing mandatory information.`)
  process.exit(1)
}

program
  .command('user <username>')
  .option('-i --interval <interval>', 'Report interval', /^(daily|weekly|monthly|yearly)$/i, 'daily')
  .option('-o --organization <organization>', 'Filter by organization')
  .option('-m --message <message>', 'How did your you day go?')
  .option('-c --config <config>', 'Manually override the config')
  .action(async (username, cmd) => {
    const interval = cmd.interval
    const organization = cmd.organization
    const message = cmd.message
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
                    repository {
                      name
                    }
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

      const data = await github.query(getUserStats, { login: username }, { url: GITHUB_API_URL, token: GITHUB_API_TOKEN })

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
            const repoName = ref && ref.repository ? ref.repository.name : null
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
                commits.push({
                  ...node,
                  repoName
                })
              }
            })
          })
        })
        /* console.log('getUserStats commits size', _.size(commits))
        console.log('getUserStats filteredOpenIssues size', _.size(filteredOpenIssues))
        console.log('getUserStats filteredClosedIssues size', _.size(filteredClosedIssues)) */

        const groupedCommits = _.groupBy(commits, "repoName")
        const contributionList = []
        _.forEach(groupedCommits, (commits, repoName) => {
          contributionList.push({
            key: repoName,
            noOfCommits: _.size(commits)
          })
        })
        const sortedList = _.orderBy(contributionList, ["noOfCommits"], ["desc"])
        const top3 = _.take(sortedList, 3)
        // console.log('top3', top3)

        let top3RepoString = ''
        _.forEach(top3, (repo, index) => {
          top3RepoString = top3RepoString + `#${index + 1}: *${repo.noOfCommits}* commits in \`${repo.key}\`\n`
        })

        slack.send({
          token: SLACK_TOKEN,
          as_user: true,
          channel: SLACK_CHANNEL,
          attachments: [
            {
                "fallback": `Here's my ${interval} summary for the ${organization} GitHub org. ${_.size(filteredClosedIssues)} closed issues, ${_.size(filteredOpenIssues)} opened issues and ${_.size(commits)} commits.`,
                "color": "#F46085",
                "author_name": name,
                "author_link": url,
                "author_icon": avatarUrl,
                "title": `${_.upperFirst(interval)} summary`,
                "text": `${message ? message : "No message was entered so let's assume it was an awesome day."}`,
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
                    },
                    {
                        "title": "Top repositories",
                        "value": top3RepoString,
                        "short": false
                    }
                ],
                "footer": organization,
                "footer_icon": "https://assets-cdn.github.com/images/modules/logos_page/GitHub-Mark.png",
                "ts": moment().unix()
            }
          ]
        })
      }
    } catch (err) {
      if (err && err.response) {
        console.error(err.response.errors) // GraphQL response errors
        console.error(err.response.data) // Response data if available
      }
    }
  })

program.parse(process.argv)