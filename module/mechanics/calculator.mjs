import { DUNGEON } from "../config.mjs";

/**
 * Расчет максимального HP
 */
export function calculateMaxHP(endurance, boneDensity) {
    const mult = 1 + (boneDensity / 100);
    return Math.floor(endurance * mult);
}

/**
 * Расчет максимальной Маны
 * @param {number} soulPower - Сила Души
 */
export function calculateMaxMana(soulPower) {
    return Math.floor(soulPower * 1.5); 
}

/**
 * Расчет Физического Сопротивления (%)
 * Формула: 20 * ln(1 + (Плотность + ФизСопр) / 10)
 * Кап: 90% (чтобы не было иммунитета)
 */
export function calculatePhysRes(boneDensity, flatResist) {
    const totalStat = Math.max(0, boneDensity + flatResist);
    // Логарифм натуральный
    const val = 20 * Math.log(1 + (totalStat / 10));
    // Округляем и ставим лимит 90%
    return Math.min(90, Math.floor(val));
}

/**
 * Расчет Магического Сопротивления (%)
 * Формула: 15 * ln(1 + МагСопр / 10)
 * Кап: 90%
 */
export function calculateMagRes(magicResist) {
    const stat = Math.max(0, magicResist);
    const val = 15 * Math.log(1 + (stat / 10));
    return Math.min(90, Math.floor(val));
}

export function getXPThreshold(level) {
    return DUNGEON.XP_TABLE[level] || 999999;
}

/**
 * Расчет сложности заклинания (Spell DC)
 * spiritSum = cognition + manaSense + (soulPower ИЛИ divinePower)
 */
export function calculateMagicStats(cognition, manaSense, powerStat) {
    // Сумма характеристик
    const spiritSum = cognition + manaSense + powerStat;
    
    // Формула DC
    const term1 = 15 * Math.log(1 + spiritSum / 100);
    const term2 = 12 * Math.log(1 + Math.log(1 + spiritSum / 400));
    const dc = Math.floor(Math.min(90, 50 + term1 + term2));
    
    // Формула КУ
    const ku = Math.max(1, Math.floor(spiritSum / 53));
    
    return { dc, ku };
}

/**
 * Расчет времени восстановления
 * rateStat: spiritRecovery (для маны/GP)
 * current: текущее значение
 * max: максимальное значение
 */
export function calculateRecoveryTime(rateStat, current, max) {
    // Преобразуем в числа для безопасности
    rateStat = Number(rateStat) || 0;
    current = Number(current) || 0;
    max = Number(max) || 0;
    
    if (rateStat <= 0 || max <= 0) return { fullTime: "∞", restTime: "∞" };
    
    const ratePerMinute = rateStat * 0.5; // 50% от стата в минуту
    if (ratePerMinute <= 0) return { fullTime: "∞", restTime: "∞" };

    const minutesToFull = max / ratePerMinute;
    const minutesToRest = Math.max(0, (max - current) / ratePerMinute);

    const formatTime = (mins) => {
        if (mins === 0) return "0 мин";
        if (mins === Infinity || isNaN(mins)) return "Никогда";
        const totalMinutes = Math.ceil(mins); // Округляем вверх до целых минут
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h > 0) return `${h} ч. ${m > 0 ? m + " мин." : ""}`;
        return `${m} мин.`;
    };

    return {
        fullTime: formatTime(minutesToFull),
        restTime: formatTime(minutesToRest)
    };
}

/**
 * Расчет Dice Pool (Количества кубов)
 */
export function getDicePool(statValue) {
    let pool = Math.floor(statValue / 13);
    return pool < 1 ? 1 : pool;
}

/**
 * Расчет Максимума Пула Защиты (Defense Pool Max)
 * Используется ТОЛЬКО для отображения на листе персонажа.
 * В бою КУ считается динамически.
 */
export function calculateKU(agility, size) {
    const sizeConf = DUNGEON.sizes[size] || DUNGEON.sizes.medium;
    // Примерная формула для "потенциала" защиты
    const base = agility / 13;
    // Если в конфиге нет poolMult, считаем его равным 1
    const mult = sizeConf.poolMult || 1; 
    return Math.max(1, Math.floor(base * mult));
}

/**
 * Расчет Скорости
 */
export function calculateSpeed(agility, bonus = 0) {
    const base = 10;
    const agiBonus = Math.floor(agility / 5);
    return base + agiBonus + bonus;
}

/**
 * Расчёт пассивного КУ от Плотности Костей
 * Используется и в display, и в combat logic
 */
export function calculateBoneKU(boneDensity) {
    if (boneDensity <= 20) return 2;
    if (boneDensity < 35) return 3;
    if (boneDensity < 55) return 4;
    if (boneDensity < 80) return 5;
    return Math.floor(5 + (boneDensity - 70) / 30);
}
  
/**
 * Расчёт критического порога
 */
export function getCritThreshold(flexibility) {
    const bonus = Math.floor(flexibility / 50);
    return Math.max(65, 95 - bonus);
}
  
/**
 * Проверка фланкирования
 */
export function isFlanked(target, attacker) {
    if (target.system.combat?.conditions?.flanked === true) return true;
    if (!canvas.grid) return false;
    
    // Получаем токены через getActiveTokens()
    const targetTokens = target.getActiveTokens();
    if (targetTokens.length === 0) return false;
    const targetToken = targetTokens[0];
    
    const attackerTokens = attacker.getActiveTokens();
    if (attackerTokens.length === 0) return false;
    const attackerToken = attackerTokens[0];

    const gridDist = canvas.scene.grid.distance; 

    const allies = canvas.tokens.placeables.filter(t => {
        // Игнорируем самого атакующего
        if (t.id === attackerToken.id) return false;
        
        // Проверка диспозиции (союзник)
        if (t.document.disposition !== attackerToken.document.disposition) return false;
        
        // Живой?
        if (t.actor?.system?.resources?.hp?.value <= 0) return false;
        
        // Дистанция до цели
        const start = { x: t.x, y: t.y };
        const end = { x: targetToken.x, y: targetToken.y };
        const measurement = canvas.grid.measurePath([start, end]);
        const distMeters = measurement.distance;
        const reachCells = getActorReach(t.actor); 
        const reachMeters = reachCells * gridDist;
        
        return distMeters <= reachMeters + 0.5;
    });
    
    if (allies.length === 0) return false;
    
    // Углы
    const atkAngle = Math.atan2(targetToken.y - attackerToken.y, targetToken.x - attackerToken.x);
    
    for (let ally of allies) {
        const allyAngle = Math.atan2(targetToken.y - ally.y, targetToken.x - ally.x);
        let diff = Math.abs(atkAngle - allyAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        
        if (diff >= 2.35 && diff <= 3.93) return true;
    }
    
    return false;
}
  
/**
 * Вспомогательная: Досягаемость в клетках
 */
function getActorReach(actor) {
    if (!actor) return 1;
    let maxReach = 1;
    
    for (let item of actor.items) {
      if (item.type === "weapon" && item.system.equipStatus === "equipped" && item.system.attackType === "melee") {
        const range = item.system.range || 1;
        if (range > maxReach) maxReach = range;
      }
    }
    return maxReach;
}
