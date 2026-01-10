const BaseTemplate = foundry.canvas?.placeables?.MeasuredTemplate || MeasuredTemplate;

export class AbilityTemplate extends BaseTemplate {
  /**
   * Рисует превью шаблона, следующего за мышью
   */
  drawPreview() {
    const initialLayer = canvas.activeLayer;

    // Переключаемся на слой шаблонов
    this.draw();
    this.layer.activate();
    this.layer.preview.addChild(this);

    // Слушатели событий
    this.activatePreviewListeners(initialLayer);
  }

  activatePreviewListeners(initialLayer) {
    const handlers = {};
    let moveTime = 0;

    // Обновление позиции при движении мыши
    handlers.mm = (event) => {
      const now = Date.now();
      if (now - moveTime < 10) return;
      moveTime = now;
      
      const center = event.data.getLocalPosition(this.layer);
      // Привязка к сетке (опционально)
      const snapped = canvas.grid.getSnappedPosition(center.x, center.y, 2);
      
      this.document.x = snapped.x;
      this.document.y = snapped.y;
      
      // Для конуса/луча обновляем направление
      if (this.document.t !== "circle" && this.document.t !== "rect") {
         // Логика вращения (можно добавить позже)
      }
      
      this.refresh();
    };

    // Клик - создание шаблона
    handlers.mc = async (event) => {
      handlers.rc(event); // Отключаем слушатели
      
      const destination = canvas.grid.getSnappedPosition(this.document.x, this.document.y, 2);
      this.document.x = destination.x;
      this.document.y = destination.y;

      await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [this.document.toObject()]);
    };

    // ПКМ - отмена
    handlers.rc = (event) => {
      this.layer.preview.removeChildren();
      canvas.stage.off("mousemove", handlers.mm);
      canvas.stage.off("mousedown", handlers.mc);
      canvas.app.view.oncontextmenu = null;
      initialLayer.activate();
    };

    // Регистрируем
    canvas.stage.on("mousemove", handlers.mm);
    canvas.stage.on("mousedown", handlers.mc);
    canvas.app.view.oncontextmenu = handlers.rc;
  }
}