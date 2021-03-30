import { getInput, setFailed, debug } from '@actions/core'
import { context } from '@actions/github'

import { generateS3Client, generateCanaryProcessor } from './logic'

async function action() {
  const s3 = generateS3Client(debug)
  const canary = generateCanaryProcessor(debug, s3, context.sha)
  try {
    const type = getInput('type')
    const conclusion = getInput('conclusion')
    const ref = type === 'remove' ? context.payload.ref : context.ref
    await canary.postProcess(ref, conclusion)
  } catch (error) {
    setFailed(error.message)
  }
}
action()
