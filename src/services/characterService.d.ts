import { Character } from '../types/character.js';
export declare class CharacterService {
    findAll(userId: number): Promise<Character[]>;
    findById(id: number): Promise<Character | null>;
    create(data: Partial<Character>): Promise<Character>;
    update(id: number, data: Partial<Character>): Promise<Character | null>;
    delete(id: number): Promise<boolean>;
}
//# sourceMappingURL=characterService.d.ts.map