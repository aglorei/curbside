const https = require('https')
const hostname = 'challenge.curbside.com'

class Session {
  constructor () {
    this._stack = []
    this._message = ''
  }

  get stack ()          { return this._stack }
  set stack (node_id)   { this._stack.push(node_id) }
  get message ()        { return this._message }
  set message (message) { this._message += message }

  async get_session () {
    const data = await this.fetch('get-session')
    this.session = data['session']
    this.expire_at = data['expire_at']
    this.headers = {Session: this.session}
    this.search()
  }

  async get_node (node_id) {
    await this.sleep(1500)
    const data = await this.fetch(node_id, this.headers)

    Object.keys(data).map(key => {
      data[key.toLowerCase()] = data[key]
    })

    if (data.hasOwnProperty('next') && !Array.isArray(data['next'])) {
      data['next'] = Array(data['next'])
    }
    return data
  }

  search (node_id = 'start') {
    this.stack = node_id

    this.get_node(node_id)
      .then(data => {
        if (data.hasOwnProperty('message')) {
          this.message = data['message']
        }
        if (data.hasOwnProperty('next')) {
          data['next'].forEach(id => {
            if (!this.stack.includes(id)) {
              this.search(id)
            }
          })
        }
      })
  }

  fetch (path, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: headers,
        hostname: hostname,
        method: 'GET',
        path: '/' + path,
        port: 443
      }

      const req = https.request(options, (res) => {
        res.on('data', (d) => {
          console.log(JSON.parse(d.toString()))
          resolve(JSON.parse(d.toString()))
        })
      })

      req.on('error', (e) => {
        reject(e)
      })

      req.end()
    })
  }

  sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
}
