#!/usr/bin/node

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
      let fulfillment
      switch (res.statusCode) {
        case 200:
          fulfillment = resolve
          break
        default:
          fulfillment = reject
      }

      res.on('data', (d) => {
        const data = JSON.parse(d.toString())
        fulfillment(data)
      })
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

  async get_session () {
    const data = await fetch('get-session')
    this.session = data['session']
    this.expire_at = data['expire_at']
    this.headers = {Session: this.session}
    this.search().then(secret => {
      console.log(secret)
    })
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

  search (node_id = 'start', secret = '') {
    return new Promise((resolve, reject) => {
      this.stack = node_id
      this.get_node(node_id).then(data => {
        if (data.hasOwnProperty('secret')) {
          resolve(data['secret'])
        }

        let child_promises = []

        if (data.hasOwnProperty('next')) {
          for (let id of data['next']) {
            if (!this.stack.includes(id)) {
              child_promises.push(this.search(id, secret))
            }
          }
        }

        Promise.all(child_promises)
          .then(letters => {
            for (let letter of letters) {
              secret += letter
            }
            resolve(secret)
          })
      })
    })
  }
}

const sess = new Session()
sess.get_session()
