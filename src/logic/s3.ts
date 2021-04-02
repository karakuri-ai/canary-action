import S3 from 'aws-sdk/clients/s3'
import typeOf from 'just-typeof'

type OpPath = string | number
type OpAdd<T> = {
  op: 'add'
  path: OpPath[]
  value: T
}
type OpRemove = {
  op: 'remove'
  path: OpPath[]
}
type OpReplace<T> = {
  op: 'replace'
  path: OpPath[]
  value: T
}
type Op<T = any> = OpAdd<T> | OpReplace<T> | OpRemove
type Data = {
  canaries: string[]
  operations: Record<string, Op<string>[]>
}
export function generateS3Client(
  debug: (message: string) => void,
  options?: ConstructorParameters<typeof S3>[0]
) {
  const s3 = new S3(
    options || {
      region: 'ap-northeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    }
  )
  return { download, upload }

  async function download(bucket: string, keys: string[]): Promise<Data> {
    const result = await Promise.all(keys.map(key => d(bucket, key))).then(
      ([canaries, operations]) => ({
        canaries: Array.isArray(canaries) ? canaries : [],
        operations: Array.isArray(operations) || !operations ? {} : operations,
      })
    )
    return result
  }

  async function upload(bucket: string, keys: string[], bodies: unknown[]) {
    await Promise.all(keys.map((key, index) => u(bucket, key, bodies[index])))
  }

  async function d(bucket: string, key: string): Promise<Data['canaries'] | Data['operations']> {
    try {
      const result = await s3.getObject({ Bucket: bucket, Key: key }).promise()
      const json = result.Body.toString('utf-8')
      debug(`download: "${json}"`)
      const canaries = JSON.parse(json)

      return canaries
    } catch (e) {
      if (e.code === 'NoSuchKey') {
        return undefined
      }
      throw e
    }
  }

  async function u(bucket: string, key: string, body: unknown) {
    const json = JSON.stringify(body)
    debug(`upload: "${json}"`)
    return await s3.upload({ Bucket: bucket, Key: key, Body: json }).promise()
  }
}
