export class DungeonItem extends Item {
  
  prepareData() {
    super.prepareData();
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Расчет веса контейнера
    if (this.type === "container" && this.actor) {
        const contents = this.system.contents || [];
        let contentWeight = 0;
        
        // Считаем вес предметов внутри
        contents.forEach(id => {
            const item = this.actor.items.get(id);
            if (item) {
                contentWeight += (item.system.weight || 0) * (item.system.quantity || 1);
            }
        });

        // Применяем снижение веса
        const reduction = this.system.weightReduction || 0; // %
        const reducedWeight = contentWeight * (1 - reduction / 100);
        this.system.totalWeight = (this.system.weight || 0) + reducedWeight;
    }
  }

  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);

    if (changed.system?.itemLevel !== undefined) {
      // Если пришло null или "", ставим 1
      changed.system.itemLevel = Number(changed.system.itemLevel) || 1;
    }
    
    if (!changed.system) return;
    
    // Универсальная функция парсинга чисел (обрабатывает локаль с запятыми)
    const parseNumber = (value, min = null, max = null, defaultValue = 0) => {
      if (value === null || value === undefined) return defaultValue;
      
      if (typeof value === "string") {
        value = parseFloat(value.replace(",", "."));
      }
      
      if (isNaN(value)) return defaultValue;
      
      if (min !== null && value < min) value = min;
      if (max !== null && value > max) value = max;
      
      return value;
    };

    if (changed.system?.details?.age !== undefined) {
      changed.system.details.age = Math.floor(Number(changed.system.details.age)) || 0;
    }
    
    // Rank (для spell, essence, role, contract)
    if (["spell", "essence", "role", "contract"].includes(this.type)) {
      if (changed.system.rank !== undefined) {
        changed.system.rank = Math.round(parseNumber(changed.system.rank, 1, 9, 1));
      }
    }
    
    // Числовые поля общего назначения
    if (changed.system.price !== undefined) {
      changed.system.price = parseNumber(changed.system.price, 0, null, 0);
    }
    
    if (changed.system.weight !== undefined) {
      changed.system.weight = parseNumber(changed.system.weight, 0, null, 0);
    }
    
    if (changed.system.quantity !== undefined) {
      changed.system.quantity = Math.round(parseNumber(changed.system.quantity, 0, null, 1));
    }
    
    if (changed.system.manaCost !== undefined) {
      changed.system.manaCost = Math.round(parseNumber(changed.system.manaCost, 0, null, 0));
    }
    
    if (changed.system.saveDC !== undefined) {
      changed.system.saveDC = Math.round(parseNumber(changed.system.saveDC, 0, null, 0));
    }
    
    if (changed.system.armorValue !== undefined) {
      changed.system.armorValue = Math.round(parseNumber(changed.system.armorValue, 0, null, 0));
    }
    
    if (changed.system.armorPenalty !== undefined) {
      changed.system.armorPenalty = Math.round(parseNumber(changed.system.armorPenalty, 0, null, 0));
    }
  }

  getRollData() {
    const data = { ...super.getRollData() };
    return data;
  }
}
