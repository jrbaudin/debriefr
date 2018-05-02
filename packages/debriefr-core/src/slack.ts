import * as slack from 'slack'
import * as _ from 'lodash'
import { logger } from './logger'

const dev = process.env.NODE_ENV !== 'production'
const logPrefix = 'slack ||'

export interface ISlackMessage {
  text: String
  channel?: String
  token?: String
  parse?: String
  as_user?: String
}

export const send = (message: ISlackMessage): Promise<any> => {
  const defaults: ISlackMessage = {
    token: process.env.SLACK_BOT_TOKEN,
    parse: 'full',
    as_user: 'karma',
    channel: dev ? '#prod-log' : '#prod-monitor',
    text: 'MonBot Slack Default Text',
  }
  const readyMessage = _.merge(defaults, message) as Chat.PostMessage.Params
  return slack.chat
    .postMessage(readyMessage)
    .then(res => {
      logger.info(`${logPrefix} Message successfully sent!`)
      delete readyMessage.token
      logger.debug(
        `${logPrefix} The following message was sent to ${readyMessage.channel}: %o`,
        readyMessage
      )
      return res
    })
    .catch(err => {
      logger.error(`${logPrefix} Error caught while running postMessage()`)
      logger.error(err)
      return err
    })
}
