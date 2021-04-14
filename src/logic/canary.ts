import { diffApply as apply } from 'just-diff-apply'
import omit from 'just-omit'

import { generateS3Client } from './s3'
import { diff, update } from './util'

interface Result {
  canaries: string[]
  typeDetail: 'remove' | 'update' | 'create'
}

export function generateCanaryProcessor(
  debug: (message: string) => void,
  s3: ReturnType<typeof generateS3Client>,
  sha: string
) {
  const keys = ['canaries/bots.json', 'canaries/operations.json']
  return { process, postProcess }

  async function process(type: string, accountId: string, bucketName: string): Promise<Result> {
    debug(`process: ${type} ${accountId}`)
    const { canaries: current, operations } = await s3.download(bucketName, keys)
    const typeDetail = type === 'remove' ? type : current.includes(accountId) ? 'update' : 'create'

    const canaries = update(type, current, accountId, operations)

    await s3.upload(bucketName, keys, [
      canaries,
      {
        ...operations,
        [sha]: diff(typeDetail, canaries, accountId, operations),
      },
    ])

    return { canaries, typeDetail }
  }

  async function postProcess(bucketName: string, conclusion: string) {
    debug(`postProcess: ${conclusion}`)
    const { canaries: current, operations } = await s3.download(bucketName, keys)
    if (!operations[sha]) {
      debug('operation is empty')
      return
    }
    const canaries =
      conclusion === 'success' || operations[sha].length === 0
        ? current
        : apply(current, operations[sha])
    debug(`upload: ${JSON.stringify([canaries, omit(operations, sha)])}`)
    await s3.upload(bucketName, keys, [canaries, omit(operations, sha)])
    return { canaries }
  }
}
