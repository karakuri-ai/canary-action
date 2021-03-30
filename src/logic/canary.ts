import { diffApply as apply } from 'just-diff-apply'
import omit from 'just-omit'

import { generateS3Client } from './s3'
import { parse, diff, update } from './util'

interface Result {
  canaries: string[]
  typeDetail: 'remove' | 'update' | 'create'
}

export function generateCanaryProcessor(
  debug: (message: string) => void,
  s3: ReturnType<typeof generateS3Client>,
  sha: string
) {
  const key = 'canaries/bots.json'
  return { process, postProcess }

  async function process(type: string, ref: string, refType?: string): Promise<Result> {
    const [accountId, bucketName] = parse(ref, debug)

    const { canaries: current, operations } = await s3.download(bucketName, key)
    const typeDetail = type === 'remove' ? type : current.includes(accountId) ? 'update' : 'create'
    // await s3.backup(bucketName, key, sha)
    if ((type === 'remove' && refType !== 'branch') || !accountId) {
      debug(`ignore: ref_type ${refType}, ${accountId}`)
      return { canaries: current, typeDetail }
    }
    const canaries = update(type, current, accountId, operations)

    await s3.upload(bucketName, key, {
      canaries,
      operations: {
        ...operations,
        [sha]: diff(typeDetail, canaries, accountId, operations),
      },
    })

    return { canaries, typeDetail }
  }

  async function postProcess(ref: string, conclusion: string) {
    const [, bucketName] = parse(ref, debug)

    const { canaries: current, operations } = await s3.download(bucketName, key)
    if (!operations[sha]) {
      return
    }
    const canaries =
      conclusion === 'success' || operations[sha].length === 0
        ? current
        : apply(current, operations[sha])

    await s3.upload(bucketName, key, {
      canaries,
      operations: omit(operations, sha),
    })
  }
}
