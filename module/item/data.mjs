const { NumberField, SchemaField, StringField, BooleanField, HTMLField } = foundry.data.fields;

export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      damage: new StringField({ initial: "1d8" }),
      
      // Основной тип (по умолчанию)
      damageType: new StringField({ initial: "slashing" }),

      // Список доступных типов (какие галочки проставлены)
      availableTypes: new SchemaField({
          slashing: new BooleanField({ initial: false }),
          blunt: new BooleanField({ initial: false }),
          piercing: new BooleanField({ initial: false }),
          fire: new BooleanField({ initial: false }),
          cold: new BooleanField({ initial: false }),
          lightning: new BooleanField({ initial: false }),
          acid: new BooleanField({ initial: false }),
          poison: new BooleanField({ initial: false }),
          psychic: new BooleanField({ initial: false }),
          light: new BooleanField({ initial: false }),
          dark: new BooleanField({ initial: false }),
          pure: new BooleanField({ initial: false })
      }),

      attackType: new StringField({ initial: "melee" }), 
      proficiency: new StringField({ initial: "bladed" }), 

      scaling: new StringField({ initial: "strength" }),
      
      range: new NumberField({ initial: 1 }),
      weight: new NumberField({ initial: 1 }),
      price: new NumberField({ initial: 10 }),
      description: new HTMLField()
    };
  }
}

export class EssenceData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rank: new NumberField({ initial: 9, min: 1, max: 9 }),
      activeAbility: new HTMLField(),
      passiveBonuses: new SchemaField({
        target: new StringField({ initial: "strength" }),
        value: new NumberField({ initial: 0 })
      }),
      price: new NumberField({ initial: 100 }),
      description: new HTMLField()
    };
  }
}

export class LineageData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
      return {
        description: new HTMLField(),
      };
    }
}

export class SimpleItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      quantity: new NumberField({ initial: 1 }),
      weight: new NumberField({ initial: 0 }),
      price: new NumberField({ initial: 0 }),
      armorValue: new NumberField({ initial: 0 }),
      armorPenalty: new NumberField({ initial: 0 })
    };
  }
}

export class RoleData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
      return {
        rank: new NumberField({ initial: 9, min: 1, max: 9 }),
        description: new HTMLField()
      };
    }
}
  
export class SpellData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
      return {
        rank: new NumberField({ initial: 9, min: 1, max: 9 }), // Ранг самого заклинания
        manaCost: new NumberField({ initial: 10 }),
        damage: new StringField({ initial: "" }),
        description: new HTMLField()
      };
    }
}

export class ContractData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
      return {
        spiritCost: new NumberField({ initial: 0 }), // Цена поддержания или призыва
        contractType: new StringField({ initial: "Дух Природы" }), // Тип духа
        description: new HTMLField()
      };
    }
}
