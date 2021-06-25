export declare interface Zone {
    id: number;
    name: string;
    category: ZoneCategory;
    level: MinMaxLevel;
    territory: ZoneTerritory;
}

export declare type ZoneCategory = 'Dungeon'|'undefined'|'Raid'|'Arena'|'Open World'|'Battleground';
export declare type MinMaxLevel = [number, number];
export declare type ZoneTerritory = 'Contested'|'Sanctuary'|'Horde'|'Alliance'|'PvP';