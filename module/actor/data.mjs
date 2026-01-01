const { NumberField, SchemaField, StringField, BooleanField, HTMLField } = foundry.data.fields;

// Общая схема (Common)
class CommonActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      attributes: new SchemaField({
        physique: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
        spirit: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
        speed: new NumberField({ initial: 10 }),       // Итоговая скорость
        speedBonus: new NumberField({ initial: 0 })
      }),
      subAttributes: new SchemaField({
        strength: new NumberField({ required: true, integer: true, initial: 0 }),
        agility: new NumberField({ required: true, integer: true, initial: 0 }),
        endurance: new NumberField({ required: true, integer: true, initial: 0 }),
        accuracy: new NumberField({ required: true, integer: true, initial: 0 }),
        throwing: new NumberField({ required: true, integer: true, initial: 0 }),
        flexibility: new NumberField({ required: true, integer: true, initial: 0 }),
        boneDensity: new NumberField({ required: true, integer: true, initial: 0 }),
        naturalRegeneration: new NumberField({ required: true, integer: true, initial: 0 }),
        perception: new NumberField({ required: true, integer: true, initial: 0 }),
        vision: new NumberField({ required: true, integer: true, initial: 0 }),
        physicalResistance: new NumberField({ required: true, integer: true, initial: 0 }),
        magicResistance: new NumberField({ required: true, integer: true, initial: 10 }),
        intuition: new NumberField({ required: true, integer: true, initial: 0 }), // Интуиция
        cognition: new NumberField({ required: true, integer: true, initial: 0 }), // Когнитивность (Ум)
        willpower: new NumberField({ required: true, integer: true, initial: 0 }), // Воля
        presence: new NumberField({ required: true, integer: true, initial: 0 }),  // Присутствие (Соц)
        fortitude: new NumberField({ required: true, integer: true, initial: 0 }), // Стойкость
        metabolism: new NumberField({ required: true, integer: true, initial: 0 }), // Метаболизм
        manaSensitivity: new NumberField({ required: true, integer: true, initial: 0 }),
        spiritRecovery: new NumberField({ required: true, integer: true, initial: 0 })
      }),
      proficiencies: new SchemaField({
        bladed: new NumberField({ required: true, integer: true, initial: 0 }),
        blunt: new NumberField({ required: true, integer: true, initial: 0 }),
        polearm: new NumberField({ required: true, integer: true, initial: 0 }),
        axes: new NumberField({ required: true, integer: true, initial: 0 }),
        unarmed: new NumberField({ required: true, integer: true, initial: 0 })
      }),
      resistances: new SchemaField({
        physBase: new NumberField({ initial: 0 }),
        magBase: new NumberField({ initial: 0 }),
        slashing: new NumberField({ initial: 0 }),
        blunt: new NumberField({ initial: 0 }),
        piercing: new NumberField({ initial: 0 }),
        fire: new NumberField({ initial: 0 }),
        cold: new NumberField({ initial: 0 }),
        lightning: new NumberField({ initial: 0 }),
        acid: new NumberField({ initial: 0 }),
        poison: new NumberField({ initial: 0 }),
        psychic: new NumberField({ initial: 0 }),
        light: new NumberField({ initial: 0 }),
        dark: new NumberField({ initial: 0 }),
        pure: new NumberField({ initial: 0 })
      }),
      resources: new SchemaField({
        hp: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
          max: new NumberField({ required: true, integer: true, min: 0, initial: 10 })
        }),
        mana: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
          max: new NumberField({ required: true, integer: true, min: 0, initial: 10 })
        }),
        combatPower: new NumberField({ required: true, integer: true, initial: 0 }),
        currency: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        level: new NumberField({ required: true, integer: true, min: 1, max: 11, initial: 1 }),
        xp: new SchemaField({
            value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            max: new NumberField({ required: true, integer: true, min: 0, initial: 6 })
        })
      }),
      combat: new SchemaField({
        actions: new SchemaField({ value: new NumberField({ initial: 2 }), max: new NumberField({ initial: 2 }) }),
        reactions: new SchemaField({ value: new NumberField({ initial: 1 }), max: new NumberField({ initial: 1 }) }),
        defensiveStance: new BooleanField({ initial: false }),
        shieldRaised: new BooleanField({ initial: false }),
        shieldBonus: new NumberField({ initial: 0 }),
        armorBonus: new NumberField({ initial: 0 }),
        defensePenalty: new NumberField({ initial: 0 }),
        defensePool: new SchemaField({
          value: new NumberField({ initial: 0 }),
          max: new NumberField({ initial: 0 })
        }),
        successCount: new NumberField({ initial: 0 })
      }),
      
      // === ПЕРЕНЕСЕНО СЮДА, ЧТОБЫ БЫЛО И У МОНСТРОВ ===
      details: new SchemaField({
          appearance: new HTMLField(),
          personality: new HTMLField(),
          // Это поле критически важно для механики боя (КС)
          size: new StringField({ initial: "medium" }),
          goals: new HTMLField()
      }),
      
      biography: new HTMLField()
    };
  }

  // prepareDerivedData вызывается автоматически
}

// Персонаж
export class CharacterData extends CommonActorData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      race: new StringField(),
      lineage: new StringField(),
      essenceCount: new NumberField({ initial: 0, min: 0 }),
      
      // Уникальные механики рас
      aura: new SchemaField({
        active: new BooleanField({ initial: false }),
        level: new NumberField({ initial: 0 }),
        pool: new NumberField({ initial: 0 })
      }),
      dragonPower: new NumberField({ initial: 0 }),
      imprint: new SchemaField({
        level: new NumberField({ initial: 0 }),
        path: new StringField({ initial: "" })
      })
      
      // details УБРАН ОТСЮДА, так как он наследуется от Common
    };
  }
}

// Монстр
export class MonsterData extends CommonActorData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      rank: new NumberField({ initial: 9, min: 1, max: 9 }),
      dropChance: new NumberField({ initial: 0.22 })
      
      // details наследуется от Common, поэтому у монстра тоже будет size
    };
  }
}
