import { DUNGEON } from "../config.mjs";

const BaseActorSheet = foundry.appv1 ? foundry.appv1.sheets.ActorSheet : ActorSheet;

export class DungeonActorSheet extends BaseActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dungeon-stone", "sheet", "actor"],
      width: 950,
      height: 750,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
    });
  }

  get template() {
    if (this.actor.type === 'monster') return "systems/dungeon-stone/templates/actor/monster-sheet.hbs";
    return "systems/dungeon-stone/templates/actor/character-sheet.hbs";
  }

  async getData() {
    const context = await super.getData();
    const actorData = context.data;
    
    // Подготовка базовых данных
    context.system = actorData.system;
    // ВАЖНО: Получаем source данные для правильного редактирования инпутов
    context.sourceSystem = this.actor._source.system;
    
    context.flags = actorData.flags;
    context.config = DUNGEON;
    context.isGM = game.user.isGM;
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;

    // --- VISIBILITY (ГЛАЗИКИ) ---
    const revealedRaw = this.actor.getFlag("dungeon-stone", "revealed") || {};
    context.revealed = {};
    const allKeys = [
        "strength", "agility", "endurance", "accuracy", "throwing", "flexibility",
        "boneDensity", "naturalRegeneration", "perception", "vision", "physicalResistance",
        "magicResistance", "manaSensitivity", "spiritRecovery",
        "physique", "spirit", "xp",
        // Резисты
        "resist_slashing", "resist_blunt", "resist_piercing",
        "resist_fire", "resist_cold", "resist_lightning",
        "resist_psychic", "resist_poison", "resist_acid",
        "resist_light", "resist_dark", "resist_pure",
        // Владения
        "prof_bladed", "prof_blunt", "prof_polearm", "prof_axes", "prof_unarmed",
        "intuition", "cognition", "willpower", "presence", "fortitude", "metabolism"
    ];
    allKeys.forEach(k => { context.revealed[k] = revealedRaw[k] === true; });

    // Проценты
    context.xpPercent = (context.system.resources.xp.max > 0) ? Math.min(100, Math.round((context.system.resources.xp.value / context.system.resources.xp.max) * 100)) : 100;
    context.hpPercent = (context.system.resources.hp.max > 0) ? Math.round((context.system.resources.hp.value / context.system.resources.hp.max) * 100) : 0;
    context.manaPercent = (context.system.resources.mana.max > 0) ? Math.round((context.system.resources.mana.value / context.system.resources.mana.max) * 100) : 0;

    // 1. Предметы
    this._prepareItems(context);

    // 2. Роль и Ранг
    // Объявляем переменные ЯВНО перед использованием
    const roleItem = context.roles.length > 0 ? context.roles[0] : null;
    const lineageItem = context.lineages.length > 0 ? context.lineages[0] : null;
    
    // Определяем числовой ранг (если роли нет, то 99)
    const currentRoleRank = roleItem ? Number(roleItem.system.rank) : 99;

    // Записываем в контекст для шаблона
    context.roleItem = roleItem;
    context.lineageItem = lineageItem;
    context.hasRole = !!roleItem;
    context.currentRoleRank = currentRoleRank;

    // 3. Логика Расы
    context.race = { isHuman: false, isBeastkin: false, isDragon: false, isDwarf: false, isBarbarian: false, isElf: false };
    if (lineageItem) {
        const name = lineageItem.name.toLowerCase();
        if (name.includes("люд") || name.includes("human")) context.race.isHuman = true;
        else if (name.includes("зверо") || name.includes("beast")) context.race.isBeastkin = true;
        else if (name.includes("дракон") || name.includes("dragon")) context.race.isDragon = true;
        else if (name.includes("дварф") || name.includes("гном") || name.includes("dwarf")) context.race.isDwarf = true;
        else if (name.includes("варвар") || name.includes("barbarian")) context.race.isBarbarian = true;
        else if (name.includes("эльф") || name.includes("elf")) context.race.isElf = true;
    }

    // 4. Логика Магии (Вкладка)
    let isMagicUser = false;
    if (roleItem) {
        const rName = roleItem.name.toLowerCase();
        isMagicUser = ["маг", "жрец", "паладин", "некромант", "mage", "priest", "paladin", "necromancer"].some(k => rName.includes(k));
    }
    context.showContractsTab = (context.isGM || context.race.isBeastkin || context.race.isElf);
    context.showSpellsTab = (context.isGM || isMagicUser) && context.hasRole;

    // 5. Видимость рангов заклинаний
    // Здесь мы используем локальную переменную currentRoleRank, которая точно существует
    context.spellsByRank.forEach(group => {
        if (!roleItem) {
            // Если нет роли - скрываем всё (кроме ГМа, если там что-то лежит)
            group.visible = (context.isGM && group.list.length > 0);
        } else {
            // Если есть роль: ранг заклинания должен быть >= рангу роли (9 >= 5)
            const isAvailable = group.rank >= currentRoleRank;
            const hasItems = group.list.length > 0;
            
            if (context.isGM) {
                group.visible = isAvailable || hasItems;
            } else {
                group.visible = isAvailable;
            }
        }
    });

    return context;
  }

  _prepareItems(context) {
    const weapons = [];
    const armor = [];
    const consumables = [];
    const loot = [];
    const lineages = [];
    const roles = [];
    const abilities = [];
    const others = [];
    const contracts = [];
    const blessings = [];
    
    // Создаем каркас для заклинаний: [ {rank: 9, list: [], visible: false}, ... ]
    const spellsByRank = [];
    for (let r = 9; r >= 1; r--) {
        spellsByRank.push({ rank: r, list: [], visible: false });
    }
    
    const essencesByRank = { 9:[], 8:[], 7:[], 6:[], 5:[], 4:[], 3:[], 2:[], 1:[] };

    for (let i of context.items) {
      if (i.type === 'weapon') weapons.push(i);
      else if (i.type === 'armor') armor.push(i);
      else if (i.type === 'blessing') blessings.push(i);
      else if (i.type === 'consumable') consumables.push(i);
      else if (i.type === 'loot') loot.push(i);
      else if (i.type === 'lineage') lineages.push(i);
      else if (i.type === 'contract') contracts.push(i);
      
      // === ВАЖНО: Добавляем роль в массив ===
      else if (i.type === 'role') roles.push(i);
      // ======================================
      
      else if (i.type === 'essence') {
          const rank = i.system.rank || 9;
          if (essencesByRank[rank]) essencesByRank[rank].push(i);
          if (i.system.activeAbility) abilities.push(i);
      }
      else if (i.type === 'spell') {
          const rank = i.system.rank || 9;
          const group = spellsByRank.find(g => g.rank === rank);
          if (group) group.list.push(i);
      }
      else others.push(i);
    }

    context.weapons = weapons;
    context.armor = armor;
    context.consumables = consumables;
    context.loot = loot;
    context.lineages = lineages;
    context.roles = roles;
    context.essencesByRank = essencesByRank;
    context.spellsByRank = spellsByRank;
    context.abilities = abilities;
    context.others = others;
    context.contracts = contracts;
  }

  /** @override */
  _onDragStart(event) {
    if (event.originalEvent) event = event.originalEvent;
    const li = event.currentTarget;
    
    // 1. Если это Предмет (стандартная логика)
    if (li.dataset.itemId) {
        const item = this.actor.items.get(li.dataset.itemId);
        event.dataTransfer.setData("text/plain", JSON.stringify({
            type: "Item",
            uuid: item.uuid
        }));
        return;
    }
    
    // 2. Если это Атрибут/Навык (наш кастомный draggable)
    // В шаблоне нужно добавить draggable="true" и data-key="..." к строкам статов
    if (li.dataset.key) {
        const label = li.dataset.label || "Check";
        const rollData = {
            type: "Macro", // Обманываем Foundry, говорим что это макрос
            command: `const actor = game.actors.get("${this.actor.id}"); if(actor) actor.rollAttribute("${li.dataset.key}", "${label}");`,
            name: label,
            img: "icons/svg/d20.svg" // Или иконка стата
        };
        event.dataTransfer.setData("text/plain", JSON.stringify(rollData));
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find('.roll-initiative').click(async ev => {
        ev.preventDefault();
        await this.actor.rollInitiative({createCombatants: true});
    });

    // --- БРОСКИ СТАТОВ ---
    html.find('.rollable').click(this._onRoll.bind(this));

    // Разрешаем перетаскивание статов
    html.find('.rollable').attr("draggable", "true").on("dragstart", this._onDragStart.bind(this));
    // Разрешаем перетаскивание предметов (если класс .item не сработал)
    html.find('.item-entry').attr("draggable", "true").on("dragstart", this._onDragStart.bind(this));
    
    // --- ГЛАЗИКИ ---
    html.find('.vis-btn').click(async (event) => {
        event.preventDefault(); event.stopPropagation();
        const btn = event.currentTarget;
        const key = btn.dataset.key;
        if (!key) return;
        const current = this.actor.getFlag("dungeon-stone", "revealed") || {};
        await this.actor.setFlag("dungeon-stone", `revealed.${key}`, !current[key]);
    });

    // --- ПЕРЕКЛЮЧАТЕЛЬ ЩИТА ---
    // Ищем кнопку конкретно с ключом shieldRaised
    html.find('.vis-btn[data-key="shieldRaised"]').click(async (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Получаем текущее значение
        const current = this.actor.system.combat.shieldRaised;
        
        // Обновляем данные актера
        await this.actor.update({"system.combat.shieldRaised": !current});
    });

    html.find('.direct-edit').change(async ev => {
        ev.preventDefault();
        ev.stopPropagation(); // Останавливаем стандартную отправку формы
        
        const input = ev.currentTarget;
        const fieldPath = input.name; // например: system.subAttributes.strength
        const value = Number(input.value);
        
        // Прямое обновление базы данных
        await this.actor.update({ [fieldPath]: value });
    });
    
    // --- КАЛЬКУЛЯТОР ВАЛЮТЫ ---
    html.find('.currency-input').change(async ev => {
        // ... (код калькулятора без изменений) ...
        ev.preventDefault();
        const input = ev.currentTarget;
        const valueStr = input.value.trim();
        const current = this.actor.system.resources.currency;
        let newValue = current;
        if (!valueStr) return;
        if (valueStr.startsWith("+")) {
            const add = Number(valueStr.replace("+", ""));
            if (!isNaN(add)) newValue = current + add;
        } else if (valueStr.startsWith("-")) {
            const sub = Number(valueStr.replace("-", ""));
            if (!isNaN(sub)) newValue = current - sub;
        } else {
            const setVal = Number(valueStr);
            if (!isNaN(setVal)) newValue = setVal;
        }
        if (newValue < 0) newValue = 0;
        await this.actor.update({"system.resources.currency": newValue});
        input.value = ""; 
    });

    html.find('.regen-btn').click(ev => { ev.preventDefault(); this.actor.applyRegenDialog(); });
    html.find('.xp-add-btn').click(ev => { ev.preventDefault(); this.actor.addExperienceDialog(); });

    html.find('.item-create').click(this._onItemCreate.bind(this));
    
    // === ИСПРАВЛЕННЫЕ ОБРАБОТЧИКИ ПРЕДМЕТОВ ===
    
    // Редактирование
    html.find('.item-edit').click(ev => {
      const element = $(ev.currentTarget).closest("[data-item-id]"); // Ищем любой контейнер с ID
      const item = this.actor.items.get(element.data("itemId"));
      if (item) item.sheet.render(true);
    });
    
    // Удаление
    html.find('.item-delete').click(async ev => {
      const element = $(ev.currentTarget).closest("[data-item-id]");
      const item = this.actor.items.get(element.data("itemId"));
      if (item) {
          const confirmed = await Dialog.confirm({
              title: "Удалить предмет?",
              content: `<p>Удалить <b>${item.name}</b>?</p>`,
              yes: () => true,
              no: () => false
          });
          if (confirmed) await item.delete();
      }
    });
    
    // Бросок оружия
    html.find('.weapon-roll').click(ev => {
        ev.preventDefault();
        const element = $(ev.currentTarget).closest("[data-item-id]");
        const itemId = element.data("itemId");
        if (itemId) this.actor.rollWeaponAttack(itemId);
    });

    // Использование способности
    html.find('.ability-use').click(ev => {
        ev.preventDefault();
        const element = $(ev.currentTarget).closest("[data-item-id]");
        const itemId = element.data("itemId");
        // Вызов метода актера
        if (itemId) this.actor.useItem(itemId); 
    });
  }

  async _onRoll(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    if (dataset.key && dataset.label) this.actor.rollAttribute(dataset.key, dataset.label);
  }
  
  async _onWeaponRoll(event) { 
      event.preventDefault(); 
      const itemId = event.currentTarget.closest(".item-entry")?.dataset.itemId;
      if (itemId) this.actor.rollWeaponAttack(itemId);
  }
  
  async _onAbilityUse(event) { 
      event.preventDefault(); 
      const itemId = event.currentTarget.closest(".item-entry")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (!item) return;
      
      let content = `<div class="card-body">${item.system.activeAbility || item.system.description}</div>`;
      if (item.type === 'spell') {
          content = `
            <div style="font-size:12px; color:#aaa; margin-bottom:5px;">Ранг ${item.system.rank} | Мана: ${item.system.manaCost}</div>
            <div class="card-body">${item.system.description}</div>
            ${item.system.damage ? `<div style="margin-top:5px; font-weight:bold; color:#d4af37;">Эффект: ${item.system.damage}</div>` : ""}
          `;
      }
      
      ChatMessage.create({ 
          speaker: ChatMessage.getSpeaker({actor: this.actor}), 
          content: `<div class="dungeon-chat-card"><h3>${item.name}</h3>${content}</div>`, 
          style: CONST.CHAT_MESSAGE_STYLES.OTHER 
      });
  }
  
  async _onItemCreate(event) { 
      event.preventDefault(); 
      const header = event.currentTarget;
      const type = header.dataset.type;
      
      const itemData = { name: `Новый ${type}`, type: type, system: {} };
      
      if (type === 'spell') {
          const rank = Number(header.dataset.rank) || 9;
          itemData.system.rank = rank;
          itemData.name = `Заклинание ${rank} ранга`;
      }
      if (type === 'role') {
          itemData.system.rank = 9;
          itemData.name = "Новый Класс";
      }
      if (type === 'contract') {
        itemData.name = "Новый Контракт";
      }
      
      return await Item.create(itemData, { parent: this.actor });
  }
}
