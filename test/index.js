const assert = require('assert')
const groundTruth = require('../data/json/data.json')
const Items = require('../index.js')

describe('index.js', function () {
  it('should contain all items', function () {
    const items = new Items()
    assert(items.length === groundTruth.length)
  })

  it('should return correctly formatted objects', function () {
    const items = new Items({ iconSrc: false })
    const i1 = items.find((x) => x.itemId === 2589)
    const i2 = groundTruth.find((x) => x.itemId === 2589)
    assert.deepStrictEqual(i1, i2)
  })

  it('should filter items correctly', function () {
    const items = new Items()
    const filteredItems = items.filter((x) => x.class === 'Weapon')
    const filteredGroundTruth = items.filter((x) => x.class === 'Weapon')
    assert.deepStrictEqual(filteredItems, filteredGroundTruth)
  })

  it('should parse icons correctly', function () {
    const baseItem = groundTruth[0]
    const blizzardItem = new Items({ iconSrc: 'blizzard' }).find((x) => x.itemId === baseItem.itemId)
    const wowheadItem = new Items({ iconSrc: 'wowhead' }).find((x) => x.itemId === baseItem.itemId)

    assert(blizzardItem.icon === `https://render-classic-us.worldofwarcraft.com/icons/56/${baseItem.icon}.jpg`)
    assert(wowheadItem.icon === `https://wow.zamimg.com/images/wow/icons/large/${baseItem.icon}.jpg`)
  })
})
