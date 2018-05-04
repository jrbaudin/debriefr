# debriefr-cli

> Debriefr command line.

In addition, various entry point scripts live in the top-level package at `@babel/cli/bin`.

There is a shell-executable utility script, `babel-external-helpers.js`, and the main Babel cli script, `babel.js`.

## Install

```sh
npm install -g debriefr-cli
```

## Usage

1. Add a `.debriefrrc` file in your home directory. See the [.debriefrrc.example](.debriefrrc.example) file for guidance.

2. Create a report and send to Slack (currently the only supported destination)

```sh
debriefr user jrbaudin -i daily -o githuborg -m "Today was a good day"
```

For a list of available flags use:
```sh
debriefr user -h
```