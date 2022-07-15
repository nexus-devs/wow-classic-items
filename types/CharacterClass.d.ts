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

export declare type CharacterClassName = 'Death Knight'|'Druid'|'Hunter'|'Mage'|'Paladin'|'Priest'|'Rogue'|'Shaman'|'Warlock'|'Warrior';
