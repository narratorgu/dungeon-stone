import { DUNGEON } from "../config.mjs";

const { NumberField, SchemaField, StringField, BooleanField, HTMLField, ArrayField } = foundry.data.fields;

/** Создаёт SchemaField с NumberField(0) для каждого ключа объекта */
function schemaFromKeys(source) {
  return new SchemaField(
    Object.fromEntries(
      Object.keys(source).map(key => [key, new NumberField({ initial: 0 })])
    )
  );
}

/** Ресурс с value/max */
function resourceField(initial = 0, max = null) {
  return new SchemaField({
    value: new NumberField({ required: true, integer: true, min: 0, initial }),
    max: new NumberField({ required: true, integer: true, min: 0, initial: max ?? initial })
  });
}


class CommonActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      attributes: new SchemaField({
        body:   new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
        spirit: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
        
        speed:        new NumberField({ initial: 10 }),
        speedBonus:   new NumberField({ initial: 0 }),
        itemLevel:    new NumberField({ initial: 0 }),
        threatLevel:  new NumberField({ initial: 0 }),
        abilityCount: new NumberField({ initial: 0 })
      }),

      subAttributes: new SchemaField({
        strength:    new NumberField({ initial: 0 }),
        agility:     new NumberField({ initial: 0 }),
        precision:   new NumberField({ initial: 0 }),
        flexibility: new NumberField({ initial: 0 }),

        stamina:             new NumberField({ initial: 0 }),
        fortitude:           new NumberField({ initial: 0 }),
        naturalRegeneration: new NumberField({ initial: 0 }),

        boneDensity: new NumberField({ initial: 0 }),
        height:      new NumberField({ initial: 0 }),
        weight:      new NumberField({ initial: 0 }),
        metabolism:  new NumberField({ initial: 0 }),
        size: new StringField({ 
          initial: "medium",
          choices: Object.keys(DUNGEON.sizes)
        }),

        vision:  new NumberField({ initial: 0 }),
        hearing: new NumberField({ initial: 0 }),
        touch:   new NumberField({ initial: 0 }),
        smell:   new NumberField({ initial: 0 }),

        cuttingForce:  new NumberField({ initial: 0 }),
        crushingForce: new NumberField({ initial: 0 }),
        piercingForce: new NumberField({ initial: 0 }),

        cognition:     new NumberField({ initial: 0 }),
        willpower:     new NumberField({ initial: 0 }),
        intuition:     new NumberField({ initial: 0 }),
        consciousness: new NumberField({ initial: 0 }),

        soulPower:       new NumberField({ initial: 0 }),
        manaSense:       new NumberField({ initial: 0 }),
        spiritRecovery:  new NumberField({ initial: 0 }),
        magicResistance: new NumberField({ initial: 0 }),
        physicalResistance: new NumberField({ initial: 0 }),

        luck:            new NumberField({ initial: 0 }),
        presence:        new NumberField({ initial: 0 }),
        divinePowerStat: new NumberField({ initial: 0 }),
        dragonPowerStat: new NumberField({ initial: 0 })
      }),

      proficiencies: schemaFromKeys(DUNGEON.proficiencies),

      resistances: new SchemaField({
        physBase: new NumberField({ initial: 0 }),
        magBase:  new NumberField({ initial: 0 }),
        ...Object.fromEntries(
          Object.keys(DUNGEON.damageTypes).map(key => [key, new NumberField({ initial: 0 })])
        )
      }),

      resources: new SchemaField({
        hp:   resourceField(10, 10),
        mana: resourceField(10, 10),
        
        fate: new SchemaField({
          value: new NumberField({ initial: 1, min: 0, max: 3 }),
          max:   new NumberField({ initial: 3 })
        }),
        
        gp: resourceField(0, 0),
        dp: resourceField(0, 0),

        currency: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        level: new NumberField({ 
          required: true, 
          integer: true, 
          min: 1, 
          max: Object.keys(DUNGEON.XP_TABLE).length, 
          initial: 1 
        }),
        xp: resourceField(0, DUNGEON.XP_TABLE[1]),
        combatPower: new NumberField({ initial: 0 })
      }),

      equipment: new SchemaField({
        // Оружие
        mainHand: new StringField({ initial: "" }),
        offHand: new StringField({ initial: "" }),
        
        // Броня
        head: new StringField({ initial: "" }),
        shoulders: new StringField({ initial: "" }),
        body: new StringField({ initial: "" }),
        arms: new StringField({ initial: "" }),
        hands: new StringField({ initial: "" }),
        legs: new StringField({ initial: "" }),
        ears: new StringField({ initial: "" }), 
        feet: new StringField({ initial: "" }),
        neck: new StringField({ initial: "" }),
        cloak: new StringField({ initial: "" }),
        
        // Кольца (массив ID, так как слотов может быть несколько)
        rings: new ArrayField(new StringField()),
        
        // Эссенции (тоже массив)
        essences: new ArrayField(new StringField()),

        contractSlotsMax: new NumberField({ initial: 0 }),

        // Служебные поля (расчётные)
        blockedRings: new NumberField({ initial: 0 }), // Сколько колец заблокировано перчатками
        essenceSlotsMax: new NumberField({ initial: 0 }) // Сколько слотов эссенций доступно
      }),

      // Нагрузка (Вес)
      encumbrance: new SchemaField({
        value: new NumberField({ initial: 0 }), // Текущий вес
        max: new NumberField({ initial: 0 }),   // Макс вес
        pct: new NumberField({ initial: 0 })    // Процент загрузки
      }),

      combat: new SchemaField({
        actions: resourceField(2, 2),
        reactions: resourceField(1, 1),
        
        defensiveStance: new BooleanField({ initial: false }),
        shieldRaised: new BooleanField({ initial: false }),
        shieldBonus: new NumberField({ initial: 0 }),
        armorBonus: new NumberField({ initial: 0 }),
        defensePenalty: new NumberField({ initial: 0 }),
        
        defensePool: resourceField(0, 0),

        conditions: new SchemaField({
          prone: new BooleanField({ initial: false }),        // Ничком
          blinded: new BooleanField({ initial: false }),      // Слепота
          invisible: new BooleanField({ initial: false }),    // Невидимость
          stunned: new BooleanField({ initial: false }),      // Оглушение
          paralyzed: new BooleanField({ initial: false }),    // Паралич
          flanked: new BooleanField({ initial: false }),      // Фланкирование
          grappled: new BooleanField({ initial: false }),     // Схваченность
          cover: new StringField({ 
            initial: "none",
            choices: ["none", "partial", "good", "full"]      // Укрытие
          })
        }),
        
        // Модификаторы (ручной ввод)
        dcModifier: new NumberField({ initial: 0 }),         // Мод. КС
        kuModifier: new NumberField({ initial: 0 }),         // Мод. КУ
        
        // КУ укрытия (для полного укрытия)
        coverKU: new NumberField({ initial: 0 }),
        coverHP: new NumberField({ initial: 0 })             // HP укрытия (= КУ)
      }),

      details: new SchemaField({
        appearance:  new HTMLField(),
        personality: new HTMLField(),
        goals:       new HTMLField(),
        gender: new StringField(),
        alignment: new StringField(),
        height: new StringField(), // или Number
        weight: new StringField(),
        organization: new StringField({ initial: "" }),
        age: new NumberField({ initial: 0, integer: true, min: 0 }),
        biography:   new HTMLField()
      })
    };
  }
}


export class CharacterData extends CommonActorData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      
      race:         new StringField(),
      lineage:      new StringField(),
      essenceCount: new NumberField({ initial: 0, min: 0 }),
      
      aura: new SchemaField({
        active: new BooleanField({ initial: false }),
        level:  new NumberField({ initial: 0 }),
        pool:   new NumberField({ initial: 0 })
      }),
      
      imprint: new SchemaField({
        level: new NumberField({ initial: 0 }),
        path:  new StringField({ initial: "" })
      })
    };
  }
}


export class MonsterData extends CommonActorData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      
      rank: new NumberField({ 
        initial: 9, 
        min: 1, 
        max: Object.keys(DUNGEON.ranks).length 
      }),
      dropChance: new NumberField({ initial: 0.22 }),
      floor: new StringField({ initial: "1" }),
      monsterType: new StringField({ 
          initial: "normal", 
          choices: ["normal", "mutant", "elite", "boss"] 
      })
    };
  }
}
