const request = require('requestretry')
const cheerio = require('cheerio')
const ProgressBar = require('./progress')
const fs = require('fs')

class Build {
  constructor() {
    this.pipeline = [
      { name: 'base_items', fn: this.scrapeWowheadListing }
    ]
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
        this.saveJSON(fileOut, result)
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
      const url = `https://classic.wowhead.com/items?filter=151:151;2:5;${i}:${i + stepSize}`

      const req = await request({
        url,
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
}

const build = new Build()
build.start()
