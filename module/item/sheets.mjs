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
      dragonword: "systems/dungeon-stone/templates/item/item-dragonword-sheet.hbs",
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

    // Loot
    context.lootTypes = {
      treasure: "Ценность",
      material: "Материал",
      trophy: "Трофей",
      quest: "Квестовый",
      junk: "Хлам"
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
      spirit: "Дух Природы",
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

    // === Данные для Armor слотов ===
    if (this.item.type === "armor") {
      const slotLabels = {
          head: "Голова",
          shoulders: "Плечи",
          body: "Тело",
          arms: "Руки",
          hands: "Кисти",
          legs: "Ноги",
          feet: "Ступни",
          neck: "Шея",
          ring: "Кольцо",
          cloak: "Плащ",
          shield: "Щит",
          ears: "Уши"
      };
      
      // Занимаемые слоты
      context.coversSlotsList = Object.entries(slotLabels).map(([key, label]) => ({
          key,
          label,
          checked: this.item.system.coversSlots?.[key] === true
      }));
      
      // Блокируемые слоты
      context.blockedSlotsList = Object.entries(slotLabels).map(([key, label]) => ({
          key,
          label,
          checked: this.item.system.blockedSlots?.[key] === true
      }));
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
    
    // === Экипировка (для эссенций и других предметов) ===
    html.find('.item-equip').click(async ev => {
        ev.preventDefault();
        if (!this.item.actor) {
            return ui.notifications.warn("Эссенция не принадлежит персонажу.");
        }
        await this.item.actor.toggleEquip(this.item.id);
    });

    // === Container ===
    html.find(".remove-from-container").click(this._onRemoveFromContainer.bind(this));

    html.find('.slot-checkbox').change(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      
      const input = ev.currentTarget;
      const slotType = input.dataset.slotType; // "covers" или "blocked"
      const slotKey = input.dataset.slotKey;   // "head", "body", etc.
      const checked = input.checked;
      
      const updatePath = slotType === "covers" 
          ? `system.coversSlots.${slotKey}` 
          : `system.blockedSlots.${slotKey}`;
      
      await this.item.update({ [updatePath]: checked });
    });

    // === ЭССЕНЦИИ: Управление способностями ===
    if (this.item.type === "essence") {
      html.find(".add-ability-btn").click(async (ev) => {
        ev.preventDefault();
        await this._onAddEssenceAbility();
      });
      
      html.find(".ability-edit-btn").click(async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        
        let abilityId = ev.currentTarget.dataset.abilityId;
        if (!abilityId) {
          const parent = ev.currentTarget.closest("[data-ability-id]");
          abilityId = parent?.dataset.abilityId;
        }
        
        if (abilityId) await this._onEditEssenceAbility(abilityId);
      });
      
      html.find(".ability-delete-btn").click(async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        
        let abilityId = ev.currentTarget.dataset.abilityId;
        if (!abilityId) {
          const parent = ev.currentTarget.closest("[data-ability-id]");
          abilityId = parent?.dataset.abilityId;
        }
        
        if (abilityId) await this._onDeleteEssenceAbility(abilityId);
      });

      // ОДИН обработчик для использования
      html.find(".ability-use-btn, .essence-ability-use, .quick-ability-btn").click(async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        
        if (!this.item.actor) {
          ui.notifications.warn("Эссенция не принадлежит персонажу");
          return;
        }
        
        let abilityId = ev.currentTarget.dataset.abilityId;
        if (!abilityId) {
          const parent = ev.currentTarget.closest("[data-ability-id]");
          abilityId = parent?.dataset.abilityId;
        }
        
        if (abilityId) {
          await this.item.actor.useEssenceAbility(this.item.id, abilityId);
        }
      });
    }

    // === Spell ===
    html.find('.cast-spell').click(ev => {
      ev.preventDefault();
      this._onCastSpell(ev);
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

  /**
   * Добавить способность эссенции
   */
  async _onAddEssenceAbility() {
    const newAbility = {
      id: foundry.utils.randomID(),
      name: "Новая способность",
      img: "icons/svg/aura.svg",
      description: "",
      activationAction: "action",
      abilityType: "damage",
      manaCost: 0,
      spiritCost: 0,
      cooldown: 0,
      currentCooldown: 0,
      damage: "",
      damageType: "pure",
      damageScaling: "soulPower",
      range: 0,
      targetType: "enemy",
      areaType: "none",
      areaSize: 0,
      duration: "instant",
      durationRounds: 0,
      requiresSave: false,
      saveAttribute: "agility",
      playerNotes: ""
    };
    
    const abilities = foundry.utils.deepClone(this.item.system.abilities || []);
    abilities.push(newAbility);
    
    await this.item.update({ "system.abilities": abilities });
    
    // Открываем диалог редактирования
    this._onEditEssenceAbility(newAbility.id);
  }

  /**
   * Редактировать способность
   */
  async _onEditEssenceAbility(abilityId) {
    const abilities = this.item.system.abilities || [];
    const index = abilities.findIndex(a => a.id === abilityId);
    if (index === -1) return;
    
    const ability = abilities[index];
    
    // Сохраняем ссылку на item для использования в callback
    const item = this.item;
    
    const content = await renderTemplate(
      "systems/dungeon-stone/templates/dialogs/essence-ability-edit-dialog.hbs",
      { 
        ability, 
        config: DUNGEON,
        damageTypes: DUNGEON.damageTypes,
        subAttributes: DUNGEON.subAttributes,
        activationActions: {
          action: "Действие",
          bonus: "Бонусное",
          reaction: "Реакция",
          free: "Свободное",
          passive: "Пассив"
        },
        abilityTypes: {
          damage: "Урон",
          buff: "Усиление",
          debuff: "Ослабление",
          utility: "Утилита",
          heal: "Лечение",
          other: "Другое"
        },
        scalingOptions: {
          none: "Нет",
          soulPower: "Сила Души",
          strength: "Сила",
          agility: "Ловкость",
          cognition: "Когнитивность",
          willpower: "Воля"
        },
        targetTypes: {
          enemy: "Враг",
          ally: "Союзник",
          self: "На себя",
          any: "Любой",
          point: "Точка"
        },
        areaTypes: {
          none: "Нет",
          sphere: "Сфера",
          cone: "Конус",
          line: "Линия"
        },
        saveAttributes: {
          agility: "Ловкость",
          fortitude: "Стойкость",
          willpower: "Воля",
          cognition: "Разум"
        }
      }
    );
    
    new Dialog({
      title: `Редактирование: ${ability.name}`,
      content,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Сохранить",
          callback: async (html) => {
            const form = html[0].querySelector("form");
            if (!form) return;
            
            const currentAbilities = foundry.utils.deepClone(item.system.abilities || []);
            const currentIndex = currentAbilities.findIndex(a => a.id === abilityId);
            
            if (currentIndex === -1) return;
            
            const existingAbility = currentAbilities[currentIndex];
            
            const changes = {
              id: abilityId,
              name: form.querySelector('[name="name"]')?.value || existingAbility.name,
              img: form.querySelector('[name="img"]')?.value || existingAbility.img || "icons/svg/aura.svg",
              description: form.querySelector('[name="description"]')?.value || "",
              activationAction: form.querySelector('[name="activationAction"]')?.value || "action",
              abilityType: form.querySelector('[name="abilityType"]')?.value || "damage",
              manaCost: Number(form.querySelector('[name="manaCost"]')?.value) || 0,
              spiritCost: Number(form.querySelector('[name="spiritCost"]')?.value) || 0,
              cooldown: Number(form.querySelector('[name="cooldown"]')?.value) || 0,
              currentCooldown: existingAbility.currentCooldown || 0,
              damage: form.querySelector('[name="damage"]')?.value || "",
              damageType: form.querySelector('[name="damageType"]')?.value || "pure",
              damageScaling: form.querySelector('[name="damageScaling"]')?.value || "soulPower",
              range: Number(form.querySelector('[name="range"]')?.value) || 0,
              targetType: form.querySelector('[name="targetType"]')?.value || "enemy",
              areaType: form.querySelector('[name="areaType"]')?.value || "none",
              areaSize: Number(form.querySelector('[name="areaSize"]')?.value) || 0,
              duration: form.querySelector('[name="duration"]')?.value || "instant",
              durationRounds: Number(form.querySelector('[name="durationRounds"]')?.value) || 0,
              requiresSave: form.querySelector('[name="requiresSave"]')?.checked || false,
              saveAttribute: form.querySelector('[name="saveAttribute"]')?.value || "agility",
              playerNotes: form.querySelector('[name="playerNotes"]')?.value || ""
            };
            
            currentAbilities[currentIndex] = foundry.utils.mergeObject(existingAbility, changes);
            
            await item.update({ "system.abilities": currentAbilities });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Отмена"
        }
      },
      default: "save",
      render: (html) => {
        html.find('.ability-img').click(async (ev) => {
          const fp = new FilePicker({
            type: "image",
            current: ability.img || "icons/svg/aura.svg",
            callback: (path) => {
              html.find('[name="img"]').val(path);
              html.find('.ability-img').attr('src', path);
            }
          });
          fp.browse();
        });
      }
    }, { width: 500 }).render(true);
  }

  /**
  * Удалить способность
  */
  async _onDeleteEssenceAbility(abilityId) {
    const abilities = this.item.system.abilities || [];
    const ability = abilities.find(a => a.id === abilityId);
    
    if (!ability) return;
    
    const confirmed = await Dialog.confirm({
        title: "Удалить способность",
        content: `<p>Удалить способность "<b>${ability.name}</b>"?</p>`
    });
    
    if (!confirmed) return;
    
    const newAbilities = abilities.filter(a => a.id !== abilityId);
    await this.item.update({ "system.abilities": newAbilities });
  }
}
