#!/usr/bin/node

const https = require('https')
const hostname = 'challenge.curbside.com'

function fetch (path, headers = {}) {
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

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getSecret () {
  const sessionData = await fetch('get-session')
  const headers = {Session: sessionData['session']}
  search('start', headers).then(secret => {
    console.log(secret)
  })
}

async function getNode (nodeID, headers) {
  let data
  let success = false

  while (!success) {
    try {
      data = await fetch(nodeID, headers)
      success = true
    } catch (e) {
      const wait = Math.random() * 1000
      await sleep(wait)
    }
  }

  return normalizeData(data)
}

function normalizeData (data) {
  Object.keys(data).map(key => {
    data[key.toLowerCase()] = data[key]
  })

  if (data.hasOwnProperty('next') && !Array.isArray(data['next'])) {
    data['next'] = Array(data['next'])
  }

  return data
}

function search (nodeID, headers, secret = '') {
  return new Promise((resolve, reject) => {
    getNode(nodeID, headers).then(data => {
      if (data.hasOwnProperty('secret')) {
        resolve(data['secret'])
        return
      }

      let childPromises = []

      for (let nextId of data['next']) {
        childPromises.push(search(nextId, headers, secret))
      }

      Promise.all(childPromises)
        .then(letters => {
          for (let letter of letters) {
            secret += letter
          }
          resolve(secret)
        })
    })
  })
}

getSecret()
