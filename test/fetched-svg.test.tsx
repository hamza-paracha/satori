import { afterEach, describe, expect, it, vi } from 'vitest'

import satori from '../src/index.js'
import {
  cache,
  inflightRequests,
  resolveImageData,
} from '../src/handler/image.js'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"/>'
const URL = 'https://8.8.8.8/image.svg'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  cache.clear()
  inflightRequests.clear()
})

describe('fetched SVG content types', () => {
  it.each([
    'image/svg+xml',
    'application/svg+xml',
    'image/svg+xml; charset=utf-8',
    'application/svg+xml; charset=UTF-8',
    'IMAGE/SVG+XML',
    'Image/Svg+Xml ; charset=utf-8',
  ])('loads %s responses', async (contentType) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(SVG, { headers: { 'content-type': contentType } })
      )
    )
    const src = `data:image/svg+xml;base64,${btoa(SVG)}`

    await expect(resolveImageData(URL)).resolves.toEqual([src, 20, 10])
    const svg = await satori(<img src={URL} />, {
      width: 20,
      height: 10,
      fonts: [],
    })
    expect(svg).toContain(src)
  })

  it.each([null, '', 'text/plain; charset=utf-8'])(
    'does not treat a %s response as SVG',
    async (contentType) => {
      const error = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined)
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(new TextEncoder().encode(SVG), {
              headers:
                contentType === null ? {} : { 'content-type': contentType },
            })
        )
      )

      await expect(resolveImageData(URL)).resolves.toEqual([])
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported image type: unknown')
      )
    }
  )
})
