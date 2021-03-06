import { promises as fs } from 'fs'
import process from 'process'

import github = require('@actions/github')
import execa = require('execa')
import readPackage = require('read-pkg')

type Contributor = {
  name: string
  url: string
  email: string
}

export const createContributorString = (entry: Contributor) =>
  [entry.name, entry.email && `<${entry.email}>`, entry.url && `(${entry.url})`].filter(Boolean).join(' ')

const getMailList = async () => {
  // Get a list of email addresses from local git log as they are not
  // part of the user information
  const { stdout: gitlog } = await execa('git', ['log', '--format=%ae'])
  const lines = gitlog.split('\n')
  const entries = lines.map((entry) => entry.split('⏣')).filter(([key]) => !(key.length === 0 || key.includes('[bot]')))

  const mailList = new Map<string, string>(entries as unknown as readonly [string, string][])
  return mailList
}

type GitHubUser = {
  // eslint-disable-next-line camelcase
  twitter_username: string | null
  blog: string | null
  name: string
  login: string
  email: string
}

const getUserUrl = (user: GitHubUser) =>
  (user.twitter_username && `https://twitter.com/${user.twitter_username}`) || user.blog || ''

// eslint-disable-next-line complexity
const getUserDetails = (mailList: Map<string, string>, user: GitHubUser) => {
  const fullName = user.name || user.login
  const email = mailList.get(user.login) || mailList.get(user.name) || user.email

  if (email) {
    return { email, fullName }
  }

  const matchingName = [...mailList.keys()].find((name) => name.startsWith(user.name))
  if (matchingName) {
    return { fullName: matchingName, email: mailList.get(matchingName) || '' }
  }

  return { email, fullName }
}

// eslint-disable-next-line complexity,max-params
const matchExisting = (cont: Contributor, name: string, fullName: string, email: string, url: string) =>
  cont.name === fullName ||
  cont.name.startsWith(name) ||
  (cont.email && cont.email === email) ||
  (cont.url && cont.url === url)

const getGitHubContributors = async (token: string) => {
  const octokit = github.getOctokit(token)

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')
  const contributorList = await octokit.paginate('GET /repos/{owner}/{repo}/contributors', {
    per_page: 100,
    owner,
    repo,
  })

  // get the user information for each contributor
  const contributors = await Promise.all(
    contributorList
      .filter(({ type }) => type === 'User')
      .map((user) => octokit.rest.users.getByUsername({ username: user.login as string }).then(({ data }) => data)),
  )

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const currentActor = process.env.GITHUB_ACTOR!
  // add the current user to the list of contributors if needed
  if (!contributorList.some((user) => user.login === currentActor)) {
    const { data: currentUser } = await octokit.rest.users.getByUsername({ username: currentActor })
    if (currentUser.type === 'User') {
      return [...contributors, currentUser] as GitHubUser[]
    }
  }

  return contributors as GitHubUser[]
}

const updatePackageJson = async (contributors: string[]) => {
  // eslint-disable-next-line unicorn/prefer-json-parse-buffer
  const jsonFile = JSON.parse(await fs.readFile('package.json', 'utf8'))
  jsonFile.contributors = contributors
  await fs.writeFile('package.json', `${JSON.stringify(jsonFile, null, 2)}\n`, 'utf-8')
}

export const updateContributors = async (token: string) => {
  const [mailList, packageJson, contributors] = await Promise.all([
    getMailList(),
    readPackage(),
    getGitHubContributors(token),
  ])

  const existingContributors = (packageJson.contributors || []) as Contributor[]
  // generate a list of strings with name email and website
  const newContributors = contributors.map((user) => {
    const url = getUserUrl(user)
    const { email, fullName } = getUserDetails(mailList, user)

    // Check if an existing user can be found if yes use the details provided in the package.json
    const existing = existingContributors.find((cont) => matchExisting(cont, user.name, fullName, email, url))

    if (existing) {
      return createContributorString(existing)
    }

    return createContributorString({ name: fullName, email, url })
  })

  return updatePackageJson(newContributors.sort())
}
