import { DUNGEON } from "../config.mjs";

const BaseActorSheet = foundry.appv1?.sheets?.ActorSheet || ActorSheet;

export class DungeonActorSheet extends BaseActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dungeon-stone", "sheet", "actor"],
      width: 950,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "body" }],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

  get template() {
    if (this.actor.type === 'monster') return "systems/dungeon-stone/templates/actor/monster-sheet.hbs";
    return "systems/dungeon-stone/templates/actor/character-sheet.hbs";
  }

  async getData() {
    const context = await super.getData();
    const actorData = context.data;
    
    context.system = actorData.system;
    context.sourceSystem = this.actor._source.system;
    context.flags = actorData.flags;
    context.config = DUNGEON;
    context.isGM = game.user.isGM;
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;

    // Восстановление активного фильтра
    context.activeInventoryFilter = this._activeInventoryFilter || "all";

    const sys = context.system;
    
    // Подготовка предметов
    this._prepareItems(context);

    // Расчет эссенций
    context.essenceCount = sys.equipment.essences.length;
    context.essenceMax = sys.equipment.essenceSlotsMax || 0;
    context.essenceSlots = [];
    for (let i = 0; i < context.essenceMax; i++) {
        const itemId = sys.equipment.essences[i];
        const item = itemId ? this.actor.items.get(itemId) : null;
        context.essenceSlots.push({ index: i, item: item, isEmpty: !item });
    }

    context.isDivine = this.actor.isDivine;
    context.isArcane = this.actor.isArcane;
    context.magicRank = this.actor.magicRank;
    context.magicStats = this.actor.magicStats;
    context.recoveryInfo = this.actor.recoveryInfo || { fullTime: "—", restTime: "—" };

    // --- Логика "Глазиков" ---
    const revealedRaw = this.actor.getFlag("dungeon-stone", "revealed") || {};
    context.revealed = {};
    const allKeys = Object.keys(DUNGEON.subAttributes).concat(Object.keys(DUNGEON.proficiencies), ["physBase", "magBase"], Object.keys(DUNGEON.damageTypes));
    allKeys.forEach(k => { context.revealed[k] = revealedRaw[k] === true; });

    // --- Проценты ресурсов ---
    context.xpPercent = (sys.resources.xp.max > 0) ? Math.min(100, Math.round((sys.resources.xp.value / sys.resources.xp.max) * 100)) : 100;
    context.hpPercent = (sys.resources.hp.max > 0) ? Math.round((sys.resources.hp.value / sys.resources.hp.max) * 100) : 0;
    context.manaPercent = (sys.resources.mana.max > 0) ? Math.round((sys.resources.mana.value / sys.resources.mana.max) * 100) : 0;
    
    const dp = sys.resources.dp;
    context.dpPercent = (dp && dp.max > 0) ? Math.min(100, Math.round((dp.value / dp.max) * 100)) : 0;

    // --- Категории атрибутов ---
    const s = sys.subAttributes;
    const p = sys.proficiencies;
    const attr = sys.attributes;

    context.bodyCategories = {
      main: { 
        id: "main", label: "ОСНОВНЫЕ", 
        list: [
          { key: "subAttributes.strength", label: "Сила", val: s.strength },
          { key: "subAttributes.agility", label: "Ловкость", val: s.agility },
          { key: "subAttributes.precision", label: "Точность", val: s.precision },
          { key: "subAttributes.flexibility", label: "Гибкость", val: s.flexibility }
        ]
      },
      health: { 
        id: "health", label: "ЗДОРОВЬЕ", 
        list: [
          { key: "subAttributes.stamina", label: "Выносливость", val: s.stamina },
          { key: "subAttributes.fortitude", label: "Стойкость", val: s.fortitude },
          { key: "subAttributes.naturalRegeneration", label: "Ест. Регенерация", val: s.naturalRegeneration },
          { key: "subAttributes.physicalResistance", label: "Физ. Сопр.", val: s.physicalResistance }
        ]
      },
      complexion: { 
        id: "complexion", label: "КОМПЛЕКЦИЯ", 
        list: [
          { key: "subAttributes.boneDensity", label: "Плотность Костей", val: s.boneDensity },
          { key: "subAttributes.height", label: "Высота (см)", val: s.height },
          { key: "subAttributes.weight", label: "Вес (кг)", val: s.weight },
          { key: "subAttributes.metabolism", label: "Метаболизм", val: s.metabolism }
        ]
      },
      senses: { 
        id: "senses", label: "ОРГАНЫ ЧУВСТВ", 
        list: [
          { key: "subAttributes.vision", label: "Зрение", val: s.vision },
          { key: "subAttributes.hearing", label: "Слух", val: s.hearing },
          { key: "subAttributes.touch", label: "Осязание", val: s.touch },
          { key: "subAttributes.smell", label: "Обоняние", val: s.smell }
        ]
      },
      weaponForce: { 
        id: "weaponForce", label: "СИЛА ОРУЖИЯ", 
        list: [
          { key: "subAttributes.cuttingForce", label: "Режущая", val: s.cuttingForce },
          { key: "subAttributes.crushingForce", label: "Дробящая", val: s.crushingForce },
          { key: "subAttributes.piercingForce", label: "Колющая", val: s.piercingForce }
        ]
      },
      profs: { 
        id: "profs", label: "ВЛАДЕНИЯ", 
        list: [
          { key: "proficiencies.bladed", label: "Клинковое", val: p.bladed },
          { key: "proficiencies.blunt", label: "Дробящее", val: p.blunt },
          { key: "proficiencies.polearm", label: "Древковое", val: p.polearm },
          { key: "proficiencies.unarmed", label: "Безоружное", val: p.unarmed },
          { key: "proficiencies.throwing", label: "Метательное", val: p.throwing }
        ]
      }
    };

    context.spiritCategories = {
      mind: { 
        id: "mind", label: "РАЗУМ", 
        list: [
          { key: "subAttributes.cognition", label: "Когнитивность", val: s.cognition },
          { key: "subAttributes.willpower", label: "Воля", val: s.willpower },
          { key: "subAttributes.intuition", label: "Интуиция", val: s.intuition }
        ]
      },
      mana: { 
        id: "mana", label: "МАНА", 
        list: [
          { key: "subAttributes.soulPower", label: "Сила Души", val: s.soulPower },
          { key: "subAttributes.manaSense", label: "Чувствительность", val: s.manaSense },
          { key: "subAttributes.spiritRecovery", label: "Восст. Духа", val: s.spiritRecovery },
          { key: "subAttributes.magicResistance", label: "Маг. Сопр.", val: s.magicResistance }
        ]
      },
      special: { 
        id: "special", label: "СПЕЦИАЛЬНОЕ", 
        list: [
          { key: "subAttributes.luck", label: "Удача", val: s.luck },
          { key: "subAttributes.presence", label: "Присутствие", val: s.presence }
        ]
      }
    };

    if (s.divinePowerStat > 0) context.spiritCategories.special.list.push({ key: "subAttributes.divinePowerStat", label: "Божественная Сила", val: s.divinePowerStat });
    if (s.dragonPowerStat > 0) context.spiritCategories.special.list.push({ key: "subAttributes.dragonPowerStat", label: "Сила Дракона", val: s.dragonPowerStat });

    context.globalStats = {
      itemLevel: attr.itemLevel,
      threatLevel: attr.threatLevel,
      
      speed: attr.speed,
      abilityCount: attr.abilityCount,
      spellDC: 10 + sys.attributes.spirit,
      spellAttack: sys.attributes.spirit,
      concentration: sys.attributes.spirit
    };

    // Роли и Расы
    const roleItem = context.roles.length > 0 ? context.roles[0] : null;
    const lineageItem = context.lineages.length > 0 ? context.lineages[0] : null;
    
    context.roleItem = roleItem;
    context.lineageItem = lineageItem;
    context.hasRole = !!roleItem;
    context.currentRoleRank = roleItem ? Number(roleItem.system.rank) : 99;

    context.race = { isHuman: false, isBeastkin: false, isDragon: false, isDwarf: false, isBarbarian: false, isElf: false };
    if (lineageItem) {
      const name = lineageItem.name.toLowerCase();
      if (name.includes("человек") || name.includes("human")) context.race.isHuman = true;
      else if (name.includes("зверо") || name.includes("beast")) context.race.isBeastkin = true;
      else if (name.includes("дракон") || name.includes("dragon")) context.race.isDragon = true;
      else if (name.includes("дварф") || name.includes("гном") || name.includes("dwarf")) context.race.isDwarf = true;
      else if (name.includes("варвар") || name.includes("barbarian")) context.race.isBarbarian = true;
      else if (name.includes("эльф") || name.includes("elf")) context.race.isElf = true;
    }

    // --- РАСЧЕТ СЛОТОВ КОНТРАКТОВ ---
    let contractSlots = 0;
    const spirit = (attr.spirit || 0) + s.soulPower;

    const isBeastkin = lineageItem && lineageItem.name.toLowerCase().match(/зверо|beast/);
    const isElf = lineageItem && lineageItem.name.toLowerCase().match(/эльф|elf/);
    const isElementalist = roleItem && roleItem.name.toLowerCase().match(/элементалист|elementalist/);

    if (isBeastkin) {
        contractSlots = 1; 
    }
    else if (isElf || isElementalist) {
        // База 1 + (Дух / 20)
        const spirit = attr.spirit || 0;
        contractSlots = 1 + Math.floor(Math.sqrt(spirit / 50));
    }
    sys.equipment.contractSlotsMax = contractSlots;

    context.contractCount = context.contracts.length;
    context.contractMax = context.system.equipment.contractSlotsMax || 0;

    context.showContractsTab = (
        context.isGM || 
        context.race.isBeastkin || 
        context.race.isElf || 
        isElementalist
    );

    let isMagicUser = false;
    if (roleItem) {
      const rName = roleItem.name.toLowerCase();
      isMagicUser = ["маг", "жрец", "паладин", "некромант", "mage", "priest", "paladin"].some(k => rName.includes(k));
    }
    context.showContractsTab = (context.isGM || context.race.isBeastkin || context.race.isElf);
    context.showSpellsTab = (context.isGM || isMagicUser) && context.hasRole;

    // Раскрытие предметов
    if (this._expandedItems) {
      context.items.forEach(i => {
          if (this._expandedItems.has(i._id)) i.isExpanded = true;
      });
    }

    if (context.isDivine) {
        const gp = context.system.resources.gp;
        context.headerResourcePercent = gp.max ? Math.round((gp.value / gp.max) * 100) : 0;
        context.headerResourceValue = gp.value;
        context.headerResourceMax = gp.max;
        context.headerResourceLabel = "GP";
        context.headerResourceClass = "gp-fill";
    } else {
        const mp = context.system.resources.mana;
        context.headerResourcePercent = mp.max ? Math.round((mp.value / mp.max) * 100) : 0;
        context.headerResourceValue = mp.value;
        context.headerResourceMax = mp.max;
        context.headerResourceLabel = "MP";
        context.headerResourceClass = "mp-fill";
    }
    
    context.showContractsTab = context.isGM || isBeastkin || isElf || isElementalist;
    
    // Текстовка источника
    if (isBeastkin) context.contractSourceLabel = "Зверина Кровь";
    else if (isElf) context.contractSourceLabel = "Эльфийская Кровь";
    else if (isElementalist) context.contractSourceLabel = "Элементалист";
    else context.contractSourceLabel = "Неизвестно";

    // --- Слоты Контрактов ---
    const maxContracts = context.system.equipment.contractSlotsMax || 0;
    const activeContracts = context.items.filter(i => i.type === "contract" && i.system.equipStatus === "equipped");
    
    context.contractSlots = [];
    for (let i = 0; i < maxContracts; i++) {
        context.contractSlots.push({ 
            item: activeContracts[i] || null, 
            index: i 
        });
    }

    context.enrichedBiography = await TextEditor.enrichHTML(context.system.biography, {async: true});
    context.enrichedAppearance = await TextEditor.enrichHTML(context.system.details.appearance, {async: true});
    context.enrichedPersonality = await TextEditor.enrichHTML(context.system.details.personality, {async: true});
    context.enrichedGoals = await TextEditor.enrichHTML(context.system.details.goals, {async: true});

    context.spellsLearned = context.items.filter(i => i.type === "spell").length;
    
    return context;
  }

  _prepareItems(context) {
    const actor = this.actor;
    const containedItemIds = new Set();
    for (const i of actor.items) {
        if (i.type === "container" && i.system.contents) {
            i.system.contents.forEach(id => containedItemIds.add(id));
        }
    }
    const categories = {
        weapons: [], armor: [], consumables: [], loot: [], containers: [],
        essences: [], spells: [], features: [], others: [], contracts: [], 
        blessings: [], dragonWords: [], knowledges: [], lineages: [], roles: []
    };

    const spellsByRank = [];
    const classRank = actor.magicRank || 9;
    for (let r = 9; r >= 1; r--) {
      const isAvailable = r >= classRank;
      spellsByRank.push({ rank: r, list: [], visible: false, available: isAvailable });
    }
    const essencesByRank = { 9:[], 8:[], 7:[], 6:[], 5:[], 4:[], 3:[], 2:[], 1:[] };

    for (let i of actor.items) {
      i.img = i.img || "icons/svg/item-bag.svg";
      i.isExpanded = this._expandedItems?.has(i.id);

      if (containedItemIds.has(i.id)) continue;
      if (i.type === 'weapon') categories.weapons.push(i);
      else if (i.type === 'armor') categories.armor.push(i);
      else if (i.type === 'consumable') categories.consumables.push(i);
      if (i.type === 'container') {
        if (i.system.contents && i.system.contents.length > 0) {
            i.containedItems = i.system.contents
                .map(id => actor.items.get(id))
                .filter(item => item);
        } else {
            i.containedItems = [];
        }
        categories.containers.push(i);
      }
      else if (i.type === 'loot') categories.loot.push(i);
      else if (i.type === 'essence') {
          categories.essences.push(i);
          const rank = i.system.rank || 9;
          if (essencesByRank[rank]) essencesByRank[rank].push(i);
      }
      if (i.type === 'spell') {
        const rank = i.system.rank || 9;
        if (rank >= classRank) {
            const group = spellsByRank.find(g => g.rank === rank);
            if (group) {
                group.list.push(i);
                group.visible = true;
            }
        }
      }
      else if (i.type === 'contract') categories.contracts.push(i);
      else if (i.type === 'blessing') categories.blessings.push(i);
      else if (i.type === 'knowledge') categories.knowledges.push(i);
      else if (i.type === 'lineage') categories.lineages.push(i);
      else if (i.type === 'role') categories.roles.push(i);
      else if (i.type === "feature") {
        const isWord = i.getFlag("dungeon-stone", "isDragonWord");
        const nameCheck = i.name.toLowerCase().includes("слово");
        
        if (isWord || nameCheck) {
            categories.dragonWords.push(i);
        } else {
            categories.others.push(i);
        }
    }
      else categories.others.push(i);
    }

    Object.assign(context, categories);
    context.spellsByRank = spellsByRank;
    context.essencesByRank = essencesByRank;
    context.abilities = categories.essences;

    const eq = context.system.equipment;
    context.equipment = {
        head: actor.items.get(eq.head),
        neck: actor.items.get(eq.neck),
        shoulders: actor.items.get(eq.shoulders),
        body: actor.items.get(eq.body),
        cloak: actor.items.get(eq.cloak),
        arms: actor.items.get(eq.arms),
        hands: actor.items.get(eq.hands),
        waist: actor.items.get(eq.waist),
        legs: actor.items.get(eq.legs),
        feet: actor.items.get(eq.feet),
        mainHand: actor.items.get(eq.mainHand),
        offHand: actor.items.get(eq.offHand),
        rings: eq.rings.map(id => actor.items.get(id)).filter(i => i),
        ears: actor.items.get(eq.ears)
    };
    context.equippedShield = context.equipment.offHand?.system.isShield ? context.equipment.offHand : null;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // Вкладки
    const savedTab = this.actor.getFlag("dungeon-stone", "activeSubTab") || "body";
    html.find('.sub-tab-link').removeClass('active');
    html.find(`.sub-tab-link[data-tab="${savedTab}"]`).addClass('active');
    html.find('.sub-tab-content').hide();
    html.find(`.sub-tab-content[data-tab="${savedTab}"]`).show();

    html.find('.sub-tab-link').click(async ev => {
      ev.preventDefault();
      const tab = ev.currentTarget.dataset.tab;
      await this.actor.setFlag("dungeon-stone", "activeSubTab", tab);
      const parent = $(ev.currentTarget).closest('.tab-container');
      parent.find('.sub-tab-link').removeClass('active');
      $(ev.currentTarget).addClass('active');
      parent.find('.sub-tab-content').hide();
      parent.find(`.sub-tab-content[data-tab="${tab}"]`).show();
    });

    // Фильтры Инвентаря
    html.find('.inv-nav a').click(this._onInventoryFilter.bind(this));
    if (this._activeInventoryFilter) {
        html.find('.inv-nav a').removeClass('active');
        html.find(`.inv-nav a[data-filter="${this._activeInventoryFilter}"]`).addClass('active');
        const container = html.find('.items-scroll-container');
        if (this._activeInventoryFilter !== 'all') {
            container.find('.item-category').hide();
            container.find(`.item-category[data-type="${this._activeInventoryFilter}"]`).show();
        }
    }

    // Раскрытие Описания
    html.find('.item .item-clickable').click(ev => {
        const li = $(ev.currentTarget).parents(".item");
        const itemId = li.data("itemId");
        if (!this._expandedItems) this._expandedItems = new Set();
        if (this._expandedItems.has(itemId)) this._expandedItems.delete(itemId);
        else this._expandedItems.add(itemId);
        this.render(false);
    });

    // Кнопки Действий
    html.find('.item-create').click(this._onItemCreate.bind(this));
    
    html.find('.item-edit').click(ev => {
      // Ищем ID в ближайшем родителе с data-item-id
      const target = $(ev.currentTarget).closest("[data-item-id]"); 
      const item = this.actor.items.get(target.data("itemId"));
      if (item) item.sheet.render(true);
    });
    
    html.find('.item-delete').click(async ev => {
      const target = $(ev.currentTarget).closest("[data-item-id]");
      const item = this.actor.items.get(target.data("itemId"));
      if (item && await Dialog.confirm({ title: "Удалить?", content: `<p>Удалить <b>${item.name}</b>?</p>` })) {
        await item.delete();
      }
    });

    html.find('.item-equip, .item-unequip').click(this._onToggleEquip.bind(this));
    
    // Drag & Drop
    html.find(".slot").on("drop", this._onDropItemOnSlot.bind(this));
    html.find('.item-list .item').attr("draggable", "true").on("dragstart", this._onDragStart.bind(this));

    // Броски и Абилки
    html.find('.rollable').click(this._onRoll.bind(this));
    html.find('.weapon-roll').click(ev => { ev.preventDefault(); const itemId = $(ev.currentTarget).parents(".item").data("itemId"); this.actor.rollWeaponAttack(itemId); });
    html.find('.ability-use').click(ev => { ev.preventDefault(); const itemId = $(ev.currentTarget).parents(".item, .ability-card").data("itemId"); this.actor.useItem(itemId); });
    
    html.find('.btn-initiative').click(() => this.actor.rollInitiative({createCombatants: true}));
    html.find('.btn-rest').click(() => this.actor.applyRegenDialog());
    html.find('.xp-add-btn').click(() => this.actor.addExperienceDialog());
    html.find('.shield-toggle').click(async ev => { ev.preventDefault(); const current = this.actor.system.combat.shieldRaised; await this.actor.update({"system.combat.shieldRaised": !current}); });

    // Глазики
    html.find('.vis-btn').click(async (event) => {
        event.preventDefault(); event.stopPropagation();
        const btn = event.currentTarget;
        const key = btn.dataset.key;
        if (!key) return;
        const cleanKey = key.replace(/^system\./, '').replace(/^subAttributes\./, '').replace(/^proficiencies\./, '');
        const revealed = this.actor.getFlag("dungeon-stone", "revealed") || {};
        revealed[cleanKey] = !revealed[cleanKey];
        await this.actor.update({ [`flags.dungeon-stone.revealed.${cleanKey}`]: revealed[cleanKey] }, { render: false });
        
        const icon = btn.querySelector('i');
        if (icon) icon.className = revealed[cleanKey] ? 'fas fa-eye' : 'fas fa-eye-slash';
        const statRow = btn.closest('.stat-row');
        if (statRow) {
          const statName = statRow.querySelector('.stat-name');
          const statDisplay = statRow.querySelector('.stat-val-display');
          if (statName) statName.classList.toggle('dimmed', !revealed[cleanKey]);
          if (statDisplay) statDisplay.textContent = revealed[cleanKey] ? statDisplay.dataset.value : '?';
        }
    });

    // Редактирование
    html.find('input[name^="items."], select[name^="items."]').change(async ev => {
        ev.preventDefault(); ev.stopPropagation();
        const input = ev.currentTarget;
        const match = input.name.match(/^items\.([^.]+)\.(.+)$/);
        if (!match) return;
        const itemId = match[1]; const path = match[2];
        const item = this.actor.items.get(itemId);
        if (!item) return;
        let value = input.type === "checkbox" ? input.checked : Number(input.value);
        await item.update({ [path]: value });
    });

    html.find('.direct-edit').change(async ev => {
      ev.preventDefault(); const input = ev.currentTarget;
      let value = input.type === "checkbox" ? input.checked : Number(input.value);
      await this.actor.update({ [input.name]: value });
    });

    /* Внутри activateListeners в sheets.mjs */
    html.find('.remove-from-container').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation(); // Чтобы не раскрылось описание
      const btn = ev.currentTarget;
      const containerId = btn.dataset.containerId;
      const itemId = btn.dataset.itemId;
      
      const container = this.actor.items.get(containerId);
      if (!container) return;
      
      const newContents = container.system.contents.filter(id => id !== itemId);
      await container.update({ "system.contents": newContents });
      ui.notifications.info("Предмет извлечен из сумки.");
    });

    html.find('.consume-item').click(this._onConsumeItem.bind(this));

    html.find('.spell-filter, .component-filter, .rank-filter').change(this._applySpellFilters.bind(this));

    // Валюта
    html.find('.calc-btn').click(async ev => {
        ev.preventDefault(); ev.stopPropagation();
        const btn = ev.currentTarget; const panel = btn.closest('.currency-panel');
        const amountInput = panel.querySelector('.calc-amount'); const amount = Number(amountInput.value);
        if (!amount || amount <= 0) return ui.notifications.warn("Введите сумму");
        const current = this.actor.system.resources.currency || 0;
        let newValue = current;
        if (btn.dataset.action === "add") newValue += amount;
        else if (btn.dataset.action === "sub") newValue = Math.max(0, current - amount);
        await this.actor.update({"system.resources.currency": newValue});
        amountInput.value = ''; amountInput.blur();
    });

    // Инициализация фильтров заклинаний
    this._initSpellFilters(html);
    
    html.find('#rank-slider').on('input change', this._applySpellFilters.bind(this));
    html.find('.spell-filter-checkbox').change(this._applySpellFilters.bind(this));
    html.find('.spell-type-select').change(this._applySpellFilters.bind(this));
    html.find('.component-filter').change(this._applySpellFilters.bind(this));

    html.find(".effect-toggle").click(async ev => { ev.preventDefault(); const effectId = ev.currentTarget.closest(".effect-item").dataset.effectId; const effect = this.item.effects.get(effectId); if (effect) await effect.update({disabled: !effect.disabled}); });
    html.find('.tag-toggle').click(function(ev) { const checkbox = ev.currentTarget.querySelector('input[type="checkbox"]'); checkbox.checked = !checkbox.checked; $(checkbox).trigger('change'); ev.currentTarget.classList.toggle('active', checkbox.checked); });
    html.find('input[type="checkbox"]').change(ev => { const input = ev.currentTarget; const label = input.closest('.checkbox-item'); if (label) { if (input.checked) label.classList.add('checked'); else label.classList.remove('checked'); } });
  }

  // === МЕТОДЫ ===

  /* module/actor/sheets.mjs */

  _initSpellFilters(html) {
    // Восстанавливаем сохраненные значения фильтров
    const savedFilters = this.actor.getFlag("dungeon-stone", "spellFilters") || {};
    const rankSlider = html.find('#rank-slider');
    const typeSelect = html.find('.spell-type-select');
    const concCheckbox = html.find('#filter-conc');
    const componentFilters = html.find('.component-filter');
    
    // Получаем допустимый диапазон слайдера
    const minRank = parseInt(rankSlider.attr('min')) || 9;
    const maxRank = parseInt(rankSlider.attr('max')) || 9;
    
    // Восстанавливаем значение слайдера (по умолчанию 9 - показывать все)
    let savedRank = savedFilters.rankSlider !== undefined ? savedFilters.rankSlider : 9;
    // Ограничиваем значение диапазоном
    savedRank = Math.max(minRank, Math.min(maxRank, savedRank));
    rankSlider.val(savedRank);
    html.find('#rank-slider-val').text(savedRank);
    
    // Восстанавливаем тип
    if (savedFilters.typeFilter) {
      typeSelect.val(savedFilters.typeFilter);
    }
    
    // Восстанавливаем концентрацию
    if (savedFilters.concFilter !== undefined) {
      concCheckbox.prop('checked', savedFilters.concFilter);
    }
    
    // Восстанавливаем компоненты
    if (savedFilters.componentFilters) {
      componentFilters.each((_, el) => {
        const checkbox = $(el);
        const component = checkbox.data('component');
        if (savedFilters.componentFilters[component]) {
          checkbox.prop('checked', true);
        }
      });
    }
    
    // Применяем фильтры
    this._applySpellFilters();
  }

  _applySpellFilters(event) {
    const html = $(this.element);
    
    // 1. Ранг (Ползунок)
    // Значение слайдера (например 7).
    // Показываем ранги >= 7 (т.е. 7, 8, 9 - слабые).
    // Скрываем ранги < 7 (т.е. 6, 5... - сильные).
    const sliderVal = parseInt(html.find('#rank-slider').val()) || 9;
    html.find('#rank-slider-val').text(sliderVal); // Обновляем цифру

    // 2. Тип
    const typeFilter = html.find('.spell-type-select').val();
    
    // 3. Концентрация
    const concFilter = html.find('#filter-conc').is(':checked');
    
    // 4. Компоненты
    const componentFilters = {};
    html.find('.component-filter').each((_, el) => {
      const checkbox = $(el);
      const component = checkbox.data('component');
      componentFilters[component] = checkbox.is(':checked');
    });
    
    // Сохраняем состояние фильтров
    this.actor.setFlag("dungeon-stone", "spellFilters", {
      rankSlider: sliderVal,
      typeFilter: typeFilter,
      concFilter: concFilter,
      componentFilters: componentFilters
    });

    // ПРИМЕНЯЕМ ФИЛЬТР К ГРУППАМ РАНГОВ (Скрываем целые категории)
    html.find('.spell-rank-section').each((_, el) => {
        const section = $(el);
        const rank = parseInt(section.data('rank'));
        
        // Логика слайдера: "Показать ранги до X" (где X - это число на слайдере, а Ранг 9 - это минимум силы)
        // Если слайдер = 7, мы хотим видеть 7, 8, 9.
        // Условие: rank >= sliderVal
        if (rank >= sliderVal) section.show();
        else section.hide();
    });

    html.find('.roll-drop').click(async ev => {
        ev.preventDefault();
        const chance = this.actor.system.dropChance || 0;
        const roll = new Roll("1d100");
        await roll.evaluate();
        
        // Шанс 0.22 = 22%. Значит, успех если 1d100 <= 22 ?
        // Или как ты писал: КС = 78 (100 - 22). Если >= 78, то успех.
        // Давай сделаем по твоей формуле: >= (100 - (chance * 100))
        const threshold = 100 - Math.floor(chance * 100);
        const success = roll.total >= threshold;
        
        const color = success ? "#44ff44" : "#ff4444";
        const text = success ? "ЛУТ ВЫПАЛ!" : "Пусто";
        
        ChatMessage.create({
            content: `
            <div class="dungeon-chat-card" style="border-left: 4px solid ${color}; background: #1a1a1a; padding: 10px;">
                <h3 style="margin:0; color:#d4af37; border-bottom:1px solid #444; padding-bottom:5px;">Бросок Дропа</h3>
                <div style="text-align:center; font-size:18px; font-weight:bold; color:${color}; margin:10px 0;">
                    ${text}
                </div>
                <div class="gm-only" style="font-size:11px; color:#888;">
                    Roll: ${roll.total} vs Threshold: ${threshold} (Chance: ${chance})
                </div>
            </div>`,
            speaker: ChatMessage.getSpeaker({actor: this.actor})
        });
    });
    
    html.find('.cast-spell').click(ev => {
      ev.preventDefault();
      // Ищем ближайший родительский элемент с data-item-id (это .spell-item)
      const itemId = $(ev.currentTarget).closest("[data-item-id]").data("itemId");
      if (itemId) this._onCastSpell(ev, itemId); // Передаем ID
    });

    // ПРИМЕНЯЕМ ФИЛЬТР К ОТДЕЛЬНЫМ ЗАКЛИНАНИЯМ (Внутри видимых категорий)
    html.find('.spell-item').each((_, el) => {
        const item = $(el);
        const iType = item.data('type');
        const iConc = item.data('conc') === true;
        const iVerb = item.data('verb') === true;
        const iSom = item.data('som') === true;
        const iMat = item.data('mat') === true;

        let show = true;

        if (typeFilter !== "all" && iType !== typeFilter) show = false;
        if (concFilter && !iConc) show = false;
        
        // Фильтр по компонентам: показываем только если выбранный компонент присутствует
        if (componentFilters.verbal && !iVerb) show = false;
        if (componentFilters.somatic && !iSom) show = false;
        if (componentFilters.material && !iMat) show = false;

        if (show) item.show(); else item.hide();
    });
  }

  async _onCastSpell(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const itemId = $(btn).closest("[data-item-id]").data("itemId");
    const item = this.actor.items.get(itemId);
    
    if (!item) return;

    // ... Проверка маны ...
    const sys = item.system;
    let resourceCost = 0;
    let resourceKey = sys.magicSource === "divine" ? "gp" : "mana";
    resourceCost = sys.magicSource === "divine" ? sys.gpCost : sys.manaCost;

    if (resourceCost > 0) {
        const current = this.actor.system.resources[resourceKey].value;
        if (current < resourceCost) return ui.notifications.warn("Недостаточно ресурса!");
        await this.actor.update({ [`system.resources.${resourceKey}.value`]: current - resourceCost });
    }

    this.actor.rollSpell(itemId);
  }

  _onInventoryFilter(event) {
      event.preventDefault();
      const tab = event.currentTarget;
      const filter = tab.dataset.filter;
      this._activeInventoryFilter = filter;
      
      $(tab).addClass('active').siblings().removeClass('active');
      const container = $(this.element).find('.items-scroll-container');
      
      if (filter === 'all') container.find('.item-category').show();
      else {
          container.find('.item-category').hide();
          container.find(`.item-category[data-type="${filter}"]`).show();
      }
  }

  async _onToggleEquip(event) {
      event.preventDefault();
      event.stopPropagation();
      const itemId = $(event.currentTarget).parents(".item, .item-card-mini, .slot-row").data("itemId");
      await this.actor.toggleEquip(itemId);
  }

  async _onItemCreate(event) {
      event.preventDefault();
      const header = event.currentTarget;
      const type = header.dataset.type;
      const itemData = { name: `Новый ${type}`, type: type, system: {} };
      
      // Логика рангов
      if (type === 'spell') {
          const rank = Number(header.dataset.rank) || 9;
          itemData.system.rank = rank;
          itemData.name = `Заклинание ${rank} ранга`;
      }
      // Слова Дракона
      if (header.dataset.isDragonWord) {
        itemData.name = "Новое Слово";
        itemData.type = "feature"; // Принудительно
        itemData.flags = { "dungeon-stone": { isDragonWord: true } };
      }
      
      return await Item.create(itemData, { parent: this.actor });
  }

  async _onDropItemOnSlot(event) {
      event.preventDefault();
      let data;
      try {
          data = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
      } catch (err) { return false; }

      if (data.type !== "Item") return;
      const item = await Item.implementation.fromDropData(data);
      if (!item) return;

      let ownedItem = item;
      if (!this.actor.items.has(item.id)) {
          [ownedItem] = await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
      }

      const slot = event.currentTarget.dataset.slot;
      
      if (ownedItem.type === "armor") {
          const sys = ownedItem.system;
          if (sys.slot === slot || (slot === "offHand" && sys.isShield) || sys.coversSlots?.[slot]) {
              await this.actor.toggleEquip(ownedItem.id);
          } else {
              ui.notifications.warn("Этот предмет не подходит для данного слота.");
          }
      } 
      else if (ownedItem.type === "weapon" && (slot === "mainHand" || slot === "offHand")) {
          const grip = slot === "offHand" ? "offhand" : "1h";
          await ownedItem.update({ "system.equipStatus": "equipped", "system.grip": grip });
      }
  }

  _onDragStart(event) {
    if (event.originalEvent) event = event.originalEvent;
    const li = event.currentTarget;
    if (li.dataset.itemId) {
      const item = this.actor.items.get(li.dataset.itemId);
      if (item) event.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: item.uuid }));
      return;
    }
    if (li.dataset.key) {
      const label = li.dataset.label || "Check";
      const rollData = { type: "Macro", command: `const actor = game.actors.get("${this.actor.id}"); if(actor) actor.rollAttribute("${li.dataset.key}", "${label}");`, name: label, img: "icons/svg/d20.svg" };
      event.dataTransfer.setData("text/plain", JSON.stringify(rollData));
    }
  }

  async _onRoll(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    if (dataset.key && dataset.label) this.actor.rollAttribute(dataset.key, dataset.label);
  }

  /** @override */
  async _onDrop(event) {
      // Игнорируем сортировку, если это дроп на контейнер
      const target = event.target.closest(".item[data-item-id]");
      if (target) {
          const targetId = target.dataset.itemId;
          const targetItem = this.actor.items.get(targetId);
          
          // Если цель — контейнер
          if (targetItem && targetItem.type === "container") {
              event.preventDefault(); // Останавливаем всплытие (чтобы не сработал Sort)
              event.stopPropagation();
              
              let data;
              try {
                  data = JSON.parse(event.dataTransfer.getData("text/plain"));
              } catch (err) { return false; }
              
              if (data.type !== "Item") return false;
              const item = await Item.implementation.fromDropData(data);
              
              if (item) return this._onDropToContainer(item, targetItem);
          }
      }
      return super._onDrop(event);
  }

  async _onDropToContainer(item, container) {
      // 1. Запрет вкладывать контейнер в контейнер
      if (item.type === "container") {
          return ui.notifications.warn("Нельзя поместить хранилище внутрь другого хранилища!");
      }

      // 2. Если предмет внешний — создаем
      let ownedItem = item;
      if (!this.actor.items.has(item.id)) {
          [ownedItem] = await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
      }

      // 3. Добавляем в список
      const contents = container.system.contents || [];
      if (!contents.includes(ownedItem.id)) {
          contents.push(ownedItem.id);
          await container.update({"system.contents": contents});
      }
  }

  async _onConsumeItem(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const btn = event.currentTarget;
    // Берем ID либо с кнопки, либо с родителя (на всякий случай)
    const itemId = btn.dataset.itemId || $(btn).parents('.item').data("itemId");
    
    if (itemId) {
        await this.actor.useItem(itemId);
    }
  }
}
