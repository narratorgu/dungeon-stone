import { DUNGEON } from "./module/config.mjs";
import { registerHooks } from "./module/hooks.mjs";
import { DungeonActor } from "./module/actor/document.mjs";
import { DungeonActorSheet } from "./module/actor/sheets.mjs";
import { CharacterData, MonsterData } from "./module/actor/data.mjs";
import { DungeonItem } from "./module/item/document.mjs";
import { DungeonItemSheet } from "./module/item/sheets.mjs";
import { AbilityTemplate } from "./module/helpers/template.mjs";
import { 
  WeaponData, 
  ArmorData,
  ConsumableData,
  ContainerData,
  LootData,
  EssenceData, 
  SpellData,
  BlessingData,
  LineageData, 
  RoleData, 
  ContractData, 
  KnowledgeData,
  SimpleItemData, 
  DragonWordData
} from "./module/item/data.mjs";
import { MigrationManager } from "./module/migrations.mjs";

Hooks.once("init", async function() {
  console.log("Dungeon & Stone | Initializing System");

  game.dungeon = {
    rollItemMacro: (itemName) => {
      const speaker = ChatMessage.getSpeaker();
      let actor;

      if (speaker.token) {
        const token = canvas.tokens.get(speaker.token);
        actor = token?.actor;
      }
      if (!actor) actor = game.actors.get(speaker.actor);
      
      if (!actor) return ui.notifications.warn("Нужно выделить токен персонажа.");
      
      const item = actor.items.find(i => i.name === itemName);
      if (!item) return ui.notifications.warn(`У вас нет предмета "${itemName}".`);
      
      if (item.type === "weapon") return actor.rollWeaponAttack(item.id);
      if (["spell", "essence", "contract", "feature", "knowledge"].includes(item.type)) {
        return actor.useItem(item.id);
      }
      
      return item.sheet.render(true);
    },
    
    MigrationManager: MigrationManager
  };

  game.settings.register("dungeon-stone", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: "0.0.0"
  });

  CONFIG.DUNGEON = DUNGEON;

  CONFIG.Actor.documentClass = DungeonActor;
  CONFIG.Item.documentClass = DungeonItem;

  CONFIG.Actor.dataModels = {
    character: CharacterData,
    monster: MonsterData
  };

  CONFIG.Item.dataModels = {
    weapon: WeaponData,
    armor: ArmorData,
    consumable: ConsumableData,
    container: ContainerData,
    loot: LootData,
    essence: EssenceData,
    spell: SpellData,
    blessing: BlessingData,
    lineage: LineageData,
    role: RoleData,
    contract: ContractData,
    knowledge: KnowledgeData,
    dragonword: DragonWordData,
    feature: SimpleItemData
  };

  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2
  };

  // Переопределяем метод rollInitiative в Combat для использования кастомной формулы
  const originalRollInitiative = Combat.prototype.rollInitiative;
  Combat.prototype.rollInitiative = async function(ids, options = {}) {
    // Если передан массив ID комбатантов, обрабатываем каждого
    if (Array.isArray(ids)) {
      for (const id of ids) {
        const combatant = this.combatants.get(id);
        if (!combatant?.actor) continue;
        
        const actor = combatant.actor;
        // Проверяем, что это наш актер
        if (actor instanceof CONFIG.Actor.documentClass) {
          await actor.rollInitiative({ createCombatants: false });
        } else {
          // Для других систем используем стандартный метод
          await originalRollInitiative.call(this, [id], options);
        }
      }
      return this;
    }
    
    // Если передан один ID
    const combatant = this.combatants.get(ids);
    if (combatant?.actor instanceof CONFIG.Actor.documentClass) {
      await combatant.actor.rollInitiative({ createCombatants: false });
      return this;
    }
    
    // Для других систем используем стандартный метод
    return originalRollInitiative.call(this, ids, options);
  };

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["resources.hp", "resources.mana", "resources.fate"],
      value: []
    },
    monster: {
      bar: ["resources.hp", "resources.mana"],
      value: []
    }
  };

  const ActorsCollection = foundry.documents?.collections?.Actors || Actors;
  const ItemsCollection = foundry.documents?.collections?.Items || Items;
  const BaseActorSheet = foundry.appv1?.sheets?.ActorSheet || ActorSheet;
  const BaseItemSheet = foundry.appv1?.sheets?.ItemSheet || ItemSheet;

  ActorsCollection.unregisterSheet("core", BaseActorSheet);
  ActorsCollection.registerSheet("dungeon-stone", DungeonActorSheet, { 
    types: ["character", "monster"], 
    makeDefault: true 
  });

  ItemsCollection.unregisterSheet("core", BaseItemSheet);
  ItemsCollection.registerSheet("dungeon-stone", DungeonItemSheet, { 
    makeDefault: true 
  });

  Handlebars.registerHelper("formatNumber", function(value) {
    return Number(value).toLocaleString('ru-RU');
  });

  Handlebars.registerHelper({
    sub: (a, b) => a - b,
    add: (a, b) => a + b,
    multiply: (a, b) => a * b,
    gt: (a, b) => a > b,
    divide: (a, b) => b !== 0 ? a / b : 0,
    lt: (a, b) => a < b,
    eq: (a, b) => a == b,
    ne: (a, b) => a != b,
    neq: (a, b) => a != b, // Алиас для ne
    gte: (a, b) => a >= b,
    lte: (a, b) => a <= b,
    and: (a, b) => a && b,
    or: (a, b) => a || b,

    default: (value, defaultValue) => {
      if (value === null || value === undefined || value === "") {
        return defaultValue;
      }
      return value;
    },

    getItem: function(itemId, options) {
      const actor = options.data.root.actor;
      return actor.items.get(itemId);
    },

    getRevealed: function(key, revealed) {
      const cleanKey = key
        .replace(/^system\./, '')
        .replace(/^subAttributes\./, '')
        .replace(/^proficiencies\./, '');
      
      return revealed[cleanKey] === true;
    },

    concat: function(...args) {
      args.pop();
      return args.join('');
    },

    join: (array, separator) => {
      if (!array || !Array.isArray(array)) return "";
      return array.join(separator || ", ");
    }
  });
  game.dungeon.AbilityTemplate = AbilityTemplate;

  await foundry.applications.handlebars.loadTemplates([
    "systems/dungeon-stone/templates/actor/parts/stat-row.hbs",
    "systems/dungeon-stone/templates/item/parts/effects-tab.hbs",
    "systems/dungeon-stone/templates/actor/parts/inventory.hbs",
    "systems/dungeon-stone/templates/actor/parts/item-card-mini.hbs",
    "systems/dungeon-stone/templates/item/parts/_item-header.hbs",
    "systems/dungeon-stone/templates/actor/parts/item-row.hbs",
    "systems/dungeon-stone/templates/dialogs/essence-attack-dialog.hbs",
    "systems/dungeon-stone/templates/dialogs/essence-save-dialog.hbs",
    "systems/dungeon-stone/templates/dialogs/essence-ability-edit-dialog.hbs",
    "systems/dungeon-stone/templates/dialogs/attack-dialog.hbs"
  ]);
  
  registerHooks();
});

Hooks.on("hotbarDrop", async (bar, data, slot) => {
  if (data.type !== "Item") return;
  if (!data.uuid) return ui.notifications.warn("Можно создавать макросы только для предметов актера.");
  
  const item = await fromUuid(data.uuid);
  const command = `game.dungeon.rollItemMacro("${item.name}");`;
  
  let macro = game.macros.find(m => m.name === item.name && m.command === command);
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "dungeon-stone.itemMacro": true }
    });
  }
  
  await game.user.assignHotbarMacro(macro, slot);
  return false;
});

Hooks.once("ready", async () => {
  await MigrationManager.migrateWorld();

  game.socket.on("system.dungeon-stone", async (data) => {
    if (!game.user.isGM) return;
    if (game.users.activeGM?.id !== game.user.id) return;
  
    if (data.type === "applyDamage") {
      const actor = game.actors.get(data.actorId);
      if (!actor) return;
      const currentHP = actor.system.resources.hp.value;
      const newHP = Math.max(0, currentHP - data.damage);
      await actor.update({ "system.resources.hp.value": newHP });
      return;
    }
  
    if (data.type === "syncArmorPenaltyAE") {
      const actor = game.actors.get(data.actorId);
      console.log("SYNC REQUEST", {
        actorFound: !!actor,
        actorName: actor?.name,
        actorClass: actor?.constructor?.name,
        hasMethod: typeof actor?._syncAllArmorPenaltyEffects === "function"
      });
    }
  
    if (data.type === "proxyAttack") {
      const attacker = game.actors.get(data.attackerId);
      const target = game.actors.get(data.targetId);
      if (attacker && target) {
        attacker.rollWeaponAttack(data.itemId);
        ui.notifications.info(`Игрок ${data.userId} запрашивает атаку.`);
      }
      return;
    }
  });
});
