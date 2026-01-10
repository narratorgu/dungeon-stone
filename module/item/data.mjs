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
    return {
      rank: new NumberField({ initial: 9, min: 1, max: 9, nullable: true }),
      
      equipStatus: new StringField({
        initial: "stored",
        choices: ["stored", "equipped"]
      }),
      
      abilityName: new StringField({ initial: "Способность" }),
      description: new HTMLField(),
      
      manaCost: new NumberField({ initial: 0 }),
      spiritCost: new NumberField({ initial: 0 }),
      cooldown: new NumberField({ initial: 0 }),
      isOnCooldown: new BooleanField({ initial: false }),
      
      activationAction: new StringField({
        initial: "action",
        choices: ["action", "bonus", "reaction", "free", "passive"]
      }),
      
      abilityType: new StringField({
        initial: "damage",
        choices: ["damage", "buff", "debuff", "utility", "summon", "transform", "other"]
      }),
      
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
        initial: "spirit",
        choices: ["strength", "agility", "precision", "spirit", "cognition", "none"],
        blank: true
      }),
      
      range: new NumberField({ initial: 0 }),
      
      targetType: new StringField({
        initial: "self",
        choices: ["self", "ally", "enemy", "any", "point"]
      }),
      
      areaType: new StringField({
        initial: "none",
        choices: ["none", "sphere", "cone", "line", "emanation"]
      }),
      areaSize: new NumberField({ initial: 0 }),
      
      duration: new StringField({ initial: "instant" }),
      durationRounds: new NumberField({ initial: 0 }),
      
      requiresSave: new BooleanField({ initial: false }),
      saveAttribute: new StringField({
        initial: "agility",
        choices: ["agility", "fortitude", "willpower", "cognition"],
        blank: true
      }),
      saveDC: new NumberField({ initial: 0 }),
      
      itemLevel: new NumberField({ initial: 1, nullable: true }),
      price: new NumberField({ initial: 100, nullable: true })
    };
  }
  
  get hasActivation() {
    return this.activationAction !== "passive";
  }
  
  get dealsDamage() {
    return this.damage && this.damage.length > 0;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    
    if (!this.rank || isNaN(this.rank) || typeof this.rank !== "number") {
      this.rank = 1;
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

  prepareDerivedData() {
    super.prepareDerivedData();
    
    if (!this.rank || isNaN(this.rank) || typeof this.rank !== "number") {
      this.rank = 1;
    }
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
