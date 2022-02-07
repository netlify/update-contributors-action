// eslint-disable-next-line ava/no-ignored-test-files
import test from 'ava'

import { createContributorString } from '../src/update'

test('createContributorString name only', (t) => {
  const result = createContributorString({ name: 'Alice', email: '', url: '' })

  t.is(result, 'Alice')
})

test('createContributorString name with email', (t) => {
  const result = createContributorString({ name: 'Alice', email: 'alice@netlify.com', url: '' })

  t.is(result, 'Alice <alice@netlify.com>')
})
