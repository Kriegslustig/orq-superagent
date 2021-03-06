// @flow

import { Observable as O } from 'rxjs'
import request from '../'

const url = 'https://example.com'

type Response = {
  body?: any,
  headers?: { [string]: string },
  status?: number,
}
type SuperagentRequest = {
  redirects: (number) => void,
  set: () => void,
  send: () => void,
  abort: ((err: ?any, Response) => void) => void,
  end: () => void,
  response: ?Response,
}

const superagentMock = (result = [null, {
  body: {},
  status: 200,
  headers: {},
}]) => {
  const superagent = jest.fn()
  const set = jest.fn()
  const send = jest.fn()
  const abort = jest.fn()
  const redirects = jest.fn()
  const end = jest.fn((cb) => {
    request.response = result[1]
    cb(...result)
  })
  const request: SuperagentRequest =
    { set, send, end, abort, response: null, redirects }
  superagent.mockReturnValue(request)
  return { superagent, set, send, end, abort, redirects }
}

describe('request', () => {
  it('should make a GET request by default', () => {
    const { superagent } = superagentMock()
    request(url, {}, superagent).subscribe()
    expect(superagent).toBeCalledWith('GET', url)
  })

  it('should send headers', () => {
    const { superagent, set } = superagentMock()
    const headers = { a: 'b' }
    const next = jest.fn()

    request(url, { headers }, superagent).subscribe()

    expect(set).toBeCalledWith(headers)
  })

  it('should pass the response headers to the subscriber', () => {
    const response = { headers: { a: 'b' } }
    const { superagent } = superagentMock([ null, response ])
    const next = jest.fn()

    request(url, {}, superagent).subscribe(next)

    expect(next).toBeCalledWith(response)
  })

  it('should throw if the callback is called with an error', () => {
    const response = { status: 500 }
    const { superagent } = superagentMock([ true, response ])
    const errorHandler = jest.fn()

    request(url, {}, superagent).subscribe(null, errorHandler)

    const param = errorHandler.mock.calls[0][0]
    expect(param.response).toMatchObject(response)
    expect(typeof param.message).toBe('string')
  })

  it('should simply return no response if there is an error and no response', () => {
    const { superagent } = superagentMock([ true, null ])
    const errorHandler = jest.fn()

    request(url, {}, superagent).subscribe(null, errorHandler)

    expect(errorHandler).toBeCalled()
  })

  it('should cancel the request if the observable is unsubscribed from', () => {
    const { superagent, abort, end } = superagentMock()
    end.mockImplementation(() => {})
    const o$ = request(url, {}, superagent).subscribe()

    o$.unsubscribe()

    expect(abort).toBeCalled()
  })

  it('should use the specified method', () => {
    const { superagent } = superagentMock()
    const method = 'POST'

    request(url, { method }, superagent).subscribe()

    expect(superagent).toBeCalledWith(method, url)
  })

  it('should send the specified body along with the request', () => {
    const { superagent, send } = superagentMock()
    const body = { x: true }

    request(url, { method: 'POST', body }, superagent).subscribe()

    expect(send).toBeCalledWith(body)
  })

  it('should should use the passed instance of superagent', () => {
    const { superagent } = superagentMock()
    request(url, {}, superagent).subscribe()
    expect(superagent).toBeCalled()
  })

  it('should pass redirects to superagent', () => {
    const { superagent, redirects } = superagentMock()
    request(url, { redirects: 0 }, superagent).subscribe()
    expect(redirects).toBeCalledWith(0)
  })

  it('should pass thrown redirects as next values', () => {
    const response = { status: 302 }
    const { superagent } = superagentMock([ true, response ])
    const next = jest.fn()

    request(url, {}, superagent).subscribe(next)

    expect(next).toHaveBeenCalled()
  })
})
