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

DUNGEON.ranks = {
  9: "Ранг 9",
  8: "Ранг 8",
  7: "Ранг 7",
  6: "Ранг 6",
  5: "Ранг 5",
  4: "Ранг 4",
  3: "Ранг 3",
  2: "Ранг 2",
  1: "Ранг 1"
};

// dcMod = модификатор КС попадания по цели данного размера
DUNGEON.sizes = {
  tiny:      { label: "Крохотный",   dcMod: 20 },
  small:     { label: "Маленький",   dcMod: 10 },
  medium:    { label: "Средний",     dcMod: 0 },
  large:     { label: "Большой",     dcMod: -10 },
  giant:     { label: "Гигантский",  dcMod: -20 },
  colossal:  { label: "Чудовищный",  dcMod: -30 }
};

DUNGEON.damageTypes = {
  slashing:  "Режущий",
  blunt:     "Дробящий",
  piercing:  "Колющий",
  fire:      "Огонь",
  cold:      "Холод",
  lightning: "Молния",
  acid:      "Кислота",
  poison:    "Яд",
  psychic:   "Психический",
  light:     "Свет",
  dark:      "Тьма",
  pure:      "Чистый"
};

DUNGEON.damageSeverity = {
  none:     "Нет урона",
  scratch:  "Царапина",
  light:    "Лёгкая рана",
  moderate: "Средняя рана",
  heavy:    "Тяжёлая рана",
  critical: "Критическая рана",
  fatal:    "Смертельная рана"
};

DUNGEON.attackTypes = {
  melee:  "Ближний бой",
  ranged: "Стрелковое",
  thrown: "Метательное"
};

DUNGEON.armorSlots = {
  head: "Голова",
  shoulders: "Плечи",
  body: "Корпус",
  arms: "Руки (наручи)",
  hands: "Кисти (перчатки)",
  legs: "Ноги",
  feet: "Ступни",
  neck: "Шея",
  ring: "Палец",
  cloak: "Плащ",
  shield: "Щит"
};

DUNGEON.equipStatus = {
  stored: "В рюкзаке",
  carried: "Носимое (быстрый доступ)",
  equipped: "Экипировано"
};

DUNGEON.proficiencies = {
  bladed:   "Клинковое",
  blunt:    "Дробящее",
  polearm:  "Древковое",
  unarmed:  "Безоружный",
  throwing: "Метательное"
};

DUNGEON.subAttributes = {
  strength:    "Сила",
  agility:     "Ловкость",
  precision:   "Точность",
  flexibility: "Гибкость",
  
  stamina:             "Выносливость",
  fortitude:           "Стойкость",
  naturalRegeneration: "Ест. регенерация",
  
  boneDensity: "Плотность костей",
  height:      "Рост",
  weight:      "Вес",
  metabolism:  "Метаболизм",
  
  vision:  "Зрение",
  hearing: "Слух",
  touch:   "Осязание",
  smell:   "Обоняние",
  
  cuttingForce:  "Режущая сила",
  crushingForce: "Дробящая сила",
  piercingForce: "Колющая сила",
  
  cognition:     "Когнитивность",
  willpower:     "Воля",
  intuition:     "Интуиция",
  consciousness: "Сознание",
  
  soulPower:       "Сила души",
  manaSense:       "Чувство маны",
  spiritRecovery:  "Восст. духа",
  magicResistance: "Маг. сопротивление",
  
  luck:            "Удача",
  presence:        "Присутствие",
  divinePowerStat: "Божественная сила",
  dragonPowerStat: "Драконья сила"
};
