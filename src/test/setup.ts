import '@testing-library/jest-dom'

// Node 22+ exposes a built-in localStorage global that lacks .clear() and
// other standard Storage methods. Override it with a proper in-memory
// implementation so tests can rely on the full Web Storage API.
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: createLocalStorageMock(),
  writable: true,
})

beforeEach(() => localStorage.clear())
