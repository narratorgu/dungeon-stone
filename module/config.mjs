export const DUNGEON = {};

DUNGEON.XP_TABLE = {
  1: 6,
  2: 30,
  3: 150,
  4: 300,
  5: 600,
  6: 1200,
  7: 2500,
  8: 5000,
  9: 10000,
  10: 15000,
  11: 999999
};

DUNGEON.damageTypes = {
  slashing: "Режущий",
  blunt: "Дробящий",
  piercing: "Колющий",
  poison: "Яд",
  acid: "Кислота",
  fire: "Огонь",
  cold: "Холод",
  lightning: "Молния",
  light: "Свет",
  dark: "Тьма",
  psychic: "Психический",
  pure: "Чистый"
};

DUNGEON.damageSeverity = {
    none: "Нет урона",
    scratch: "Царапина",
    light: "Легкая рана",
    moderate: "Средняя рана",
    heavy: "Тяжелая рана",
    critical: "Критическая рана",
    fatal: "Смертельная рана"
};

DUNGEON.attackTypes = {
  melee: "Ближний бой",
  ranged: "Стрелковое",
  thrown: "Метательное"
};

DUNGEON.proficiencies = {
  bladed: "Клинковое",
  blunt: "Дробящее",
  polearm: "Древковое",
  axes: "Топоры",
  unarmed: "Безоружный"
};

DUNGEON.sizes = {
  tiny: { label: "Крохотный", dcMult: 1.5, poolMult: 0.5 },
  small: { label: "Маленький", dcMult: 1.25, poolMult: 0.75 },
  medium: { label: "Средний", dcMult: 1.0, poolMult: 1.0 },
  large: { label: "Большой", dcMult: 0.8, poolMult: 1.25 },
  giant: { label: "Гигантский", dcMult: 0.66, poolMult: 1.5 },
  monstrous: { label: "Чудовищный", dcMult: 0.5, poolMult: 2.0 }
};

DUNGEON.ranks = {
  9: "Ранг 9",
  8: "Ранг 8",
  7: "Ранг 7",
  6: "Ранг 6",
  5: "Ранг 5",
  4: "Ранг 4",
  3: "Ранг 3",
  2: "Ранг 2",
  1: "Ранг 1",
};
