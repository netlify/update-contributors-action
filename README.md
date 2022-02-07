[![Build](https://github.com/netlify/update-contributors-action/workflows/Build/badge.svg)](https://github.com/netlify/update-contributors-action/actions)

# update-contributors-action

## Motivation

We love open source contributions and want to make sure that we acknowledge the contributors.
We use this GitHub action to update our packages `package.json` file with the list of contributors.

## Usage

1. Create a workflow file under `.github/workflows/update-contributors.yml`.

Use this example as a reference:

```yaml
name: Update contributors
on:
  pull_request:
    branches: [main]

jobs:
  update-contributors:
    runs-on: ubuntu-latest
    steps:
      - name: Git checkout
        uses: actions/checkout@v2
      - uses: netlify/update-contributors-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
      - uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: 'chore: update contributors field'
          file_pattern: package.json
          commit_user_name: Contributors[bot]
```

## Contributors

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for instructions on how to set up and work on this repository. Thanks
for contributing!
