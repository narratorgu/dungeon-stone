export function registerHooks() {

    /**
     * Инициализация флагов видимости при создании персонажа
     */
    Hooks.on("createActor", async (actor, options, userId) => {
        if (actor.type !== "character") return;
        if (userId !== game.user.id) return;
        
        const existing = actor.getFlag("dungeon-stone", "revealed");
        if (existing) return;
        
        const allKeys = [
            "strength", "agility", "precision", "flexibility",
            "stamina", "fortitude", "naturalRegeneration",
            "boneDensity", "height", "weight", "metabolism",
            "vision", "hearing", "touch", "smell",
            "cuttingForce", "crushingForce", "piercingForce",
            "cognition", "willpower", "intuition", "consciousness",
            "soulPower", "manaSense", "spiritRecovery", "magicResistance",
            "luck", "presence",
            "bladed", "blunt", "polearm", "unarmed", "throwing",
            "physBase", "magBase",
            "slashing", "blunt", "piercing",
            "fire", "cold", "lightning", "acid", "poison",
            "psychic", "light", "dark", "pure"
        ];
        
        const revealed = {};
        allKeys.forEach(key => revealed[key] = false);
        
        await actor.setFlag("dungeon-stone", "revealed", revealed);
        console.log(`🔴 Инициализированы флаги видимости для ${actor.name}`);
    });

    Hooks.on("preCreateItem", (item) => {
        // Для контрактов не трогаем equipStatus вообще - он устанавливается в sheets.mjs
        if (item.type === "contract") {
            return;
        }
        // Для остальных предметов устанавливаем "stored" только если equipStatus не установлен
        if (!item.system.equipStatus) {
            item.updateSource({ "system.equipStatus": "stored" });
        }
    });
    
    /**
     * Обработка кнопок в чате
     */
    Hooks.on("renderChatMessageHTML", (message, html) => {
        const element = html;

        // Размещение шаблона
        const templateBtns = element.querySelectorAll("button[data-action='place-template']");
        templateBtns.forEach(btn => {
            btn.addEventListener('click', ev => {
                ev.preventDefault();
                const itemId = btn.dataset.itemId;
                
                const speaker = message.speaker;
                let actor;
                if (speaker.token) actor = game.actors.tokens[speaker.token];
                if (!actor) actor = game.actors.get(speaker.actor);

                if (actor) {
                    const item = actor.items.get(itemId);
                    if (item) actor._placeTemplate(item);
                }
            });
        });
        
        // 1. Кнопка "Нанести урон" (из броска атаки)
        const rollDamageBtns = element.querySelectorAll("button[data-action='roll-damage']");
        rollDamageBtns.forEach(btn => {
            btn.addEventListener('click', ev => {
                ev.preventDefault();
                const itemId = btn.dataset.itemId;
                const bonus = Number(btn.dataset.bonus) || 0;
                
                const speaker = message.speaker;
                let actor;
                if (speaker.token) actor = game.actors.tokens[speaker.token];
                if (!actor) actor = game.actors.get(speaker.actor);
        
                if (actor) {
                    actor.rollWeaponDamage(itemId, bonus);
                }
            });
        });

        // 2. Кнопка "Применить урон" (из карточки урона)
        const applyDamageBtns = element.querySelectorAll("button[data-action='apply-damage']");
        applyDamageBtns.forEach(btn => {
            btn.addEventListener('click', async ev => {
                ev.preventDefault();
                if (btn.disabled) return;

                const damage = Number(btn.dataset.val);
                const type = btn.dataset.type;
        
                const targets = Array.from(game.user.targets);
                if (targets.length === 0) {
                    return ui.notifications.warn("Сначала выберите цель (Target)!");
                }
        
                for (let t of targets) {
                    if (t.actor) {
                        await t.actor.applyDamage(damage, type);
                    }
                }

                btn.disabled = true;
                btn.innerHTML = `<i class="fas fa-check"></i> Применено`;
            });
        });

        // 3. Бросок Магической Атаки
        const spellAttackBtns = element.querySelectorAll("button[data-action='spell-attack']");
        spellAttackBtns.forEach(btn => {
            btn.addEventListener('click', ev => {
                ev.preventDefault();
                const itemId = btn.dataset.itemId;
                
                const speaker = message.speaker;
                let actor;
                if (speaker.token) actor = game.actors.tokens[speaker.token];
                if (!actor) actor = game.actors.get(speaker.actor);
        
                if (actor) actor.rollWeaponAttack(itemId);
            });
        });

        // 4. Запрос Спасброска
        const saveBtns = element.querySelectorAll("button[data-action='request-save']");
        saveBtns.forEach(btn => {
            btn.addEventListener('click', async ev => {
                ev.preventDefault();
                const dc = Number(btn.dataset.dc);
                const requiredKU = Number(btn.dataset.ku);
                const attrKey = btn.dataset.attr;
        
                const targets = Array.from(game.user.targets);
                if (targets.length === 0) {
                    return ui.notifications.warn("Выберите цели (Target), чтобы запросить спасбросок.");
                }
        
                let resultsHTML = "";
                
                for (let t of targets) {
                    const actor = t.actor;
                    if (!actor) continue;
                    
                    let val = actor.system.subAttributes[attrKey] || actor.system.attributes[attrKey] || 0;
                    let pool = Math.max(1, Math.floor(val / 13));
                    
                    const roll = new Roll(`${pool}d100`);
                    await roll.evaluate();
                    
                    let successes = 0;
                    roll.terms[0].results.forEach(r => {
                        if (r.result >= 95) successes += 3;
                        else if (r.result <= 5) successes -= 1;
                        else if (r.result >= dc) successes += 1;
                    });
                    
                    const isSave = successes >= requiredKU;
                    const color = isSave ? "green" : "red";
                    const text = isSave ? "СПАС" : "ПРОВАЛ";
                    
                    resultsHTML += `
                        <div style="margin-bottom:5px; border-bottom:1px solid #333; font-size: 12px;">
                            <b>${actor.name}:</b> <span style="color:${color}; font-weight:bold;">${text}</span> 
                            <span style="color:#888;">(${successes}/${requiredKU})</span>
                        </div>
                    `;
                }
        
                ChatMessage.create({
                    content: `
                        <div class="dungeon-chat-card">
                            <h3>🛡️ Результаты Спасброска</h3>
                            <div style="font-size:11px; margin-bottom:5px; color:#aaa;">Атрибут: ${attrKey} | DC: ${dc}</div>
                            ${resultsHTML}
                        </div>
                    `
                });
            });
        });
    });

    /**
     * Сброс защиты в начале нового раунда
     */
    Hooks.on("updateCombat", async (combat, updateData, options, userId) => {
        if (!updateData.turn && !updateData.round) return;
        if (!game.user.isGM) return;
  
        const combatant = combat.combatant;
        if (!combatant || !combatant.actor) return;
  
        const actor = combatant.actor;
        const currentPenalty = actor.system.combat?.defensePenalty || 0;
  
        if (currentPenalty > 0) {
            await actor.update({"system.combat.defensePenalty": 0});
            ui.notifications.info(`🛡️ ${actor.name}: Защита восстановлена.`);
        }
    });

    Hooks.on("updateCombat", async (combat, updateData, options, userId) => {
        if (!game.user.isGM) return;
        if (updateData.round !== 1) return;

        // Фильтруем: только персонажи (не монстры)
        const pcs = combat.combatants
            .filter(c => c.actor && c.actor.type === "character")
            .map(c => ({
                name: c.name,
                threat: c.actor.system.attributes.threatLevel || 0
            }))
            .sort((a, b) => b.threat - a.threat); // Сортировка по убыванию

        if (pcs.length === 0) return; // Если в бою нет игроков, ничего не выводим

        let content = `
        <div class="dungeon-chat-card">
            <header style="background:#331111; border-color:#552222;">
                <h3 style="color:#ffaaaa;">⚔️ АГРО (Угроза)</h3>
            </header>
            <div class="card-content" style="padding: 5px;">
                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid #555;">
                            <th style="text-align: left;">Имя</th>
                            <th style="text-align: center;">Угроза</th>
                        </tr>
                    </thead>
                    <tbody>`;

        for (let pc of pcs) {
            content += `
                <tr>
                    <td style="color:#fff; padding:2px;">${pc.name}</td>
                    <td style="text-align:center; font-weight:bold; color:#d4af37; padding:2px;">${pc.threat}</td>
                </tr>`;
        }

        content += `</tbody></table></div></div>`;

        await ChatMessage.create({
            content: content,
            speaker: { alias: "Battle Tracker" },
            whisper: ChatMessage.getWhisperRecipients("GM")
        });
    });
}
