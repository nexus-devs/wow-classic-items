export declare interface Item {
    itemId: number;
    name: string;
    icon: string;
    class: ItemClass;
    subclass: ItemSubClass;
    sellPrice: number;
    quality: ItemQuality;
    itemLevel: number;
    requiredLevel: number;
    slot: ItemSlot;
    tooltip: ItemTooltip[];
    itemLink: string;
    vendorPrice: number;
    source: ItemSource;
    uniqueName: string;
}

export declare interface ItemTooltip {
    label: string;
    format?: ItemTooltipFormat;
}

export declare interface ItemSource {
    category: ItemSourceCategory;
    name?: string;
    faction?: Faction;
    cost?: number;
    quests?: ItemQuest[];
    zone?: number;
    dropChance?: number;
}

export declare interface ItemQuest {
    questId: number;
    name: string;
    faction: Faction;
}

export declare type ItemClass = 'Armor'|'Weapon'|'Consumable'|'Quest'|'Miscellaneous'|'Trade Goods'|'Recipe'|'Container'|'Gem'|'Quiver'|'Projectile'|'Key'|'Reagent';
export declare type ItemSubClass = 'Miscellaneous'|'Staff'|'Cloth'|'Leather'|'Axe'|'Sword'|'Potion'|'Mace'|'Quest'|'Food & Drink'|'Junk'|'Meat'|'Cooking'|'Mail'|'Herb'|'Dagger'|'Bag'|'Simple'|'Parts'|'Consumable'|'Shield'|'Other'|'Scroll'|'Book'|'Mount'|'Bandage'|'Polearm'|'Gun'|'Quiver'|'Ammo Pouch'|'Item Enhancement'|'Leatherworking'|'Elixir'|'Bow'|'Arrow'|'Bullet'|'Alchemy'|'Tailoring'|'Key'|'Metal & Stone'|'Blacksmithing'|'Reagent'|'Fist Weapon'|'Explosives'|'Devices'|'Engineering'|'Pet'|'Wand'|'Enchanting'|'Fishing Pole'|'Crossbow'|'First Aid'|'Elemental'|'Plate'|'Flask'|'Fishing'|'Holiday'|'Jewelcrafting'|'Soul Bag'|'Enchanting Bag'|'Orange'|'Herb Bag'|'Totem'|'Libram'|'Idol'|'Prismatic'|'Green'|'Red'|'Purple'|'Yellow'|'Blue'|'Materials'|'Engineering Bag'|'Gem Bag'|'Thrown'|'Meta'|'Mining Bag'|'Exotic'|'Leatherworking Bag';
export declare type ItemQuality = 'Poor'|'Uncommon'|'Common'|'Epic'|'Rare'|'Legendary'|'Artifact';
export declare type ItemSlot = 'Shirt'|'Two-Hand'|'Chest'|'Legs'|'Feet'|'Main Hand'|'Hands'|'Non-equippable'|'One-Hand'|'Wrist'|'Trinket'|'Bag'|'Waist'|'Finger'|'Off Hand'|'Held In Off-hand'|'Back'|'Relic'|'Head'|'Neck'|'Shoulder'|'Ranged'|'Ammo'|'Tabard'|'Thrown';
export declare type Faction = 'Alliance'|'Horde'|'Both';
export declare type ItemSourceCategory = 'Vendor'|'Quest'|'Boss Drop'|'Rare Drop'|'Zone Drop';
export declare type ItemTooltipFormat = 'Common'|'Misc'|'alignRight'|'Poor'|'Uncommon'|'Rare'|'indent'|'Epic'|'Legendary';