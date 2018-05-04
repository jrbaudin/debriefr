# debriefr-cli

> Debriefr command line.

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