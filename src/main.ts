import process from 'process'

import core = require('@actions/core')

import { updateContributors } from './update'

type Inputs = {
  githubToken: string
}

const getInputs = () => {
  const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN || ''

  return { githubToken }
}

const validateInputs = ({ githubToken }: Inputs) => {
  if (!githubToken) {
    throw new Error('GitHub token is required')
  }
}

const run = async () => {
  try {
    const inputs = getInputs()
    validateInputs(inputs)
    await updateContributors(inputs.githubToken)
  } catch (error) {
    const err = error as Error
    core.setFailed(err.message)
  }
}

run()
