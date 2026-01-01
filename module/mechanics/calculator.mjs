import { DUNGEON } from "../config.mjs";

/**
 * Расчет максимального HP
 * @param {number} endurance - Выносливость (или Телосложение * 2)
 * @param {number} boneDensity - Плотность костей
 * @returns {number}
 */
export function calculateMaxHP(endurance, boneDensity) {
    const mult = 1 + (boneDensity / 100);
    return Math.floor(endurance * mult);
}

/**
 * Расчет максимальной Маны (Духа)
 * @param {number} spirit - Атрибут Дух
 * @returns {number}
 */
export function calculateMaxMana(spirit) {
    return Math.floor(spirit * 1.5);
}

/**
 * Расчет Физического Сопротивления (%)
 * Формула: 20 * ln(1 + (Плотность + ФизСопр) / 10)
 */
export function calculatePhysRes(boneDensity, flatResist) {
    const val = 20 * Math.log(1 + ((boneDensity + flatResist) / 10));
    return Math.floor(val);
}

/**
 * Расчет Магического Сопротивления (%)
 * Формула: 15 * ln(1 + МагСопр / 10)
 */
export function calculateMagRes(magicResist) {
    const val = 15 * Math.log(1 + (magicResist / 10));
    return Math.floor(val);
}

/**
 * Получить порог опыта для следующего уровня
 * @param {number} level 
 * @returns {number}
 */
export function getXPThreshold(level) {
    return DUNGEON.XP_TABLE[level] || 999999;
}

/**
 * Расчет количества кубов для броска
 * @param {number} statValue 
 * @returns {number} минимум 1
 */
export function getDicePool(statValue) {
    let pool = Math.floor(statValue / 13);
    return pool < 1 ? 1 : pool;
}

/**
 * Мультипликативная формула сопротивления
 * Resist = 1 - (1 - Phys) * (1 - Specific)
 */
export function calculateTotalResist(physResistPercent, specificResistPercent) {
    const p = physResistPercent / 100;
    const s = specificResistPercent / 100;
    const result = 1 - (1 - p) * (1 - s);
    return Math.round(result * 100);
}

/**
 * Расчет КС (Класса Сложности) для защиты
 */
export function calculateDC(actorData, attackerAgility = null) {
    // 1. Безопасное получение размера
    // Если details нет или size нет, используем 'medium'
    const sizeKey = actorData?.details?.size || "medium";
    const sizeConf = DUNGEON.sizes[sizeKey] || DUNGEON.sizes.medium;
    
    // 2. База: 50 * Множитель
    let dc = 50 * sizeConf.dcMult;
    
    // 3. Доспех и Щит (с проверкой существования combat)
    if (actorData?.combat) {
        dc += (actorData.combat.armorBonus || 0);
        if (actorData.combat.shieldRaised) {
            dc += (actorData.combat.shieldBonus || 0);
        }
    }
    
    // 4. Сравнение Ловкости
    if (attackerAgility !== null && actorData?.subAttributes?.agility !== undefined) {
        const defenderAgility = actorData.subAttributes.agility;
        const diff = defenderAgility - attackerAgility;
        
        if (diff > 5) dc += 15;
        if (defenderAgility > (attackerAgility * 3)) dc += 30;
        
        const atkDiff = attackerAgility - defenderAgility;
        if (atkDiff > 5) dc -= 15;
        if (attackerAgility > (defenderAgility * 3)) dc -= 30;
    }
    
    return Math.round(dc);
}

export function calculateKU(agility, size) {
    const sizeConf = DUNGEON.sizes[size] || DUNGEON.sizes.medium;
    const base = agility / 13;
    const ku = Math.floor(base * sizeConf.poolMult);
    return Math.max(1, ku);
}

/**
 * Расчет Скорости перемещения (м)
 * База 10м + (Ловкость / 5) + Бонусы
 */
export function calculateSpeed(agility, bonus = 0) {
    const base = 10;
    const agiBonus = Math.floor(agility / 5);
    return base + agiBonus + bonus;
}
