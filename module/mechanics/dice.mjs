/**
 * Основная функция броска d100
 */
export async function rollDungeonCheck(actor, pool, dc, label, options = {}) {
    // Минимум 1 куб
    const finalPool = Math.max(1, pool);
    
    const roll = new Roll(`${finalPool}d100`);
    await roll.evaluate();

    let successes = 0;
    let critSuccesses = 0; 
    let critFails = 0;

    // Подсчет
    roll.terms[0].results.forEach(r => {
        if (r.result >= 95) { successes += 3; critSuccesses++; }
        else if (r.result <= 5) { successes -= 1; critFails++; }
        else if (r.result >= dc) { successes += 1; }
    });

    const ku = options.ku || 1; // Порог успехов (по умолчанию 1)
    const isHit = successes >= ku;

    // --- НАРРАТИВ (ТЕКСТ ДЛЯ ИГРОКОВ) ---
    let outcomeTitle = "НЕУДАЧА";
    let outcomeColor = "#ff4444"; // Красный

    if (isHit) {
        outcomeTitle = "УСПЕХ";
        outcomeColor = "#44ff44"; // Зеленый
        
        // Степени успеха (для проверок навыков)
        if (!options.isAttack) {
            if (successes >= (ku + 5)) outcomeTitle = "ЛЕГЕНДАРНЫЙ УСПЕХ";
            else if (successes >= (ku + 2)) outcomeTitle = "ОТЛИЧНЫЙ УСПЕХ";
        } else {
            outcomeTitle = "ПОПАДАНИЕ";
        }
    } else {
        if (options.isAttack) outcomeTitle = "ПРОМАХ";
    }

    // Критические пометки
    let critStatus = "";
    if (critSuccesses > 0) critStatus += `<div style="color:#ffd700; font-size:11px;">КРИТИЧЕСКИЙ УСПЕХ (${critSuccesses})</div>`;
    if (critFails > 0) critStatus += `<div style="color:#ff6666; font-size:11px;">КРИТИЧЕСКАЯ НЕУДАЧА (${critFails})</div>`;

    // Кнопки (только если есть права)
    let buttons = "";
    if (options.isAttack && isHit && options.itemId) {
        buttons = `<div class="card-buttons" style="margin-top:8px;">
            <button data-action="roll-damage" data-item-id="${options.itemId}" data-bonus="${successes}">Нанести Урон</button>
        </div>`;
    }

    // --- HTML КАРТОЧКИ ---
    // Используем flex для центрирования и строгие цвета
    const content = `
      <div class="dungeon-chat-card" style="border-left: 4px solid ${outcomeColor};">
        <header class="card-header" style="background:#1a1a1a; padding:5px; display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; font-size:14px; color:#ddd;">${label}</h3>
            ${options.img ? `<img src="${options.img}" width="24" height="24" style="border:1px solid #444; border-radius:4px;"/>` : ""}
        </header>
        
        <div class="card-body" style="padding:10px; text-align:center; background:#222;">
            
            <!-- ГЛАВНЫЙ ИСХОД (ВИДЯТ ВСЕ) -->
            <div style="font-size: 20px; font-weight: bold; color: ${outcomeColor}; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">
                ${outcomeTitle}
            </div>
            
            <!-- КРИТ СТАТУСЫ (ВИДЯТ ВСЕ) -->
            ${critStatus}

            ${buttons}

            <!-- МЕХАНИКА (ВИДИТ ТОЛЬКО ГМ) -->
            <div class="gm-only" style="margin-top:10px; padding-top:8px; border-top:1px dashed #444; text-align:left; font-size:11px; color:#888;">
                <div style="display:flex; justify-content:space-between;">
                    <span>Сложность (DC): <b>${dc}</b></span>
                    <span>Порог (КУ): <b>${ku}</b></span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span>Пул: <b>${finalPool}</b>к</span>
                    <span>Успехов: <b style="color:${isHit ? '#4f4' : '#f44'}">${successes}</b></span>
                </div>
                <div style="margin-top:4px; word-break:break-all;">
                    Кубы: [${roll.terms[0].results.map(r => {
                        let c = "#aaa";
                        if (r.result >= 95) c = "#ffd700"; // Крит
                        else if (r.result <= 5) c = "#f44"; // Фейл
                        else if (r.result >= dc) c = "#fff"; // Успех
                        return `<span style="color:${c}">${r.result}</span>`;
                    }).join(", ")}]
                </div>
            </div>
        </div>
      </div>
    `;

    // Если Dice So Nice
    if (game.dice3d) {
        await game.dice3d.showForRoll(roll, game.user, true);
    }

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: content,
      rolls: [roll], // Чтобы Foundry понимал что это бросок (для звука и логов)
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice
    });

    return { successes, isHit, roll };
}
