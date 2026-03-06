import 'fake-indexeddb/auto'
import { saveAudioBlob, getAudioBlob, deleteAudioBlob } from './audio-storage'

describe('audio-storage', () => {
  it('returns null for non-existent id', async () => {
    const blob = await getAudioBlob('nonexistent')
    expect(blob).toBeNull()
  })

  it('saves and retrieves audio blob', async () => {
    const blob = new Blob(['test audio'], { type: 'audio/webm' })
    await saveAudioBlob('audio-1', blob)
    const result = await getAudioBlob('audio-1')
    expect(result).not.toBeNull()
    expect(result!.size).toBe(blob.size)
    expect(result!.type).toBe('audio/webm')
  })

  it('overwrites existing blob with same id', async () => {
    const blob1 = new Blob(['first'], { type: 'audio/webm' })
    const blob2 = new Blob(['second recording'], { type: 'audio/webm' })
    await saveAudioBlob('audio-1', blob1)
    await saveAudioBlob('audio-1', blob2)
    const result = await getAudioBlob('audio-1')
    expect(result!.size).toBe(blob2.size)
  })

  it('deletes audio blob', async () => {
    const blob = new Blob(['test'], { type: 'audio/webm' })
    await saveAudioBlob('audio-1', blob)
    await deleteAudioBlob('audio-1')
    const result = await getAudioBlob('audio-1')
    expect(result).toBeNull()
  })

  it('delete is a no-op for non-existent id', async () => {
    await expect(deleteAudioBlob('nonexistent')).resolves.not.toThrow()
  })
})
