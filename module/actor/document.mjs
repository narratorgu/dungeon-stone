import { DUNGEON } from "../config.mjs";
import * as Calc from "../mechanics/calculator.mjs";
import * as Dice from "../mechanics/dice.mjs";

export class DungeonActor extends Actor {

  /** 
   * Предварительная обработка обновлений.
   * Валидация ресурсов (HP, Mana) и ограничение значений (clamping).
   * @override 
   */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
  
    if (changed.system?.resources) {
      const res = changed.system.resources;
      const current = this.system.resources;

      // HP: Проверка на выход за границы 0 - Max
      if (res.hp) {
        if (res.hp.max !== undefined) res.hp.max = Math.floor(res.hp.max);
        if (res.hp.value !== undefined) {
          const max = res.hp.max ?? current.hp.max;
          res.hp.value = Math.clamp(Math.floor(res.hp.value), 0, max);
        }
      }

      // Mana: Проверка на выход за границы 0 - Max
      if (res.mana) {
        if (res.mana.max !== undefined) res.mana.max = Math.floor(res.mana.max);
        if (res.mana.value !== undefined) {
          const max = res.mana.max ?? current.mana.max;
          res.mana.value = Math.clamp(Math.floor(res.mana.value), 0, max);
        }
      }

      // Fate: 0 - 3
      if (res.fate?.value !== undefined) {
        res.fate.value = Math.clamp(Math.floor(res.fate.value), 0, 3);
      }

      // Level: Целое число
      if (res.level !== undefined) {
        res.level = Math.floor(Number(res.level));
      }
    }
  }

  /** 
   * Расчёт производных характеристик.
   * Выполняется ПОСЛЕ применения Активных Эффектов.
   * @override 
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    
    const sys = this.system; 
    const sub = sys.subAttributes;
    const attr = sys.attributes;

    const lineageItem = this.items.find(i => i.type === "lineage");
    const roleItem = this.items.find(i => i.type === "role");

    let isDivine = false;
    let isArcane = false;
    let magicRank = 99;

    if (roleItem) {
      const rName = roleItem.name.toLowerCase();
      
      // Божественные классы
      if (rName.match(/жрец|паладин|клирик|priest|paladin/)) {
          isDivine = true;
          if (sub.divinePowerStat === 0) sub.divinePowerStat = 1;
          magicRank = roleItem.system.rank || 9;
      }
      else if (rName.match(/маг|некромант|волшебник|mage|wizard|necromancer/)) {
          isArcane = true;
          magicRank = roleItem.system.rank || 9;
      }
    }

    this.isDivine = isDivine;
    this.isArcane = isArcane;
    this.magicRank = magicRank;

    if (roleItem) {
      const rName = roleItem.name.toLowerCase();
      if (isDivine || (isArcane && !rName.match(/некромант|necromancer/))) {
        sys.equipment.essenceSlotsMax = 0;
      } else {
        sys.equipment.essenceSlotsMax = sys.resources.level || 1;
      }
    }

    const cognition = sub.cognition || 0;
    const manaSense = sub.manaSense || 0;

    const powerStat = isDivine ? (sub.divinePowerStat || 0) : (sub.soulPower || 0);
    
    const magicStats = Calc.calculateMagicStats(cognition, manaSense, powerStat);

    this.magicStats = {
      dc: magicStats.dc,
      ku: magicStats.ku
    };

    // Логика Дракона (Родословная)
    if (lineageItem) {
      const lName = lineageItem.name.toLowerCase();
      if (lName.includes("дракон") || lName.includes("dragon")) {
          // Если стат равен 0 (скрыт), ставим 1, чтобы он появился
          if (sub.dragonPowerStat === 0) sub.dragonPowerStat = 1;
      }
    }

    // Логика Божественной силы (Класс: Жрец, Паладин, Клирик и т.д.)
    if (roleItem) {
        const rName = roleItem.name.toLowerCase();
        if (rName.includes("жрец") || rName.includes("паладин") || rName.includes("priest")) {
            if (sub.divinePowerStat === 0) sub.divinePowerStat = 1;
        }
    }
  
    // 1. Инициализация базовых переменных (с учетом AE)
    const strength = sub.strength || 0;
    const bone = sub.boneDensity || 0;
    const agility = sub.agility || 0;
    const spirit = sub.soulPower || 0;
    const endurance = sub.stamina || (attr.body * 2);
    
    // 2. Расчёт Максимумов Ресурсов
    sys.resources.hp.max = Math.floor(Calc.calculateMaxHP(endurance, bone));
    sys.resources.mana.max = Math.floor(Calc.calculateMaxMana(spirit));

    if (sys.subAttributes.dragonPowerStat > 0) {
        const soul = sys.subAttributes.soulPower || 0;
        sys.resources.dp.max = Math.floor(soul * 0.5 + sys.subAttributes.dragonPowerStat * 1.5);
    } else {
        sys.resources.dp.max = 0;
    }

    if (isDivine) {
        sys.resources.gp.max = Math.floor(((sys.subAttributes.divinePowerStat || 0) * 1.5 + (sys.subAttributes.soulPower || 0) * 0.75));
    } else {
        sys.resources.gp.max = 0;
    }
    
    // 3. Расчёт Нагрузки
    sys.encumbrance.max = Math.floor((strength * 5) + (bone * 2) + 20);
    
    // 4. Обработка Экипировки (Вес, Уровень предмета, Ссылки на слоты)
    let totalWeight = 0;
    let totalItemLevel = 0;
    let equippedCount = 0;
    let blockedRings = 0;
  
    this._resetEquipmentLinks(sys);
  
    for (const item of this.items) {
      const iSys = item.system;
      let weight = (iSys.weight || 0) * (iSys.quantity || 1);
      if (item.type === "container" && item.system.totalWeight !== undefined) {
          weight = item.system.totalWeight;
      }
      
      // Вес считается всегда (даже в рюкзаке)
      totalWeight += weight;
  
      if (iSys.equipStatus === "equipped") {
        if (iSys.itemLevel) {
          totalItemLevel += iSys.itemLevel;
          equippedCount++;
        }
        this._linkEquippedItem(item, sys);
        
        // Блокировка колец перчатками
        if (item.type === "armor" && iSys.blockedSlots?.ringsBlocked > 0) {
          blockedRings += iSys.blockedSlots.ringsBlocked;
        }
      }
    }
  
    sys.encumbrance.value = parseFloat(totalWeight.toFixed(2));
    sys.encumbrance.pct = Math.min(100, Math.round((totalWeight / sys.encumbrance.max) * 100));
    sys.attributes.itemLevel = totalItemLevel;
    sys.equipment.blockedRings = blockedRings;

    sys.resources.hp.value = Math.min(sys.resources.hp.value, sys.resources.hp.max);
    sys.resources.mana.value = Math.min(sys.resources.mana.value, sys.resources.mana.max);

    if (this.type === "character") {
      const sizeMap = { "tiny": 1, "small": 2, "medium": 3, "large": 4, "giant": 500, "colossal": 6 };
      const sizeVal = sizeMap[sub.size] || 3;

      const threat = Math.floor(
          ((sub.height || 0) / 10) + 
          (sizeVal * 50) + 
          ((sub.weight || 0) / 10) + 
          (sub.boneDensity || 0) + 
          (sub.presence || 0) + 
          (sub.willpower || 0) + 
          (totalItemLevel / 100)
      );
      sys.attributes.threatLevel = threat;
    } else {
      sys.attributes.threatLevel = 0; 
    }
  
    // 5. Остальные расчёты (Скорость, Резисты, КУ, XP)
    sys.attributes.speed = Calc.calculateSpeed(agility, sys.attributes.speedBonus || 0);
    sys.resistances.physBase = Calc.calculatePhysRes(bone, sub.physicalResistance || 0);
    sys.resistances.magBase = Calc.calculateMagRes(sub.magicResistance || 0);
    sys.resources.xp.max = Calc.getXPThreshold(sys.resources.level);
    
    const size = sub.size || "medium";
    sys.combat.defensePool.max = Math.floor(Calc.calculateKU(agility, size));

    sys.resources.dp.value = Math.min(sys.resources.dp.value, sys.resources.dp.max);
    sys.resources.gp.value = Math.min(sys.resources.gp.value, sys.resources.gp.max);
    const hasDP = sys.subAttributes.dragonPowerStat > 0 && sys.resources.dp.max > 0;
    
    if (hasDP) {
        // Для драконов используем DP
        const dpRegenStat = Number(sub.dragonPowerStat) || 0;
        const dpValue = Number(sys.resources.dp.value) || 0;
        const dpMax = Number(sys.resources.dp.max) || 0;
        this.recoveryInfo = Calc.calculateRecoveryTime(dpRegenStat, dpValue, dpMax);
    } else if (isDivine) {
        // Для божественных классов используем GP
        // Формула: (spiritRecovery * 0.5) + divinePowerStat
        const divinePower = Number(sub.divinePowerStat) || 0;
        const spiritRec = Number(sub.spiritRecovery) || 0;
        let manaRegenStat;
        
        if (divinePower > 0) {
            manaRegenStat = (spiritRec * 0.5) + divinePower;
        } else {
            // Если нет divinePowerStat, используем только spiritRecovery
            manaRegenStat = spiritRec;
        }
        const gpValue = Number(sys.resources.gp.value) || 0;
        const gpMax = Number(sys.resources.gp.max) || 0;
        this.recoveryInfo = Calc.calculateRecoveryTime(manaRegenStat, gpValue, gpMax);
    } else {
        // Для аркановых классов используем MP
        const spiritRec = Number(sub.spiritRecovery) || 0;
        const manaValue = Number(sys.resources.mana.value) || 0;
        const manaMax = Number(sys.resources.mana.max) || 0;
        // Используем spiritRecovery напрямую для расчета восстановления MP
        this.recoveryInfo = Calc.calculateRecoveryTime(spiritRec, manaValue, manaMax);
    }
  }

  /* -------------------------------------------- */
  /*  МЕТОДЫ РАБОТЫ С ЭКИПИРОВКОЙ                 */
  /* -------------------------------------------- */

  _resetEquipmentLinks(sys) {
    const eq = sys.equipment;
    for (const key in eq) {
      if (Array.isArray(eq[key])) eq[key] = [];
      else if (typeof eq[key] === "string") eq[key] = "";
    }
  }

  _linkEquippedItem(item, sys) {
    const eq = sys.equipment;
    const is = item.system;

    if (item.type === "weapon") {
      if (is.grip === "offhand") eq.offHand = item.id; 
      else eq.mainHand = item.id;
      if (is.grip === "2h") eq.offHand = item.id;
    } 
    else if (item.type === "armor") {
      if (is.isShield) eq.offHand = item.id;
      else if (is.slot === "ring") eq.rings.push(item.id);
      else { 
          if (eq[is.slot] !== undefined) eq[is.slot] = item.id; 
          if (is.coversSlots) {
              for (const [slotKey, covered] of Object.entries(is.coversSlots)) {
                  if (covered && eq[slotKey] !== undefined && slotKey !== is.slot) {
                      eq[slotKey] = item.id;
                  }
              }
          }
      }
    } else if (item.type === "essence") eq.essences.push(item.id);
  }

  /**
   * Экипировать/Снять предмет
   */
  async toggleEquip(itemId) {
    const item = this.items.get(itemId);
    if (!item) return;
    const sys = this.system;
    const isEquipped = item.system.equipStatus === "equipped";

    const updates = [];

    // --- ОРУЖИЕ ---
    if (item.type === "weapon") {
        const tags = item.system.tags;
        
        // Если уже экипировано
        if (isEquipped) {
            // Если универсальное (Versatile): 1h -> 2h -> Stored
            if (tags.versatile) {
                if (item.system.grip === "1h") {
                    // Переключаем на 2H (освобождаем левую руку)
                    this._unequipIfOccupied("offHand", updates);
                    updates.push({ _id: item.id, "system.grip": "2h" });
                    ui.notifications.info(`${item.name}: Двуручный хват`);
                } else {
                    // Снимаем
                    updates.push({ _id: item.id, "system.equipStatus": "stored", "system.grip": "1h" });
                }
            } else {
                // Обычное - просто снимаем
                updates.push({ _id: item.id, "system.equipStatus": "stored" });
            }
        } 
        // Если не экипировано -> Надеваем
        else {
            if (tags.twoHanded) {
                this._unequipIfOccupied("mainHand", updates);
                this._unequipIfOccupied("offHand", updates);
                updates.push({ _id: item.id, "system.equipStatus": "equipped", "system.grip": "2h" });
            } else {
                this._unequipIfOccupied("mainHand", updates);
                // По умолчанию 1h, даже если универсальное
                updates.push({ _id: item.id, "system.equipStatus": "equipped", "system.grip": "1h" });
            }
        }
    }
    // --- БРОНЯ / ЩИТ ---
    else if (item.type === "armor") {
        if (isEquipped) {
            updates.push({ _id: item.id, "system.equipStatus": "stored" });
        } else {
            if (item.system.isShield) {
                // Если в главной руке двуручное - нельзя щит
                const mainItem = this.items.get(sys.equipment.mainHand);
                if (mainItem && mainItem.system.grip === "2h") {
                    return ui.notifications.warn("Руки заняты двуручным оружием!");
                }
                this._unequipIfOccupied("offHand", updates);
                updates.push({ _id: item.id, "system.equipStatus": "equipped" });
            } else {
                // Обычная броня (слот + coversSlots)
                this._unequipSlot(item.system.slot, updates);
                // Проверка coversSlots (для комплектов)
                if (item.system.coversSlots) {
                    for (const [slotKey, covered] of Object.entries(item.system.coversSlots)) {
                        if (covered) this._unequipSlot(slotKey, updates);
                    }
                }
                updates.push({ _id: item.id, "system.equipStatus": "equipped" });
            }
        }
    }
    else if (item.type === "contract") {
      // Получаем лимит (если он вдруг 0 из-за ошибки расчета, даем хотя бы 1 для теста, но лучше проверить логику выше)
      const maxSlots = sys.equipment.contractSlotsMax || 0;
      
      // Считаем активные
      const activeCount = this.items.filter(i => i.type === "contract" && i.system.equipStatus === "equipped").length;
      
      if (!isEquipped && activeCount >= maxSlots) {
          return ui.notifications.warn(`Лимит контрактов исчерпан (${maxSlots})!`);
      }
      updates.push({ _id: item.id, "system.equipStatus": isEquipped ? "stored" : "equipped" });
  }
    // --- ЭССЕНЦИИ ---
    else if (item.type === "essence") {
        if (sys.equipment.essences.length >= sys.equipment.essenceSlotsMax) return ui.notifications.warn("Слоты эссенций заполнены!");
        updates.push({ _id: item.id, "system.equipStatus": "equipped" });
    }

    if (updates.length > 0) {
        await this.updateEmbeddedDocuments("Item", updates);
        if (game.user.isGM) await this._syncAllArmorPenaltyEffects();
        else game.socket.emit("system.dungeon-stone", { type: "syncArmorPenaltyAE", actorId: this.id });
    }
  }
  
  _unequipIfOccupied(slotName, updates) {
    const itemId = this.system.equipment[slotName];
    if (itemId) {
        // Проверяем, не добавлен ли уже этот предмет в updates на снятие
        if (!updates.find(u => u._id === itemId)) {
            updates.push({ _id: itemId, "system.equipStatus": "stored" });
        }
    }
  }
  
  _unequipSlot(slotType, updates) {
    const equippedItems = this.items.filter(i => 
        i.type === "armor" && 
        i.system.equipStatus === "equipped" &&
        (i.system.slot === slotType || i.system.coversSlots?.[slotType])
    );

    for (const item of equippedItems) {
        if (!updates.find(u => u._id === item.id)) {
            updates.push({ _id: item.id, "system.equipStatus": "stored" });
        }
    }
  }

  /* -------------------------------------------- */
  /*  ИСПОЛЬЗОВАНИЕ ПРЕДМЕТОВ / АБИЛОК            */
  /* -------------------------------------------- */
  async useItem(itemId) {
    const item = this.items.get(itemId);
    if (!item) return;
    const sys = item.system;
  
    // === 1. РАСХОДНИКИ ===
    if (item.type === "consumable") {
      if (sys.quantity <= 0) return ui.notifications.warn("Предмет закончился!");
  
      const updates = {};
      const rolls = [];
      let restoreMsg = "";
  
      // Лечение / Ресурсы
      if (sys.healing) {
        const roll = await new Roll(sys.healing).evaluate();
        rolls.push(roll);
        const newHP = Math.min(this.system.resources.hp.value + roll.total, this.system.resources.hp.max);
        updates["system.resources.hp.value"] = newHP;
        restoreMsg += `<div style="color:#ffaaaa;">❤️ +${roll.total} HP</div>`;
      }
      if (sys.manaRestore) {
        const roll = await new Roll(sys.manaRestore).evaluate();
        rolls.push(roll);
        const newMana = Math.min(this.system.resources.mana.value + roll.total, this.system.resources.mana.max);
        updates["system.resources.mana.value"] = newMana;
        restoreMsg += `<div style="color:#aaddff;">💧 +${roll.total} Маны</div>`;
      }
      // GP / DP
      if (sys.gpRestore) {
        const roll = await new Roll(sys.gpRestore).evaluate();
        rolls.push(roll);
        const newGP = Math.min(this.system.resources.gp.value + roll.total, this.system.resources.gp.max);
        updates["system.resources.gp.value"] = newGP;
        restoreMsg += `<div style="color:#ffd700;">⚡ +${roll.total} GP</div>`;
      }
      if (sys.dpRestore) {
        const roll = await new Roll(sys.dpRestore).evaluate();
        rolls.push(roll);
        const newDP = Math.min(this.system.resources.dp.value + roll.total, this.system.resources.dp.max);
        updates["system.resources.dp.value"] = newDP;
        restoreMsg += `<div style="color:#ddaaff;">🌟 +${roll.total} DP</div>`;
      }
  
      if (Object.keys(updates).length > 0) await this.update(updates);
  
      // Трата предмета
      await item.update({ "system.quantity": sys.quantity - 1 });
      if (sys.quantity - 1 <= 0) ui.notifications.info(`${item.name} закончился.`);
  
      // Если нет атакующих эффектов - просто выводим инфо
      if (!sys.damage && !sys.attackBonus && !sys.damageBonus) {
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({actor: this}),
          content: `
            <div class="dungeon-chat-card">
              <header><h3>${item.name}</h3></header>
              <div class="card-body">
                <p>${this.name} использует ${item.name}.</p>
                ${restoreMsg}
                ${sys.description}
              </div>
            </div>`,
          style: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
        return;
      }
    }
  
    // === 2. МАНА (для заклинаний / эссенций) ===
    const manaCost = Number(sys.manaCost) || 0;
    if (manaCost > 0) {
      const currentMana = this.system.resources.mana.value;
      if (currentMana < manaCost) {
        return ui.notifications.warn(`Недостаточно маны! Требуется ${manaCost}, есть ${currentMana}.`);
      }
      await this.update({"system.resources.mana.value": currentMana - manaCost});
    }
  
    // === 3. КНОПКИ ДЕЙСТВИЙ ===
    let buttons = "";
  
    // Атака (Spell / Weapon / Consumable)
    // Поддержка и старого scaling, и нового attackAttribute
    const attackAttr = sys.attackAttribute || sys.scaling; 
    if (attackAttr && attackAttr !== "none") {
      // Локализуем название атрибута
      const label = game.i18n.localize(`DUNGEON.attributes.${attackAttr}`) || attackAttr;
      buttons += `<button data-action="spell-attack" data-item-id="${item.id}">⚔️ Атака (${label})</button>`;
    }
  
    // Урон
    if (sys.damage && String(sys.damage).trim() !== "") {
      buttons += `<button data-action="roll-damage" data-item-id="${item.id}">🎲 Урон (${sys.damage})</button>`;
    }
  
    // Спасбросок
    let saveInfo = "";
    if (sys.saveAttribute) {
      let dc = sys.saveDC || 0;
      const ku = sys.saveKU || 1;
  
      // Авторасчет DC (твоя формула)
      if (dc === 0) {
        dc = Calc.calculateSpellDC(this.system.attributes.spirit || 0);
      }
  
      // Словарь названий атрибутов
      const attrNames = {
        "fortitude": "Стойкость",
        "agility": "Ловкость",
        "willpower": "Воля",
        "cognition": "Когнитивность",
        "intuition": "Интуиция",
        "physique": "Телосложение" // Легаси
      };
      const attrLabel = attrNames[sys.saveAttribute] || sys.saveAttribute;
  
      saveInfo = `<div style="margin-top:5px; border-top:1px dashed #555; padding-top:2px; font-size:11px; color:#aaa;">
                    DC Спаса: <b>${dc}</b> (${attrLabel})
                  </div>`;
      
      buttons += `<button data-action="request-save" data-dc="${dc}" data-ku="${ku}" data-attr="${sys.saveAttribute}">🛡️ Запросить Спас (DC ${dc})</button>`;
    }
  
    // === 4. ЧАТ КАРТОЧКА ===
    const description = sys.description || "";
    
    ChatMessage.create({ 
      speaker: ChatMessage.getSpeaker({actor: this}), 
      content: `
        <div class="dungeon-chat-card">
            <header>
                <img src="${item.img}" width="30" height="30" style="margin-right:5px">
                <h3>${item.name}</h3>
            </header>
            <div class="card-body">
                ${manaCost > 0 ? `<div style="color:#aaddff; font-weight:bold; font-size:11px; margin-bottom:5px;">💧 Потрачено ${manaCost} Маны</div>` : ""}
                ${description}
                ${saveInfo}
            </div>
            <div class="card-buttons" style="margin-top:10px; display:flex; flex-direction:column; gap:5px;">
                ${buttons}
            </div>
        </div>
      `, 
      style: CONST.CHAT_MESSAGE_STYLES.OTHER 
    });
  }

  /* -------------------------------------------- */
  /*  ИНИЦИАТИВА                                  */
  /* -------------------------------------------- */

  async rollInitiative(options = {}) {
    if (!game.combat) {
        return ui.notifications.warn("Нет активного боевого столкновения.");
    }

    let combatant = game.combat.combatants.find(c => c.actorId === this.id);
    if (!combatant && options.createCombatants) {
        const tokens = this.getActiveTokens();
        if (tokens.length > 0) {
            await game.combat.createEmbeddedDocuments("Combatant", [{tokenId: tokens[0].id, actorId: this.id}]);
            combatant = game.combat.combatants.find(c => c.actorId === this.id);
        }
    }

    if (!combatant) {
        return ui.notifications.warn("Этот персонаж не находится в Боевом Трекере.");
    }

    console.log(`Dungeon & Stone | Force Rolling Initiative for ${this.name}`);

    const agility = this.system.subAttributes.agility || 0;
    const pool = Math.max(1, Math.floor(agility / 13));
    
    const roll = new Roll(`${pool}d100`);
    await roll.evaluate();
    
    let successes = 0;
    const diceResults = roll.terms[0].results.map(r => r.result);
    
    diceResults.forEach(r => {
        if (r >= 95) successes += 3;
        else if (r <= 5) successes -= 1;
        else if (r >= 50) successes += 1;
    });
    
    const tieBreaker = agility / 100;
    let total = successes + tieBreaker;
    if (total < 0) total = 0;

    await game.combat.setInitiative(combatant.id, total);

    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor: this}),
        content: `
          <div class="dungeon-chat-card">
              <h3>⚡ Инициатива</h3>
              <div style="font-size:11px; color:#aaa; display:flex; justify-content:space-between;">
                  <span>${this.name}</span>
                  <span>ЛВК: ${agility} (${pool}к)</span>
              </div>
              <div class="outcome" style="margin:5px 0;">${successes} Успехов</div>
              <div class="gm-only" style="font-size:10px; border-top:1px dashed #555;">
                  Кубы: [${diceResults.join(", ")}]<br>Тай-брейкер: +${tieBreaker}
              </div>
              <div style="background:#222; color:#d4af37; text-align:center; font-weight:bold; padding:2px; margin-top:5px; border-radius:2px;">
                  Итог: ${total}
              </div>
          </div>
        `,
        sound: CONFIG.sounds.dice
    });

    return this;
  }

  /* -------------------------------------------- */
  /*  XP & REGEN                                  */
  /* -------------------------------------------- */

  async addExperienceDialog() {
      new Dialog({
          title: "Добавить Опыт",
          content: `<form class="dungeon-dialog"><div class="form-group"><label>XP:</label><input type="number" name="xpAmount" value="0" autofocus></div></form>`,
          buttons: {
              add: { label: "OK", callback: html => this.addExperience(Number(html.find('[name="xpAmount"]').val())) }
          },
          default: "add"
      }).render(true);
  }

  async addExperience(amount) {
      if (!amount) return;
      let xp = this.system.resources.xp.value + amount;
      let level = this.system.resources.level;
      
      let max = Calc.getXPThreshold(level);
      let levelUp = false;
      let safety = 0;
      
      while (max && xp >= max && level < 11 && safety < 20) {
          xp -= max;
          level++;
          levelUp = true;
          max = Calc.getXPThreshold(level);
          safety++;
      }
      
      await this.update({ "system.resources.xp.value": xp, "system.resources.level": level });
      
      if (levelUp) {
          ChatMessage.create({
              content: `<div class="dungeon-chat-card success" style="border: 2px solid gold;"><h3 style="color:gold; text-align:center; margin:0;">🎉 НОВЫЙ УРОВЕНЬ!</h3><div style="text-align:center;">Уровень <b>${level}</b> достигнут!</div></div>`,
              speaker: ChatMessage.getSpeaker({actor: this})
          });
      }
  }

  async applyRegenDialog() {
      new Dialog({
          title: "Отдых",
          content: `<form><div class="form-group"><label>Время:</label><input type="number" name="t" value="10"></div><div class="form-group"><label>Ед:</label><select name="u"><option value="sec">Сек</option><option value="min" selected>Мин</option><option value="hour">Час</option></select></div></form>`,
          buttons: {
              heal: { label: "Применить", callback: html => this._calculateRegen(Number(html.find('[name="t"]').val()), html.find('[name="u"]').val()) }
          }
      }).render(true);
  }

  /**
 * Расчет регенерации HP и Маны
 * @param {number} val - Количество времени
 * @param {string} unit - Единица измерения ('sec', 'min', 'hour', 'round')
 */
  async _calculateRegen(val, unit) {
    const hpRegenStat = this.system.subAttributes.naturalRegeneration || 0;
    let manaRegenStat = this.system.subAttributes.spiritRecovery || 0;
    if (this.system.subAttributes.divinePowerStat > 0) {
        manaRegenStat = (manaRegenStat * 0.5) + this.system.subAttributes.divinePowerStat;
    }
    const dpRegenStat = this.system.subAttributes.dragonPowerStat || 0;
    
    // Конвертация в минуты
    let minutes = 0;
    if (unit === 'sec') minutes = val / 60;
    else if (unit === 'round') minutes = (val * 10) / 60; // 1 раунд = 10 сек
    else if (unit === 'hour') minutes = val * 60;
    else minutes = val; // min
  
    if (hpRegenStat <= 0 && manaRegenStat <= 0) {
        return ui.notifications.warn("Нет навыков регенерации.");
    }
  
    // КОЭФФИЦИЕНТ: 0.5 (50% от стата в минуту)
    const RATE = 0.5;
  
    let hpHeal = Math.floor(hpRegenStat * minutes * RATE);
    let manaHeal = Math.floor(manaRegenStat * minutes * RATE);
    let dpHeal = Math.floor(dpRegenStat * minutes * RATE);
  
    // Минимум 1, если прошло достаточно времени (например 1 минута) и стат > 0
    if (hpRegenStat > 0 && hpHeal < 1 && minutes >= 1) hpHeal = 1;
    if (manaRegenStat > 0 && manaHeal < 1 && minutes >= 1) manaHeal = 1;
    if (dpRegenStat > 0 && dpHeal < 1 && minutes >= 1) dpHeal = 1;
  
    const updates = {};
    let msg = "";
  
    // HP
    if (hpHeal > 0) {
        const cur = this.system.resources.hp.value;
        const max = this.system.resources.hp.max;
        if (cur < max) {
            const newVal = Math.min(max, cur + hpHeal);
            updates["system.resources.hp.value"] = newVal;
            msg += `<div>❤️ HP: +${newVal - cur}</div>`;
        }
    }
  
    // Мана/GP
    if (manaHeal > 0) {
        if (this.isDivine) {
            // Для божественных классов используем GP
            const cur = this.system.resources.gp.value;
            const max = this.system.resources.gp.max;
            if (cur < max) {
                const newVal = Math.min(max, cur + manaHeal);
                updates["system.resources.gp.value"] = newVal;
                msg += `<div>💧 GP: +${newVal - cur}</div>`;
            }
        } else {
            // Для аркановых классов используем MP
            const cur = this.system.resources.mana.value;
            const max = this.system.resources.mana.max;
            if (cur < max) {
                const newVal = Math.min(max, cur + manaHeal);
                updates["system.resources.mana.value"] = newVal;
                msg += `<div>💧 MP: +${newVal - cur}</div>`;
            }
        }
    }

    if (dpHeal > 0) {
      let cur = this.system.resources.dp.value;
      let max = this.system.resources.dp.max;
      if (cur < max) {
          const newVal = Math.min(max, cur + dpHeal);
          updates["system.resources.dp.value"] = newVal;
          msg += `<div>🌟 DP: +${newVal - cur}</div>`;
      }
    }
  
    // СБРОС КУЛДАУНОВ (если отдых > 5 минут)
    if (minutes >= 5) {
      const cooldownUpdates = [];
      
      // Эссенции
      for (const item of this.items.filter(i => i.type === "essence" && i.system.isOnCooldown)) {
        cooldownUpdates.push({ _id: item.id, "system.isOnCooldown": false });
      }
      
      // Контракты
      for (const item of this.items.filter(i => i.type === "contract" && i.system.activeAbilityParams?.isOnCooldown)) {
        cooldownUpdates.push({ _id: item.id, "system.activeAbilityParams.isOnCooldown": false });
      }
      
      if (cooldownUpdates.length > 0) {
        await this.updateEmbeddedDocuments("Item", cooldownUpdates);
        msg += `<div style="color:#ffd700; margin-top:5px;">🔄 Кулдауны сброшены (${cooldownUpdates.length})</div>`;
      }
    }
  
    // Применяем обновления
    if (Object.keys(updates).length > 0 || msg.includes("Кулдауны")) {
        await this.update(updates);
        
        // Красивое отображение времени
        let timeLabel = `${val} ${unit}`;
        if (unit === 'min') timeLabel = `${val} мин.`;
        if (unit === 'sec') timeLabel = `${val} сек.`;
        if (unit === 'round') timeLabel = `${val} раунд(ов)`;
  
        ChatMessage.create({
           speaker: ChatMessage.getSpeaker({ actor: this }),
           content: `<div class="dungeon-chat-card success"><h3>💖 Отдых (${timeLabel})</h3>${msg}</div>`,
           style: CONST.CHAT_MESSAGE_STYLES.OTHER
       });
    } else {
        ui.notifications.info("Здоровье и MP/GP полны, кулдаунов нет.");
    }
  }

  /**
 * Разместить шаблон области на сцене
 * @param {object} item - Предмет
 */
  async _placeTemplate(item) {
    const areaType = item.system.areaType || item.system.activeAbilityParams?.areaType;
    const areaSize = item.system.areaSize || item.system.activeAbilityParams?.areaSize || 0;
  
    if (!areaType || areaType === "none" || areaSize <= 0) return;
  
    const gridDist = canvas.scene.grid.distance; // Дистанция одной клетки (2м)
    const distance = areaSize * gridDist; // Радиус/Длина в метрах
  
    let templateData = {
      t: "circle",
      user: game.user.id,
      distance: distance,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user.color
    };
  
    switch (areaType) {
      case "cone":
        templateData.t = "cone";
        templateData.angle = 53.13; // Стандартный угол для конуса (как в D&D 5e)
        break;
      case "cube":
        templateData.t = "rect";
        templateData.width = distance;
        templateData.distance = distance; // height
        break;
      case "line":
        templateData.t = "ray";
        templateData.width = gridDist; // Ширина луча = 1 клетка
        break;
      case "sphere":
      case "emanation":
        templateData.t = "circle";
        break;
      default:
        return;
    }
  
    // Запуск инструмента размещения
    const doc = new MeasuredTemplateDocument(templateData, { parent: canvas.scene });
    const template = new game.dungeon.AbilityTemplate(doc);
    template.item = item;
    template.actorSheet = this.sheet;
    
    template.drawPreview();
  }

  /* -------------------------------------------- */
  /*  ПРИМЕНЕНИЕ УРОНА И СОПРОТИВЛЕНИЯ            */
  /* -------------------------------------------- */

  async applyDamage(amount, type = "pure") {
    const sub = this.system.subAttributes;
    const res = this.system.resistances;
    
    const magicTypes = ["fire", "cold", "lightning", "light", "dark", "psychic", "acid", "poison"];
    
    let baseResistPercent = 0;
    let statValue = 0;
    let statName = "";
    
    // Чистый урон
    if (type === "pure") {
      baseResistPercent = 0;
      statName = "Чистый урон (игнор)";
    }
    // Магический урон
    else if (magicTypes.includes(type)) {
      statValue = sub.magicResistance || 0;
      statName = `Маг. Сопр. (${statValue})`;
      baseResistPercent = 15 * Math.log(1 + (statValue / 10));
    }
    // Физический урон
    else {
      const bone = sub.boneDensity || 0;
      const physRes = res.physBase || 0;
      statValue = bone + physRes;
      statName = `Плотность(${bone}) + Физ.База(${physRes})`;
      baseResistPercent = 20 * Math.log(1 + (statValue / 10));
    }
    
    // Специфическое сопротивление
    const specificPercent = res[type] || 0;
  
    // Мультипликативная формула
    const p1 = Math.max(0, Math.min(1, baseResistPercent / 100));
    const p2 = Math.max(0, Math.min(1, specificPercent / 100));
    const resistMult = 1 - (1 - p1) * (1 - p2);
    const totalResistPercent = Math.round(resistMult * 100);
    
    const finalDamage = Math.max(0, Math.floor(amount * (1 - resistMult)));
    const reduced = amount - finalDamage;
    
    // Применение
    const currentHP = this.system.resources.hp.value;
    const newHP = Math.max(0, currentHP - finalDamage);
    
    if (this.isOwner || game.user.isGM) {
      await this.update({ "system.resources.hp.value": newHP });
    } else {
      game.socket.emit("system.dungeon-stone", {
        type: "applyDamage",
        actorId: this.id,
        damage: finalDamage
      });
    }
    
    ChatMessage.create({
      content: `
        <div class="dungeon-chat-card failure">
          <header><h3>💔 ${this.name} получает урон</h3></header>
          <div class="player-view">
            <div class="damage-applied" style="font-size: 24px; font-weight: bold; color: #ff4444;">-${finalDamage} HP</div>
            <div style="font-size: 12px; color: #aaa; margin-top: 4px;">Тип: ${DUNGEON.damageTypes[type] || type} | Входящий: ${amount}</div>
          </div>
          <div class="gm-only" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #333; font-size: 11px; color: #666;">
            <div><b>База:</b> ${Math.round(baseResistPercent)}% (${statName})</div>
            <div><b>Спец. (${type}):</b> ${specificPercent}%</div>
            <div><b>Итого сопр.:</b> ${totalResistPercent}%</div>
            <div><b>Поглощено:</b> ${reduced} урона</div>
            <div><b>HP:</b> ${currentHP} → ${newHP}</div>
          </div>
        </div>
      `,
      whisper: game.user.isGM ? [] : [game.user.id]
    });
  }

  /* -------------------------------------------- */
  /*  МЕХАНИКА БРОСКОВ                            */
  /* -------------------------------------------- */
  async rollAttribute(key, label) {
    let baseVal = 0;
    let isKnowledgeRoll = false;

    // Если кликнули на Знание напрямую
    if (key.startsWith("knowledge.")) {
        const itemId = key.replace("knowledge.", "");
        const knowledge = this.items.get(itemId);
        if (!knowledge) return ui.notifications.warn("Знание не найдено.");
        baseVal = Number(knowledge.system.value) || 0;
        isKnowledgeRoll = true;
    } else {
        // Обычный атрибут
        const cleanKey = key.replace(/^(system\.|subAttributes\.|attributes\.)/, '');
        baseVal = Number(this.system.subAttributes[cleanKey] || this.system.attributes[cleanKey] || 0);
    }

    return this._showComplexCheckDialog(label, baseVal, isKnowledgeRoll);
  }

  /**
   * Отображение диалога комплексной проверки
   */
  async _showComplexCheckDialog(label, baseVal, isKnowledgeRoll) {
    // 1. Список податрибутов (Вторичный)
    const subAttrs = Object.entries(DUNGEON.subAttributes).map(([k, v]) => ({ key: k, label: v }));
    
    // 2. Список Знаний (Третий компонент) - исключаем, если мы УЖЕ бросаем знание
    let knowledgeItems = [];
    if (!isKnowledgeRoll) {
        knowledgeItems = this.items.filter(i => i.type === "knowledge").map(i => ({ 
            id: i.id, 
            name: i.name, 
            val: i.system.value 
        }));
    }

    const content = await foundry.applications.handlebars.renderTemplate("systems/dungeon-stone/templates/dialogs/check-roll.hbs", {
        label,
        baseVal,
        basePool: Math.floor(baseVal / 13), // Справочно
        subAttributes: subAttrs,
        knowledges: knowledgeItems,
        isKnowledgeRoll
    });

    new Dialog({
        title: `Проверка: ${label}`,
        content,
        buttons: {
            roll: {
                label: `<i class="fas fa-dice"></i> Бросок`,
                callback: html => {
                    const form = html[0].querySelector("form");
                    this._processComplexRoll(form, baseVal, label);
                }
            }
        },
        default: "roll",
        render: (html) => {
            // Логика UI для Custom полей
            const toggleCustom = (selectId, inputId) => {
                html.on("change", selectId, (e) => {
                    const val = e.target.value;
                    const input = html.find(inputId);
                    if (val === "custom") input.show(); else input.hide();
                });
            };
            toggleCustom("#dc-preset", "#dc-custom-container");
            toggleCustom("#ku-preset", "#ku-custom-container");
        }
    }).render(true);
  }

  async _processComplexRoll(form, baseVal, label) {
    // 1. Параметры сложности
    let dc = parseInt(form.dcPreset.value);
    if (form.dcPreset.value === "custom") dc = parseInt(form.dcCustom.value) || 0;

    let ku = parseInt(form.kuPreset.value);
    if (form.kuPreset.value === "custom") ku = parseInt(form.kuCustom.value) || 1;

    // 2. Вторичный атрибут
    let secVal = 0;
    let secLabel = "";
    if (form.secondaryStat && form.secondaryStat.value !== "none") {
        const k = form.secondaryStat.value;
        secVal = this.system.subAttributes[k] || 0;
        secLabel = DUNGEON.subAttributes[k];
    }

    // 3. Знание (Третий слой)
    let knowVal = 0;
    let knowLabel = "";
    if (form.knowledgeStat && form.knowledgeStat.value !== "none") {
        const kId = form.knowledgeStat.value;
        const item = this.items.get(kId);
        if (item) {
            knowVal = Number(item.system.value) || 0;
            knowLabel = item.name;
        }
    }

    // 4. Модификаторы
    const modPool = parseInt(form.modPool.value) || 0;
    const modDC = parseInt(form.modDC.value) || 0;
    const modKU = parseInt(form.modKU.value) || 0;

    // --- РАСЧЕТ ПУЛА ---
    const totalStat = baseVal + secVal + knowVal;
    
    // Формула: (Сумма статов) / 13
    let diceCount = Math.floor(totalStat / 13);
    if (diceCount < 1) diceCount = 1; // Минимум 1 куб от статов
    
    diceCount += modPool;
    if (diceCount < 1) diceCount = 1; // Хард кап минимума

    const finalDC = dc + modDC;
    const finalKU = ku + modKU;

    let titleParts = [label];
    if (secLabel) titleParts.push(secLabel);
    if (knowLabel) titleParts.push(knowLabel);
    const titleFull = titleParts.join(" + ");

    // --- ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ БРОСКА ---
    await Dice.rollDungeonCheck(this, diceCount, finalDC, titleFull, {
        ku: finalKU,
        isAttack: false // Это проверка навыка
    });
  }

  /* -------------------------------------------- */
  /*  БОЕВАЯ СИСТЕМА (АТАКА)                      */
  /* -------------------------------------------- */

  async rollWeaponAttack(itemId) {
    const item = this.items.get(itemId);
    if (!item) return ui.notifications.warn("Оружие не найдено.");
    
    const sys = this.system;
    const weapon = item.system;
    
    // 1. ОПРЕДЕЛЕНИЕ АТРИБУТА СКАЛИРОВАНИЯ
    const scaleKey = weapon.scaling || "strength";
    
    // Получаем значение атрибута (ищем везде: в subAttributes, attributes)
    let attrValue = 0;
    if (sys.subAttributes[scaleKey] !== undefined) attrValue = sys.subAttributes[scaleKey];
    else if (sys.attributes[scaleKey] !== undefined) attrValue = sys.attributes[scaleKey]; // Например, spirit

    // Получаем владение
    const profKey = weapon.proficiency || "bladed";
    const profValue = sys.proficiencies[profKey] || 0;

    let attackPool = 1;

    // =================================================
    // ЛОГИКА РАСЧЕТА ПУЛА
    // =================================================
    
    // А) СТРЕЛКОВОЕ (Ranged)
    if (weapon.attackType === "ranged") {
        // Всегда Точность (Precision) или то, что выбрано в скалировании
        attackPool = Calc.getDicePool(attrValue);
    }
    
    // Б) МАГИЧЕСКОЕ / ОСОБОЕ (Если выбрано скалирование НЕ Сила и НЕ Ловкость)
    else if (!["strength", "agility"].includes(scaleKey)) {
        // Например, Дух или Когнитивность
        // Пул = Макс(Атрибут, Владение)
        attackPool = Calc.getDicePool(Math.max(attrValue, profValue));
    }
    
    // В) ФИЗИЧЕСКОЕ БЛИЖНЕЕ (Сила/Ловкость)
    else {
        const str = sys.subAttributes.strength || 0;
        const agi = sys.subAttributes.agility || 0;

        if (weapon.tags.light) {
            // Лёгкое: MAX(Сила, Ловкость, Владение)
            attackPool = Calc.getDicePool(Math.max(str, agi, profValue));
        } else {
            // Обычное/Тяжелое: MAX(Сила, Владение)
            // (Даже если в скалировании стоит Ловкость по ошибке, для тяжелого берем Силу, 
            // если только это не специфичный хоумбрю)
            const stat = (scaleKey === "agility") ? agi : str;
            attackPool = Calc.getDicePool(Math.max(stat, profValue));
        }
    }
    
    // ==========================================
    // 2. ЦЕЛИ И ДИАЛОГ
    // ==========================================
    const targets = Array.from(game.user.targets);
    if (targets.length === 0) return ui.notifications.warn("Выберите цель.");

    const targetToken = targets[0];
    const targetActor = targetToken.actor;

    // Проверка прав на цель
    if (!targetActor.testUserPermission(game.user, "OBSERVER")) {
      game.socket.emit("system.dungeon-stone", {
        type: "proxyAttack",
        attackerId: this.id,
        targetId: targetActor.id,
        itemId: itemId,
        userId: game.user.id
      });
      return ui.notifications.info("Атака отправлена на обработку GM...");
    }
    
    // Расчет порога крита
    const flexibility = sys.subAttributes.flexibility || 0;
    const critThreshold = Calc.getCritThreshold(flexibility);
    
    new Dialog({
      title: `Атака: ${item.name}`,
      content: await foundry.applications.handlebars.renderTemplate("systems/dungeon-stone/templates/dialogs/attack-dialog.hbs", {
        attacker: this,
        target: targetActor,
        weapon: weapon,
        itemImg: item.img,
        attackPool: attackPool,
        isThrowable: weapon.tags.throwable,
        isMelee: weapon.attackType === "melee"
      }),
      buttons: {
        roll: {
          label: "Бросить",
          callback: html => this._executeAttack(html, {
            item, targetToken, targetActor, attackPool, critThreshold
          })
        }
      },
      default: "roll",
      render: (html) => {
        // Динамическое изменение пула в диалоге (если метаем)
        html.find('[name="attackMode"]').change(ev => {
          if (ev.currentTarget.value === "thrown") {
            const throwPool = Calc.getDicePool(this.system.proficiencies.throwing || 0);
            html.find('.pool-display').text(`${throwPool} кубов`);
          } else {
            html.find('.pool-display').text(`${attackPool} кубов`);
          }
        });
        
        // UI переключатель защиты
        html.find('[name="defenseType"]').change(ev => {
          const type = ev.currentTarget.value;
          html.find('.passive-info').toggle(type === "passive");
          html.find('.active-info').toggle(type === "active");
          html.find('.fullcover-info').toggle(type === "fullcover");
        });
      }
    }).render(true);
  }

  async rollWeaponDamage(itemId, successes = 1) {
    const item = this.items.get(itemId);
    if (!item) return;
    const weapon = item.system;
    
    // 1. ОПРЕДЕЛЕНИЕ БОНУСА АТРИБУТА
    let attributeBonus = 0;
    const scaleKey = weapon.scaling || "strength";
    
    // Получаем значения статов
    const str = this.system.subAttributes.strength || 0;
    const agi = this.system.subAttributes.agility || 0;
    
    // ЛОГИКА БОНУСА
    
    // А) СТРЕЛКОВОЕ
    if (weapon.attackType === "ranged") {
        attributeBonus = 0; // Нет бонуса от статов (урон от пули/стрелы)
    }
    
    // Б) МАГИЧЕСКОЕ / ОСОБОЕ (Дух, Интеллект и т.д.)
    else if (!["strength", "agility"].includes(scaleKey)) {
        let attrValue = 0;
        if (this.system.subAttributes[scaleKey] !== undefined) attrValue = this.system.subAttributes[scaleKey];
        else if (this.system.attributes[scaleKey] !== undefined) attrValue = this.system.attributes[scaleKey];
        
        attributeBonus = Math.floor(attrValue / 13);
    }
    
    // В) ФИЗИЧЕСКОЕ БЛИЖНЕЕ / МЕТАТЕЛЬНОЕ
    else {
        if (weapon.tags.light) {
            // Лёгкое: MAX(Сила, Ловкость)
            attributeBonus = Math.floor(Math.max(str, agi) / 13);
        } else {
            // Обычное: Только Сила
            attributeBonus = Math.floor(str / 13);
        }
    }

    // 2. СВЕРХУСПЕХИ
    const extraDiceCount = Math.max(0, successes - 1);
    
    // 3. ВЫБОР ФОРМУЛЫ (1h vs 2h)
    let baseDamage = weapon.damage || "1d4";
    // Если хват 2h или Универсальное в двух руках - берем damageVersatile
    if (weapon.grip === "2h" && weapon.tags.versatile && weapon.damageVersatile) {
        baseDamage = weapon.damageVersatile;
    } 
    // Если просто двуручное (у него damageVersatile нет, используем damage)
    
    let damageFormula = baseDamage;
    if (attributeBonus > 0) damageFormula += ` + ${attributeBonus}`;
    if (extraDiceCount > 0) damageFormula += ` + ${extraDiceCount}d4`;
    
    // 4. ТИПЫ УРОНА
    const availableTypes = [];
    if (weapon.availableTypes) {
        for (const [key, enabled] of Object.entries(weapon.availableTypes)) {
            if (enabled) availableTypes.push({ key, label: DUNGEON.damageTypes[key] || key });
        }
    }
    // Если ничего не выбрано, берем дефолтный
    if (availableTypes.length === 0) {
        availableTypes.push({ 
            key: weapon.damageType || "slashing", 
            label: DUNGEON.damageTypes[weapon.damageType] || weapon.damageType 
        });
    }

    const executeRoll = async (typeKey, typeLabel) => {
      const roll = new Roll(damageFormula);
      await roll.evaluate();
      
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor: this}),
        content: `
         <div class="dungeon-chat-card damage-card">
           <header class="damage-header">
             <img src="${item.img}" width="30" height="30"/>
             <h3>Урон: ${item.name}</h3>
           </header>
           <div class="damage-total" style="font-size:28px;color:#f44;font-weight:bold; text-align:center;">${roll.total}</div>
           <div class="damage-type" style="text-align:center;color:#aaa;font-size:12px;">${typeLabel}</div>
           <div class="damage-buttons" style="margin-top:5px;">
             <button data-action="apply-damage" data-val="${roll.total}" data-type="${typeKey}">🩸 Применить к цели</button>
           </div>
           <div class="gm-only" style="font-size:10px; color:#555; margin-top:5px;">
             Формула: ${damageFormula}<br>
             Бонус аттр: +${attributeBonus}
           </div>
         </div>`,
        rolls: [roll],
        sound: CONFIG.sounds.dice
      });
    };

    if (availableTypes.length === 1) return executeRoll(availableTypes[0].key, availableTypes[0].label);

    const options = availableTypes.map(t => `<option value="${t.key}">${t.label}</option>`).join("");
    new Dialog({
        title: "Тип урона",
        content: `<form><div class="form-group"><label>Выберите тип:</label><select name="dtype" style="width:100%">${options}</select></div></form>`,
        buttons: {
            roll: { label: "Нанести", callback: html => {
                const k = html.find('[name="dtype"]').val();
                executeRoll(k, DUNGEON.damageTypes[k]);
            }}
        }
    }).render(true);
  }

  async _executeAttack(html, {item, targetToken, targetActor, attackPool, critThreshold}) {
    const weapon = item.system;
    const sys = this.system;
    const targetSys = targetActor.system;
    
    const attackMode = html.find('[name="attackMode"]').val() || weapon.attackType;
    const defenseType = html.find('[name="defenseType"]').val(); 
    const manualDCMod = Number(html.find('[name="dcModifier"]').val()) || 0;
    const manualKUMod = Number(html.find('[name="kuModifier"]').val()) || 0;
    
    if (attackMode === "thrown" && weapon.tags.throwable) {
      attackPool = Calc.getDicePool(sys.proficiencies.throwing || 0);
    }
    
    // Расчёт КС (DC)
    let finalDC = 50;
    
    if (defenseType !== "active") {
      let agiAttacker = sys.subAttributes.agility || 0;
      let agiDefender = targetSys.subAttributes.agility || 0;
      
      if (targetSys.combat.conditions.stunned || targetSys.combat.conditions.paralyzed) {
        agiDefender = 0;
      }
      
      const baseDC = 50 + 40 * (agiDefender - agiAttacker) / (agiDefender + agiAttacker + 0.01);
      let dcMods = 0;
      
      const sizeData = DUNGEON.sizes[targetSys.subAttributes.size] || DUNGEON.sizes.medium;
      dcMods += sizeData.dcMod;
      
      if (targetSys.combat.conditions.cover === "partial") dcMods += 10;
      if (targetSys.combat.conditions.cover === "good") dcMods += 20;
      if (sys.combat.conditions.prone) dcMods += 10;
      if (sys.combat.conditions.blinded) dcMods += 25;
      if (targetSys.combat.conditions.invisible) dcMods += 25;
      
      if (attackMode === "ranged" || attackMode === "thrown") {
        const gridDist = canvas.scene.grid.distance; // Например, 2 метра
        const distMeters = canvas.grid.measureDistance(this.token, targetToken);
        
        // 1. Максимальная дальность (Жесткий предел)
        const maxRangeCells = weapon.maxRange || 100;
        const maxMeters = maxRangeCells * gridDist;
        
        if (distMeters > maxMeters) {
            return ui.notifications.warn(`Цель слишком далеко! (Макс: ${maxMeters}м, До цели: ${Math.round(distMeters)}м)`);
        }

        // 2. Эффективный шаг дистанции (с учетом Зрения)
        const baseRangeCells = weapon.range || 1;
        // Логика: Каждые 10 очков Зрения добавляют 1 клетку к шагу дистанции
        // (Можешь поменять формулу под свой баланс)
        const vision = sys.subAttributes.vision || 0;
        const visionBonusCells = Math.floor(vision / 10); 
        
        const effectiveRangeCells = baseRangeCells + visionBonusCells;
        const effectiveRangeMeters = effectiveRangeCells * gridDist;
        
        // 3. Расчет штрафа
        if (distMeters > effectiveRangeMeters) {
            const steps = Math.floor(distMeters / effectiveRangeMeters);
            dcMods += steps * 10; // +10 КС за каждый шаг превышения
        }
      }
      
      dcMods += manualDCMod + (targetSys.combat.dcModifier || 0); 
      finalDC = Math.floor(Math.max(0, Math.min(100, baseDC + dcMods)));
    }
    
    // Расчёт КУ (Target KU)
    let targetKU = Calc.calculateBoneKU(targetSys.subAttributes.boneDensity || 0);
    const armor = targetActor.items.find(i => i.type === "armor" && i.system.equipStatus === "equipped" && !i.system.isShield);
    if (armor) targetKU += armor.system.armorValue || 0;
    
    if (targetSys.combat.shieldRaised) targetKU += targetSys.combat.shieldBonus || 0;
    
    let kuMods = 0;
    const isFlanked = targetSys.combat.conditions.flanked || Calc.isFlanked(targetActor, this);
    if (isFlanked) kuMods -= 2;
    if (targetSys.combat.conditions.prone) kuMods -= 2;
    if (targetSys.combat.conditions.stunned) kuMods -= 2;
    if (targetSys.combat.conditions.grappled) kuMods -= 1;
    if (targetSys.combat.conditions.paralyzed) kuMods -= 2;
    
    kuMods += manualKUMod + (targetSys.combat.kuModifier || 0);
    kuMods -= (targetSys.combat.defensePenalty || 0);
    
    targetKU = Math.max(0, targetKU + kuMods);
    
    // Маршрутизация
    if (defenseType === "fullcover") return this._rollFullCover(item, targetActor, attackPool, critThreshold, targetKU);
    if (defenseType === "active") return this._rollOpposed(item, targetActor, attackPool, critThreshold);
    return this._rollPassive(item, targetActor, attackPool, critThreshold, finalDC, targetKU);
  }

  /**
   * Пассивная защита (Атака против статического КС)
   */
  async _rollPassive(item, targetActor, attackPool, critThreshold, finalDC, targetKU) {
    const roll = new Roll(`${attackPool}d100`);
    await roll.evaluate();
    
    let successes = 0;
    let critSuccesses = 0;
    let critFails = 0;
    
    roll.terms[0].results.forEach(r => {
      if (r.result >= critThreshold) { successes += 3; critSuccesses++; }
      else if (r.result <= 5) { successes -= 1; critFails++; }
      else if (r.result >= finalDC) successes += 1;
    });
    
    const hit = successes >= targetKU;
    
    // Попадание по укрытию (если промах, но КУ хватило бы на укрытие)
    // Условие: не попал в цель, но успехов > 0, и успехи >= КУ укрытия, и укрытие есть
    const coverKU = targetActor.system.combat.coverKU || 0;
    let coverHit = false;
    if (!hit && successes > 0 && successes >= coverKU && targetActor.system.combat.conditions.cover === "full") {
      coverHit = true;
    }

    // --- ЛОГИКА ИСТОЩЕНИЯ ---
    // Наносим истощение цели (снижаем КУ) даже при промахе, если были успехи
    if (successes > 0 && !coverHit) { // Если попали в укрытие, истощение не наносится по цели
      const depletion = Math.max(1, Math.ceil(successes / 3));
      await targetActor.update({
        "system.combat.defensePenalty": (targetActor.system.combat.defensePenalty || 0) + depletion
      });
    }

    // Генерация HTML
    let outcomeTitle = "ПРОМАХ";
    let outcomeColor = "#ff4444"; // Красный

    if (hit) {
        outcomeTitle = "ПОПАДАНИЕ";
        outcomeColor = "#44ff44"; // Зеленый
    } else if (coverHit) {
        outcomeTitle = "УКРЫТИЕ ПОВРЕЖДЕНО";
        outcomeColor = "#ffaa00"; // Оранжевый
    }

    // Криты
    let critStatus = "";
    if (critSuccesses > 0) critStatus += `<div style="color:#ffd700; font-size:11px;">КРИТИЧЕСКИЙ УСПЕХ (${critSuccesses})</div>`;
    if (critFails > 0) critStatus += `<div style="color:#ff6666; font-size:11px;">КРИТИЧЕСКАЯ НЕУДАЧА (${critFails})</div>`;

    // Кнопки
    let buttons = "";
    if (hit) {
        buttons = `<div class="card-buttons" style="margin-top:8px;">
            <button data-action="roll-damage" data-item-id="${item.id}" data-bonus="${successes}">🩸 Нанести Урон (${successes} КУ)</button>
        </div>`;
    } else if (coverHit) {
        buttons = `<div class="card-buttons" style="margin-top:8px;">
            <button data-action="roll-damage" data-item-id="${item.id}" data-bonus="${successes}" data-target="cover">🧱 Урон по Укрытию</button>
        </div>`;
    }

    const content = `
      <div class="dungeon-chat-card" style="border-left: 4px solid ${outcomeColor};">
        <header class="card-header" style="background:#1a1a1a; padding:5px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:5px;">
                <img src="${item.img}" width="24" height="24" style="border:1px solid #444; border-radius:4px;"/>
                <h3 style="margin:0; font-size:14px; color:#ddd;">Атака: ${item.name}</h3>
            </div>
        </header>
        
        <div class="card-body" style="padding:10px; text-align:center; background:#222;">
            <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">${this.name} <span style="color:#666">vs</span> ${targetActor.name}</div>
            
            <div style="font-size: 20px; font-weight: bold; color: ${outcomeColor}; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">
                ${outcomeTitle}
            </div>
            ${critStatus}
            ${buttons}

            <div class="gm-only" style="margin-top:10px; padding-top:8px; border-top:1px dashed #444; text-align:left; font-size:11px; color:#888;">
                <div style="display:flex; justify-content:space-between;">
                    <span>КС: <b>${finalDC}</b></span>
                    <span>КУ Цели: <b>${targetKU}</b></span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span>Пул: <b>${attackPool}</b>к</span>
                    <span>Успехов: <b style="color:${successes >= targetKU ? '#4f4' : (successes > 0 ? '#fa0' : '#f44')}">${successes}</b></span>
                </div>
                <div style="margin-top:4px; word-break:break-all;">
                    [${roll.terms[0].results.map(r => {
                        let c = "#aaa";
                        if (r.result >= critThreshold) c = "#ffd700";
                        else if (r.result <= 5) c = "#f44";
                        else if (r.result >= finalDC) c = "#fff";
                        return `<span style="color:${c}">${r.result}</span>`;
                    }).join(", ")}]
                </div>
            </div>
        </div>
      </div>
    `;
    
    if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({actor: this}), content, rolls: [roll], sound: CONFIG.sounds.dice });
  }

  /**
   * Активная защита (Встречный бросок)
   */
  async _rollOpposed(item, targetActor, attackPool, critThreshold) {
    const targetSys = targetActor.system;
    
    // АТАКА
    const atkRoll = new Roll(`${attackPool}d100`);
    await atkRoll.evaluate();
    let atkSuccesses = 0;
    let atkCrits = 0;
    atkRoll.terms[0].results.forEach(r => {
      if (r.result >= critThreshold) { atkSuccesses += 3; atkCrits++; }
      else if (r.result <= 5) { atkSuccesses -= 1; }
      else if (r.result >= 50) { atkSuccesses += 1; }
    });

    // ЗАЩИТА (Ловкость)
    const defPool = Calc.getDicePool(targetSys.subAttributes.agility || 0);
    const defCritThreshold = Calc.getCritThreshold(targetSys.subAttributes.flexibility || 0);
    
    const defRoll = new Roll(`${defPool}d100`);
    await defRoll.evaluate();
    let defSuccesses = 0;
    let defCrits = 0;
    defRoll.terms[0].results.forEach(r => {
      if (r.result >= defCritThreshold) { defSuccesses += 3; defCrits++; }
      else if (r.result <= 5) { defSuccesses -= 1; }
      else if (r.result >= 50) { defSuccesses += 1; }
    });

    const hit = atkSuccesses > defSuccesses;
    const netSuccesses = Math.max(0, atkSuccesses - defSuccesses);
    
    // HTML
    let outcomeTitle = hit ? "ПОПАДАНИЕ" : "УКЛОНЕНИЕ";
    if (!hit && atkSuccesses === defSuccesses) outcomeTitle = "НИЧЬЯ (УКЛОНЕНИЕ)";
    let outcomeColor = hit ? "#44ff44" : "#ff4444";

    let critStatus = "";
    if (atkCrits > 0) critStatus += `<div style="color:#ffd700; font-size:11px;">АТАКА: КРИТ (${atkCrits})</div>`;
    if (defCrits > 0) critStatus += `<div style="color:#aaddff; font-size:11px;">ЗАЩИТА: КРИТ (${defCrits})</div>`;

    let buttons = "";
    if (hit) {
        buttons = `<div class="card-buttons" style="margin-top:8px;">
            <button data-action="roll-damage" data-item-id="${item.id}" data-bonus="${netSuccesses}">🩸 Нанести Урон (${netSuccesses} КУ)</button>
        </div>`;
    }

    const content = `
      <div class="dungeon-chat-card" style="border-left: 4px solid ${outcomeColor};">
        <header class="card-header" style="background:#1a1a1a; padding:5px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:5px;">
                <img src="${item.img}" width="24" height="24" style="border:1px solid #444; border-radius:4px;"/>
                <h3 style="margin:0; font-size:14px; color:#ddd;">Встречная атака: ${item.name}</h3>
            </div>
        </header>
        
        <div class="card-body" style="padding:10px; text-align:center; background:#222;">
            <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">${this.name} <span style="color:#666">vs</span> ${targetActor.name}</div>
            
            <div style="font-size: 20px; font-weight: bold; color: ${outcomeColor}; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">
                ${outcomeTitle}
            </div>
            ${critStatus}
            ${buttons}

            <div class="gm-only" style="margin-top:10px; padding-top:8px; border-top:1px dashed #444; text-align:left; font-size:11px; color:#888;">
                <div style="display:flex; justify-content:space-between;">
                    <span>Атака (Усп): <b style="color:#fff">${atkSuccesses}</b></span>
                    <span>Защита (Усп): <b style="color:#fff">${defSuccesses}</b></span>
                </div>
                <div style="margin-top:4px;">
                    <div>Атк [${atkRoll.terms[0].results.map(r=>r.result).join(",")}]</div>
                    <div>Защ [${defRoll.terms[0].results.map(r=>r.result).join(",")}]</div>
                </div>
            </div>
        </div>
      </div>
    `;

    if (game.dice3d) {
        await game.dice3d.showForRoll(atkRoll, game.user, true);
        await game.dice3d.showForRoll(defRoll, game.user, true);
    }
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({actor: this}), content, rolls: [atkRoll, defRoll], sound: CONFIG.sounds.dice });
  }

  /**
   * Атака сквозь Полное Укрытие
   */
  async _rollFullCover(item, targetActor, attackPool, critThreshold, targetKU) {
    const coverKU = targetActor.system.combat.coverKU || 0;
    
    // БРОСОК
    const roll = new Roll(`${attackPool}d100`);
    await roll.evaluate();
    
    let successes = 0;
    let crits = 0;
    roll.terms[0].results.forEach(r => {
      if (r.result >= critThreshold) { successes += 3; crits++; }
      else if (r.result <= 5) successes -= 1;
      else if (r.result >= 50) successes += 1;
    });

    // Фаза 1: Пробитие укрытия
    const brokeCover = successes >= coverKU;
    const remainingSuccesses = successes - coverKU;
    
    // Фаза 2: Попадание по цели (если укрытие пробито)
    let hitTarget = false;
    let outcomeTitle = "УКРЫТИЕ ВЫДЕРЖАЛО";
    let outcomeColor = "#ff4444";

    if (brokeCover) {
        // Укрытие пробито, проверяем попал ли остаток по цели
        // Для упрощения считаем, что остаток успехов идет в цель
        if (remainingSuccesses >= targetKU) {
            hitTarget = true;
            outcomeTitle = "ПРОБИТИЕ И ПОПАДАНИЕ";
            outcomeColor = "#44ff44";
        } else {
            outcomeTitle = "УКРЫТИЕ ПРОБИТО (ПРОМАХ)";
            outcomeColor = "#ffaa00";
        }
    }

    let buttons = "";
    // Урон по укрытию (всегда, если есть успехи)
    if (successes > 0) {
        buttons += `<div class="card-buttons" style="margin-top:8px;">
            <button data-action="roll-damage" data-item-id="${item.id}" data-bonus="${Math.min(successes, coverKU)}" data-target="cover">🧱 Урон Укрытию (${Math.min(successes, coverKU)})</button>
        </div>`;
    }
    // Урон по цели (если пробито и попал)
    if (hitTarget) {
        buttons += `<div class="card-buttons" style="margin-top:4px;">
            <button data-action="roll-damage" data-item-id="${item.id}" data-bonus="${remainingSuccesses}">🩸 Урон Цели (${remainingSuccesses})</button>
        </div>`;
    }

    const content = `
      <div class="dungeon-chat-card" style="border-left: 4px solid ${outcomeColor};">
        <header class="card-header" style="background:#1a1a1a; padding:5px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:5px;">
                <img src="${item.img}" width="24" height="24" style="border:1px solid #444; border-radius:4px;"/>
                <h3 style="margin:0; font-size:14px; color:#ddd;">Сквозь укрытие: ${item.name}</h3>
            </div>
        </header>
        
        <div class="card-body" style="padding:10px; text-align:center; background:#222;">
            <div style="font-size: 20px; font-weight: bold; color: ${outcomeColor}; margin-bottom: 5px; text-transform: uppercase;">
                ${outcomeTitle}
            </div>
            ${crits > 0 ? `<div style="color:#ffd700; font-size:11px;">КРИТ (${crits})</div>` : ""}
            ${buttons}

            <div class="gm-only" style="margin-top:10px; padding-top:8px; border-top:1px dashed #444; text-align:left; font-size:11px; color:#888;">
                <div>Всего успехов: ${successes}</div>
                <div>КУ Укрытия: ${coverKU}</div>
                <div>Остаток в цель: ${remainingSuccesses} (КУ Цели: ${targetKU})</div>
            </div>
        </div>
      </div>
    `;

    if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({actor: this}), content, rolls: [roll], sound: CONFIG.sounds.dice });
  }

  async _preCreateEmbeddedDocuments(embeddedName, resultData, options, userId) {
    await super._preCreateEmbeddedDocuments(embeddedName, resultData, options, userId);
    if (embeddedName === "Item") {
        for (const data of resultData) {
            if (['role', 'lineage'].includes(data.type)) {
                if (this.items.find(i => i.type === data.type)) {
                    ui.notifications.warn(`Уже есть ${data.type}.`);
                    return false;
                }
            }
        }
    }
  }

  /**
 * Синхронизировать Active Effect штрафа ловкости от брони
 * Создает/обновляет/удаляет эффект на ACTOR, основанный на Item armorPenalty
 */
async _syncArmorPenaltyEffect(armorItem) {
    if (!armorItem || armorItem.type !== "armor") return;
  
    const penalty = Number(armorItem.system.armorPenalty) || 0;
  
    // Флаг-идентификатор, чтобы отличать наш эффект от других
    const effectKey = `dungeon-stone.armorPenalty.${armorItem.id}`;
  
    // Ищем существующий эффект на актёре
    const existing = this.effects.find(e => e.getFlag("dungeon-stone", "key") === effectKey);
  
    // Если броня не экипирована или штраф = 0 -> эффект не нужен
    const shouldHave = armorItem.system.equipStatus === "equipped" && penalty !== 0;
  
    if (!shouldHave) {
      if (existing) await existing.delete();
      return;
    }
  
    // Данные эффекта
    const effectData = {
      name: `Штраф брони: ${armorItem.name}`,
      icon: armorItem.img,
      origin: armorItem.uuid,
      disabled: false,
      flags: { "dungeon-stone": { key: effectKey, sourceItemId: armorItem.id } },
      changes: [
        {
          key: "system.subAttributes.agility",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: -Math.abs(penalty), // всегда отрицательно
          priority: 20
        }
      ]
    };
  
    if (existing) {
      // Обновляем, если изменился штраф/иконка/имя
      await existing.update(effectData);
    } else {
      await this.createEmbeddedDocuments("ActiveEffect", [effectData]);
    }
  }
  
  /**
   * После обновлений экипировки броней прогнать синхронизацию по всем armor items
   * (на случай массовых обновлений updateEmbeddedDocuments)
   */
  async _syncAllArmorPenaltyEffects() {
    for (const item of this.items) {
      if (item.type !== "armor") continue;
      await this._syncArmorPenaltyEffect(item);
    }
  }

  /** @override */
  async _onDeleteEmbeddedDocuments(embeddedName, documents, result, options, userId) {
    await super._onDeleteEmbeddedDocuments(embeddedName, documents, result, options, userId);
  
    if (embeddedName === "Item") {
      // Удаляем эффекты штрафа, связанные с удаленными предметами
      const effectIdsToDelete = [];
      for (const doc of documents) {
        if (doc.type === "armor") {
          const key = `dungeon-stone.armorPenalty.${doc.id}`;
          const effect = this.effects.find(e => e.getFlag("dungeon-stone", "key") === key);
          if (effect) effectIdsToDelete.push(effect.id);
        }
      }
      
      if (effectIdsToDelete.length > 0) {
        await this.deleteEmbeddedDocuments("ActiveEffect", effectIdsToDelete);
      }
    }
  }

  /**
   * Главный метод каста
   */
  async rollSpell(itemId) {
      const item = this.items.get(itemId);
      if (!item) return;
      const sys = item.system;

      // 1. БЕЗ БРОСКА (Утилиты, Баффы)
      if (sys.rollType === "none") {
          ChatMessage.create({
              speaker: ChatMessage.getSpeaker({actor: this}),
              content: `
                <div class="dungeon-chat-card">
                    <header style="background:#1a1a1a; padding:5px; border-bottom:2px solid #d4af37;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${item.img}" width="32" height="32" style="border:1px solid #555;">
                            <h3 style="margin:0; color:#d4af37;">${item.name}</h3>
                        </div>
                    </header>
                    <div class="card-body" style="padding:10px; background:#222; color:#ccc; font-size:12px;">
                        ${sys.description}
                        ${sys.damage ? `<div style="margin-top:10px; border-top:1px dashed #444; padding-top:5px;">Урон/Эффект: <b>${sys.damage}</b></div>` : ""}
                    </div>
                </div>`,
              type: CONST.CHAT_MESSAGE_STYLES.OTHER
          });
          return;
      }

      // 2. СПАСБРОСОК
      if (sys.rollType === "save") {
          return this._rollSpellSave(item);
      }

      // 3. АТАКА
      if (sys.rollType === "attack") {
          return this._rollSpellAttack(item);
      }
  }

  /* ================================================= */
  /*  ЛОГИКА СПАСБРОСКА (SAVE)                         */
  /* ================================================= */
  async _rollSpellSave(item) {
      const sys = item.system;
      
      // Параметры для диалога
      const dialogData = {
          item: item,
          saveAttr: sys.saveAttribute,
          saveDC: sys.saveDC > 0 ? sys.saveDC : Calc.calculateMagicStats(this.system.subAttributes.cognition||0, this.system.subAttributes.manaSense||0, (this.isDivine ? this.system.subAttributes.divinePowerStat : this.system.subAttributes.soulPower)||0).dc,
          saveKU: sys.saveKU || 1,
          damage: sys.damage,
          damageType: sys.damageType,
          subAttributes: DUNGEON.subAttributes,
          damageTypes: DUNGEON.damageTypes
      };

      const content = await renderTemplate("systems/dungeon-stone/templates/dialogs/spell-save-dialog.hbs", dialogData);

      new Dialog({
          title: `Каст: ${item.name}`,
          content: content,
          buttons: {
              cast: {
                  label: "Каст",
                  callback: html => this._executeSpellSave(html, item)
              }
          },
          default: "cast"
      }).render(true);
  }

  async _executeSpellSave(html, item) {
      const form = html[0].querySelector("form");
      
      // Читаем данные из формы
      const dc = parseInt(form.dc.value) + parseInt(form.modDC.value);
      const ku = parseInt(form.ku.value) + parseInt(form.modKU.value);
      const damageFormula = form.damage.value;
      const damageType = form.damageType.value;
      const canAvoid = form.canAvoid.checked; // "Есть возможность избежать"
      
      // Расчет урона сразу
      let rolledDamage = 0;
      let damageMsg = "";
      if (damageFormula) {
          const roll = new Roll(damageFormula);
          await roll.evaluate();
          rolledDamage = roll.total;
          damageMsg = `Base Damage: ${rolledDamage}`;
      }

      // Цели
      const targets = Array.from(game.user.targets);
      let resultsHTML = "";

      for (let t of targets) {
          const actor = t.actor;
          if (!actor) continue;

          // Бросок Спаса Цели (Упрощенно: берем стату цели + можно добавить бонус в будущем)
          // В идеале тут нужен диалог для цели, но сделаем авто-бросок
          const saveKey = form.saveAttr.value || item.system.saveAttribute;
          const statVal = actor.system.subAttributes[saveKey] || actor.system.attributes[saveKey] || 0;
          
          // Пул = стат / 13
          const pool = Math.max(1, Math.floor(statVal / 13));
          
          const saveRoll = new Roll(`${pool}d100`);
          await saveRoll.evaluate();
          
          let successes = 0;
          saveRoll.terms[0].results.forEach(r => {
              if (r.result >= 95) successes += 3;
              else if (r.result <= 5) successes -= 1;
              else if (r.result >= dc) successes += 1;
          });

          // ЛОГИКА РЕЗУЛЬТАТА (ТВОЕ ТЗ)
          let finalDamage = rolledDamage;
          let outcome = "ПРОВАЛ";
          let color = "#ff4444"; // Красный

          // 1. Успех с запасом >= 3 И "Можно избежать" -> 0 урона
          if (canAvoid && successes >= (ku + 3)) {
              finalDamage = 0;
              outcome = "УКЛОНЕНИЕ (0 урона)";
              color = "#44ff44";
          }
          // 2. Равенство (Successes == KU) -> Половина
          else if (successes === ku) {
              finalDamage = Math.floor(rolledDamage / 2);
              outcome = "ЧАСТИЧНО (1/2 урона)";
              color = "#ffaa00";
          }
          // 3. Успех (Successes > KU) -> Обычно половина (или 0, если evasion)
          else if (successes > ku) {
              // Стандартное правило спаса: успех = половина урона
              finalDamage = Math.floor(rolledDamage / 2);
              outcome = "УСПЕХ (1/2 урона)";
              color = "#aaddff";
          }
          // 4. Провал (Successes < KU) -> Полный
          else {
              finalDamage = rolledDamage;
              outcome = "ПРОВАЛ (Полный)";
          }

          resultsHTML += `
            <div style="margin-bottom:5px; border-bottom:1px dashed #444; padding:2px; font-size:12px;">
                <div style="display:flex; justify-content:space-between;">
                    <span style="font-weight:bold;">${actor.name}</span>
                    <span style="color:${color}">${outcome}</span>
                </div>
                <div style="color:#888; font-size:10px;">
                    Успехов: ${successes}/${ku} | Урон: <b>${finalDamage}</b>
                </div>
                ${finalDamage > 0 ? `<button data-action="apply-damage" data-val="${finalDamage}" data-type="${damageType}" style="width:100%; font-size:10px; margin-top:2px;">Нанести ${finalDamage}</button>` : ""}
            </div>`;
      }

      ChatMessage.create({
          speaker: ChatMessage.getSpeaker({actor: this}),
          content: `
            <div class="dungeon-chat-card">
                <header style="background:#221133; border-bottom:2px solid #a0f;"><h3>✨ ${item.name}</h3></header>
                <div class="card-body" style="background:#1a1a1a;">
                    <div style="font-size:11px; color:#aaa; margin-bottom:10px;">
                        DC: ${dc} | KU: ${ku} | Save: ${DUNGEON.subAttributes[form.saveAttr.value]}
                    </div>
                    ${resultsHTML || "<div style='color:#666'>Нет целей</div>"}
                </div>
            </div>
          `
      });
  }

  /* ================================================= */
  /*  ЛОГИКА АТАКИ (ATTACK)                            */
  /* ================================================= */
  async _rollSpellAttack(item) {
      const sys = item.system;
      
      // Атрибуты для диалога
      const subAttrs = Object.entries(DUNGEON.subAttributes).map(([k, v]) => ({ key: k, label: v }));
      
      // Знания
      const knowledges = this.items.filter(i => i.type === "knowledge").map(i => ({ id: i.id, name: i.name, val: i.system.value }));

      // Базовый атрибут
      const attrKey = sys.attackAttribute;
      const attrVal = this.system.subAttributes[attrKey] || 0;

      const content = await renderTemplate("systems/dungeon-stone/templates/dialogs/spell-attack-dialog.hbs", {
          item,
          attrLabel: DUNGEON.subAttributes[attrKey],
          attrVal,
          subAttributes: subAttrs,
          knowledges,
          damage: sys.damage,
          damageType: sys.damageType
      });

      new Dialog({
          title: `Атака заклинанием: ${item.name}`,
          content,
          buttons: {
              attack: {
                  label: "Атаковать",
                  callback: html => this._executeSpellAttack(html, item, attrVal)
              }
          },
          default: "attack"
      }).render(true);
  }

  async _executeSpellAttack(html, item, baseVal) {
      const form = html[0].querySelector("form");
      const target = Array.from(game.user.targets)[0]?.actor;
      if (!target) return ui.notifications.warn("Выберите цель!");

      // 1. Сбор Пула (Атрибут + Доп + Знание + Мод)
      let secVal = 0;
      if (form.secondaryStat.value !== "none") secVal = this.system.subAttributes[form.secondaryStat.value] || 0;
      
      let knowVal = 0;
      if (form.knowledgeStat.value !== "none") {
          const k = this.items.get(form.knowledgeStat.value);
          if (k) knowVal = k.system.value;
      }

      const modPool = parseInt(form.modPool.value) || 0;
      const totalStat = baseVal + secVal + knowVal;
      let pool = Math.max(1, Math.floor(totalStat / 13)) + modPool;

      // 2. Параметры Защиты
      const defenseMode = form.defenseMode.value; // passive, active_opp, active_def, full_cover
      const modDC = parseInt(form.modDC.value) || 0;
      const modKU = parseInt(form.modKU.value) || 0;
      
      const isAOE = item.system.areaType !== "none";

      // 3. Бросок
      const roll = new Roll(`${pool}d100`);
      await roll.evaluate();
      
      let successes = 0;
      let crits = 0;
      
      // Расчет DC и KU Цели
      let targetDC = 50;
      let targetKU = Math.floor((target.system.subAttributes.boneDensity||0)/13);
      
      // Если Пассивная или Укрытие (база)
      if (defenseMode === "passive" || defenseMode === "full_cover") {
          const agiDef = target.system.subAttributes.agility || 0;
          // (Упрощенная формула DC)
          targetDC = 50 + Math.floor(agiDef / 2); 
      }
      
      if (defenseMode === "active_opp") {
          // Встречный бросок (Магия vs ???)
          // Для простоты возьмем пассивный DC + 20
          targetDC += 20; 
      }

      // Модификаторы
      targetDC += modDC;
      targetKU += modKU;

      // Считаем успехи
      roll.terms[0].results.forEach(r => {
          if (r.result >= 95) { successes += 3; crits++; }
          else if (r.result >= targetDC) successes += 1;
      });

      // --- ЛОГИКА ИСХОДА ---
      let hit = false;
      let damageMult = 0; // 0, 0.5, 1
      let outcomeText = "ПРОМАХ";
      let color = "#f44";

      // 1. ПОЛНОЕ УКРЫТИЕ
      if (defenseMode === "full_cover") {
          // Нужно пробить укрытие (допустим, КУ укрытия = КУ цели + 5)
          const coverKU = targetKU + 5; 
          if (successes >= coverKU) {
              hit = true;
              damageMult = 1;
              outcomeText = "УКРЫТИЕ ПРОБИТО!";
              color = "#4f4";
          } else {
              // Если АОЕ и разница <= 3 -> Половина
              if (isAOE && (coverKU - successes) <= 3) {
                  damageMult = 0.5;
                  outcomeText = "ЗАДЕЛО ВЗРЫВОМ (1/2)";
                  color = "#fa0";
              }
          }
      }
      // 2. АКТИВНАЯ ЗАЩИТА (Щит/Уворот)
      else if (defenseMode === "active_def") {
          // Равенство КУ = Промах (встала на безопасную клетку)
          if (successes > targetKU) {
              hit = true;
              damageMult = 1;
              outcomeText = "ПОПАДАНИЕ";
              color = "#4f4";
          } else {
              // Даже если АОЕ - при активной защите урона нет (по ТЗ)
              damageMult = 0;
              outcomeText = "ПОЛНЫЙ УВОРОТ";
          }
      }
      // 3. ПАССИВНАЯ / ВСТРЕЧНАЯ
      else {
          if (successes >= targetKU) {
              hit = true;
              damageMult = 1;
              outcomeText = "ПОПАДАНИЕ";
              color = "#4f4";
          } else {
              // Если АОЕ и разница <= 3 -> Половина
              if (isAOE && (targetKU - successes) <= 3) {
                  damageMult = 0.5;
                  outcomeText = "ЗАДЕЛО КРАЕМ (1/2)";
                  color = "#fa0";
              }
          }
      }

      // Урон
      let finalDamage = 0;
      if (damageMult > 0 && form.damage.value) {
          const dmgRoll = new Roll(form.damage.value);
          await dmgRoll.evaluate();
          finalDamage = Math.floor(dmgRoll.total * damageMult);
      }

      // Карточка
      const content = `
      <div class="dungeon-chat-card" style="border-left: 4px solid ${color};">
          <header style="background:#1a1a1a; padding:5px; display:flex; justify-content:space-between; align-items:center;">
              <h3 style="margin:0; font-size:14px; color:#ddd;">Атака: ${item.name}</h3>
              <img src="${item.img}" width="24" height="24"/>
          </header>
          
          <div class="card-body" style="padding:10px; text-align:center; background:#222;">
              <!-- НАРРАТИВ -->
              <div style="font-size: 20px; font-weight: bold; color: ${color}; margin-bottom: 5px; text-transform: uppercase;">
                  ${outcomeText}
              </div>
              
              <!-- КРИТЫ (Видят все) -->
              ${crits > 0 ? `<div style="color:#ffd700; font-size:11px;">⚡ КРИТ (${crits})</div>` : ""}
              
              <!-- КНОПКИ -->
              ${finalDamage > 0 ? `<div style="margin-top:10px;"><button data-action="apply-damage" data-val="${finalDamage}" data-type="${form.damageType.value}">🩸 Нанести ${finalDamage} Урона</button></div>` : ""}
              
              <!-- GM INFO -->
              <div class="gm-only" style="margin-top:10px; padding-top:8px; border-top:1px dashed #444; text-align:left; font-size:11px; color:#888;">
                  <div style="display:flex; justify-content:space-between;">
                      <span>КС: <b>${targetDC}</b></span>
                      <span>КУ Цели: <b>${targetKU}</b></span>
                  </div>
                  <div style="display:flex; justify-content:space-between;">
                      <span>Пул: <b>${pool}</b>к</span>
                      <span>Успехов: <b style="color:${successes >= targetKU ? '#4f4' : '#f44'}">${successes}</b></span>
                  </div>
                  <div style="margin-top:4px; word-break:break-all;">
                      Кубы: [${roll.terms[0].results.map(r => {
                          let c = "#aaa";
                          if (r.result >= 95) c = "#ffd700";
                          else if (r.result <= 5) c = "#f44";
                          else if (r.result >= targetDC) c = "#fff";
                          return `<span style="color:${c}">${r.result}</span>`;
                      }).join(", ")}]
                  </div>
                  <div style="margin-top:2px;">Mode: ${defenseMode} | AOE: ${isAOE}</div>
              </div>
          </div>
      </div>`;

      if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);
      ChatMessage.create({ speaker: ChatMessage.getSpeaker({actor: this}), content, rolls: [roll] });
  }
}
