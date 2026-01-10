export class MigrationManager {
  
  static getWorldMigrationVersion() {
    return game.settings.get("dungeon-stone", "systemMigrationVersion") || "0.0.0";
  }

  static async setWorldMigrationVersion(version) {
    await game.settings.set("dungeon-stone", "systemMigrationVersion", version);
  }

  static needsMigration(currentVersion, targetVersion) {
    return foundry.utils.isNewerVersion(targetVersion, currentVersion);
  }

  static async migrateWorld() {
    if (!game.user.isGM) return;

    const currentVersion = this.getWorldMigrationVersion();
    const systemVersion = game.system.version;

    if (!this.needsMigration(currentVersion, systemVersion)) {
      console.log(`Dungeon & Stone | Миграция не требуется (текущая: ${currentVersion})`);
      return;
    }

    ui.notifications.info(`Dungeon & Stone | Начинается миграция с ${currentVersion} до ${systemVersion}...`);
    console.log(`Dungeon & Stone | Миграция: ${currentVersion} → ${systemVersion}`);

    let itemsUpdated = 0;
    let actorsUpdated = 0;
    let compendia = 0;

    // === МИГРАЦИЯ ПРЕДМЕТОВ В МИРЕ ===
    for (const item of game.items) {
      const wasUpdated = await this.migrateItemData(item);
      if (wasUpdated) itemsUpdated++;
    }

    // === МИГРАЦИЯ ПРЕДМЕТОВ НА АКТЕРАХ ===
    for (const actor of game.actors) {
      let actorNeedsUpdate = false;

      for (const item of actor.items) {
        const wasUpdated = await this.migrateItemData(item);
        if (wasUpdated) {
          itemsUpdated++;
          actorNeedsUpdate = true;
        }
      }

      if (actorNeedsUpdate) actorsUpdated++;
    }

    // === МИГРАЦИЯ КОМПЕНДИУМОВ ===
    for (const pack of game.packs) {
      // Только компендиумы предметов и актеров
      if (pack.metadata.type === "Item" || pack.metadata.type === "Actor") {
        const updated = await this.migrateCompendium(pack);
        if (updated > 0) {
          compendia++;
          itemsUpdated += updated;
        }
      }
    }

    // Сохранить новую версию
    await this.setWorldMigrationVersion(systemVersion);

    ui.notifications.info(
      `Dungeon & Stone | Миграция завершена!\n` +
      `Предметов обновлено: ${itemsUpdated}\n` +
      `Актеров затронуто: ${actorsUpdated}\n` +
      `Компендиумов обработано: ${compendia}`
    );

    console.log(`Dungeon & Stone | Миграция завершена.`, {
      items: itemsUpdated,
      actors: actorsUpdated,
      compendia: compendia
    });
  }

  static async migrateItemData(item) {
    const updates = {};
  
    // === ОБЩИЕ ИСПРАВЛЕНИЯ ===
    
    if (item.system.price === null || item.system.price === undefined || item.system.price === "") {
      updates["system.price"] = 0;
    }
  
    if (item.system.weight === null || item.system.weight === undefined || item.system.weight === "") {
      updates["system.weight"] = 0;
    }
  
    if (item.system.quantity === null || item.system.quantity === undefined || item.system.quantity === "") {
      updates["system.quantity"] = 1;
    }
  
    // ✅ УНИВЕРСАЛЬНОЕ ИСПРАВЛЕНИЕ RANK ДЛЯ ВСЕХ ТИПОВ
    if (["spell", "essence", "role", "contract"].includes(item.type)) {
      const currentRank = item.system.rank;
      
      // Если rank невалидный (null, undefined, "", NaN, не число)
      if (
        currentRank === null || 
        currentRank === undefined || 
        currentRank === "" || 
        isNaN(currentRank) ||
        typeof currentRank !== "number"
      ) {
        updates["system.rank"] = 1;
      }
    }
  
    // === SPELL ===
    if (item.type === "spell") {
      if (item.system.scaling && !item.system.attackAttribute) {
        const scalingMap = {
          "accuracy": "precision",
          "proficiency": "spirit",
          "endurance": "spirit"
        };
        updates["system.attackAttribute"] = scalingMap[item.system.scaling] || item.system.scaling;
        updates["system.-=scaling"] = null;
      }
  
      if (item.system.saveAttribute) {
        const saveMap = {
          "physique": "fortitude",
          "reflex": "agility"
        };
        if (saveMap[item.system.saveAttribute]) {
          updates["system.saveAttribute"] = saveMap[item.system.saveAttribute];
        }
      }
  
      if (!item.system.rollType) {
        updates["system.rollType"] = item.system.saveAttribute ? "save" : "attack";
      }
  
      if (!item.system.castTime) {
        updates["system.castTime"] = 1;
      }
  
      if (!item.system.components) {
        updates["system.components"] = {
          verbal: true,
          somatic: true,
          material: false,
          materialDescription: ""
        };
      }
    }
  
    // === CONTRACT ===
    if (item.type === "contract") {
      const contractMap = {
        "Дух Природы": "spirit",
        "Дух Зверей": "spirit",
        "Дух Предков": "spirit",
        "Элементаль": "elemental",
        "nature": "spirit"
      };
  
      const oldType = item.system.contractType;
      if (contractMap[oldType]) {
        updates["system.contractType"] = contractMap[oldType];
        
        if (!item.system.entityName || item.system.entityName === "Дух Природы") {
          updates["system.entityName"] = oldType;
        }
      }
  
      if (item.system.canSummon === undefined) {
        updates["system.canSummon"] = false;
      }
  
      if (!item.system.activeAbilityParams) {
        updates["system.activeAbilityParams"] = {
          manaCost: 0,
          spiritCost: 0,
          damage: "",
          damageType: "pure",
          cooldown: 0,
          range: 0
        };
      }
    }
  
    // === ESSENCE ===
    if (item.type === "essence") {
      if (!item.system.abilityName) {
        updates["system.abilityName"] = item.name || "Способность";
      }
  
      if (!item.system.abilityType) {
        updates["system.abilityType"] = "damage";
      }
  
      if (!item.system.activationAction) {
        updates["system.activationAction"] = "action";
      }
  
      if (item.system.requiresSave === undefined) {
        updates["system.requiresSave"] = false;
      }
    }
  
    // === ROLE ===
    if (item.type === "role") {
      // Уже обработано в универсальном блоке выше
      
      // Дополнительные поля для Role
      if (!item.system.roleType) {
        updates["system.roleType"] = "combat";
      }
  
      if (item.system.hpPerLevel === null || item.system.hpPerLevel === undefined) {
        updates["system.hpPerLevel"] = 0;
      }
  
      if (item.system.manaPerLevel === null || item.system.manaPerLevel === undefined) {
        updates["system.manaPerLevel"] = 0;
      }
    }
  
    // === WEAPON / CONSUMABLE ===
    if (item.type === "weapon" || item.type === "consumable") {
      if (item.system.ammoType === "") {
        updates["system.ammoType"] = null;
      }
    }
  
    // Применяем обновления
    if (Object.keys(updates).length > 0) {
      try {
        await item.update(updates, { diff: false, recursive: false });
        console.log(`Мигрирован: ${item.name} (${item.type})`, updates);
        return true;
      } catch (err) {
        console.error(`Ошибка миграции ${item.name}:`, err);
        return false;
      }
    }
  
    return false;
  }

  static async migrateCompendium(pack) {
    console.log(`Dungeon & Stone | Миграция компендиума: ${pack.metadata.label}`);
    
    const wasLocked = pack.locked;
    
    // Разблокируем компендиум
    if (wasLocked) {
      await pack.configure({ locked: false });
    }

    let updated = 0;

    try {
      // Получаем все документы
      const documents = await pack.getDocuments();

      for (const doc of documents) {
        // Если это актер, мигрируем его предметы
        if (doc.documentName === "Actor") {
          for (const item of doc.items) {
            const wasUpdated = await this.migrateItemData(item);
            if (wasUpdated) updated++;
          }
        }
        
        // Если это предмет, мигрируем напрямую
        if (doc.documentName === "Item") {
          const wasUpdated = await this.migrateItemData(doc);
          if (wasUpdated) updated++;
        }
      }

      console.log(`Компендиум ${pack.metadata.label}: ${updated} документов обновлено`);
    } catch (err) {
      console.error(`Ошибка миграции компендиума ${pack.metadata.label}:`, err);
    } finally {
      // Возвращаем блокировку
      if (wasLocked) {
        await pack.configure({ locked: wasLocked });
      }
    }

    return updated;
  }
}
