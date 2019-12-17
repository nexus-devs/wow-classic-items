class Build {
  /**
   * Starts the build process
   */
  async start () {
    const baseItems = await this.scrapeWowheadListing()
  }

  /**
   * Scrapes the item listings of Wowhead.
   */
  async scrapeWowheadListing () {
    // Filter the items by ID (total ID range about 24000).
    const stepSize = 500 // Wowhead can only show about 500 items per page.
    for (let i = 0; i < 24000; i += stepSize) {
      const uri = `https://classic.wowhead.com/items?filter=151:151;2:5;${i}:${i + stepSize}`
    }
  }
}

const build = new Build()
build.start()
