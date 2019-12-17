const request = require('requestretry')
const cheerio = require('cheerio')

class Build {
  /**
   * Starts the build process
   */
  async start () {
    const baseItems = await this.scrapeWowheadListing()
  }

  /**
   * Scrapes the item listings of Wowhead.
   * This returns ALL (even weird, unobtainable ones) raw items { itemId, name, icon }
   */
  async scrapeWowheadListing () {
    const items = []

    // Filter the items by ID (total ID range about 24000).
    const stepSize = 500 // Wowhead can only show about 500 items per page.
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
    }

    return items
  }
}

const build = new Build()
build.start()
