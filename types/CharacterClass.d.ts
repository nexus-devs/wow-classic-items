export declare interface CharacterClass {
    name: CharacterClassName;
    color: string;
    icon: string;
    specs: CharacterClassSpec[];
}

export declare interface CharacterClassSpec {
    name: string;
    icon: string;
}

export declare type CharacterClassName = 'Druid'|'Hunter'|'Mage'|'Paladin'|'Priest'|'Rogue'|'Shaman'|'Warlock'|'Warrior';