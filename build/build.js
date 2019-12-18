const request = require('requestretry')
const cheerio = require('cheerio')
const ProgressBar = require('./progress')
const fs = require('fs')
const colors = require('colors/safe')

class Build {
  constructor (blizzardToken = 'blizzard_token') {
    this.pipeline = [
      { name: 'base_items', fn: this.scrapeWowheadListing },
      { name: 'item_desc', fn: this.scrapeBlizzardAPI.bind(this) },
      { name: 'crafting', fn: this.scrapeWowheadCrafting }
    ]

    try {
      this.blizzardToken = fs.readFileSync(`${__dirname}/../${blizzardToken}`, 'utf8').trim()
    } catch (err) {
      if (err.code !== 'ENOENT') throw err // Don't throw error if file simply doesn't exist
      else this.warn('Blizzard Token could not be found')
    }
  }

  /**
   * Starts the build process.
   */
  async start () {
    let stageResult
    for (const stage of this.pipeline) {
      stageResult = await stage.fn(stageResult)
    }
    this.saveJSON('build/data.json', stageResult)
  }

  /**
   * Only perform a single step of the whole pipeline, with a specified output or input file.
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
   * Scrapes the information of the official Blizzard API (Requires an API key)
   * Updates the given data with more description (class, subclass, sellPrice, quality, itemLevel, requiredLevel, slot)
   * Also sanitizes the input by throwing everything away the Blizzard API doesn't know.
   */
  async scrapeBlizzardAPI (input) {
    if (!this.blizzardToken) {
      console.log('Skipping this stage because blizzard token could not be found.')
      return input
    }

    const items = []

    // Fetch function so we can parallelize it
    const fetchItem = async (item) => {
      const req = await request({
        url: `https://us.api.blizzard.com/data/wow/item/${item.itemId}?namespace=static-classic-us&locale=en_US&access_token=${this.blizzardToken}`,
        json: true
      })

      const res = req.body

      // Catch unknown error codes or sanitize input if known
      if (res.code) {
        if (res.detail !== 'Not Found') this.warn(`Unknown Blizzard Error with code ${res.code} on item ${item.itemId}: ${res.detail}`)
        return
      }

      // Update item with basic desc
      item.class = res.item_class.name
      item.subclass = res.item_subclass.name
      item.sellPrice = res.sell_price
      item.quality = res.quality.name
      item.itemLevel = res.level
      item.requiredLevel = res.required_level

      // Add slot if item can be equipped
      if (res.inventory_type.name) item.slot = res.inventory_type.name
      else if (res.inventory_type.type === 'RANGEDRIGHT') item.slot = 'Ranged' // Catch weird edge case

      items.push(item)
    }

    let parallel = []
    const batchSize = 100 // Blizzard throttling limit is 100/s
    const progress = new ProgressBar('Fetching item descriptions', input.length / batchSize)
    for (let i = 0; i < input.length; i++) {
      const item = input[i]
      parallel.push(fetchItem(item))
      if (parallel.length >= batchSize || i === input.length - 1) {
        await Promise.all(parallel)
        progress.tick()
        parallel = []
      }
    }

    return items
  }

  /**
   * Scrapes all crafting related information from Wowhead.
   */
  async scrapeWowheadCrafting (input) {
    const applyCraftingInfo = async (item) => {
      const req = await request({
        url: `https://classic.wowhead.com/item=${item.itemId}`,
        json: true
      })

      // Categories. Hardcode taken from Wowhead source code
      const categories = {
        333: 'Enchanting',
        202: 'Engineering',
        197: 'Tailoring',
        186: 'Mining',
        185: 'Cooking',
        171: 'Alchemy',
        165: 'Leatherworking',
        164: 'Blacksmithing',
        129: 'First Aid'
      }

      // Wowhead uses JavaScript to load in their table content, so we'd need something like Selenium to get the HTML.
      // However, that is really painful and slow. Fortunately, with some parsing the table content is available in the source code.
      // We just have to search for the right ListView() with crafting information.
      const $ = cheerio.load(req.body)
      const tableContentRaw = $('script[type="text/javascript"]').get()
      let foundCreatedBy = false
      for (const contentRaw of tableContentRaw) {
        const content = contentRaw.children[0].data
        if (!content.includes('new Listview({')) continue

        const listViews = content.split('new Listview({')
        for (const listView of listViews) {
          const props = listView.split('\n')
          for (const prop of props) {
            if (prop.includes('id: \'created-by-spell\'')) foundCreatedBy = true
            if (foundCreatedBy && prop.includes('data:')) {
              // Array of spells this item is created by
              const data = JSON.parse(prop.slice(prop.indexOf('data:') + 5, -1))
              for (const spell of data) {
                // Filter out some edge cases
                if (spell.cat === 0 || !spell.skill || !spell.skill.length) continue

                if (!item.createdBy) item.createdBy = []
                const createdByEntry = {
                  amount: spell.creates.slice(1),
                  requiredSkill: spell.learnedat,
                  category: categories[spell.skill[0]] || spell.skill[0],
                  reagents: []
                }
                if (spell.reagents) { createdByEntry.reagents = spell.reagents.map((r) => {
                  return { itemId: r[0], amount: r[1] }
                }) }
                item.createdBy.push(createdByEntry)
              }
            }
          }
          if (foundCreatedBy) break
        }
      }
    }

    let parallel = []
    const batchSize = 200
    const progress = new ProgressBar('Fetching crafting info', input.length / batchSize)
    for (let i = 0; i < input.length; i++) {
      const item = input[i]
      parallel.push(applyCraftingInfo(item))
      if (parallel.length >= batchSize || i === input.length - 1) {
        await Promise.all(parallel)
        progress.tick()
        parallel = []
      }
    }

    return input
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
   * Cosmetic function for build warnings.
   */
  warn (message) {
    console.log(`${colors.yellow('Warning')}: ${message}`)
  }
}

const build = new Build()
build.start()
