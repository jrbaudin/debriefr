import * as _ from 'lodash'
import * as moment from 'moment'
import { slack, util, github } from 'debriefr-core'
import { isWithinInterval } from './validation'
import { IProfile } from './types'
import { ORG_STATS_WITH_COMMITS, ORG_STATS_WITH_ISSUES, ORG_STATS_WITH_PRS } from './queries'

const LOG_PREFIX = 'team ||'

export interface IProps {
  github: {
    token: string
    url: string
  }
  slack: {
    token: string
    channel: string
  }
}

export interface ICmdOptions {
  interval: string
  organization: string
  profile: string
}

export const process = async (team: string[], cmd: ICmdOptions, props: IProps, profiles: object) => {
  try {
    const profile = cmd.profile
    const selectedProfile = profiles[profile] as IProfile

    const interval = cmd && cmd.interval ? cmd.interval : selectedProfile && selectedProfile.team && selectedProfile.team.interval ? selectedProfile.team.interval : 'weekly'
    const organization = cmd && cmd.organization ? cmd.organization : selectedProfile && selectedProfile.team && selectedProfile.team.organization ? selectedProfile.team.organization : null
    const profileMembers = selectedProfile && selectedProfile.team && selectedProfile.team.members && _.size(selectedProfile.team.members) > 0 ? selectedProfile.team.members : []
    const members = _.uniq([...profileMembers, ...team])
    const exclude = selectedProfile && selectedProfile.team && selectedProfile.team.exclude && _.size(selectedProfile.team.exclude) > 0 ? selectedProfile.team.exclude : false
    const include = selectedProfile && selectedProfile.team && selectedProfile.team.include && _.size(selectedProfile.team.include) > 0 ? selectedProfile.team.include : false

    const slackChannel = selectedProfile && selectedProfile.team && selectedProfile.team.slack && selectedProfile.team.slack.channel ? selectedProfile.team.slack.channel : props.slack.channel

    /* console.log('organization %s', organization)
    console.log('interval %s', interval)
    console.log('profile %s', profile)
    console.log('selectedProfile %j', selectedProfile)
    console.log('.....') */
    /* if (members) {
      members.forEach(function (mate) {
        console.log('teammate %s', mate);
      })
    } */

    if (!organization) {
      console.error(`${LOG_PREFIX} Missing mandatory information of which GitHub organization to target.`)
      throw new Error('Missing mandatory information of which GitHub organization to target.')
    }

    const responses = await Promise.all([
      github.query(ORG_STATS_WITH_COMMITS, { login: organization }, { url: props.github.url, token: props.github.token }),
      github.query(ORG_STATS_WITH_ISSUES, { login: organization }, { url: props.github.url, token: props.github.token }),
      github.query(ORG_STATS_WITH_PRS, { login: organization }, { url: props.github.url, token: props.github.token })
    ])

    const commitsResponse = responses[0]
    const issuesResponse = responses[1]
    const pullRequestsResponse = responses[2]

    /* const commitsResponse = await github.query(ORG_STATS_WITH_COMMITS, { login: organization }, { url: props.github.url, token: props.github.token })
    const issuesResponse = await github.query(ORG_STATS_WITH_ISSUES, { login: organization }, { url: props.github.url, token: props.github.token })
    const pullRequestsResponse = await github.query(ORG_STATS_WITH_PRS, { login: organization }, { url: props.github.url, token: props.github.token }) */

    let orgName = ''
    let orgAvatar = ''
    let orgUrl = ''
    const validCommits = []
    const validIssues = []
    const prCreatedByTeam = []
    const prMergedByTeam = []

    if (commitsResponse && commitsResponse.success && commitsResponse.data && commitsResponse.data.organization) {
      const { name, avatarUrl, url, repositories: { edges } } = commitsResponse.data.organization
      orgName = name
      orgAvatar = avatarUrl
      orgUrl = url

      _.forEach(edges, repo => {
        const node = repo && repo.node ? repo.node : {}
        const repoName = node && node.name ? node.name : null
        const toBeIncluded = include ? _.includes(include, repoName) : true
        const toBeExcluded = exclude ? _.includes(exclude, repoName) : false
        if (toBeIncluded && !toBeExcluded) {
          const refs = node && node.refs ? node.refs.nodes : []
          _.forEach(refs, ref => {
            const history = ref && ref.target && ref.target.history ? ref.target.history.edges : []
            _.forEach(history, edge => {
              const node = edge ? edge.node : {}
              const author = node && node.author && node.author.user ? node.author.user.login : ''

              const isWithinTeam = _.includes(members, author)
              const validDate = isWithinInterval(node.pushedDate, interval)

              if (isWithinTeam && validDate) {
                validCommits.push({
                  ...node,
                  repoName
                })
              }
            })
          })
        }
      })

      console.log(`${LOG_PREFIX} commits size %d`, _.size(validCommits))
    } else {
      console.error(`${LOG_PREFIX} commits response.error %o`, commitsResponse.error)
    }

    if (issuesResponse && issuesResponse.success && issuesResponse.data && issuesResponse.data.organization) {
      const { name, avatarUrl, url, repositories: { edges } } = issuesResponse.data.organization
      orgName = name
      orgAvatar = avatarUrl
      orgUrl = url

      _.forEach(edges, repo => {
        const node = repo && repo.node ? repo.node : {}
        const repoName = node && node.name ? node.name : null
        const toBeIncluded = include ? _.includes(include, repoName) : true
        const toBeExcluded = exclude ? _.includes(exclude, repoName) : false
        if (toBeIncluded && !toBeExcluded) {
          const issues = node && node.issues ? node.issues.edges : []
          _.forEach(issues, edge => {
            const issue = edge ? edge.node : {}
            // console.log('issue', issue)
            const { closedAt, body, title, author: { login }} = issue

            const isWithinTeam = _.includes(members, login)
            const validDate = isWithinInterval(closedAt, interval)

            if (isWithinTeam && validDate) {
              // console.log('Lets push it to the issues list... user(%s) and closedAt(%s)', login, closedAt)
              validIssues.push({
                ...issue,
                repoName
              })
            }
          })
        }
      })

      console.log(`${LOG_PREFIX} issues size %d`, _.size(validIssues))
    } else {
      console.error(`${LOG_PREFIX} issues response.error %o`, commitsResponse.error)
    }

    if (pullRequestsResponse && pullRequestsResponse.success && pullRequestsResponse.data && pullRequestsResponse.data.organization) {
      const { name, avatarUrl, url, repositories: { edges } } = pullRequestsResponse.data.organization
      orgName = name
      orgAvatar = avatarUrl
      orgUrl = url

      _.forEach(edges, repo => {
        const node = repo && repo.node ? repo.node : {}
        const repoName = node && node.name ? node.name : null
        const toBeIncluded = include ? _.includes(include, repoName) : true
        const toBeExcluded = exclude ? _.includes(exclude, repoName) : false
        if (toBeIncluded && !toBeExcluded) {
          const pullRequests = node && node.pullRequests ? node.pullRequests.edges : []
          _.forEach(pullRequests, edge => {
            const pullRequest = edge ? edge.node : {}
            const { closedAt, mergedAt, body, title, author, mergedBy} = pullRequest
            const createdByUser = author ? author.login : null
            const mergedByUser = mergedBy ? mergedBy.login : null

            const createdByTeamMember = _.includes(members, createdByUser)
            const mergedByTeamMember = _.includes(members, mergedByUser)

            const validDate = isWithinInterval(mergedAt, interval)

            if (createdByTeamMember && validDate) {
              // console.log('Lets push it to the prCreatedByTeam list... user(%s) and closedAt(%s)', createdByUser, mergedAt)
              prCreatedByTeam.push({
                ...pullRequest,
                repoName
              })
            }
            if (mergedByTeamMember && validDate) {
              // console.log('Lets push it to the mergedByTeamMember list... user(%s) and closedAt(%s)', createdByUser, mergedAt)
              prMergedByTeam.push({
                ...pullRequest,
                repoName
              })
            }
          })
        }
      })

      console.log(`${LOG_PREFIX} prCreatedByTeam size %d`, _.size(prCreatedByTeam))
      console.log(`${LOG_PREFIX} prMergedByTeam size %d`, _.size(prMergedByTeam))
    } else {
      console.error(`${LOG_PREFIX} prs response.error %o`, commitsResponse.error)
    }

    let teamString = ''
    _.forEach(members, (member, index) => {
      teamString = teamString + `${member}\n`
    })
    let repoString = ''
    if (include) {
      _.forEach(include, (repo, index) => {
        repoString = repoString + `${repo}\n`
      })
    }

    slack.send({
      token: props.slack.token,
      as_user: true,
      channel: slackChannel,
      attachments: [
        {
            "fallback": `Teeeest team report.`,
            "color": "#F46085",
            "author_name": orgName,
            "author_link": orgUrl,
            "author_icon": orgAvatar,
            "title": `${_.upperFirst(interval)} team summary`,
            "fields": [
                {
                  "title": "Closed issues",
                  "value": _.size(validIssues),
                  "short": true
                },
                {
                  "title": "Commits",
                  "value": _.size(validCommits),
                  "short": true
                },
                {
                  "title": "Created pull requests",
                  "value": _.size(prCreatedByTeam),
                  "short": true
                },
                {
                  "title": "Merged pull requests",
                  "value": _.size(prMergedByTeam),
                  "short": true
                },
                {
                  "title": "Team",
                  "value": teamString,
                  "short": true
                },
                {
                  "title": "Repositories",
                  "value": repoString,
                  "short": true
                }
            ],
            "footer": organization,
            "footer_icon": "https://assets-cdn.github.com/images/modules/logos_page/GitHub-Mark.png",
            "ts": moment().unix()
        }
      ]
    })
  } catch (error) {
    throw error
  }
}