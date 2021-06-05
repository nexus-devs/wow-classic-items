const fs = require('fs')
const path = require('path')
const colors = require('colors/safe')
const assert = require('assert')

/**
 * Check differences between new and old JSON data
 */
async function validate (fileOld, fileNew) {
  const dataOld = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', fileOld), 'utf8'))
  const dataNew = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', fileNew), 'utf8'))

  let itemsDeleted = 0
  let itemsChanged = 0
  for (const itemOld of dataOld) {
    const newExists = dataNew.find((i) => i.itemId === itemOld.itemId)
    if (!newExists) itemsDeleted += 1
    else {
      try {
        assert.deepStrictEqual(newExists, itemOld)
      } catch (err) {
        itemsChanged += 1
      }
    }
  }
  const itemsAdded = dataNew.length - (dataOld.length - itemsDeleted)

  printValidation(itemsDeleted, 'items missing')
  printValidation(itemsAdded, 'items added')
  printValidation(itemsChanged, 'items changed')

  if (itemsDeleted > 0 || itemsAdded > 0 || itemsChanged > 0) {
    console.log(colors.yellow('Changes detected'))
    console.log('Either something went wrong with your build or you improved it somehow (e.g. better sanitization). In the latter case, please make a pull request to get the new data up!')
  } else {
    console.log(colors.green('Build successfully validated'))
  }
}

function printValidation (variable, description) {
  console.log(`${variable > 0 ? colors.yellow('Change'.padStart(10, ' ')) : colors.green('Validated'.padStart(10, ' '))}: ${variable} ${description}.`)
}

validate('json/data.json', 'build/data.json')