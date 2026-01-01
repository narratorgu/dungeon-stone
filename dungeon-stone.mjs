import { DUNGEON } from "./module/config.mjs";
import { registerHooks } from "./module/hooks.mjs";
import { DungeonActor } from "./module/actor/document.mjs";
import { DungeonActorSheet } from "./module/actor/sheets.mjs";
import { CharacterData, MonsterData } from "./module/actor/data.mjs";
import { DungeonItem } from "./module/item/document.mjs";
import { DungeonItemSheet } from "./module/item/sheets.mjs";
import { WeaponData, EssenceData, LineageData, SimpleItemData, RoleData, SpellData, ContractData } from "./module/item/data.mjs";

// Глобальный объект для вызова из макросов
game.dungeon = {
  rollItemMacro: (itemName) => {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    
    if (!actor) return ui.notifications.warn("Нужно выделить токен персонажа.");
    
    // Ищем предмет по имени
    const item = actor.items.find(i => i.name === itemName);
    if (!item) return ui.notifications.warn(`У вас нет предмета "${itemName}".`);
    
    // Запускаем логику в зависимости от типа
    if (item.type === "weapon") return actor.rollWeaponAttack(item.id);
    if (item.type === "spell" || item.type === "contract") {
        return actor.useItem(item.id);
    }
    
    return item.sheet.render(true); // Для остальных просто открываем лист
  }
};

Hooks.once("init", async function() {
  console.log("Dungeon & Stone | Initializing System");

  CONFIG.DUNGEON = DUNGEON;

  CONFIG.Actor.documentClass = DungeonActor;
  CONFIG.Item.documentClass = DungeonItem;

  CONFIG.Actor.dataModels = {
    character: CharacterData,
    monster: MonsterData
  };
  CONFIG.Item.dataModels = {
    weapon: WeaponData,
    essence: EssenceData,
    lineage: LineageData,
    armor: SimpleItemData,
    consumable: SimpleItemData,
    loot: SimpleItemData,
    feature: SimpleItemData,
    role: RoleData,
    spell: SpellData,
    contract: ContractData
  };

  CONFIG.Combat.initiative = {
    decimals: 2
  };

  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
  const Actors = foundry.documents.collections.Actors;
  const Items = foundry.documents.collections.Items;
  const ActorSheet = foundry.appv1 ? foundry.appv1.sheets.ActorSheet : foundry.applications.sheets.ActorSheet;
  const ItemSheet = foundry.appv1 ? foundry.appv1.sheets.ItemSheet : foundry.applications.sheets.ItemSheet;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dungeon-stone", DungeonActorSheet, { 
    types: ["character", "monster"], 
    makeDefault: true 
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dungeon-stone", DungeonItemSheet, { 
      makeDefault: true 
  });

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["resources.hp", "resources.mana"],
      value: []
    },
    monster: {
      bar: ["resources.hp"],
      value: []
    }
  };

  Handlebars.registerHelper({
    "sub": (a, b) => a - b,
    "add": (a, b) => a + b,
    "gt": (a, b) => a > b,
    "lt": (a, b) => a < b,
    "eq": (a, b) => a == b,
    "ne": (a, b) => a != b,
    "gte": (a, b) => a >= b,
    "lte": (a, b) => a <= b,
    "and": (a, b) => a && b,
    "or": (a, b) => a || b
});

  await foundry.applications.handlebars.loadTemplates([
    "systems/dungeon-stone/templates/actor/parts/stat-row.hbs",
    "systems/dungeon-stone/templates/item/parts/effects-tab.hbs"
  ]);
  
  registerHooks();
});

async function createItemMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("uuid" in data)) return ui.notifications.warn("Можно создавать макросы только для предметов, принадлежащих Актеру.");
  
  const item = await fromUuid(data.uuid);
  
  // Создаем макрос
  const command = `game.dungeon.rollItemMacro("${item.name}");`;
  
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "dungeon.itemMacro": true }
    });
  }
  
  game.user.assignHotbarMacro(macro, slot);
  return false;
}
