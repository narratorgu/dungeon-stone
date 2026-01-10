import { DUNGEON } from "../config.mjs";

const BaseItemSheet = foundry.appv1 ? foundry.appv1.sheets.ItemSheet : ItemSheet;

export class DungeonItemSheet extends BaseItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 560,
      height: 480,
      classes: ["dungeon-stone", "sheet", "item"],
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  get template() {
    const type = this.item.type;
    const templates = {
      weapon: "systems/dungeon-stone/templates/item/item-weapon-sheet.hbs",
      armor: "systems/dungeon-stone/templates/item/item-armor-sheet.hbs",
      consumable: "systems/dungeon-stone/templates/item/item-consumable-sheet.hbs",
      container: "systems/dungeon-stone/templates/item/item-container-sheet.hbs",
      loot: "systems/dungeon-stone/templates/item/item-loot-sheet.hbs",
      essence: "systems/dungeon-stone/templates/item/item-essence-sheet.hbs",
      spell: "systems/dungeon-stone/templates/item/item-spell-sheet.hbs",
      blessing: "systems/dungeon-stone/templates/item/item-blessing-sheet.hbs",
      lineage: "systems/dungeon-stone/templates/item/item-lineage-sheet.hbs",
      role: "systems/dungeon-stone/templates/item/item-role-sheet.hbs",
      contract: "systems/dungeon-stone/templates/item/item-contract-sheet.hbs",
      knowledge: "systems/dungeon-stone/templates/item/item-knowledge-sheet.hbs"
    };
    return templates[type] || "systems/dungeon-stone/templates/item/item-base-sheet.hbs";
  }

  async getData() {
    const context = await super.getData();
    context.system = this.item.system;
    context.config = DUNGEON;
    const TextEditorClass = foundry.applications?.ux?.TextEditor?.implementation || TextEditor;
    
    context.enrichedDescription = await TextEditorClass.enrichHTML(
      this.item.system.description ?? "",
      { async: true, secrets: this.item.isOwner }
    );

    // Active Effects
    context.effects = this.item.effects.map(e => ({
      id: e.id,
      name: e.name,
      img: e.img,
      disabled: e.disabled
    }));

    // Мета-информация
    context.itemTypeLabel = this._getTypeLabel();
    context.itemIcon = this._getTypeIcon();
    context.hasEquipStatus = this._hasEquipStatus();
    context.hasWeight = this._hasWeight();
    context.hasQuantity = this._hasQuantity();
    context.hasPrice = this._hasPrice();
    context.hasItemLevel = this._hasItemLevel();

    // Владелец
    context.isOwned = this.item.isOwned;
    context.actor = this.item.actor;

    // === Данные для селектов ===
    
    // Consumable
    context.consumableTypes = {
      potion: "Зелье",
      poison: "Яд",
      bomb: "Бомба",
      ammo: "Боеприпасы",
      scroll: "Свиток",
      food: "Еда/Питьё",
      tool: "Инструмент",
      reagent: "Реагент",
      other: "Прочее"
    };

    context.ammoTypes = {
      "": "—",
      arrow: "Стрелы",
      bolt: "Болты",
      bullet: "Пули",
      dart: "Дротики",
      stone: "Камни"
    };

    context.qualityLevels = {
      common: "Обычное",
      uncommon: "Необычное",
      rare: "Редкое",
      epic: "Эпическое",
      legendary: "Легендарное"
    };

    context.contractTypes = {
      spirit: "Контракт с Духами",
      elemental: "Контракт с Элементалями"
    };

    context.actionTypes = {
      action: "Действие",
      bonus: "Бонусное",
      reaction: "Реакция",
      free: "Свободное",
      minute: "1 минута",
      hour: "1 час"
    };

    context.areaTypes = {
      none: "Нет",
      sphere: "Сфера",
      cone: "Конус",
      line: "Линия",
      cube: "Куб",
      cylinder: "Цилиндр"
    };

    context.poisonDeliveries = {
      injury: "При ранении",
      contact: "Контактный",
      inhaled: "Вдыхаемый",
      ingested: "Проглатываемый"
    };

    // Loot
    context.lootTypes = {
      treasure: "Ценность",
      material: "Материал",
      trophy: "Трофей",
      quest: "Квестовый",
      junk: "Хлам"
    };

    context.rarityLevels = {
      common: "Обычный",
      uncommon: "Необычный",
      rare: "Редкий",
      epic: "Эпический",
      legendary: "Легендарный",
      artifact: "Артефакт"
    };

    // Container
    context.containerTypes = {
      bag: "Сумка",
      backpack: "Рюкзак",
      chest: "Сундук",
      quiver: "Колчан",
      pouch: "Кошель",
      saddlebag: "Седельная сумка"
    };

    // Spell
    context.spellSchools = {
      evocation: "Воплощение",
      abjuration: "Ограждение",
      conjuration: "Призыв",
      divination: "Прорицание",
      enchantment: "Очарование",
      illusion: "Иллюзия",
      necromancy: "Некромантия",
      transmutation: "Преобразование",
      restoration: "Восстановление"
    };

    context.castTimes = {
      action: "Действие",
      bonus: "Бонусное",
      reaction: "Реакция",
      minute: "1 минута",
      hour: "1 час",
      ritual: "Ритуал"
    };

    context.targetTypes = {
      self: "На себя",
      creature: "Существо",
      creatures: "Несколько существ",
      point: "Точка",
      area: "Область",
      object: "Объект"
    };

    context.saveEffects = {
      none: "Нет эффекта",
      half: "Половина урона",
      negate: "Полное отрицание"
    };

    // Общие
    context.saveAttributes = {
      "": "—",
      agility: "Ловкость",
      fortitude: "Стойкость",
      willpower: "Воля",
      cognition: "Разум"
    };

    context.scalingAttributes = {
      strength: "Сила",
      agility: "Ловкость",
      precision: "Точность",
      spirit: "Дух",
      cognition: "Разум",
      willpower: "Воля"
    };

    context.equipStatuses = {
      stored: "В хранилище",
      carried: "При себе",
      equipped: "Экипировано"
    };

    // Contract
    context.contractTypes = {
      nature: "Дух Природы",
      elemental: "Элементаль",
      ancestral: "Дух Предков",
      demonic: "Демон",
      celestial: "Небожитель"
    };

    // Blessing
    context.blessingTypes = {
      passive: "Пассивное",
      active: "Активное",
      triggered: "Триггерное"
    };

    // Lineage
    context.lineageTypes = {
      race: "Раса",
      bloodline: "Кровная линия",
      heritage: "Наследие",
      curse: "Проклятие"
    };

    // Role
    context.roleTypes = {
      combat: "Боевой",
      magic: "Магический",
      skill: "Навыковый",
      hybrid: "Гибридный"
    };

    // Knowledge
    context.knowledgeTypes = {
      lore: "Знание",
      recipe: "Рецепт",
      blueprint: "Чертёж",
      language: "Язык",
      technique: "Техника"
    };

    // === Флаги для условного отображения (Consumable) ===
    if (this.item.type === "consumable") {
      context.isAmmo = this.item.system.consumableType === "ammo";
      context.isPoison = this.item.system.consumableType === "poison";
      context.isBomb = this.item.system.consumableType === "bomb";
      context.isScroll = this.item.system.consumableType === "scroll";
      context.isPotion = this.item.system.consumableType === "potion";
      context.hasArea = this.item.system.areaType !== "none";
    }

    // === Флаги для Spell ===
    if (this.item.type === "spell") {
      context.isAttackSpell = this.item.system.damage?.length > 0;
      context.isHealingSpell = this.item.system.healing?.length > 0;
      context.hasArea = this.item.system.areaType !== "none";
      context.requiresSave = this.item.system.saveAttribute?.length > 0;
    }

    // === Содержимое контейнера ===
    if (this.item.type === "container" && this.item.actor) {
      context.containerContents = this._getContainerContents();
    }

    return context;
  }

  /**
   * Получить предметы внутри контейнера
   */
  _getContainerContents() {
    if (!this.item.actor || !this.item.system.contents) return [];
    
    return this.item.system.contents
      .map(id => this.item.actor.items.get(id))
      .filter(item => item != null)
      .map(item => ({
        id: item.id,
        name: item.name,
        img: item.img,
        type: item.type,
        weight: item.system.weight || 0,
        quantity: item.system.quantity || 1
      }));
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // === Active Effects ===
    html.find(".effect-create").click(this._onEffectCreate.bind(this));
    html.find(".effect-edit").click(this._onEffectEdit.bind(this));
    html.find(".effect-delete").click(this._onEffectDelete.bind(this));
    html.find(".effect-toggle").click(this._onEffectToggle.bind(this));

    html.find('input[name="system.isShield"]').change(async ev => {
        if (ev.currentTarget.checked) {
            await this.item.update({ "system.isSet": false });
        }
    });

    html.find('input[name="system.isSet"]').change(async ev => {
        if (ev.currentTarget.checked) {
            await this.item.update({ "system.isShield": false });
        }
    });
    
    // === Checkboxes ===
    html.find('.tag-checkbox').change(this._onTagChange.bind(this));
    html.find('.damage-type-checkbox').change(this._onDamageTypeChange.bind(this));

    // === Consumable ===
    html.find(".consume-item").click(async ev => {
        ev.preventDefault();
        const actor = this.item.actor;
        if (!actor) return ui.notifications.warn("Предмет не принадлежит персонажу.");
        await actor.useItem(this.item.id);
    });
    html.find(".quantity-adjust").click(this._onQuantityAdjust.bind(this));

    // === Container ===
    html.find(".remove-from-container").click(this._onRemoveFromContainer.bind(this));

    // === Spell ===
    html.find('.cast-spell').click(ev => {
      ev.preventDefault();
      // Ищем ближайший родительский элемент с data-item-id (это .spell-item)
      const itemId = $(ev.currentTarget).closest("[data-item-id]").data("itemId");
      if (itemId) this._onCastSpell(ev, itemId); // Передаем ID
    });
  }

  // === Effect Handlers ===

  async _onEffectCreate(event) {
    event.preventDefault();
    await this.item.createEmbeddedDocuments("ActiveEffect", [{
      name: "Новый эффект",
      img: "icons/svg/aura.svg",
      disabled: false
    }]);
  }

  async _onEffectEdit(event) {
    event.preventDefault();
    const effectId = event.currentTarget.closest(".effect-item").dataset.effectId;
    const effect = this.item.effects.get(effectId);
    if (effect) effect.sheet.render(true);
  }

  async _onEffectDelete(event) {
    event.preventDefault();
    const effectId = event.currentTarget.closest(".effect-item").dataset.effectId;
    await this.item.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
  }

  async _onEffectToggle(event) {
    event.preventDefault();
    const effectId = event.currentTarget.closest(".effect-item").dataset.effectId;
    const effect = this.item.effects.get(effectId);
    if (effect) await effect.update({ disabled: !effect.disabled });
  }

  // === Checkbox Handlers ===

  async _onTagChange(event) {
    const tag = event.currentTarget.dataset.tag;
    await this.item.update({ [`system.tags.${tag}`]: event.currentTarget.checked });
  }

  async _onDamageTypeChange(event) {
    const type = event.currentTarget.dataset.type;
    await this.item.update({ [`system.availableTypes.${type}`]: event.currentTarget.checked });
  }

  // === Consumable Handlers ===

  async _onConsumeItem(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const btn = event.currentTarget;
    const itemId = btn.dataset.itemId || $(btn).parents('.item').data("itemId");
    
    if (itemId) {
        await this.actor.useItem(itemId);
    } else {
        console.error("No item ID found for consume button");
    }
  }

  async _useConsumable(actor, item) {
    const type = item.system.consumableType;
    let messageContent = `<div class="consumable-use"><h3>${item.name}</h3>`;
    messageContent += `<p><strong>${actor.name}</strong> использует <strong>${item.name}</strong></p>`;
    
    const rolls = [];

    // Лечение
    if (item.system.healing) {
      const healRoll = await new Roll(item.system.healing).evaluate();
      rolls.push(healRoll);
      
      const currentHP = actor.system.resources.hp.value;
      const maxHP = actor.system.resources.hp.max;
      const newHP = Math.min(currentHP + healRoll.total, maxHP);
      await actor.update({ "system.resources.hp.value": newHP });
      
      messageContent += `<p class="heal-result">❤️ Восстановлено HP: <strong>${healRoll.total}</strong></p>`;
    }

    // Восстановление маны
    if (item.system.manaRestore) {
      const manaRoll = await new Roll(item.system.manaRestore).evaluate();
      rolls.push(manaRoll);
      
      const currentMana = actor.system.resources.mana.value;
      const maxMana = actor.system.resources.mana.max;
      const newMana = Math.min(currentMana + manaRoll.total, maxMana);
      await actor.update({ "system.resources.mana.value": newMana });
      
      messageContent += `<p class="mana-result">💧 Восстановлено маны: <strong>${manaRoll.total}</strong></p>`;
    }

    // Урон (бомбы, яды)
    if (item.system.damage) {
      const damageRoll = await new Roll(item.system.damage).evaluate();
      rolls.push(damageRoll);
      
      messageContent += `<p class="damage-result">💥 Урон: <strong>${damageRoll.total}</strong> (${item.system.damageType})</p>`;
      
      if (item.system.areaType !== "none") {
        messageContent += `<p>📍 Область: ${item.system.areaType} ${item.system.areaSize} кл.</p>`;
      }
      
      if (item.system.saveDC > 0) {
        messageContent += `<p>🎯 Спасбросок (${item.system.saveAttribute}): КС ${item.system.saveDC}</p>`;
      }
    }

    messageContent += `</div>`;

    // Уменьшаем количество
    const newQty = item.system.quantity - 1;
    if (newQty <= 0) {
      await item.delete();
      ui.notifications.info(`${item.name} закончился и удалён из инвентаря`);
    } else {
      await item.update({ "system.quantity": newQty });
    }

    // Сообщение в чат
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: messageContent,
      rolls,
      type: rolls.length > 0 ? CONST.CHAT_MESSAGE_TYPES.ROLL : CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  async _onQuantityAdjust(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const current = this.item.system.quantity;
    const max = this.item.system.maxStack || 99;

    let newValue;
    if (action === "increase") {
      newValue = Math.min(current + 1, max);
    } else if (action === "decrease") {
      newValue = Math.max(current - 1, 0);
    } else {
      return;
    }

    await this.item.update({ "system.quantity": newValue });
  }

  // === Container Handlers ===

  async _onRemoveFromContainer(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const contents = this.item.system.contents.filter(id => id !== itemId);
    await this.item.update({ "system.contents": contents });
  }

  // === Spell Handlers ===

  async _onCastSpell(event) {
    event.preventDefault();
    const actor = this.item.actor;
    const sys = this.item.system;
    
    // 1. Проверка и списание ресурсов (Мана / GP)
    let resourceCost = 0;
    let resourceKey = "";
    
    if (sys.magicSource === "divine") {
        resourceCost = sys.gpCost;
        resourceKey = "gp";
    } else {
        resourceCost = sys.manaCost;
        resourceKey = "mana";
    }
    
    if (resourceCost > 0) {
        const current = actor.system.resources[resourceKey].value;
        if (current < resourceCost) return ui.notifications.warn(`Недостаточно ${resourceKey.toUpperCase()}!`);
        await actor.update({ [`system.resources.${resourceKey}.value`]: current - resourceCost });
    }

    // 2. Передача управления
    return actor.rollSpell(this.item.id);
  }

    // Вспомогательные методы
    _getTypeLabel() {
      const typeMap = {
          weapon: "Оружие",
          armor: "Доспех",
          essence: "Эссенция",
          spell: "Заклинание",
          contract: "Контракт",
          blessing: "Благословение",
          lineage: "Происхождение",
          role: "Класс",
          knowledge: "Знание",
          consumable: "Расходник",
          loot: "Ценность",
          container: "Контейнер",
          feature: "Особенность"
      };
      return typeMap[this.item.type] || "Предмет";
  }

  _getTypeIcon() {
      const iconMap = {
          weapon: "fas fa-sword",
          armor: "fas fa-shield-alt",
          essence: "fas fa-star",
          spell: "fas fa-magic",
          contract: "fas fa-file-contract",
          blessing: "fas fa-praying-hands",
          lineage: "fas fa-dna",
          role: "fas fa-user-tag",
          knowledge: "fas fa-book",
          consumable: "fas fa-flask",
          loot: "fas fa-coins",
          container: "fas fa-box",
          feature: "fas fa-puzzle-piece"
      };
      return iconMap[this.item.type] || "fas fa-cube";
  }

  _hasEquipStatus() {
      // Статус экипировки нужен только этим:
      return ["weapon", "armor", "essence", "container"].includes(this.item.type);
  }

  _hasWeight() {
      // Вес есть у физических предметов
      return ["weapon", "armor", "consumable", "loot", "container"].includes(this.item.type);
  }

  _hasQuantity() {
      // Количество (стак)
      return ["consumable", "loot", "weapon", "armor"].includes(this.item.type);
  }

  _hasPrice() {
      // Цену показываем только у того, что можно купить/продать
      // Убираем у: blessing, spell, knowledge, feature, role, lineage, contract, essence
      return ["weapon", "armor", "consumable", "loot", "container"].includes(this.item.type);
  }

  _hasItemLevel() {
      // Уровень предмета (Item Level)
      // Оставляем только у экипировки
      return ["weapon", "armor"].includes(this.item.type);
  }
}
