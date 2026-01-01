import { DUNGEON } from "../config.mjs";

const BaseItemSheet = foundry.appv1 ? foundry.appv1.sheets.ItemSheet : ItemSheet;

export class DungeonItemSheet extends BaseItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 600,
      height: 500,
      classes: ["dungeon-stone", "sheet", "item"],
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  get template() {
    const type = this.item.type;
    if (type === 'weapon') return "systems/dungeon-stone/templates/item/item-weapon-sheet.hbs";
    if (type === 'essence') return "systems/dungeon-stone/templates/item/item-essence-sheet.hbs";
    if (type === 'role') return "systems/dungeon-stone/templates/item/item-role-sheet.hbs";
    if (type === 'spell') return "systems/dungeon-stone/templates/item/item-spell-sheet.hbs";
    if (type === 'lineage') return "systems/dungeon-stone/templates/item/item-lineage-sheet.hbs"; // Новый шаблон
    return "systems/dungeon-stone/templates/item/item-base-sheet.hbs";
  }

  async getData() {
    const context = await super.getData();
    context.system = this.item.system;
    context.config = DUNGEON;
    
    // Подготовка эффектов для отображения
    context.effects = this.item.effects.map(e => {
        return {
            id: e.id,
            name: e.name,
            img: e.icon,
            disabled: e.disabled
        };
    });

    return context;
  }

  activateListeners(html) {
      super.activateListeners(html);
      if (!this.isEditable) return;

      // Управление Эффектами
      html.find(".effect-create").click(ev => {
          this.item.createEmbeddedDocuments("ActiveEffect", [{
              name: "Новый Эффект",
              icon: "icons/svg/aura.svg"
          }]);
      });

      html.find(".effect-edit").click(ev => {
          const effectId = ev.currentTarget.closest(".effect-item").dataset.effectId;
          const effect = this.item.effects.get(effectId);
          effect.sheet.render(true);
      });

      html.find(".effect-delete").click(ev => {
          const effectId = ev.currentTarget.closest(".effect-item").dataset.effectId;
          this.item.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
      });
      
      html.find(".effect-toggle").click(ev => {
          const effectId = ev.currentTarget.closest(".effect-item").dataset.effectId;
          const effect = this.item.effects.get(effectId);
          effect.update({disabled: !effect.disabled});
      });
  }
}
