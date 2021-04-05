import { getInput, setFailed, setOutput, debug } from '@actions/core'
import { context } from '@actions/github'

import { generateS3Client, generateCanaryProcessor } from './logic'
import { parse } from './logic/util'

async function action() {
  const type = getInput('type')
  const bucket = getInput('bucketName')
  if (!bucket) {
    debug('skip empty bucket')
    return
  }

  const f = getInput('function')
  const account = getInput('account').trim()

  const s3 = generateS3Client(debug)
  const canary = generateCanaryProcessor(
    debug,
    s3,
    type === 'remove' ? `${type}-${account}` : context.sha
  )
  try {
    if (f === 'cleanup') {
      const conclusion = getInput('conclusion')
      await canary.postProcess(bucket, conclusion)
      return
    }

    const { canaries, typeDetail } = await canary.process(
      type,
      account || parse(type === 'remove' ? context.payload.ref : context.ref, debug),
      bucket
    )

    setOutput('type', typeDetail)
    setOutput('canaries', canaries.join(','))
  } catch (error) {
    setFailed(error.message)
  }
}
action()
