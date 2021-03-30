import { getInput, setFailed, setOutput, debug } from '@actions/core'
import { context } from '@actions/github'

import { generateS3Client, generateCanaryProcessor } from './logic'

async function action() {
  const s3 = generateS3Client(debug)
  const canary = generateCanaryProcessor(debug, s3, context.sha)
  try {
    const type = getInput('type')
    const ref = type === 'remove' ? context.payload.ref : context.ref
    const { canaries, typeDetail } = await canary.process(type, ref, context.payload?.ref_type)

    setOutput('type', typeDetail)
    setOutput('canaries', canaries.join(','))
  } catch (error) {
    setFailed(error.message)
  }
}
action()
