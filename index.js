class Items extends Array {
  constructor () {
    const data = require('./data/json/data.json')
    super(...data)
  }

  /**
   * Override Array.prototype.filter
   *
   * This roughly implements Mozilla's builtin for `Array.prototype.filter`[1].
   * V8 passes the prototype of the original Array into `ArraySpeciesCreate`[2][3],
   * which is the Array that gets returned from `filter()`. However, they don't
   * pass the arguments passed to the constructor of the original Array (this Class),
   * which means that it will always return a new Array with ALL items, even when
   * different categories are specified.[4]
   *
   * [1] https://hg.mozilla.org/mozilla-central/file/tip/js/src/builtin/Array.js#l320
   * [2] https://github.com/v8/v8/blob/master/src/builtins/array-filter.tq#L193
   * [3] https://www.ecma-international.org/ecma-262/7.0/#sec-arrayspeciescreate
   * [4] https://runkit.com/kaptard/5c9daf33090ab900120465fe
   */
  filter (fn) {
    const A = []

    for (const el of this) {
      if (fn(el)) A.push(el)
    }
    return A
  }
}

module.exports = Items
