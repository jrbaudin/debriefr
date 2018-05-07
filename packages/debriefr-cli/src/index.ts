#!/usr/bin/env node
import * as rc from 'rc'
import * as _ from 'lodash'
import * as moment from 'moment'
import * as program from 'commander'
import { slack, util, github } from 'debriefr-core'
import { isWithinInterval } from './validation'
import { process as processUserAction } from './user'
import { process as processTeamAction } from './team'
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
const PROFILES = conf && conf.profiles ? conf.profiles : {}

if (!SLACK_TOKEN || !SLACK_CHANNEL || !GITHUB_API_TOKEN || !GITHUB_API_URL) {
  console.error(`${LOG_PREFIX} Missing mandatory information.`)
  process.exit(1)
}

program
  .version('1.0.0')
  .command('user <username>')
  .option('-i --interval <interval>', 'Report interval', /^(daily|weekly|monthly|yearly)$/i, 'daily')
  .option('-o --organization <organization>', 'Filter by organization')
  .option('-m --message <message>', 'How did your you day go?')
  .option('-c --config <config>', 'Manually override the config')
  .action((username, cmd) => processUserAction(
    username,
    cmd,
    {
      github: {
        token: GITHUB_API_TOKEN,
        url: GITHUB_API_URL
      },
      slack: {
        token: SLACK_TOKEN,
        channel: SLACK_CHANNEL
      }
    }
  ))

program
  .version('0.1.0')
  .command('team <teammate> [teammates...]')
  .option('-i --interval <interval>', 'Report interval', /^(daily|weekly|monthly|yearly)$/i, 'weekly')
  .option('-o --organization <organization>', 'Filter by organization')
  .option('-p --profile <profile>', 'Select a profile that exists in your .debriefrrc file')
  .action((teammate, teammates, cmd) => processTeamAction(
    [teammate, ...teammates],
    cmd,
    {
      github: {
        token: GITHUB_API_TOKEN,
        url: GITHUB_API_URL
      },
      slack: {
        token: SLACK_TOKEN,
        channel: SLACK_CHANNEL
      }
    },
    PROFILES
  ))

program.parse(process.argv)