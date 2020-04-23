'use strict';

System.register(['./thredds'], function (_export, _context) {
  "use strict";

  var Thredds;
  function link(scope, elem, attrs, ctrl) {
    var mapContainer = elem.find('.mapcontainer');
    console.log('initialized map renderer');

    ctrl.events.on('render', function () {
      render();
      if (ctrl.map) {
        setTimeout(function () {
          ctrl.map.resize();
        }, 500);
      }
      ctrl.renderingCompleted();
    });

    function render() {
      console.log('called into RENDER');
      if (!ctrl.map) {
        // console.log('creating new map');
        ctrl.map = new Thredds(ctrl, mapContainer[0]);
      }

      ctrl.map.resize();

      if (ctrl.mapCenterMoved) ctrl.map.panToMapCenter();

      // if (!ctrl.map.legend && ctrl.panel.showLegend) ctrl.map.createLegend();

      // ctrl.updateRamp();
      ctrl.map.drawLayerFrames();
    }
  }

  _export('default', link);

  return {
    setters: [function (_thredds) {
      Thredds = _thredds.default;
    }],
    execute: function () {}
  };
});
//# sourceMappingURL=map_renderer.js.map
