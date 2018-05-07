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

    const interval = selectedProfile && selectedProfile.team && selectedProfile.team.interval ? selectedProfile.team.interval : cmd.interval
    const organization = selectedProfile && selectedProfile.team && selectedProfile.team.organization ? selectedProfile.team.organization : cmd.organization
    const profileMembers = selectedProfile && selectedProfile.team && selectedProfile.team.members && _.size(selectedProfile.team.members) > 0 ? selectedProfile.team.members : []
    const members = _.uniq([...profileMembers, ...team])

    console.log('organization %s', organization)
    console.log('interval %s', interval)
    console.log('profile %s', profile)
    console.log('selectedProfile %j', selectedProfile)
    console.log('.....')
    if (members) {
      members.forEach(function (mate) {
        console.log('teammate %s', mate);
      })
    }

    if (!organization) {
      console.error(`${LOG_PREFIX} Missing mandatory information of which GitHub organization to target.`)
      throw new Error('Missing mandatory information of which GitHub organization to target.')
    }

    const commitsResponse = await github.query(ORG_STATS_WITH_COMMITS, { login: organization }, { url: props.github.url, token: props.github.token })
    const issuesResponse = await github.query(ORG_STATS_WITH_ISSUES, { login: organization }, { url: props.github.url, token: props.github.token })
    const pullRequestsResponse = await github.query(ORG_STATS_WITH_PRS, { login: organization }, { url: props.github.url, token: props.github.token })

    let orgName = ''
    let orgAvatar = ''
    const commits = []
    const issues = []
    const pullRequests = []

    if (commitsResponse && commitsResponse.success && commitsResponse.data && commitsResponse.data.organization) {
      const { name, avatarUrl, repositories: { edges } } = commitsResponse.data.organization
      orgName = name
      orgAvatar = avatarUrl

      _.forEach(edges, repo => {
        const node = repo && repo.node ? repo.node : {}
        const repoName = node && node.name ? node.name : null
        const refs = node && node.refs ? node.refs.nodes : []
        _.forEach(refs, ref => {
          const history = ref && ref.target && ref.target.history ? ref.target.history.edges : []
          _.forEach(history, edge => {
            const node = edge ? edge.node : {}
            const author = node && node.author && node.author.user ? node.author.user.login : ''

            const isWithinTeam = _.includes(members, author)
            const validDate = isWithinInterval(node.pushedDate, interval)

            if (isWithinTeam && validDate) {
              commits.push({
                ...node,
                repoName
              })
            }
          })
        })
      })

      console.log(`${LOG_PREFIX} commits size %d`, _.size(commits))
    } else {
      console.error(`${LOG_PREFIX} commits response.error %o`, commitsResponse.error)
    }

    if (issuesResponse && issuesResponse.success && issuesResponse.data && issuesResponse.data.organization) {
      const { name, avatarUrl, repositories: { edges } } = issuesResponse.data.organization
      orgName = name
      orgAvatar = avatarUrl

      _.forEach(edges, repo => {
        const node = repo && repo.node ? repo.node : {}
        const repoName = node && node.name ? node.name : null
        const issues = node && node.issues ? node.issues.edges : []
        _.forEach(issues, edge => {
          const issue = edge ? edge.node : {}
          // console.log('issue', issue)
          const { closedAt, body, title, author: { login }} = issue

          const isWithinTeam = _.includes(members, login)
          console.log('isWithinTeam %s %j %s', isWithinTeam, members, login)
          const validDate = isWithinInterval(closedAt, interval)
          console.log('validDate %s %s %s', validDate, closedAt, interval)

          if (isWithinTeam && validDate) {
            issues.push({
              ...issue,
              repoName
            })
          }
        })
      })

      console.log(`${LOG_PREFIX} issues size %d`, _.size(issues))
    } else {
      console.error(`${LOG_PREFIX} issues response.error %o`, commitsResponse.error)
    }

    if (pullRequestsResponse && pullRequestsResponse.success && pullRequestsResponse.data && pullRequestsResponse.data.organization) {
      const { name, avatarUrl, repositories: { edges } } = pullRequestsResponse.data.organization
      orgName = name
      orgAvatar = avatarUrl

      // console.log(`${LOG_PREFIX} prs edges %o`, edges)
    } else {
      console.error(`${LOG_PREFIX} prs response.error %o`, commitsResponse.error)
    }
  } catch (error) {
    throw error
  }
}