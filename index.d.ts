import { Item } from './types/Item';
import { Profession } from './types/Profession';
import { Zone } from './types/Zone';
import { CharacterClass } from './types/CharacterClass';

declare module 'wow-classic-items' {
  export interface DataBaseOptions {
    iconSrc: 'blizzard' | 'wowhead';
  }

  class DataBase<T> extends Array<T> {}

  export class Items extends DataBase<Item> {
    constructor(options: DataBaseOptions);
    getItemLink(itemId: number): string;
  }

  export class Professions extends DataBase<Profession> {
    constructor(options: DataBaseOptions);
    get(name: string): Profession;
  }

  export class Zones extends DataBase<Zone> {
    constructor(options: DataBaseOptions);
  }

  export class Classes extends DataBase<CharacterClass> {
    constructor(options: DataBaseOptions)
    get(name: string): CharacterClass;
  }
}
