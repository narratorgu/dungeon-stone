import { DUNGEON } from "../config.mjs";

/**
 * Основная функция броска d100
 * @param {Actor} actor - Кто бросает
 * @param {number} pool - Количество кубов
 * @param {number} dc - Сложность
 * @param {string} label - Название проверки
 * @param {object} options - Доп настройки (itemId, damageRoll и т.д.)
 */
export async function rollDungeonCheck(actor, pool, dc, label, options = {}) {
    const roll = new Roll(`${pool}d100`);
    await roll.evaluate();

    let successes = 0;
    let critSuccess = false; 
    let critFail = false;

    // Подсчет успехов
    roll.terms[0].results.forEach(r => {
        if (r.result >= 95) { successes += 3; critSuccess = true; }
        else if (r.result <= 5) { successes -= 1; critFail = true; }
        else if (r.result >= dc) { successes += 1; }
    });

    // Определение исхода
    let outcomeClass = "failure";
    let outcomeText = "Провал";
    let isHit = false;

    if (successes > 0) {
        outcomeClass = "success";
        outcomeText = options.isAttack ? "ПОПАДАНИЕ" : "Успех";
        isHit = true;
        if (!options.isAttack) {
            if (successes >= 3) outcomeText = "Отличный успех";
            if (successes >= 6) outcomeText = "Невероятный успех";
        }
    } else if (options.isAttack) {
        outcomeText = "ПРОМАХ";
    }

    if (critSuccess) outcomeText += " ⚡КРИТ!⚡";
    if (critFail) outcomeText += " 💀ФАТАЛЬНО!💀";

    // Генерация кнопок (например, для урона)
    let buttons = "";
    if (options.isAttack && isHit && options.itemId) {
        buttons = `<button data-action="roll-damage" data-item-id="${options.itemId}" data-bonus="${successes}">🎲 Нанести Урон</button>`;
    }

    // HTML Карточки
    const content = `
      <div class="dungeon-chat-card ${outcomeClass}">
        <div class="card-header">
            <h3>${label}</h3>
            <span style="font-size:12px; color:#aaa;">DC ${dc}</span>
        </div>
        <div class="card-body">
            <div class="outcome">${outcomeText}</div>
            ${options.extraContent || ""}
        </div>
        <div class="card-footer">
           ${buttons}
           <div class="gm-only">
               <div><b>КУ:</b> ${successes}</div>
               <div><b>Кубы:</b> [${roll.terms[0].results.map(r=>r.result).join(", ")}]</div>
           </div>
        </div>
      </div>
    `;

    // Отправка в чат
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: content,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER
    });

    return { successes, isHit, roll };
}
