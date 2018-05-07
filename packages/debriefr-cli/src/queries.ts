export const ORG_STATS_WITH_ISSUES = `
query organizationStats($login: String!) {
  organization(login: $login) {
    name
    avatarUrl
    repositories(first: 100, orderBy: {field: PUSHED_AT, direction: DESC}) {
      edges {
        node {
          name
          pushedAt
          issues (first: 100, states: CLOSED, orderBy: {field:CREATED_AT, direction:DESC}) {
            edges {
            	node {
                createdAt
                closedAt
                author {
                  login
                }
                body
                title
              }
            }
          }
        }
      }
    }
  }
}`

export const ORG_STATS_WITH_COMMITS = `
query organizationStats($login: String!) {
  organization(login: $login) {
    name
    avatarUrl
    repositories(first: 100, orderBy: {field: PUSHED_AT, direction: DESC}) {
      edges {
        node {
          name
          pushedAt
          refs(last: 100, refPrefix: "refs/heads/") {
            nodes {
              target {
                ... on Commit {
                  history(first: 10) {
                    edges {
                      node {
                        message
                        commitUrl
                        pushedDate
                        author {
                          name
                          user {
                            login
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`

export const ORG_STATS_WITH_PRS = `
query organizationStats($login: String!) {
  organization(login: $login) {
    name
    avatarUrl
    repositories(first: 100, orderBy: {field: PUSHED_AT, direction: DESC}) {
      edges {
        node {
          name
          pushedAt
          pullRequests(last: 100, states: MERGED, orderBy: {field: UPDATED_AT, direction: DESC}) {
            edges {
              node {
                headRefName
                baseRefName
                closedAt
                mergedAt
                mergedBy {
                  login
                }
                author {
                  login
                }
              }
            }
          }
        }
      }
    }
  }
}`