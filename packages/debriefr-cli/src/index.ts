import * as _ from 'lodash'
import { slack, logger, util } from 'mon-bot-core'
import DB from './database'

const dev = process.env.NODE_ENV !== 'production'
const SLACK_ENV_FLAG = dev ? 'DEV' : 'PROD'
const LOG_PREFIX = 'db ||'

const testQuery = `
  SELECT
    ca.user_id,
    ca.company_id,
    c.name AS company_name,
    ca.module,
    ca.level,
    l.id AS location_id,
    l.name,
    l.address,
    l.zip,
    l.city,
    l.country_id,
    co.name as country_name,
    l.latitude,
    l.longitude,
    t.timezone,
    cu.code AS currency_code,
    cu.symbol AS currency_symbol,
    cu.is_prefix AS currency_is_prefix,
    l.dvh,
    l.beta,
    l.hidden,
    (NOW() AT TIME ZONE t.timezone) AS today_date
  FROM company_access ca
    JOIN companies c ON ca.company_id = c.id
    LEFT JOIN locations l ON l.id = ca.location_id
    JOIN currencies cu ON cu.id = l.currency_id
    JOIN timezones t ON t.id = l.timezone_id
    JOIN countries co ON co.id = l.country_id
  WHERE ca.user_id = $id`

const variables = {
  id: 1
}

let okCount: number = 0
let executionTimes: number[] = []

interface ITestDBResponse {
  success: boolean,
  message?: string
}

const testDBConnectivity = (conn: any, withMock?: any): Promise<ITestDBResponse> => {
  return new Promise(resolve => {
    logger.info(`${LOG_PREFIX} Testing DB connection...`)
    // start execution timer
    const hrstart = process.hrtime()
    DB.query(testQuery, {
      bind: variables,
      type: DB.QueryTypes.SELECT
    }).then(result => {
      // stop execution timer
      const hrend = process.hrtime(hrstart)
      logger.info(`${LOG_PREFIX} We got a response with execution time: %ds %dms`, hrend[0], hrend[1]/1000000)
      // verify response data
      if (result[0] && result[0].user_id && _.isEqual(result[0].user_id, variables.id)) {
        const data = result[0]
        logger.silly(`${LOG_PREFIX} Result: %o`, data)
        // update state variables

        okCount = okCount + 1
        executionTimes.push(util.convertDurationToMillis(hrend))
        // if we've received 5 OKs let's print to Slack
        if (okCount === 5) {
          logger.info(`${LOG_PREFIX} 5 OKs > Sending Slack message...`)
          const average = _.round(_.sum(executionTimes)/_.size(executionTimes), 2)
          if (average >= 600) {
            // if the average execution time is equal or above 600 ms we should print to #prod-moniter if prod deployment
            slack.send({
              token: process.env.SLACK_BOT_TOKEN,
              text: `[MonBot] :robot_face: [\`${SLACK_ENV_FLAG}\`] \`Database\` is UP :white_check_mark:\n:warning: Average execution time (of query) is \`${average}ms\``
            })
          } else {
            // otherwise just print status to #prod-log
            slack.send({
              token: process.env.SLACK_BOT_TOKEN,
              text: `[MonBot] :robot_face: [\`${SLACK_ENV_FLAG}\`] \`Database\` is UP :white_check_mark:\nAverage execution time (of query) is \`${average}ms\``,
              channel: '#prod-log'
            })
          }

          // reset state variables
          okCount = 0
          executionTimes = []
        }
        resolve({
          success: true
        })
      } else {
        logger.debug(`${LOG_PREFIX} Query didn't return the expected data.`)
        slack.send({
          token: process.env.SLACK_BOT_TOKEN,
          text: `[MonBot] :robot_face: @prod [\`${SLACK_ENV_FLAG}\`] :rotating_light: Test Query didn't return the expected data :warning:`
        })
        resolve({
          success: true,
          message: 'NO_SUCH_USER'
        })
      }
    }).catch(err => {
      const message = err.message
      logger.error(`${LOG_PREFIX} Error caught! message=${message}`)
      logger.error(`${LOG_PREFIX} error: %o`, err)
      if (
        _.includes(message, 'ECONNREFUSED') ||
        _.includes(message, 'ENOTFOUND')
      ) {
        logger.debug(`${LOG_PREFIX} Sending Slack message...`)
        slack.send({
          token: process.env.SLACK_BOT_TOKEN,
          text: `[MonBot] :robot_face: @prod [\`${SLACK_ENV_FLAG}\`] :rotating_light: :octagonal_sign: Can't connect to the Karma Database :warning:\nError: ${message}`
        })
      }
      resolve({
        success: false,
        message: 'ERROR_CAUGHT'
      })
    })
  })
}
// every 5 min
setTimeout(() => {
  const interval = setInterval(testDBConnectivity, process.env.INTERVAL)
  // clearInterval(this)
}, process.env.OFFSET)