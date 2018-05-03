import * as slack from 'slack'
import * as _ from 'lodash'

const dev = process.env.NODE_ENV !== 'production'
const logPrefix = 'slack ||'

export interface ISlackMessage {
  text?: string
  channel?: string
  token?: string
  parse?: string
  as_user?: boolean
  attachments?: object[]
}

export const send = (message: ISlackMessage): Promise<any> => {
  const defaults: ISlackMessage = {
    token: process.env.SLACK_BOT_TOKEN,
    parse: 'full',
    as_user: true,
    channel: '#prod-log',
    text: '',
  }
  const readyMessage = _.merge(defaults, message) as Chat.PostMessage.Params
  return slack.chat
    .postMessage(readyMessage)
    .then(res => {
      console.info(`${logPrefix} Message successfully sent!`)
      delete readyMessage.token
      console.debug(
        `${logPrefix} The following message was sent to ${readyMessage.channel}: %o`,
        readyMessage
      )
      return res
    })
    .catch(err => {
      console.error(`${logPrefix} Error caught while running postMessage()`)
      console.error(err)
      return err
    })
}
