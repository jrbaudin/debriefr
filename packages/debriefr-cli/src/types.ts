export interface IProfile {
  team: {
    slack: {
      channel: string
    }
    members: string[]
    exclude: string[]
    include: string[]
    interval: string
    organization: string
  }
}