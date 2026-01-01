export function registerHooks() {
    
    Hooks.on("renderChatMessageHTML", (message, html) => {
        const $html = $(html);
        
        // ЛОГИКА ВИДИМОСТИ GM-ONLY
        if (game.user.isGM) {
            $html.find(".gm-only").show(); // ГМ видит всё
        } else {
            $html.find(".gm-only").remove(); // У игроков удаляем из DOM для безопасности
        }
      
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
  
      // 2. Кнопка "Применить урон" (из броска урона) - НОВОЕ
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
