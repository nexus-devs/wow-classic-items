const request = require('requestretry')
const cheerio = require('cheerio')
const ProgressBar = require('./progress')
const fs = require('fs')
const colors = require('colors/safe')

class Build {
  constructor (blizzardToken = 'blizzard_token') {
    // Item pipeline
    this.pipeline = [
      { name: 'base_items', fn: this.scrapeWowheadListing },
      { name: 'item_desc', fn: this.scrapeBlizzardAPI.bind(this) },
      { name: 'item_details', fn: this.scrapeWowheadDetail.bind(this) },
      { name: 'unique_names', fn: this.addUniqueNames }
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
    // Run zones
    const zones = this.scrapeWowheadZones()
    this.saveJSON('build/zones.json', zones)

    // Run item pipeline
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
   * This returns all raw items (except the ones marked as deprecated) { itemId, name, icon }
   */
  async scrapeWowheadListing () {
    const items = []

    // Filter the items by ID (total ID range about 24000).
    const stepSize = 500 // Wowhead can only show about 500 items per page.
    const progress = new ProgressBar('Fetching base items', 24000 / stepSize)
    for (let i = 0; i < 24000; i += stepSize) {
      const req = await request({
        url: `https://classic.wowhead.com/items?filter=162:151:151;2:2:5;0:${i}:${i + stepSize}`,
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
   * Scrapes all zone related information
   */
  async scrapeWowheadZones () {
    const zones = []

    const progress = new ProgressBar('Fetching zones', 82)
    const req = await request({
      url: `https://classic.wowhead.com/zones`,
      json: true
    })

    // Wowhead uses JavaScript to load in their table content, so we'd need something like Selenium to get the HTML.
    // However, that is really painful and slow. Fortunately, with some parsing the table content is available in the source code.
    const $ = cheerio.load(req.body)
    const zoneDataRaw = $('script[type="text/javascript"]').get()[0].children[0].data.split('\n')[1].slice(33, -1)
    const zoneData = JSON.parse(zoneDataRaw)

    // Hardcode taken from Wowhead
    const territory = {
      0: 'Alliance',
      1: 'Horde',
      2: 'Contested',
      4: 'PvP'
    }
    const category = {
      1: 'Open World',
      2: 'Dungeon',
      3: 'Raid',
      6: 'Battleground'
    }

    for (const zone of zoneData) {
      zones.push({
        id: zone.id,
        name: zone.name,
        category: category[zone.category],
        level: [zone.minlevel, zone.maxlevel],
        territory: territory[zone.territory]
      })

      progress.tick()
    }

    return zones
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
   * Scrapes all crafting, tooltip and itemLink related information from Wowhead.
   */
  async scrapeWowheadDetail (input) {
    const applyCraftingInfo = async (item) => {
      const req = await request({
        url: `https://classic.wowhead.com/item=${item.itemId}`,
        json: true
      })

      // If you add anything to this, make sure they don't overwrite item properties from each other
      await Promise.all([
        this.parseWowheadDetailCrafting(req, item),
        this.parseWowheadDetailTooltip(req, item),
        this.parseWowheadDetailItemLink(req, item),
        this.parseWowheadDetailVendor(req, item),
        this.parseWowheadDetailContentPhase(req, item)
      ])
    }

    let parallel = []
    const batchSize = 200
    const progress = new ProgressBar('Fetching crafting info', (input.length / batchSize) + 1)
    for (let i = 0; i < input.length; i++) {
      const item = input[i]
      parallel.push(applyCraftingInfo(item))
      if (parallel.length >= batchSize || i === input.length - 1) {
        await Promise.all(parallel)
        progress.tick()
        parallel = []
      }
    }

    // Apply crafting content phase, needs to be done after everything else
    for (const item of input) {
      const createdBy = item.createdBy
      if (!createdBy) continue

      for (let i = 0; i < item.createdBy.length; i++) {
        const recipes = input.filter(currentItem => item.createdBy[i].recipes.includes(currentItem.itemId))

        // Assign the smallest content phase
        let contentPhase = null
        for (const recipe of recipes) {
          if (recipe.contentPhase) {
            if (!contentPhase || recipe.contentPhase < contentPhase) contentPhase = recipe.contentPhase
          } else {
            contentPhase = null
            break
          }
        }
        if (contentPhase) item.createdBy[i].contentPhase = contentPhase
      }
    }
    progress.tick()

    return input
  }

  /**
   * Parses Wowhead detail crafting information.
   * Wowhead uses JavaScript to load in their table content, so we'd need something like Selenium to get the HTML.
   * However, that is really painful and slow. Fortunately, with some parsing the table content is available in the source code.
   * We just have to search for the right ListView() with crafting information ('reagent-for').
   */
  async parseWowheadDetailCrafting (req, item) {
    // Crafting categories. Hardcode taken from Wowhead source code
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
                amount: spell.creates.slice(1).map(a => a <= 0 ? 1 : a), // Sometimes Wowhead items list amount as 0
                requiredSkill: spell.learnedat,
                category: categories[spell.skill[0]] || spell.skill[0],
                reagents: [],
                recipes: await this.parseWowheadDetailCraftingSpell(spell.id)
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

  /**
   * Parses all available recipes for a crafting spell.
   */
  async parseWowheadDetailCraftingSpell (spellId) {
    const recipes = []

    const req = await request({
      url: `https://classic.wowhead.com/spell=${spellId}`,
      json: true
    })

    const $ = cheerio.load(req.body)
    const tableContentRaw = $('script[type="text/javascript"]').get()
    for (const contentRaw of tableContentRaw) {
      const content = contentRaw.children[0].data
      if (!content.includes('new Listview({')) continue

      const listViews = content.split('new Listview({')
      for (const listView of listViews) {
        if (!listView.includes('id: \'taught-by-item\'')) continue

        const data = JSON.parse(listView.slice(listView.indexOf('data:') + 5, -4))
        for (const recipe of data) recipes.push(parseInt(recipe.id))

        break
      }
    }

    return recipes
  }

  /**
   * Parses Wowhead detail tooltip information.
   * The Wowhead format is really fucked up, but with some creative parsing we make it work.
   * The tooltip is saved inside the variable g_items[id].tooltip_enus
   */
  async parseWowheadDetailTooltip (req, item) {
    // Qualities in CSS classes. Hardcode taken from Wowhead source code
    const qualities = {
      q: 'Misc',
      q0: 'Poor',
      q1: 'Common',
      q2: 'Uncommon',
      q3: 'Rare',
      q4: 'Epic',
      q5: 'Legendary'
    }

    const tooltipRaw = req.body.split('\n').find((line) => line.includes('.tooltip_enus'))
    const tooltipString = tooltipRaw.split(' = ')[1].slice(1, -2)
    const tooltipStringCleaned = tooltipString.replace(/\\n|(<!--.*?-->)|(<a href=.*?>)|\\/g, '').replace(/(<\/a>)/g, '')

    const $2 = cheerio.load(tooltipStringCleaned)
    // Get raw labels this way instead of the cool one because cheerio doesn't preserve order
    const labelsRaw = tooltipStringCleaned.match(/>(.*?)</g).map(s => s.slice(1, -1))

    const doubleCount = {} // Needed to count multiple occurrences (for sets for example)
    let currentlyOnSellprice = false // Needed to remove sell price lines
    const tooltip = []
    for (let label of labelsRaw) {
      if (label.trim() === '') continue // Filter empty labels
      label = label.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

      if (currentlyOnSellprice) {
        if (!isNaN(parseInt(label))) continue
        else currentlyOnSellprice = false
      }
      if (label === 'Sell Price: ') {
        currentlyOnSellprice = true
        label = 'Sell Price:'
      }

      // Count occurrences
      if (doubleCount[label]) doubleCount[label]++
      else doubleCount[label] = 1

      // Get corresponding tag
      const tags = $2('html *').filter(function () {
        return $2(this).text() === label
      })
      const tag = tags[doubleCount[label] - 1]
      const classes = tag && $2(tag).attr('class') ? $2(tag).attr('class').split(' ') : undefined
      const parent = tag ? $2(tag).parent()[0] : undefined
      const parentClasses = parent && $2(parent).attr('class') ? $2(parent).attr('class').split(' ') : undefined

      const newLabelObj = { label: label.replace(/&nbsp;/g, ' ') }

      // Add color formatting
      if (classes && qualities[classes[0]]) newLabelObj.format = qualities[classes[0]] // Add color format
      else if (parentClasses && qualities[parentClasses[0]]) newLabelObj.format = qualities[parentClasses[0]] // Add color format from parent

      // Add alignment formatting
      if (tag && tag.name === 'th') newLabelObj.format = 'alignRight'
      if (tag) {
        let currentTag = $2(tag)
        while (currentTag.parent()[0]) {
          const currentParentClasses = $2(currentTag.parent()[0]).attr('class')
          if (currentParentClasses && currentParentClasses.split(' ').includes('indent')) {
            newLabelObj.format = 'indent'
            break
          }
          currentTag = $2(currentTag.parent()[0])
        }
      }

      tooltip.push(newLabelObj)
    }

    item.tooltip = tooltip
  }

  /**
   * Parses Wowhead detail item link information.
   * Gets the itemLink for ingame (https://wowwiki.fandom.com/wiki/ItemLink).
   * The information is saved in on of the onclicks.
   */
  async parseWowheadDetailItemLink (req, item) {
    const itemLinkRaw = req.body.split('\n').find((line) => line.includes('onclick="WH.Links.show(this, {&quot;linkColor'))
    const itemLinkString = itemLinkRaw.split('onclick="WH.Links.show(this, ')[1].slice(0, -19).replace(/&quot;/g, '"')
    const itemLinkData = JSON.parse(itemLinkString)
    item.itemLink = `|c${itemLinkData.linkColor}|H${itemLinkData.linkId}|h[${itemLinkData.linkName}]|h|r`
  }

  /**
   * Parses Wowhead detail content phase.
   * The information is stored as 'Added in content phase x' in the quick facts box.
   */
  async parseWowheadDetailContentPhase (req, item) {
    const phaseStringPos = req.body.indexOf('content phase ')
    if (phaseStringPos > -1) item.contentPhase = parseInt(req.body.charAt(phaseStringPos + 14))
  }

  /**
   * Parses Wowhead detail vendor information.
   * Vendoring information is stored inside the 'sold-by' ListView().
   * The vendor price is a weighted average of all the infinite stock prices, weighted by popularity
   */
  async parseWowheadDetailVendor (req, item) {
    const $ = cheerio.load(req.body)
    const tableContentRaw = $('script[type="text/javascript"]').get()
    for (const contentRaw of tableContentRaw) {
      const content = contentRaw.children[0].data
      if (!content.includes('new Listview({')) continue

      const listViews = content.split('new Listview({')
      for (const listView of listViews) {
        if (!listView.includes('id: \'sold-by\'')) continue

        const props = listView.split('\n')
        for (const prop of props) {
          if (!prop.includes('data: [')) continue

          const data = JSON.parse(prop.slice(prop.indexOf('data:') + 5, -1))
          const stocks = data.filter(i => i.stock === -1) // Only consider infinite stock

          if (stocks.length) {
            const totalPopularity = stocks.reduce((acc, stock) => acc + stock.popularity, 0)

            item.vendorPrice = Math.round(stocks.reduce((acc, stock) => {
              if (!stock.stack) stock.stack = 1 // Stack size is missing on non-stackable items

              const costPerItem = stock.cost.reduce((acc, cV) => acc + cV, 0) / stock.cost.length / stock.stack
              const weight = stock.popularity / totalPopularity
              return acc + (costPerItem * weight)
            }, 0))
          }

          break
        }

        break
      }
    }
  }

  /**
   * Gives each item an unique item name
   */
  async addUniqueNames (input) {
    const progress = new ProgressBar('Adding unique names', input.length)

    for (const item of input) {
      const doubleNamedItems = input.filter(i => i.name === item.name)
      let uniqueName = item.name.toLowerCase().replace(/ /g, '-').replace(/[^a-zA-Z0-9-]/g, '')
      if (doubleNamedItems.length > 1) uniqueName += `-${item.itemId}`

      item.uniqueName = uniqueName
      progress.tick()
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
