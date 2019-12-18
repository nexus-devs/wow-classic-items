# WoW Classic Items

[![Discord](https://img.shields.io/discord/256087517353213954.svg?logo=discord)](https://discord.gg/jGZxH9f)

Fetches all WoW Classic items from Wowhead and the official Blizzard API and makes them available for use in code.

<br>

### Installation
```
npm install wow-classic-items
```

<br>

### Usage
```js
const Items = require('wow-classic-items')
const items = new Items(options)
```
`items` is functionally identical to an array an can be used as such:
```js
items[0] // Returns first item
items.filter((i) => i.class === 'Weapon')
items.map((i) => i.itemId)
```

<br>

### Configuration
| Option | Default | Description |
|:-------|:--------|:------------|
| iconSrc | `'blizzard'` | Specifies from which source the item icon URL's are generated. Valid values are `'blizzard'`, `'wowhead'` and `false` (in this case only the icon name is returned).

<br>
<br>

## For Developers

<br>

### Building and Testing
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
