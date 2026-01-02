export function registerHooks() {
    
    Hooks.on("renderChatMessageHTML", (message, html) => {
        const $html = $(html);
        
        // 1. Кнопка "Нанести урон" (из броска атаки)
        $html.find("button[data-action='roll-damage']").click(ev => {
            ev.preventDefault();
            const btn = ev.currentTarget;
            const itemId = btn.dataset.itemId;
            const bonus = Number(btn.dataset.bonus) || 0;
            
            const speaker = message.speaker;
            let actor;
            if (speaker.token) actor = game.actors.tokens[speaker.token];
            if (!actor) actor = game.actors.get(speaker.actor);
    
            if (actor) actor.rollWeaponDamage(itemId, bonus);
        });
    
        // 2. Кнопка "Применить урон" (из броска урона)
        $html.find("button[data-action='apply-damage']").click(async ev => {
            ev.preventDefault();
            const btn = ev.currentTarget;
            const damage = Number(btn.dataset.val);
            const type = btn.dataset.type;
    
            // Ищем цели (Targets) у текущего пользователя
            const targets = Array.from(game.user.targets);
    
            if (targets.length === 0) {
                ui.notifications.warn("Сначала выберите цель (Target)!");
                return;
            }
    
            // Применяем урон к каждой цели
            for (let t of targets) {
                if (t.actor) {
                    await t.actor.applyDamage(damage, type);
                }
            }
        });
    
        // --- НОВЫЕ КНОПКИ ---
    
        // 1. Бросок Магической Атаки
        $html.find("button[data-action='spell-attack']").click(ev => {
            ev.preventDefault();
            const itemId = ev.currentTarget.dataset.itemId;
            
            // Получаем актера из сообщения
            const speaker = message.speaker;
            let actor;
            if (speaker.token) actor = game.actors.tokens[speaker.token];
            if (!actor) actor = game.actors.get(speaker.actor);
    
            // Используем стандартную механику атаки, она уже умеет читать scaling из предмета!
            if (actor) actor.rollWeaponAttack(itemId);
        });
    
        // 2. Запрос Спасброска (Автоматический бросок за цели)
        $html.find("button[data-action='request-save']").click(async ev => {
            ev.preventDefault();
            const btn = ev.currentTarget;
            const dc = Number(btn.dataset.dc);
            const requiredKU = Number(btn.dataset.ku);
            const attrKey = btn.dataset.attr; // 'agility', 'spirit'...
    
            // Ищем цели (Targets)
            const targets = Array.from(game.user.targets);
            
            if (targets.length === 0) {
                return ui.notifications.warn("Выберите цели (Target), чтобы запросить спасбросок.");
            }
    
            // Формируем сообщение с результатами
            let resultsHTML = "";
            
            for (let t of targets) {
                const actor = t.actor;
                if (!actor) continue;
                
                // Получаем значение атрибута цели
                // Проверяем subAttributes (ловкость) и attributes (дух)
                let val = actor.system.subAttributes[attrKey] || actor.system.attributes[attrKey] || 0;
                
                // Считаем пул кубов (простая проверка атрибута)
                // Пул = Вал / 13
                let pool = Math.max(1, Math.floor(val / 13));
                
                const roll = new Roll(`${pool}d100`);
                await roll.evaluate();
                
                let successes = 0;
                roll.terms[0].results.forEach(r => {
                    if (r.result >= 95) successes += 3;
                    else if (r.result <= 5) successes -= 1;
                    else if (r.result >= dc) successes += 1;
                });
                
                // ПРОВЕРКА ПРОТИВ КУ
                const isSave = successes >= requiredKU; // <--- Сравниваем с требуемым КУ
                
                const color = isSave ? "green" : "red";
                const text = isSave ? "СПАС" : "ПРОВАЛ";
                
                resultsHTML += `
                    <div style="margin-bottom:5px; border-bottom:1px solid #333;">
                        <b>${actor.name}:</b> ${text} (${successes}/${requiredKU} усп.)</span>
                    </div>
                `;
            }
    
            ChatMessage.create({
                content: `
                    <div class="dungeon-chat-card">
                        <h3>🛡️ Результаты Спасброска</h3>
                        <div style="font-size:11px; margin-bottom:5px;">Атрибут: ${attrKey} | Сложность: ${dc}</div>
                        ${resultsHTML}
                    </div>
                `
            });
        });
    });

    Hooks.on("updateCombat", async (combat, updateData, options, userId) => {
        // Проверяем, изменился ли ход (turn) или раунд (round)
        if (!updateData.turn && !updateData.round) return;
        if (!game.user.isGM) return; // Только ГМ обрабатывает логику, чтобы не было дублей
  
        const combatant = combat.combatant;
        if (!combatant || !combatant.actor) return;
  
        const actor = combatant.actor;
        const currentPenalty = actor.system.combat?.defensePenalty || 0;
  
        // Если есть штраф - сбрасываем
        if (currentPenalty > 0) {
            await actor.update({"system.combat.defensePenalty": 0});
            
            ui.notifications.info(`🛡️ ${actor.name}: Защита восстановлена (новый ход).`);
            
            // Опционально: сообщение в чат
            ChatMessage.create({
                content: `<div style="font-size:12px; color:#aaa;">${actor.name}: Стойка восстановлена. Штраф КУ сброшен.</div>`,
                speaker: ChatMessage.getSpeaker({actor: actor})
            });
        }
    });
}
