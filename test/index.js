const assert = require('assert')
const groundTruth = require('../data/json/data.json')
const groundTruthProfessions = require('../data/json/professions.json')
const Database = require('../index.js')

describe('index.js', function () {
  it('should contain all items', function () {
    const items = new Database.Items()
    assert(items.length === groundTruth.length)
  })

  it('should contain all professions', function () {
    const professions = new Database.Professions()
    assert(professions.length === groundTruthProfessions.length)
  })

  it('should return correctly formatted objects', function () {
    const items = new Database.Items({ iconSrc: false })
    const professions = new Database.Professions({ iconSrc: false })
    const i1 = items.find((x) => x.itemId === 2589)
    const i2 = groundTruth.find((x) => x.itemId === 2589)
    const p1 = professions.find((x) => x.name === 'Alchemy')
    const p2 = groundTruthProfessions.find((x) => x.name === 'Alchemy')
    assert.deepStrictEqual(i1, i2)
    assert.deepStrictEqual(p1, p2)
  })

  it('should filter items correctly', function () {
    const items = new Database.Items({ iconSrc: false })
    const filteredItems = items.filter((x) => x.class === 'Weapon')
    const filteredGroundTruth = groundTruth.filter((x) => x.class === 'Weapon')
    assert.deepStrictEqual(filteredItems, filteredGroundTruth)
  })

  it('should parse icons correctly', function () {
    const baseItem = groundTruth[0]
    const blizzardItem = new Database.Items({ iconSrc: 'blizzard' }).find((x) => x.itemId === baseItem.itemId)
    const wowheadItem = new Database.Items({ iconSrc: 'wowhead' }).find((x) => x.itemId === baseItem.itemId)

    assert(blizzardItem.icon === `https://render-classic-us.worldofwarcraft.com/icons/56/${baseItem.icon}.jpg`)
    assert(wowheadItem.icon === `https://wow.zamimg.com/images/wow/icons/large/${baseItem.icon}.jpg`)
  })

  it('should parse item link correctly', function () {
    const items = new Database.Items({ iconSrc: false })
    const link = items.getItemLink(13510)
    assert(link === '/script DEFAULT_CHAT_FRAME:AddMessage("\\124cffffffff\\124Hitem:13510::::::::::0\\124h[Flask of the Titans]\\124h\\124r");')
  })

  it('should get professions correctly', function () {
    const professions = new Database.Professions()
    assert(professions.get('Alchemy').name === 'Alchemy')
  })

  it('should get zones correctly', function () {
    const zones = new Database.Zones()
    assert(zones.find(z => z.id === 1977).name === 'Zul\'Gurub')
  })

  it('should get classes correctly', function () {
    const classes = new Database.Classes()
    assert(classes.get('Druid').name === 'Druid')
  })
})
