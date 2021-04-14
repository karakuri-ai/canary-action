import { generateS3Client, generateCanaryProcessor } from './logic'
import { parse } from './logic/util'

type Props = {
  accessKeyId: string
  secretAccessKey: string
  region: string
  type: string
  bucket: string
  functionName: string
  account: string
  conclusion: string
  sha?: string
  ref?: string
  debug: (message: string) => void
}

type Result = {
  canaries: string[]
  typeDetail?: string
}
export async function action({
  accessKeyId,
  secretAccessKey,
  region,
  type,
  bucket,
  functionName,
  account,
  conclusion,
  sha,
  ref,
  debug,
}: Props): Promise<Result> {
  if (!bucket) {
    debug('skip empty bucket')
    return
  }

  const s3 = generateS3Client(debug, {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
  const canary = generateCanaryProcessor(debug, s3, type === 'remove' ? `${type}-${account}` : sha)
  if (functionName === 'cleanup') {
    return await canary.postProcess(bucket, conclusion)
  }

  return await canary.process(type, account || parse(ref, debug), bucket)
}
