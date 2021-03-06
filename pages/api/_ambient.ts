import { timeout } from '@bothrs/util/async'
import { postJSON } from '@bothrs/util/fetch'

const AMBIENT_URL = 'https://ambient-1.herokuapp.com'
// const AMBIENT_URL = 'http://localhost:50505'

type WorkerResponse = {
  url: string
  error?: {
    message: string
  }
  message?: string
  poll?: number
}

export class RemoteWorker {
  url = ''
  options?: { alias?: string; retry?: number }
  _instance?: Promise<WorkerResponse>
  _timeout = 6000
  server = AMBIENT_URL
  onmessage: (data: any) => void = () => {}
  unhandledrejection: (data: any) => void = () => {}

  constructor(url: string, options?: { alias?: string }) {
    console.log('api/_ambient constructor')
    this.url = url
    this.options = options
  }

  get instance() {
    if (!this._instance) {
      console.log(
        'api/_ambient first instance',
        JSON.stringify({ url: this.url.slice(0, 50), options: this.options })
      )
      this._instance = Promise.race([
        timeout(this._timeout).then(() => Promise.reject(new Error('timeout'))),
        postJSON(AMBIENT_URL, {
          url: this.url,
          options: this.options,
        }),
      ]).catch((e) => {
        console.log('api/_ambient fail instance', e.message)
        return Promise.reject(e)
      })
      this._instance.then((x) => this.handle(x))
    } else {
      console.log('api/_ambient get instance')
    }
    return this._instance
  }

  get active() {
    return !!this._instance
  }

  async request(message: any): Promise<any> {
    console.log('api/_ambient request', message)
    const response = await this.instance.then(({ url }) =>
      postJSON(url, { message })
    )
    console.log('api/_ambient response', message, '=>', response)
    if ('error' in response) {
      if (response.error.status === 404) {
        this._instance = undefined
        if (this.options?.retry) {
          this.options.retry--
          await timeout(this._timeout)
          this._timeout *= 2
          return this.request(message)
        }
        throw new Error('Failed to request Worker')
      }
      if (response.error.message) {
        throw new Error(response.error.message)
      }
      throw new Error('Unexpected Worker error')
    }
    if ('message' in response) {
      return response.message
    }
    throw new Error('Invalid response')
  }

  postMessage(message: any) {
    console.log('api/_ambient postMessage')
    this.instance.then(({ url }) =>
      postJSON(url, { message }).then((x) => this.handle(x))
    )
  }
  /** Handle worker response */
  handle(response: WorkerResponse) {
    if (!response.url) {
      console.error('api/_ambient handle response url missing')
      return
    }
    console.log('api/_ambient handle', response)
    if ('error' in response) {
      if (typeof this.unhandledrejection === 'function') {
        this.unhandledrejection(response.message)
      }
    }
    if ('message' in response) {
      if (typeof this.onmessage === 'function') {
        this.onmessage(response.message)
      }
    }
    if ('poll' in response) {
      setTimeout(
        () => postJSON(response.url, {}).then(this.handle),
        response.poll
      )
    }
  }
}

// export class Service {
//   _booting: Promise<object> | null = null

//   name = ''

//   constructor({ name }: { name: string }) {
//     this.name = name
//   }

//   get booting() {
//     if (!this._booting) {
//       this._booting = this.boot({})
//     }
//     return this._booting
//   }

//   async boot(options: any) {
//     throw new Error('Unknown service')
//     return {}
//   }
// }

// const memory: { [key: string]: any } = {}
// export class KeyValueStore extends Service {
//   constructor(rest: any = {}) {
//     super({ name: 'KeyValueStore', ...rest })
//   }

//   async boot(options: any) {
//     throw new Error('Unknown service')
//     return {}
//   }

//   async get(key: string) {
//     await this.booting
//     return memory[key]
//   }
//   async set(key: string, value: any) {
//     await this.booting
//     memory[key] = value
//   }
// }
