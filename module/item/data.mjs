const { NumberField, SchemaField, StringField, BooleanField, HTMLField, ArrayField } = foundry.data.fields;

export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      damage: new StringField({ initial: "1d8" }),
      damageVersatile: new StringField({ initial: "" }),
      damageType: new StringField({ initial: "slashing" }),
      
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

      attackType: new StringField({ 
        initial: "melee",
        choices: ["melee", "ranged", "thrown"]
      }),
      
      proficiency: new StringField({ 
        initial: "bladed",
        choices: ["bladed", "blunt", "polearm", "unarmed", "throwing"]
      }),

      scaling: new StringField({ 
        initial: "strength",
        choices: ["strength", "agility", "precision", "spirit", "cognition", "proficiency", "endurance"]
      }),

      tags: new SchemaField({
        light: new BooleanField({ initial: false }),
        throwable: new BooleanField({ initial: false }),
        twoHanded: new BooleanField({ initial: false }),
        versatile: new BooleanField({ initial: false })
      }),
      
      range: new NumberField({ initial: 1 }),
      maxRange: new NumberField({ initial: 2 }),

      equipStatus: new StringField({ 
        initial: "stored",
        choices: ["stored", "carried", "equipped"]
      }),

      grip: new StringField({
        initial: "1h",
        choices: ["1h", "2h", "offhand"]
      }),

      targetSlot: new StringField({ initial: "" }),
      
      ammoType: new StringField({ 
        initial: null,
        nullable: true,
        blank: true,
        choices: ["arrow", "bolt", "bullet", "dart", "stone"]
      }),
      
      weight: new NumberField({ initial: 1, nullable: true }),
      quantity: new NumberField({ initial: 1, nullable: true }),
      itemLevel: new NumberField({ initial: 1, nullable: true }),
      price: new NumberField({ initial: 10, nullable: true }),
      description: new HTMLField()
    };
  }
}

export class ArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      armorValue: new NumberField({ initial: 0 }),
      armorPenalty: new NumberField({ initial: 0 }),
      
      isShield: new BooleanField({ initial: false }),
      equipStatus: new StringField({ 
        initial: "stored", 
        choices: ["stored", "carried", "equipped"] 
      }),

      slot: new StringField({
        initial: "body",
        choices: [
          "head", "shoulders", "body", "arms", "hands", 
          "legs", "feet", "neck", "ring", "cloak", "shield", "ears"
        ]
      }),

      isSet: new BooleanField({ initial: false }),

      coversSlots: new SchemaField({
        head: new BooleanField({ initial: false }),
        shoulders: new BooleanField({ initial: false }),
        body: new BooleanField({ initial: true }),
        arms: new BooleanField({ initial: false }),
        hands: new BooleanField({ initial: false }),
        legs: new BooleanField({ initial: false }),
        feet: new BooleanField({ initial: false }),
        neck: new BooleanField({ initial: false }),
        ring: new BooleanField({ initial: false }),
        cloak: new BooleanField({ initial: false }),
        shield: new BooleanField({ initial: false })
      }),

      blockedSlots: new SchemaField({
        head: new BooleanField({ initial: false }),
        shoulders: new BooleanField({ initial: false }),
        body: new BooleanField({ initial: false }),
        arms: new BooleanField({ initial: false }),
        hands: new BooleanField({ initial: false }),
        legs: new BooleanField({ initial: false }),
        feet: new BooleanField({ initial: false }),
        neck: new BooleanField({ initial: false }),
        ring: new BooleanField({ initial: false }),
        cloak: new BooleanField({ initial: false })
      }),

      weight: new NumberField({ initial: 1, nullable: true }),
      quantity: new NumberField({ initial: 1, nullable: true }),
      price: new NumberField({ initial: 10, nullable: true }),
      itemLevel: new NumberField({ initial: 1, nullable: true }),
      
      description: new HTMLField()
    };
  }
}

export class ConsumableData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      consumableType: new StringField({
        initial: "potion",
        choices: ["potion", "poison", "bomb", "ammo", "food", "tool", "reagent", "other"]
      }),
      
      ammoType: new StringField({
        initial: null,
        nullable: true,
        blank: true,
        choices: ["arrow", "bolt", "bullet", "dart", "stone"]
      }),
      
      attackBonus: new NumberField({ initial: 0 }),
      damageBonus: new NumberField({ initial: 0 }),
      
      healing: new StringField({ initial: "" }),
      manaRestore: new StringField({ initial: "" }),
      gpRestore: new StringField({ initial: "" }),
      dpRestore: new StringField({ initial: "" }),
      
      damage: new StringField({ initial: "" }),
      damageType: new StringField({ 
        initial: "fire",
        choices: [
          "slashing", "blunt", "piercing", 
          "fire", "cold", "lightning", "acid", "poison", 
          "psychic", "light", "dark", "pure"
        ]
      }),
      
      areaType: new StringField({
        initial: "none",
        choices: ["none", "sphere", "cone", "line"]
      }),
      areaSize: new NumberField({ initial: 0 }),
      
      saveAttribute: new StringField({ 
        initial: "",
        blank: true,
        choices: ["", "agility", "fortitude", "willpower"]
      }),
      saveDC: new NumberField({ initial: 0 }),
      
      poisonDuration: new NumberField({ initial: 0 }),
      poisonCharges: new NumberField({ initial: 1 }),
      
      useAction: new StringField({
        initial: "action",
        choices: ["action", "bonus", "reaction", "free"]
      }),
      
      range: new NumberField({ initial: 0 }),
      duration: new NumberField({ initial: 0 }),
      
      quantity: new NumberField({ initial: 1, min: 0, nullable: true }),
      maxStack: new NumberField({ initial: 20 }),
      weight: new NumberField({ initial: 0.1, min: 0, nullable: true }),
      price: new NumberField({ initial: 1, min: 0, nullable: true }),
      
      description: new HTMLField()
    };
  }
  
  get totalWeight() {
    return (this.weight || 0) * (this.quantity || 0);
  }
  
  get isAmmo() {
    return this.consumableType === "ammo";
  }
  
  get isPoison() {
    return this.consumableType === "poison";
  }
}

export class ContainerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      capacity: new NumberField({ initial: 10 }),
      weightReduction: new NumberField({ initial: 0, min: 0, max: 100 }),
      
      containerType: new StringField({
        initial: "bag",
        choices: ["bag", "backpack", "chest", "quiver", "pouch", "saddlebag"]
      }),

      contents: new ArrayField(new StringField()),
      
      locked: new BooleanField({ initial: false }),
      lockDC: new NumberField({ initial: 0 }),
      
      equipStatus: new StringField({
        initial: "carried",
        choices: ["stored", "carried", "equipped"]
      }),
      
      weight: new NumberField({ initial: 1, nullable: true }),
      price: new NumberField({ initial: 10, nullable: true }),
      description: new HTMLField()
    };
  }
}

export class LootData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      lootType: new StringField({
        initial: "treasure",
        choices: ["treasure", "material", "book", "gem", "manastone", "other"]
      }),
      
      materialName: new StringField({ initial: "" }),
      
      quantity: new NumberField({ initial: 1, nullable: true }),
      weight: new NumberField({ initial: 0, nullable: true }),
      price: new NumberField({ initial: 0, min: 0, nullable: true }),
      
      craftable: new BooleanField({ initial: false }),
      
      description: new HTMLField()
    };
  }
  
  get totalWeight() {
    return (this.weight || 0) * (this.quantity || 0);
  }
  
  get totalPrice() {
    return (this.price || 0) * (this.quantity || 0);
  }
}

export class EssenceData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    
    // Схема для одной способности эссенции
    const abilitySchema = () => new SchemaField({
      id: new StringField({ required: true }),
      name: new StringField({ initial: "Новая способность" }),
      img: new StringField({ initial: "icons/svg/aura.svg" }),
      description: new HTMLField(),
      
      // Тип активации
      activationAction: new StringField({
        initial: "action",
        choices: ["action", "bonus", "reaction", "free", "passive"]
      }),
      
      // Тип способности
      abilityType: new StringField({
        initial: "damage",
        choices: ["damage", "buff", "debuff", "utility", "summon", "transform", "heal", "other"]
      }),
      
      // Стоимость
      manaCost: new NumberField({ initial: 0, min: 0 }),
      spiritCost: new NumberField({ initial: 0, min: 0 }),
      cooldown: new NumberField({ initial: 0, min: 0 }),
      currentCooldown: new NumberField({ initial: 0, min: 0 }),
      
      // Урон
      damage: new StringField({ initial: "" }),
      damageType: new StringField({ 
        initial: "pure",
        choices: [
          "slashing", "blunt", "piercing", 
          "fire", "cold", "lightning", "acid", "poison", 
          "psychic", "light", "dark", "pure"
        ]
      }),
      damageScaling: new StringField({
        initial: "soulPower",
        choices: ["strength", "agility", "precision", "soulPower", "spirit", "cognition", "willpower", "none"]
      }),
      
      // Дальность и область
      range: new NumberField({ initial: 0, min: 0 }),
      targetType: new StringField({
        initial: "enemy",
        choices: ["self", "ally", "enemy", "any", "point"]
      }),
      areaType: new StringField({
        initial: "none",
        choices: ["none", "sphere", "cone", "line", "emanation"]
      }),
      areaSize: new NumberField({ initial: 0, min: 0 }),
      
      // Длительность
      duration: new StringField({ initial: "instant" }),
      durationRounds: new NumberField({ initial: 0, min: 0 }),
      
      // Спасбросок
      requiresSave: new BooleanField({ initial: false }),
      saveAttribute: new StringField({
        initial: "agility",
        choices: ["agility", "fortitude", "willpower", "cognition"]
      }),
      
      // Заметки игрока для этой способности
      playerNotes: new HTMLField()
    });
    
    return {
      // === ОСНОВНАЯ ИНФОРМАЦИЯ ===
      rank: new NumberField({ initial: 1, min: 1, max: 9, integer: true }),
      
      equipStatus: new StringField({
        initial: "stored",
        choices: ["stored", "equipped"]
      }),
      
      // Цвет эссенции (определяет количество способностей)
      color: new StringField({
        initial: "red",
        choices: [
          "red", "orange", "yellow", "green", "blue", "indigo", "violet",
          "white", "black", "gray", "rainbow"
        ]
      }),
      
      // Дополнительные цвета для многоцветных
      secondaryColors: new ArrayField(new StringField()),
      
      // === ИСТОЧНИК ===
      monsterName: new StringField({ initial: "" }),
      monsterDescription: new StringField({ initial: "" }),
      
      // === ОПИСАНИЯ ===
      description: new HTMLField(),
      passiveDescription: new HTMLField(), // Описание пассивных эффектов
      
      // === СПОСОБНОСТИ (массив) ===
      abilities: new ArrayField(abilitySchema(), { initial: [] }),
      
      // === ЗАМЕТКИ ИГРОКА ===
      playerNotes: new HTMLField(),
      
      // === ТОРГОВЛЯ ===
      itemLevel: new NumberField({ initial: 1, min: 1 }),
      price: new NumberField({ initial: 100, min: 0 }),
      
      // === LEGACY (для совместимости) ===
      abilityName: new StringField({ initial: "" }),
      manaCost: new NumberField({ initial: 0 }),
      spiritCost: new NumberField({ initial: 0 }),
      cooldown: new NumberField({ initial: 0 }),
      isOnCooldown: new BooleanField({ initial: false }),
      activationAction: new StringField({ initial: "action" }),
      abilityType: new StringField({ initial: "damage" }),
      damage: new StringField({ initial: "" }),
      damageType: new StringField({ initial: "pure" }),
      damageScaling: new StringField({ initial: "spirit" }),
      range: new NumberField({ initial: 0 }),
      targetType: new StringField({ initial: "self" }),
      areaType: new StringField({ initial: "none" }),
      areaSize: new NumberField({ initial: 0 }),
      duration: new StringField({ initial: "instant" }),
      durationRounds: new NumberField({ initial: 0 }),
      requiresSave: new BooleanField({ initial: false }),
      saveAttribute: new StringField({ initial: "agility" }),
      saveDC: new NumberField({ initial: 0 })
    };
  }
  
  // === ГЕТТЕРЫ ===
  
  /** Является ли эссенция многоцветной */
  get isMulticolored() {
    return this.color === "rainbow" || (this.secondaryColors && this.secondaryColors.length > 0);
  }
  
  /** Количество активных способностей */
  get activeAbilitiesCount() {
    return this.abilities.filter(a => a.activationAction !== "passive").length;
  }
  
  /** Активные способности */
  get activeAbilities() {
    return this.abilities.filter(a => a.activationAction !== "passive");
  }
  
  /** Пассивные способности */
  get passiveAbilities() {
    return this.abilities.filter(a => a.activationAction === "passive");
  }
  
  /** Цвет для отображения */
  get colorHex() {
    const colorMap = {
      red: "#dc143c",
      orange: "#ff8c00",
      yellow: "#ffd700",
      green: "#228b22",
      blue: "#4169e1",
      indigo: "#4b0082",
      violet: "#9400d3",
      white: "#f0f0f0",
      black: "#1a1a1a",
      gray: "#808080",
      rainbow: "linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)"
    };
    return colorMap[this.color] || "#808080";
  }
  
  /** Локализованное название цвета */
  get colorLabel() {
    const labels = {
      red: "Красный",
      orange: "Оранжевый", 
      yellow: "Жёлтый",
      green: "Зелёный",
      blue: "Синий",
      violet: "Фиолетовый",
      white: "Белый",
      black: "Чёрный",
      gray: "Серый",
      rainbow: "Радужный"
    };
    return labels[this.color] || this.color;
  }
  
  // === ПОДГОТОВКА ДАННЫХ ===
  
  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Валидация ранга
    if (!this.rank || isNaN(this.rank)) {
        this.rank = 1;
    }
  }
  
  /** Миграция старого формата */
  _migrateLegacyAbility() {
    if (this.abilityName || this.damage) {
      const legacyAbility = {
        id: foundry.utils.randomID(),
        name: this.abilityName || "Способность",
        description: "",
        activationAction: this.activationAction || "action",
        abilityType: this.abilityType || "damage",
        manaCost: this.manaCost || 0,
        spiritCost: this.spiritCost || 0,
        cooldown: this.cooldown || 0,
        currentCooldown: 0,
        damage: this.damage || "",
        damageType: this.damageType || "pure",
        damageScaling: this.damageScaling || "spirit",
        range: this.range || 0,
        targetType: this.targetType || "enemy",
        areaType: this.areaType || "none",
        areaSize: this.areaSize || 0,
        duration: this.duration || "instant",
        durationRounds: this.durationRounds || 0,
        requiresSave: this.requiresSave || false,
        saveAttribute: this.saveAttribute || "agility",
        playerNotes: ""
      };
      this.abilities = [legacyAbility];
    }
  }
}

export class SpellData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rank: new NumberField({ initial: 9, min: 1, max: 9, nullable: true }),
      
      magicSource: new StringField({
        initial: "arcane", 
        choices: ["arcane", "divine"] 
      }),
      spellType: new StringField({
        initial: "utility",
        choices: ["attack", "support", "utility", "ritual"]
      }),
      gpCost: new NumberField({ initial: 0, min: 0 }),
      secondaryAttribute: new StringField({ initial: "", blank: true }),
      playerNotes: new HTMLField({ initial: "" }),

      manaCost: new NumberField({ initial: 10, min: 0 }),
      
      rollType: new StringField({
        initial: "attack",
        choices: ["attack", "save", "none"]
      }),
      
      attackAttribute: new StringField({
        initial: "precision",
        choices: ["precision", "throwing", "cognition", "willpower", "spirit"],
        blank: true
      }),
      
      saveAttribute: new StringField({
        initial: "agility",
        choices: ["agility", "flexibility", "fortitude", "stamina", "willpower", "intuition", "luck"],
        blank: true
      }),
      
      saveDC: new NumberField({ initial: 0, min: 0 }),
      saveKU: new NumberField({ initial: 1, min: 1 }),
      
      damage: new StringField({ initial: "" }),
      damageType: new StringField({ 
        initial: "fire",
        choices: [
          "slashing", "blunt", "piercing", 
          "fire", "cold", "lightning", "acid", "poison", 
          "psychic", "light", "dark", "pure"
        ]
      }),
      
      damageScaling: new StringField({
        initial: "spirit",
        choices: ["spirit", "cognition", "willpower", "none"],
        blank: true
      }),
      
      castTime: new NumberField({ initial: 1, min: 1, max: 2 }),
      canConcentrate: new BooleanField({ initial: false }),
      
      components: new SchemaField({
        verbal: new BooleanField({ initial: true }),
        somatic: new BooleanField({ initial: true }),
        material: new BooleanField({ initial: false }),
        materialDescription: new StringField({ initial: "" })
      }),
      
      range: new NumberField({ initial: 10, min: -1 }),
      targetType: new StringField({ initial: "enemy", choices: ["self", "ally", "enemy", "any", "point"] }),
      areaType: new StringField({ initial: "none", choices: ["none", "sphere", "cone", "line", "cube", "emanation"] }),
      areaSize: new NumberField({ initial: 0, min: 0 }),
      
      duration: new StringField({ initial: "instant" }),
      durationRounds: new NumberField({ initial: 0 }),
      
      description: new HTMLField(),
      requiredLevel: new NumberField({ initial: 1, min: 1 })
    };
  }
  
  get isAttack() {
    return this.rollType === "attack";
  }
  
  get requiresSave() {
    return this.rollType === "save";
  }
  
  get dealsDamage() {
    return this.damage && this.damage.length > 0;
  }
  
  get hasArea() {
    return this.areaType !== "none";
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    
    if (!this.rank || isNaN(this.rank) || typeof this.rank !== "number") {
      this.rank = 1;
    }
  }
}

export class BlessingData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      source: new StringField({ initial: "Divine" }),
      deity: new StringField({ initial: "" }),
      active: new BooleanField({ initial: true }),
      
      blessingType: new StringField({
        initial: "passive",
        choices: ["passive", "active", "triggered"]
      }),
      
      duration: new StringField({ initial: "Permanent" }),
      
      description: new HTMLField()
    };
  }
}

export class LineageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      lineageType: new StringField({
        initial: "race",
        choices: ["race", "bloodline", "heritage", "curse"]
      }),
      
      description: new HTMLField()
    };
  }
}

export class SimpleItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      quantity: new NumberField({ initial: 1, nullable: true }),
      weight: new NumberField({ initial: 0, nullable: true }),
      price: new NumberField({ initial: 0, nullable: true })
    };
  }

  get totalWeight() {
    return (this.weight || 0) * (this.quantity || 1);
  }
}

export class RoleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rank: new NumberField({ initial: 1, min: 1, max: 9, nullable: true }),
      
      roleType: new StringField({
        initial: "combat",
        choices: ["combat", "magic", "skill", "hybrid"]
      }),

      hpPerLevel: new NumberField({ initial: 0 }),
      manaPerLevel: new NumberField({ initial: 0 }),
      
      grantedProficiencies: new ArrayField(new StringField()),
      
      requirements: new HTMLField(),
      description: new HTMLField()
    };
  }
  prepareDerivedData() {
    super.prepareDerivedData();
    
    if (this.rank === null || this.rank === undefined || this.rank === "" || isNaN(this.rank)) {
      this.rank = 1;
    }
  }
}

export class ContractData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      spiritCost: new NumberField({ initial: 1, min: 0, nullable: true }),
      
      contractType: new StringField({ 
        initial: "spirit",
        blank: true
      }),
      
      entityName: new StringField({ 
        initial: "Дух Природы"
      }),
      
      canSummon: new BooleanField({ initial: false }),
      summonActorId: new StringField({ initial: "", blank: true }),
      activeAbility: new HTMLField(),

      equipStatus: new StringField({ initial: "stored", choices: ["stored", "equipped"] }),

      level: new NumberField({ initial: 1, min: 1 }),
      xp: new NumberField({ initial: 0, min: 0 }),
      xpMax: new NumberField({ initial: 100 }),
      passiveAbilities: new HTMLField(),
      
      activeAbilityParams: new SchemaField({
        manaCost: new NumberField({ initial: 0 }),
        spiritCost: new NumberField({ initial: 0 }),
        damage: new StringField({ initial: "" }),
        damageType: new StringField({ 
          initial: "pure",
          choices: [
            "slashing", "blunt", "piercing", 
            "fire", "cold", "lightning", "acid", "poison", 
            "psychic", "light", "dark", "pure"
          ]
        }),
        cooldown: new NumberField({ initial: 0 }),
        isOnCooldown: new BooleanField({ initial: false }),
        range: new NumberField({ initial: 0 })
      }),
      
      playerNotes: new HTMLField(),
      description: new HTMLField()
    };
  }
}

export class DragonWordData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // Стоимость в DP
      dpCost: new NumberField({ initial: 5, min: 0 }),
      
      // Тип слова
      wordType: new StringField({
        initial: "attack",
        choices: ["attack", "defense", "utility", "buff", "debuff"]
      }),
      
      // Механика броска
      rollType: new StringField({
        initial: "attack",
        choices: ["attack", "save", "none"]
      }),
      
      // Атрибут для атаки
      attackAttribute: new StringField({
        initial: "dragonPowerStat",
        choices: ["dragonPowerStat", "willpower", "spirit", "cognition"],
        blank: true
      }),
      
      // Спасбросок
      saveAttribute: new StringField({
        initial: "willpower",
        choices: ["agility", "fortitude", "willpower", "intuition"],
        blank: true
      }),
      saveDC: new NumberField({ initial: 0 }),
      
      // Урон
      damage: new StringField({ initial: "" }),
      damageType: new StringField({ 
        initial: "fire",
        choices: [
          "slashing", "blunt", "piercing", 
          "fire", "cold", "lightning", "acid", "poison", 
          "psychic", "light", "dark", "pure"
        ]
      }),
      
      // Скалирование урона
      damageScaling: new StringField({
        initial: "dragonPowerStat",
        choices: ["dragonPowerStat", "soulPower", "spirit", "none"],
        blank: true
      }),
      
      // Дальность и область
      range: new NumberField({ initial: 10 }),
      areaType: new StringField({
        initial: "none",
        choices: ["none", "cone", "line", "sphere"]
      }),
      areaSize: new NumberField({ initial: 0 }),
      
      // Длительность
      duration: new StringField({ initial: "instant" }),
      durationRounds: new NumberField({ initial: 0 }),
      
      // Кулдаун
      cooldown: new NumberField({ initial: 0 }),
      isOnCooldown: new BooleanField({ initial: false }),
      
      // Уровень слова (для прогрессии)
      wordLevel: new NumberField({ initial: 1, min: 1, max: 5 }),
      
      // Требования
      requiredDPStat: new NumberField({ initial: 0 }),
      
      // Описание
      description: new HTMLField(),
      playerNotes: new HTMLField()
    };
  }
  
  get isAttack() {
    return this.rollType === "attack";
  }
  
  get requiresSave() {
    return this.rollType === "save";
  }
  
  get dealsDamage() {
    return this.damage && this.damage.length > 0;
  }
}

export class KnowledgeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      value: new NumberField({ initial: 0, integer: true }),
      
      knowledgeType: new StringField({
        initial: "lore",
        choices: ["lore", "recipe", "blueprint", "language", "technique"]
      }),
      
      createsItemId: new StringField({ initial: "" }),
      
      ingredients: new ArrayField(new SchemaField({
        itemId: new StringField({ initial: "" }),
        quantity: new NumberField({ initial: 1 })
      })),
      
      craftDC: new NumberField({ initial: 10 }),
      craftTime: new StringField({ initial: "1 hour" }),
      
      description: new HTMLField()
    };
  }
}
