const request = require('requestretry')
const cheerio = require('cheerio')
const ProgressBar = require('./progress')
const fs = require('fs')
const colors = require('colors/safe')

class Build {
  constructor(blizzardToken = 'blizzard_token') {
    this.pipeline = [
      { name: 'base_items', fn: this.scrapeWowheadListing },
      { name: 'item_desc', fn: this.scrapeBlizzardAPI.bind(this) }
    ]

    try {
      this.blizzardToken = fs.readFileSync(`${__dirname}/../${blizzardToken}`, 'utf8').trim()
    } catch (err) {
      if (err.code !== 'ENOENT') throw err // Don't throw error if file simply doesn't exist
      else this.warn('Blizzard Token could not be found')
    }
  }

  /**
   * Starts the build process
   */
  async start () {
    let stageResult = undefined
    for (const stage of this.pipeline) {
      stageResult = await stage.fn(stageResult)
    }
    this.saveJSON('json/data.json', stageResult)
  }

  /**
   * Only perform a single step of the whole pipeline, with a specified output or input
   */
  async step (step, fileOut, fileIn = false) {
    const transform = (name) => name.replace(/_/g, '').toLowerCase() // Helper function so naming conventions don't conflict
    for (const stage of this.pipeline) {
      if (transform(stage.name) === transform(step)) {
        const result = await stage.fn(fileIn ? this.readJSON(fileIn) : undefined)
        if (fileOut) this.saveJSON(fileOut, result)
        break
      }
    }
  }

  /**
   * Scrapes the item listings of Wowhead.
   * This returns ALL (even weird, unobtainable ones) raw items { itemId, name, icon }
   */
  async scrapeWowheadListing () {
    const items = []

    // Filter the items by ID (total ID range about 24000).
    const stepSize = 500 // Wowhead can only show about 500 items per page.
    const progress = new ProgressBar('Fetching base items', 24000 / stepSize)
    for (let i = 0; i < 24000; i += stepSize) {
      const req = await request({
        url: `https://classic.wowhead.com/items?filter=151:151;2:5;${i}:${i + stepSize}`,
        json: true
      })

      // Wowhead uses JavaScript to load in their table content, so we'd need something like Selenium to get the HTML.
      // However, that is really painful and slow. Fortunately, with some parsing the table content is available in the source code.
      const $ = cheerio.load(req.body)
      const tableContentRaw = $('script[type="text/javascript"]').get()[0].children[0].data.split('\n')[1].slice(26, -2)
      const tableContent = JSON.parse(tableContentRaw)

      for (const key of Object.keys(tableContent)) {
        const item = tableContent[key]
        items.push({
          itemId: parseInt(key),
          name: item.name_enus,
          icon: item.icon
        })
      }

      progress.tick()
    }

    return items
  }

  /**
   * Scrapes the information of the official Blizzard API. (Requires an API key)
   * Updates the given data with more description (class, subclass, slot, sellPrice, quality, itemLevel, requiredLevel)
   * Also sanitizes the input by throwing everything away the Blizzard API doesn't know.
   */
  async scrapeBlizzardAPI (input) {
    if (!this.blizzardToken) {
      console.log('Skipping this stage because blizzard token could not be found.')
      return input
    }

    const items = []
    for (const item of input) {
      const req = await request({
        url: `https://us.api.blizzard.com/data/wow/item/${item.itemId}?namespace=static-classic-us&locale=en_US&access_token=${this.blizzardToken}`,
        json: true
      })
      const res = req.body

      // Catch unknown error codes or sanitize input if known
      if (res.code) {
        if (res.detail !== 'Not Found') {
          this.warn(`Unknown Blizzard Error with code ${res.code} on item ${item.itemId}: ${res.detail}`)
        }
        continue
      }

      // Update item with basic desc
      item.class = res.item_class.name
      item.subclass = res.item_subclass.name
      item.sellPrice = res.sell_price
      item.quality = res.quality.name
      item.itemLevel = res.level
      item.requiredLevel = res.required_level

      // Add slot if item can be equipped
      if (res.inventory_type.hasOwnProperty('name')) item.slot = res.inventory_type.name
      else if (res.inventory_type.type === 'RANGEDRIGHT') item.slot = 'Ranged' // Catch weird edge case

      items.push(item)

      break
    }

    return items
  }

  /**
   * Saves data into a .json file.
   */
  saveJSON (fileName, data) {
    fs.writeFileSync(`${__dirname}/../data/${fileName}`, JSON.stringify(data))
  }

  /**
   * Reads data from a .json file
   */
  readJSON (fileName) {
    return JSON.parse(fs.readFileSync(`${__dirname}/../data/${fileName}`, 'utf8'))
  }

  /**
   * Cosmetic function for build warnings
   */
  warn (message) {
    console.log(`${colors.yellow('Warning')}: ${message}`)
  }
}

const build = new Build()
// build.start()
build.step('item_desc', false, 'tmp/base_items.json')
