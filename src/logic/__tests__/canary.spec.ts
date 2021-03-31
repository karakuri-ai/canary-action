import { generateCanaryProcessor } from '../canary'

import { generateS3Client } from '../s3'
jest.mock('../s3')

function debug(message: string) {
  // console.log(message)
}
const bucket = 'bucket'
const key = 'canaries.json'
const refs = {
  dev1: 'canary2/dev1/develop',
  dev2: 'canary2/dev2/develop',
  dev3: 'canary2/dev3/develop',
}
const mockGenerateS3Client = generateS3Client as jest.MockedFunction<typeof generateS3Client>
mockGenerateS3Client.mockImplementation(() => {
  const data = {
    canaries: [],
    operations: {},
  }
  return {
    download: (bucket, key) => {
      return Promise.resolve(data)
    },
    upload: (bucket, key, body) => {
      data.canaries = body.canaries
      data.operations = body.operations
      return Promise.resolve({} as any)
    },
  }
})
function generateProcessors() {
  const s3 = mockGenerateS3Client(debug)
  const testA = generateCanaryProcessor(debug, s3, 'testA')
  const testB = generateCanaryProcessor(debug, s3, 'testB')
  const testC = generateCanaryProcessor(debug, s3, 'testC')
  return [s3, testA, testB, testC] as const
}

describe('canary', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  describe('create', () => {
    it('create1 - 作成', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1, bucket)
      await testB.process('create', refs.dev2, bucket)
      await testC.process('create', refs.dev3, bucket)
      await testA.postProcess(bucket, 'success')
      await testB.postProcess(bucket, 'success')
      await testC.postProcess(bucket, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['dev1', 'dev2', 'dev3'], operations: {} })
    })
    it('create2 - 失敗', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1, bucket)
      await testB.process('create', refs.dev2, bucket)
      await testC.process('create', refs.dev3, bucket)
      await testA.postProcess(bucket, 'failure')
      await testB.postProcess(bucket, 'success')
      await testC.postProcess(bucket, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['', 'dev2', 'dev3'], operations: {} })
    })
    it('create3 - 実行中の処理がある場合は末尾追加', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1, bucket)
      await testB.process('create', refs.dev2, bucket)
      await testC.process('create', refs.dev3, bucket)
      await testA.postProcess(bucket, 'failure')
      await testA.process('create', refs.dev1, bucket)
      await testB.postProcess(bucket, 'success')
      await testC.postProcess(bucket, 'success')
      await testA.postProcess(bucket, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['', 'dev2', 'dev3', 'dev1'], operations: {} })
    })
    it('create4 - 実行中の処理がない場合はslotを埋める', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1, bucket)
      await testB.process('create', refs.dev2, bucket)
      await testC.process('create', refs.dev3, bucket)
      await testA.postProcess(bucket, 'failure')
      await testB.postProcess(bucket, 'success')
      await testC.postProcess(bucket, 'success')
      await testA.process('create', refs.dev1, bucket)
      await testA.postProcess(bucket, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['dev1', 'dev2', 'dev3'], operations: {} })
    })
    it('create5 - ランダム', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1, bucket)
      await testB.process('create', refs.dev2, bucket)
      await testC.process('create', refs.dev3, bucket)
      await testC.postProcess(bucket, 'success')
      await testB.postProcess(bucket, 'success')
      await testA.postProcess(bucket, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['dev1', 'dev2', 'dev3'], operations: {} })
    })
  })
  describe('update', () => {
    it('update1', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1, bucket)
      await testB.process('create', refs.dev2, bucket)
      await testC.process('create', refs.dev3, bucket)
      await testA.postProcess(bucket, 'failure')
      await testA.process('create', refs.dev1, bucket)
      await testB.postProcess(bucket, 'success')
      await testC.postProcess(bucket, 'success')
      await testA.postProcess(bucket, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['', 'dev2', 'dev3', 'dev1'], operations: {} })
    })
  })
  describe('remove', () => {
    it('remove1', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1, bucket)
      await testB.process('create', refs.dev2, bucket)
      await testC.process('create', refs.dev3, bucket)
      await testA.postProcess(bucket, 'failure')
      await testA.process('create', refs.dev1, bucket)
      await testB.postProcess(bucket, 'success')
      await testC.postProcess(bucket, 'success')
      await testA.postProcess(bucket, 'success')

      await testB.process('remove', refs.dev2, bucket, 'branch')
      await testB.process('remove', refs.dev2, bucket, 'branch')
      await testB.postProcess(bucket, 'success')
      await testB.postProcess(bucket, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['', '', 'dev3', 'dev1'], operations: {} })
    })
    it('removeはpost processで戻さない', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1, bucket)
      await testB.process('create', refs.dev2, bucket)
      await testC.process('create', refs.dev3, bucket)
      await testA.postProcess(bucket, 'failure')
      await testA.process('create', refs.dev1, bucket)
      await testB.postProcess(bucket, 'success')
      await testC.postProcess(bucket, 'success')
      await testA.postProcess(bucket, 'success')

      await testB.process('remove', refs.dev2, bucket, 'branch')
      await testC.process('remove', refs.dev2, bucket, 'branch')
      await testB.postProcess(bucket, 'failure')

      await testC.postProcess(bucket, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['', '', 'dev3', 'dev1'], operations: {} })
    })
  })
})
