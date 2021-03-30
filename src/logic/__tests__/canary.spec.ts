import { generateCanaryProcessor } from '../canary'

import { generateS3Client } from '../s3'
jest.mock('../s3')

function debug(message: string) {
  // console.log(message)
}
const bucket = 'private.karakuri.ninja'
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
      await testA.process('create', refs.dev1)
      await testB.process('create', refs.dev2)
      await testC.process('create', refs.dev3)
      await testA.postProcess(refs.dev1, 'success')
      await testB.postProcess(refs.dev2, 'success')
      await testC.postProcess(refs.dev3, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['dev1', 'dev2', 'dev3'], operations: {} })
    })
    it('create2 - 失敗', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1)
      await testB.process('create', refs.dev2)
      await testC.process('create', refs.dev3)
      await testA.postProcess(refs.dev1, 'failure')
      await testB.postProcess(refs.dev2, 'success')
      await testC.postProcess(refs.dev3, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['', 'dev2', 'dev3'], operations: {} })
    })
    it('create3 - 実行中の処理がある場合は末尾追加', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1)
      await testB.process('create', refs.dev2)
      await testC.process('create', refs.dev3)
      await testA.postProcess(refs.dev1, 'failure')
      await testA.process('create', refs.dev1)
      await testB.postProcess(refs.dev2, 'success')
      await testC.postProcess(refs.dev3, 'success')
      await testA.postProcess(refs.dev1, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['', 'dev2', 'dev3', 'dev1'], operations: {} })
    })
    it('create4 - 実行中の処理がない場合はslotを埋める', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1)
      await testB.process('create', refs.dev2)
      await testC.process('create', refs.dev3)
      await testA.postProcess(refs.dev1, 'failure')
      await testB.postProcess(refs.dev2, 'success')
      await testC.postProcess(refs.dev3, 'success')
      await testA.process('create', refs.dev1)
      await testA.postProcess(refs.dev1, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['dev1', 'dev2', 'dev3'], operations: {} })
    })
    it('create5 - ランダム', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1)
      await testB.process('create', refs.dev2)
      await testC.process('create', refs.dev3)
      await testC.postProcess(refs.dev3, 'success')
      await testB.postProcess(refs.dev2, 'success')
      await testA.postProcess(refs.dev1, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['dev1', 'dev2', 'dev3'], operations: {} })
    })
  })
  describe('update', () => {
    it('update1', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1)
      await testB.process('create', refs.dev2)
      await testC.process('create', refs.dev3)
      await testA.postProcess(refs.dev1, 'failure')
      await testA.process('create', refs.dev1)
      await testB.postProcess(refs.dev2, 'success')
      await testC.postProcess(refs.dev3, 'success')
      await testA.postProcess(refs.dev1, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['', 'dev2', 'dev3', 'dev1'], operations: {} })
    })
  })
  describe('remove', () => {
    it('remove1', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1)
      await testB.process('create', refs.dev2)
      await testC.process('create', refs.dev3)
      await testA.postProcess(refs.dev1, 'failure')
      await testA.process('create', refs.dev1)
      await testB.postProcess(refs.dev2, 'success')
      await testC.postProcess(refs.dev3, 'success')
      await testA.postProcess(refs.dev1, 'success')

      await testB.process('remove', refs.dev2, 'branch')
      await testB.process('remove', refs.dev2, 'branch')
      await testB.postProcess(refs.dev2, 'success')
      await testB.postProcess(refs.dev2, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['', '', 'dev3', 'dev1'], operations: {} })
    })
    it('removeはpost processで戻さない', async () => {
      const [s3, testA, testB, testC] = generateProcessors()
      await testA.process('create', refs.dev1)
      await testB.process('create', refs.dev2)
      await testC.process('create', refs.dev3)
      await testA.postProcess(refs.dev1, 'failure')
      await testA.process('create', refs.dev1)
      await testB.postProcess(refs.dev2, 'success')
      await testC.postProcess(refs.dev3, 'success')
      await testA.postProcess(refs.dev1, 'success')

      await testB.process('remove', refs.dev2, 'branch')
      await testC.process('remove', refs.dev2, 'branch')
      await testB.postProcess(refs.dev2, 'failure')

      await testC.postProcess(refs.dev2, 'success')
      const result = await s3.download(bucket, key)
      expect(result).toStrictEqual({ canaries: ['', '', 'dev3', 'dev1'], operations: {} })
    })
  })
})
