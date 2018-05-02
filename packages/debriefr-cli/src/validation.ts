import * as moment from 'moment'

export const isWithinInterval = (createdAtISO: string, interval: string) => {
  let isWithinInterval = false
  const createdAt = moment(createdAtISO)
  switch (interval) {
    case 'daily': {
      const start = moment()
      isWithinInterval = createdAt.isSame(start, 'day')
      break
    }
    case 'weekly': {
      const start = moment().subtract(1, 'week')
      isWithinInterval = createdAt.isAfter(start, 'day')
      break
    }
    case 'monthly': {
      const start = moment().subtract(1, 'month')
      isWithinInterval = createdAt.isAfter(start, 'day')
      break
    }
    case 'yearly': {
      const start = moment().subtract(1, 'year')
      isWithinInterval = createdAt.isAfter(start, 'day')
      break
    }
    default: {
      const start = moment()
      isWithinInterval = createdAt.isSame(start, 'day')
    }
  }
  return isWithinInterval
}