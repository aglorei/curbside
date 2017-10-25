const https = require('https')
const hostname = 'challenge.curbside.com'

const fetch = (path, headers = {}) => {
  return new Promise((resolve, reject) => {
    const options = {
      headers: headers,
      hostname: hostname,
      method: 'GET',
      path: '/' + path,
      port: 443
    }

    const req = https.request(options, (res) => {
      switch (res.statusCode) {
        case 200:
          res.on('data', (d) => {
            resolve(JSON.parse(d.toString()))
          })
          break
        case 429:
          res.on('data', (d) => {
            reject(JSON.parse(d.toString()))
          })
      }
    })

    req.on('error', (e) => {
      reject(e)
    })

    req.end()
  })
}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class Session {
  constructor () {
    this._stack = []
    this._secret = ''
  }

  get stack ()        { return this._stack }
  set stack (node_id) { this._stack.push(node_id) }
  get secret ()       { return this._secret }
  set secret (secret) { this._secret += secret }

  async get_session () {
    const data = await fetch('get-session')
    this.session = data['session']
    this.expire_at = data['expire_at']
    this.headers = {Session: this.session}
    await this.search()
  }

  async get_node (node_id) {
    let data
    let success = false

    while (!success) {
      try {
        data = await fetch(node_id, this.headers)
        success = true
      } catch(e) {
        const wait = Math.random() * 1000
        await sleep(wait)
      }
    }

    Object.keys(data).map(key => {
      data[key.toLowerCase()] = data[key]
    })

    if (data.hasOwnProperty('next') && !Array.isArray(data['next'])) {
      data['next'] = Array(data['next'])
    }

    return data
  }

  async search (node_id = 'start') {
    this.stack = node_id
    const data = await this.get_node(node_id)

    if (data.hasOwnProperty('secret')) {
      this.secret = data['secret']
    }

    if (data.hasOwnProperty('next')) {
      for (let id of data['next']) {
        if (!this.stack.includes(id)) {
          this.search(id)
        }
      }
    }
  }
}
