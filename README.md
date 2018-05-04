# Debriefr - Generate reports from GitHub data

## Description

Calculate actual metrics from your work on GitHub, suitable for example for a daily report. Then deliver that data to a Slack channel.

## Get started

### Clone repo

```shell
git clone git@github.com:jrbaudin/debriefr.git
```

```shell
cd debriefr
```

## How to develop

To ensure a sweet workflow with this _mono repo_ [lerna](https://github.com/lerna/lerna) is used. The easiest way to get started on how to use it is to check their [How It Works](https://github.com/lerna/lerna#how-it-works) section. But in a _nut shell_ [lerna](https://github.com/lerna/lerna) resolves local [packages](/packages) first and if not found then tries to fetch them remotely from **npm**. This allows easy code sharing and structure.

_**THIS SECTION NEEDS UPDATING**_

## Available packages

- [debriefr-core](/packages/debriefr-core)
- [debriefr-cli](/packages/debriefr-cli)