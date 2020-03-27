# WoW Classic Items
[![npm](https://img.shields.io/npm/v/wow-classic-items.svg)](https://npmjs.org/wow-classic-items)
[![Discord](https://img.shields.io/discord/256087517353213954.svg?logo=discord)](https://discord.gg/jGZxH9f)

Fetches all WoW Classic items and professions from Wowhead and the official Blizzard API and makes them available for use in your project.

<br>

### Installation
```
npm install wow-classic-items
```

<br>

### Usage
```js
const Database = require('wow-classic-items')
const items = new Database.Items(options)
const professions = new Database.Professions(options)
```
`items` is functionally identical to an array and can be used as such:
```js
items[0] // Returns first item
items.filter((i) => i.class === 'Weapon')
items.map((i) => i.itemId)

items.getItemLink(123468) // Returns copy paste-able ingame link
professions.get('Alchemy') // .get returns specified profession
```

<br>

### Item Properties
```js
[{
  itemId: 19019, // Unique Item Id
  name: 'Thunderfury, Blessed Blade of the Windseeker', // Display name
  icon: 'inv_sword_39', // Display icon
  class: 'Weapon', // Item class
  subclass: 'Sword', // Item subclass, if available
  sellPrice: 255355, // Price for what this item can be sold to a vendor
  quality: 'Legendary', // Item quality
  itemLevel: 80, // Item level
  requiredLevel: 60, // Required level for this item
  slot: 'One-Hand', // Item slot
  tooltip: [Object], // Item tooltip (see below)
  itemLink: '|cffff8000|Hitem:19019::::::::::0|h[Thunderfury, Blessed Blade of the Windseeker]|h|r', // Copy-pasteable ingame item link
  uniqueName: 'thunderfury-blessed-blade-of-the-windseeker', // Unique item name
  contentPhase: 3, // Content phase in which this item becomes available
  vendorPrice: 1312, // Weighted vendor price if this item can be bought from a vendor
  source: { // Source, either Boss Drop, Rare Drop, Zone Drop or Quest
    category: 'Boss Drop',
    name: 'Some Random Boss', // Only set on Boss Drop
    zone: [209], // Only set on Zone Drop
    dropChance: 0.33, // Only set on Drops
    quests: [{ questId: 256, name: 'Some Random Quest' }] // Only set on Quest
  }
}, ...]
```

##### Tooltip
The tooltip is built the following way:
```
[{ label: 'Thunderfury, Blessed Blade of the Windseeker', format: 'Legendary' }, ...]
```
Each label represents one line in the tooltip. The format field specifies if theres a special formatting:

| Format | Meaning |
|:-------|:--------|
| Quality | If there is a quality (Common, Rare, Legendary...) it specifies the corresponding color of the label.
| `Misc` | This also refers to the label color: The item level and flavor text.
| `alignRight` | This means that the label is aligned inline to the right of the previous label (for example Armor ---- Plate).
| `indent` | This means that the label is indented and should be treated as if it was quality `Poor` (for example in set pieces).

Note that the actual sell price is not included in the tooltip (just the label), so you can format it how you want.

<br>

### Configuration
| Option | Default | Description |
|:-------|:--------|:------------|
| iconSrc | `'blizzard'` | Specifies from which source the item icon URL's are generated. Valid values are `'blizzard'`, `'wowhead'` and `false` (in this case only the icon name is returned).

<br>

### Building and Testing
The professions database is currently handmade.  
Build the item database (default output is `/data/build/data.json`):
```
npm run build
```
After that you can verify the build and/or check the changes between yours and the current one with:
```
npm run verify
```
Test the item class with:
```
npm test
```

<br>
<br>

## License
[MIT](/LICENSE.md)
