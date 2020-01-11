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
