import { parse, reverse, update } from '../util'

describe('util', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  describe('parse', () => {
    it('staging', () => {
      const result = parse('canary2/aaa/develop')
      expect(result).toStrictEqual('aaa')
    })
    it('production', () => {
      const result = parse('test-canary2/aaa/master')
      expect(result).toStrictEqual('aaa')
    })
    it('empty', () => {
      const result = parse(undefined)
      expect(result).toStrictEqual(undefined)
    })
    it('invalid', () => {
      const result = parse('test')
      expect(result).toStrictEqual(undefined)
    })
  })

  describe('reverse', () => {
    it('update', () => {
      const result = reverse('test')
      expect(result).toBe('update')
    })
    it('create', () => {
      const result = reverse('create')
      expect(result).toBe('remove')
    })
    it('remove', () => {
      const result = reverse('remove')
      expect(result).toBe('update')
    })
  })

  describe('update', () => {
    describe('remove', () => {
      it('nothing', () => {
        const result = update('remove', [], '', {})
        expect(result).toStrictEqual([])
      })
      it('remove', () => {
        const result = update('remove', ['dev1', 'dev2', 'dev3'], 'dev1', {})
        expect(result).toStrictEqual(['', 'dev2', 'dev3'])
      })
    })
    describe('create', () => {
      it('create', () => {
        const result = update('create', ['', 'dev2', 'dev3'], 'dev4', {})
        expect(result).toStrictEqual(['dev4', 'dev2', 'dev3'])
      })
      it('operating', () => {
        const result = update('create', ['', 'dev2', 'dev3'], 'dev4', { aaa: {} })
        expect(result).toStrictEqual(['', 'dev2', 'dev3', 'dev4'])
      })
    })
    describe('update', () => {
      it('create', () => {
        const result = update('create', ['', 'dev2', 'dev3'], 'dev3', {})
        expect(result).toStrictEqual(['', 'dev2', 'dev3'])
      })
    })
  })
})
