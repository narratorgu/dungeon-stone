import { DUNGEON } from "../config.mjs";
import * as Calc from "../mechanics/calculator.mjs"; // Импортируем всю математику
import * as Dice from "../mechanics/dice.mjs";       // Импортируем логику кубов

export class DungeonActor extends Actor {

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    const system = this.system;

    // === УДАЛЕНО: Ручной подсчет эссенций ===
    // Foundry сама применила Active Effects к system.subAttributes перед этим этапом.
    // Теперь мы просто считаем производные статы на основе готовых цифр.

    // 1. Расчет счетчика эссенций (для ограничения)
    if (this.type === 'character') {
        system.essenceCount = this.items.filter(i => i.type === 'essence').length;
    }

    // 2. Используем калькулятор для основных ресурсов
    // К этому моменту sub.endurance и sub.boneDensity уже включают бонусы от эффектов
    const sub = system.subAttributes;
    const attr = system.attributes;
    
    // Если выносливость 0 (не задана), берем базу от телосложения
    const endurance = sub.endurance || (attr.physique * 2);
    const bone = sub.boneDensity || 0;
    
    // Вызовы чистых функций
    system.resources.hp.max = Calc.calculateMaxHP(endurance, bone);
    system.resources.mana.max = Calc.calculateMaxMana(attr.spirit);
    
    // === РАСЧЕТ СКОРОСТИ ===
    // (Calc.calculateSpeed должен быть экспортирован)
    system.attributes.speed = Calc.calculateSpeed(system.subAttributes.agility, system.attributes.speedBonus);
    
    // Резисты считаем от итоговых значений
    system.resistances.physBase = Calc.calculatePhysRes(bone, sub.physicalResistance || 0);
    system.resistances.magBase = Calc.calculateMagRes(sub.magicResistance || 0);
    
    system.resources.xp.max = Calc.getXPThreshold(system.resources.level);

    const agility = system.subAttributes.agility || 0;
    const size = system.details?.size || "medium"; 
    system.combat.defensePool.max = Calc.calculateKU(agility, size);
    
    // Если текущее значение не инициализировано, ставим макс (опционально)
    if (system.combat.defensePool.value === 0 && system.combat.defensePool.max > 0) {
       // system.combat.defensePool.value = system.combat.defensePool.max; // Лучше делать это через отдых
    }
  }

  async useItem(itemId) {
    const item = this.items.get(itemId);
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
        speaker: ChatMessage.getSpeaker({actor: this}), 
        content: `
          <div class="dungeon-chat-card">
              <h3>${item.name}</h3>
              ${content}
          </div>
        `, 
        style: CONST.CHAT_MESSAGE_STYLES.OTHER 
    });
  }

  async rollInitiative(options = {}) {
    // 1. Проверяем наличие активного боя
    if (!game.combat) {
        return ui.notifications.warn("Нет активного боевого столкновения (Combat Encounter).");
    }

    // 2. Ищем или создаем комбатанта (участника боя)
    let combatant = game.combat.combatants.find(c => c.actorId === this.id);
    
    if (!combatant) {
        if (options.createCombatants) {
            // Добавляем токен в бой, если его нет
            const tokens = this.getActiveTokens();
            if (tokens.length > 0) {
                await game.combat.createEmbeddedDocuments("Combatant", [{tokenId: tokens[0].id, actorId: this.id}]);
                combatant = game.combat.combatants.find(c => c.actorId === this.id);
            }
        }
    }

    if (!combatant) {
        return ui.notifications.warn("Этот персонаж не находится в Боевом Трекере.");
    }

    // ==========================================
    // 3. НАША ЛОГИКА БРОСКА
    // ==========================================
    
    console.log(`Dungeon & Stone | Force Rolling Initiative for ${this.name}`);

    // Импорты должны быть в начале файла! Если нет - используем this.system...
    const agility = this.system.subAttributes.agility || 0;
    
    // Пул: минимум 1 куб
    const pool = Math.max(1, Math.floor(agility / 13));
    
    // Бросок
    const roll = new Roll(`${pool}d100`);
    await roll.evaluate();
    
    // Подсчет успехов (DC 50)
    let successes = 0;
    const diceResults = roll.terms[0].results.map(r => r.result);
    
    diceResults.forEach(r => {
        if (r >= 95) successes += 3;
        else if (r <= 5) successes -= 1;
        else if (r >= 50) successes += 1;
    });
    
    // Тай-брейкер
    const tieBreaker = agility / 100;
    let total = successes + tieBreaker;
    if (total < 0) total = 0;

    // ==========================================
    // 4. ЗАПИСЬ РЕЗУЛЬТАТА И ВЫВОД
    // ==========================================

    // Обновляем инициативу в трекере НАПРЯМУЮ
    await game.combat.setInitiative(combatant.id, total);

    // Карточка в чат
    const content = `
      <div class="dungeon-chat-card">
          <h3>⚡ Инициатива</h3>
          <div style="font-size:11px; color:#aaa; display:flex; justify-content:space-between;">
              <span>${this.name}</span>
              <span>ЛВК: ${agility} (${pool}к)</span>
          </div>
          <div class="outcome" style="margin:5px 0;">${successes} Успехов</div>
          <div class="gm-only" style="font-size:10px; border-top:1px dashed #555;">
              Кубы: [${diceResults.join(", ")}]<br>
              Тай-брейкер: +${tieBreaker}
          </div>
          <div style="background:#222; color:#d4af37; text-align:center; font-weight:bold; padding:2px; margin-top:5px; border-radius:2px;">
              Итог: ${total}
          </div>
      </div>
    `;

    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor: this}),
        content: content,
        sound: CONFIG.sounds.dice
    });

    return this;
  }

  /* --- XP LOGIC --- */
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
      
      let max = Calc.getXPThreshold(level); // Используем калькулятор
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

  /* --- REGENERATION --- */
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
   * Применить урон к актеру с учетом резистов
   * @param {number} amount - Входящий урон
   * @param {string} type - Тип урона (slashing, fire...)
   */
    async applyDamage(amount, type = "pure") {
        const sub = this.system.subAttributes;
        const res = this.system.resistances;
        
        const magicTypes = ["fire", "cold", "lightning", "light", "dark", "psychic", "acid", "poison"];
        
        let baseResistPercent = 0;
        let statValue = 0;
        let statName = "";
        
        if (type === "pure") {
            baseResistPercent = 0;
            statName = "Чистый урон";
        } else if (magicTypes.includes(type)) {
            statValue = sub.magicResistance || 0;
            statName = "Маг. Сопр.";
            baseResistPercent = 15 * Math.log(1 + (statValue / 10));
        } else {
            // ФИЗИКА
            const bone = sub.boneDensity || 0;
            const phys = sub.physicalResistance || 0;
            statValue = bone + phys;
            statName = `Плотность(${bone}) + Физ.Сопр(${phys})`;
            baseResistPercent = 20 * Math.log(1 + (statValue / 10));
        }
        
        // Специфика
        const specificPercent = res[type] || 0;
  
        // Формула
        const p1 = Math.max(0, baseResistPercent / 100);
        const p2 = Math.max(0, specificPercent / 100);
        const resistMult = 1 - (1 - p1) * (1 - p2);
        const totalResistPercent = Math.round(resistMult * 100);
        
        const finalDamage = Math.floor(amount * (1 - resistMult));
        const reduced = amount - finalDamage;
        
        const currentHP = this.system.resources.hp.value;
        await this.update({"system.resources.hp.value": currentHP - finalDamage});
  
        ChatMessage.create({
            content: `
              <div class="dungeon-chat-card failure">
                  <h3>💔 ${this.name} (-${finalDamage})</h3>
                  <div style="font-size:12px;">Тип: ${type} | Входящий: ${amount}</div>
                  
                  <div class="gm-only">
                      <hr>
                      <div><b>База:</b> ${Math.round(baseResistPercent)}% (от ${statName}: ${statValue})</div>
                      <div><b>Спец. (${type}):</b> ${specificPercent}%</div>
                      <div><b>Итого:</b> ${totalResistPercent}% (Снижено на ${reduced})</div>
                  </div>
              </div>
            `
        });
    }
  
  async _calculateRegen(val, unit) {
      // Тут логику можно оставить внутри или тоже вынести, пока оставим тут для краткости
      const hpRegenStat = this.system.subAttributes.naturalRegeneration || 0;
      const manaRegenStat = this.system.subAttributes.spiritRecovery || 0;
      
      let minutes = (unit === 'sec') ? val / 60 : (unit === 'hour') ? val * 60 : val;

      if (hpRegenStat <= 0 && manaRegenStat <= 0) {
          ui.notifications.warn("Нет навыков регенерации.");
          return;
      }

      let hpHeal = Math.floor(minutes * (hpRegenStat / 10));
      if (hpRegenStat > 0 && hpHeal < 1 && minutes >= 1) hpHeal = 1;

      let manaHeal = Math.floor(minutes * (manaRegenStat / 10));
      if (manaRegenStat > 0 && manaHeal < 1 && minutes >= 1) manaHeal = 1;

      const updates = {};
      let msg = "";

      if (hpHeal > 0) {
          const cur = this.system.resources.hp.value;
          const max = this.system.resources.hp.max;
          if (cur < max) {
              const newVal = Math.min(max, cur + hpHeal);
              updates["system.resources.hp.value"] = newVal;
              msg += `<div>HP: +${newVal - cur}</div>`;
          }
      }
      if (manaHeal > 0) {
          const cur = this.system.resources.mana.value;
          const max = this.system.resources.mana.max;
          if (cur < max) {
              const newVal = Math.min(max, cur + manaHeal);
              updates["system.resources.mana.value"] = newVal;
              msg += `<div>Дух: +${newVal - cur}</div>`;
          }
      }

      if (Object.keys(updates).length > 0) {
          await this.update(updates);
          ChatMessage.create({
             speaker: ChatMessage.getSpeaker({ actor: this }),
             content: `<div class="dungeon-chat-card success"><h3>💖 Отдых (${val} ${unit})</h3>${msg}</div>`,
             style: CONST.CHAT_MESSAGE_STYLES.OTHER
         });
      }
  }

  /* --- ROLLS (Теперь используют mechanics/dice.mjs) --- */
  
  async rollAttribute(key, label) {
    let val = 0;
    if (this.system.subAttributes[key] !== undefined) val = this.system.subAttributes[key];
    else if (this.system.attributes[key] !== undefined) val = this.system.attributes[key];
    
    val = Number(val) || 0;
    const pool = Calc.getDicePool(val); // Используем калькулятор

    new Dialog({
      title: `Проверка: ${label}`,
      content: `<form><div class="form-group"><label>Сложность:</label><select name="dc"><option value="50">Обычный (50)</option><option value="75">Трудный (75)</option><option value="25">Легкий (25)</option></select></div></form>`,
      buttons: {
        roll: {
          label: "Бросить",
          callback: html => Dice.rollDungeonCheck(this, pool, Number(html.find('[name="dc"]').val()), label)
        }
      },
      default: "roll"
    }).render(true);
  }

    /* --- АТАКА --- */
    async rollWeaponAttack(itemId) {
        const item = this.items.get(itemId);
        if (!item) return;
  
        // --- 1. АТАКУЮЩИЙ ---
        const attackType = item.system.attackType || "melee";
        const scaling = item.system.scaling || "strength";
        
        let statVal = 0;
        if (scaling === "strength") statVal = this.system.subAttributes.strength;
        else if (scaling === "agility") statVal = this.system.subAttributes.agility;
        else if (scaling === "endurance") statVal = this.system.subAttributes.endurance;
        else if (scaling === "proficiency") statVal = 0;
        
        let profBonus = 0;
        if (attackType === "melee") {
            const profKey = item.system.proficiency || "bladed";
            profBonus = this.system.proficiencies[profKey] || 0;
        } else if (attackType === "ranged") {
            profBonus = this.system.subAttributes.accuracy;
        } else if (attackType === "thrown") {
            profBonus += this.system.subAttributes.throwing;
        }
  
        const totalStat = statVal + profBonus;
        const attackPool = Calc.getDicePool(totalStat);
  
        // --- 2. ЦЕЛЬ ---
        const targets = Array.from(game.user.targets);
        let targetActor = null;
        let targetDC = 50; // КС для пассивной защиты
        let targetKU = 0;
        let defenderPool = 0; // Пул для активной защиты
        let dcDetails = "Базовый 50";
  
        if (targets.length > 0) {
            targetActor = targets[0].actor;
            if (targetActor) {
                const targetSys = targetActor.system;
                
                // КС (Пассивная сложность)
                targetDC = Calc.calculateDC(targetSys, this.system.subAttributes.agility);
                
                // КУ (Пассивный порог)
                const maxKU = targetSys.combat?.defensePool?.max || 0;
                const penalty = targetSys.combat?.defensePenalty || 0;
                targetKU = Math.max(0, maxKU - penalty);
                
                // Пул Защитника (Активная защита = Ловкость / 13)
                // Используем формулу без модификатора размера для пула, или с ним? 
                // В ТЗ: КУ = Ловкость / 13. Обычно активный додж это чистая ловкость.
                // Но у нас есть пул кубов. Пусть будет Calc.getDicePool(Agility).
                defenderPool = Calc.getDicePool(targetSys.subAttributes.agility || 0);
  
                // Детали для ГМа
                const sizeKey = targetSys.details?.size || "medium";
                const sizeLabel = DUNGEON.sizes[sizeKey]?.label || "Средний";
                const armor = targetSys.combat?.armorBonus || 0;
                dcDetails = `Размер: ${sizeLabel}, Броня: ${armor}`;
            }
        }
  
        // --- 3. ДИАЛОГ ---
        new Dialog({
          title: `Атака: ${item.name}`,
          content: `
              <div style="margin-bottom:10px;">
                  <b>Атакующий:</b> ${this.name} (${attackPool} кубов)<br>
                  <b>Цель:</b> ${targetActor ? targetActor.name : "Нет цели"}
              </div>
              ${targetActor ? `
              <div class="form-group">
                  <label>Тип проверки</label>
                  <select name="checkType" id="attack-check-type">
                      <option value="passive">Против КУ (Пассивная)</option>
                      <option value="opposed">Уклонение (Встречная)</option>
                  </select>
              </div>
              <div id="passive-info" style="font-size:11px; color:#aaa; margin-bottom:5px;">
                  Цель защищается пассивно. Сложность (КС): <b>${targetDC}</b>. Порог КУ: <b>${targetKU}</b>.
              </div>
              <div id="opposed-info" style="font-size:11px; color:#aaa; margin-bottom:5px; display:none;">
                  Цель бросает Ловкость (<b>${defenderPool}</b> кубов). Побеждает тот, у кого больше успехов. КС бросков: 50.
              </div>
              ` : ""}
              <div class="form-group"><label>Модификатор КС</label><input type="number" name="modDC" value="0"/></div>
              
              <script>
                  // Маленький скрипт для переключения подсказок в диалоге
                  $("#attack-check-type").change(function() {
                      if (this.value === "passive") { $("#passive-info").show(); $("#opposed-info").hide(); }
                      else { $("#passive-info").hide(); $("#opposed-info").show(); }
                  });
              </script>
          `,
          buttons: {
              roll: {
                  label: "Бросить",
                  callback: async html => {
                      const checkType = html.find('[name="checkType"]').val();
                      const modDC = Number(html.find('[name="modDC"]').val());
                      
                      // Для встречной проверки обычно используется стандартный КС 50 для набора успехов
                      // Для пассивной используем рассчитанный КС
                      const attackDC = (checkType === "opposed") ? (50 + modDC) : (targetDC + modDC);
                      
                      // --- 4. БРОСОК АТАКИ ---
                      const atkRoll = new Roll(`${attackPool}d100`);
                      await atkRoll.evaluate();
  
                      let atkSuccesses = 0;
                      let atkCrit = false;
                      
                      atkRoll.terms[0].results.forEach(r => {
                          if (r.result >= 95) { atkSuccesses += 3; atkCrit = true; }
                          else if (r.result <= 5) atkSuccesses -= 1;
                          else if (r.result >= attackDC) atkSuccesses += 1;
                      });
  
                      // --- 5. ВСТРЕЧНЫЙ БРОСОК (ЕСЛИ НУЖЕН) ---
                      let defSuccesses = 0;
                      let defRoll = null;
                      
                      if (checkType === "opposed" && targetActor) {
                          // Бросаем за защитника (КС 50 стандарт)
                          defRoll = new Roll(`${defenderPool}d100`);
                          await defRoll.evaluate();
                          
                          defRoll.terms[0].results.forEach(r => {
                              if (r.result >= 95) defSuccesses += 3;
                              else if (r.result <= 5) defSuccesses -= 1;
                              else if (r.result >= 50) defSuccesses += 1;
                          });
                      }
  
                      // --- 6. ОПРЕДЕЛЕНИЕ РЕЗУЛЬТАТА ---
                      let outcome = "ПРОМАХ";
                      let outcomeColor = "red";
                      let hit = false;
                      let depletion = 0;
                      
                      if (checkType === "passive") {
                          // === ПАССИВНАЯ (Против КУ) ===
                          if (atkSuccesses > targetKU) {
                              hit = true;
                              outcome = "ПОПАДАНИЕ";
                              outcomeColor = "green";
                              if (targetActor) depletion = Math.floor(atkSuccesses / 3);
                          } else {
                              if (atkSuccesses > 0) {
                                  outcome = "ЗАБЛОКИРОВАНО (КУ)";
                                  outcomeColor = "orange";
                                  // Истощение работает даже при блоке
                                  if (targetActor) depletion = Math.floor(atkSuccesses / 3);
                              }
                          }
                      } else {
                          // === ВСТРЕЧНАЯ (Уклонение) ===
                          // Атака должна быть СТРОГО БОЛЬШЕ Защиты
                          if (atkSuccesses > defSuccesses) {
                              hit = true;
                              outcome = "ПОПАДАНИЕ (Уклонение провалено)";
                              outcomeColor = "green";
                              // При уклонении истощения нет (как вы просили)
                              depletion = 0; 
                          } else {
                              outcome = "УКЛОНЕНИЕ (Промах)";
                              outcomeColor = "orange";
                          }
                      }
                      
                      if (atkCrit) outcome += " ⚡CRIT!";
  
                      // Применение истощения (только пассивная)
                      if (depletion > 0 && targetActor) {
                          const currentPen = targetActor.system.combat?.defensePenalty || 0;
                          await targetActor.update({"system.combat.defensePenalty": currentPen + depletion});
                      }
  
                      // --- 7. КАРТОЧКА ЧАТА ---
                      // Собираем все роллы для 3D кубов
                      const rollsArray = [atkRoll];
                      if (defRoll) rollsArray.push(defRoll);
  
                      const content = `
                        <div class="dungeon-chat-card">
                          <header>
                              <img src="${item.img}" width="30" height="30" style="margin-right:5px">
                              <h3>${item.name}</h3>
                          </header>
                          
                          <div class="player-view" style="text-align:center; padding:10px; font-size:16px;">
                              ${this.name} атакует <b>${targetActor ? targetActor.name : "цель"}</b>!
                              <div style="margin-top:5px; font-weight:bold; color:${outcomeColor}; font-size:20px;">
                                  ${outcome}
                              </div>
                          </div>
  
                          ${hit ? `
                          <div style="text-align:center; padding-bottom:5px;">
                              <button data-action="roll-damage" data-item-id="${item.id}" data-bonus="${atkSuccesses}">🎲 Урон</button>
                          </div>` : ""}
  
                          <div class="gm-only">
                            <hr>
                            <div><b>Атака:</b> ${atkSuccesses} успехов (${attackPool}d100)</div>
                            
                            {{!-- ЯВНО ПОКАЗЫВАЕМ БРОСОК ЗАЩИТЫ --}}
                            ${checkType === "opposed" ? 
                                `<div><b>Уклонение (ЛВК):</b> ${defSuccesses} успехов (${defenderPool}d100)</div>` 
                                : ""}
                            
                            ${targetActor ? `
                                <div style="color:#faa; margin-top:5px; font-size:10px;">
                                    <b>Цель:</b> ${targetActor.name}<br>
                                    ${checkType === "passive" ? 
                                        `КУ: ${targetKU} (Истощение: -${depletion})<br>Расчет КС: ${dcDetails}` : 
                                        "Активное уклонение (Победа при равенстве)"}
                                </div>
                            ` : ""}
                            </div>
                        </div>
                      `;
  
                      ChatMessage.create({
                          speaker: ChatMessage.getSpeaker({actor: this}),
                          content: content,
                          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                          rolls: rollsArray, // Foundry покажет кубы обоих
                          sound: CONFIG.sounds.dice
                      });
                  }
              }
          }
        }).render(true);
    }
  
  /* --- УРОН --- */
  /**
   * Бросок урона оружия
   * @param {string} itemId - ID предмета
   * @param {number} successes - Количество успехов из броска атаки (по умолчанию 1)
   */
  async rollWeaponDamage(itemId, successes = 1) {
    const item = this.items.get(itemId);
    if (!item) return;
    
    // 1. Расчет бонуса силы (Stat / 13)
    // Берем силу с учетом всех баффов
    const strength = this.system.subAttributes.strength || 0;
    const strBonus = Math.floor(strength / 13);
    
    // 2. Расчет дополнительных кубов за успехи (Crit damage)
    // Каждый успех сверх 1 дает +1d4
    // Если успехов 1 -> 0d4. Если 3 -> 2d4.
    const extraDiceCount = Math.max(0, successes - 1);
    
    // 3. Сборка формулы
    // Пример: "1d8 + 2 + 2d4"
    let damageFormula = item.system.damage || "0";
    damageFormula += Math.floor((strength % 13) / 5)
    
    // Добавляем бонус силы, если он есть
    if (strBonus > 0) {
        damageFormula += ` + ${strBonus}`;
    }
    
    // Добавляем крит кубы
    if (extraDiceCount > 0) {
        damageFormula += ` + ${extraDiceCount}d4`;
    }

    // 4. Определение доступных типов урона
    const availableTypes = [];
    const typesMap = item.system.availableTypes || {};
    
    // Перебираем галочки в оружии
    for (const [key, enabled] of Object.entries(typesMap)) {
        if (enabled) {
            // Берем красивое название из конфига (Рубящий, Огонь...)
            availableTypes.push({ 
                key: key, 
                label: DUNGEON.damageTypes[key] 
            });
        }
    }
    
    // Фолбэк: если ничего не выбрано, берем тип по умолчанию или 'slashing'
    if (availableTypes.length === 0) {
        const defType = item.system.damageType || "slashing";
        availableTypes.push({ 
            key: defType, 
            label: DUNGEON.damageTypes[defType] || defType 
        });
    }

    // --- Внутренняя функция броска (чтобы не дублировать код) ---
    const executeRoll = async (typeKey, typeLabel) => {
        const roll = new Roll(damageFormula);
        await roll.evaluate();

        // Рендер красивой карточки
        const content = `
            <div class="dungeon-chat-card">
                <h3>Урон: ${item.name}</h3>
                <div class="outcome">
                    ${roll.total} 
                    <span style="font-size:14px; color:#aaa; display:block; margin-top:2px; font-weight:normal;">
                        ${typeLabel}
                    </span>
                </div>
                
                {{!-- КНОПКИ ПРИМЕНЕНИЯ УРОНА --}}
                <div class="card-buttons" style="margin-top:5px; display:flex; gap:5px;">
                    <button data-action="apply-damage" data-val="${roll.total}" data-type="${typeKey}" style="background:#400; color:#fff;">
                        🩸 Применить
                    </button>
                </div>

                <div class="card-footer gm-only" style="font-size:10px; color:#666;">
                    <div>Успехов: ${successes} (+${extraDiceCount}d4)</div>
                    <div>Сила: ${strength} (Бонус +${strBonus})</div>
                    <div>Формула: ${damageFormula}</div>
                </div>
            </div>
        `;

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({actor: this}),
            content: content,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            rolls: [roll], // Чтобы Foundry понимала, что это бросок (для 3D кубов)
            sound: CONFIG.sounds.dice
        });
    };

    // 5. Логика выбора
    // Если тип только один - кидаем сразу
    if (availableTypes.length === 1) {
        return executeRoll(availableTypes[0].key, availableTypes[0].label);
    }

    // Если типов несколько - показываем Диалог
    let optionsHtml = availableTypes.map(t => 
        `<option value="${t.key}">${t.label}</option>`
    ).join("");

    new Dialog({
        title: "Выберите тип урона",
        content: `
          <form>
              <div class="form-group">
                  <label>Чем наносим удар?</label>
                  <select name="dtype" style="width:100%; background:#222; color:#fff;">
                      ${optionsHtml}
                  </select>
              </div>
          </form>
        `,
        buttons: {
            roll: {
                icon: '<i class="fas fa-dice"></i>',
                label: "Нанести",
                callback: html => {
                    const selectedKey = html.find('[name="dtype"]').val();
                    const selectedLabel = DUNGEON.damageTypes[selectedKey];
                    executeRoll(selectedKey, selectedLabel);
                }
            }
        },
        default: "roll"
    }).render(true);
  }

  /**
   * Перехват создания предметов.
   * Запрещает создание второй Роли или Родословной.
   */
  async _preCreateEmbeddedDocuments(embeddedName, resultData, options, userId) {
    await super._preCreateEmbeddedDocuments(embeddedName, resultData, options, userId);
    
    if (embeddedName === "Item") {
        for (const data of resultData) {
            if (['role', 'lineage'].includes(data.type)) {
                const existing = this.items.find(i => i.type === data.type);
                if (existing) {
                    const typeName = data.type === 'role' ? 'Класс (Роль)' : 'Родословную';
                    ui.notifications.warn(`У персонажа уже есть ${typeName}. Удалите текущий предмет перед добавлением нового.`);
                    return false; // Отменяет создание
                }
            }
        }
    }
  }
}
