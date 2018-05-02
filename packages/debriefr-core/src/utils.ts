export const convertDurationToMillis = (diff: number[]): number => {
  const NS_PER_SEC = 1e9
  const millis = (diff[0] * NS_PER_SEC + diff[1])/1000000
  return millis
}