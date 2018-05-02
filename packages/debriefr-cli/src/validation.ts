import * as moment from 'moment'

export const isWithinInterval = (createdAtISO: string, interval: string) => {
  let isWithinInterval = false
  const createdAt = moment(createdAtISO)
  switch (interval) {
    case 'daily': {
      const start = moment()
      isWithinInterval = createdAt.isSame(start, 'days')
      break
    }
    case 'weekly': {
      const start = moment().subtract(1, 'week')
      isWithinInterval = createdAt.isAfter(start, 'days')
      break
    }
    case 'monthly': {
      const start = moment().subtract(1, 'month')
      isWithinInterval = createdAt.isAfter(start, 'days')
      break
    }
    case 'yearly': {
      const start = moment().subtract(1, 'year')
      isWithinInterval = createdAt.isAfter(start, 'days')
      break
    }
    default: {
      const start = moment()
      isWithinInterval = createdAt.isSame(start, 'days')
    }
  }
  return isWithinInterval
}