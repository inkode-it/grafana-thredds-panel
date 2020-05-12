'use strict';

System.register(['moment', './libs/mapbox-gl', './libs/d3'], function (_export, _context) {
    "use strict";

    var moment, mapboxgl, d3, _createClass, Thredds;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    return {
        setters: [function (_moment) {
            moment = _moment.default;
        }, function (_libsMapboxGl) {
            mapboxgl = _libsMapboxGl.default;
        }, function (_libsD) {
            d3 = _libsD;
        }],
        execute: function () {
            _createClass = function () {
                function defineProperties(target, props) {
                    for (var i = 0; i < props.length; i++) {
                        var descriptor = props[i];
                        descriptor.enumerable = descriptor.enumerable || false;
                        descriptor.configurable = true;
                        if ("value" in descriptor) descriptor.writable = true;
                        Object.defineProperty(target, descriptor.key, descriptor);
                    }
                }

                return function (Constructor, protoProps, staticProps) {
                    if (protoProps) defineProperties(Constructor.prototype, protoProps);
                    if (staticProps) defineProperties(Constructor, staticProps);
                    return Constructor;
                };
            }();

            Thredds = function () {
                function Thredds(ctrl, mapContainer) {
                    _classCallCheck(this, Thredds);

                    console.log('NEW constructor');
                    this.ctrl = ctrl;
                    this.mapContainer = mapContainer;
                    this.createMap();
                    this.frames = []; // list of timestamps
                    this.currentFrameIndex = 0;
                    this.animation = {};
                }

                _createClass(Thredds, [{
                    key: 'setFrame',
                    value: function setFrame(frameIndex) {
                        if (this.animation) {
                            this.stopAnimation();
                        }
                        this.currentFrameIndex = frameIndex - 1;
                        this.stepFrame();
                    }
                }, {
                    key: 'createMap',
                    value: function createMap() {
                        console.log('rebuilding map');
                        var mapCenterLonLat = [parseFloat(this.ctrl.panel.mapCenterLongitude), parseFloat(this.ctrl.panel.mapCenterLatitude)];
                        mapboxgl.accessToken = this.ctrl.panel.mbApiKey;
                        this.map = new mapboxgl.Map({
                            container: this.mapContainer,
                            style: 'mapbox://styles/mapbox/' + this.ctrl.panel.mapStyle,
                            center: mapCenterLonLat,
                            zoom: parseFloat(this.ctrl.panel.initialZoom),
                            interactive: this.ctrl.panel.userInteractionEnabled
                        });
                    }
                }, {
                    key: 'createLegend',
                    value: function createLegend() {
                        this.legend = {};
                    }
                }, {
                    key: 'needToRedrawFrames',
                    value: function needToRedrawFrames() {
                        this.legend = {};
                        return true;
                    }
                }, {
                    key: 'drawLayerFrames',
                    value: function drawLayerFrames() {
                        var data = this.ctrl.data;
                        if (this.needToRedrawFrames(data)) {
                            console.log('needToRedrawFrames');
                            this.stopAnimation();
                            this.clearFrames();
                            this.createFrames(data);
                            // this.setFrame(0);
                            this.startAnimation();
                        }
                    }
                }, {
                    key: 'clearFrames',
                    value: function clearFrames() {
                        var _this = this;

                        this.frames.forEach(function (item) {
                            if (_this.map.getLayer('f-' + item)) _this.map.removeLayer('f-' + item);
                        });
                        this.frames = [];
                    }
                }, {
                    key: 'createFrames',
                    value: function createFrames() {
                        var _this2 = this;

                        console.log('createFrames');
                        if (!this.ctrl.dataCharacteristics.timeValues) {
                            console.log('no series to display');
                            return;
                        }

                        if (!this.ctrl.thredds) {
                            console.log('no thredds data');
                            return;
                        }

                        if (this.map.loaded()) {
                            this.createFramesSafely();
                        } else {
                            console.log('no geo source in map. maybe not loaded?');
                            // this is stupid to use setInterval.
                            // but mapbox doesn't seem to have a on-source-loaded event that reliably works
                            // for this purpose.
                            var attemptsLeft = 10;
                            var interval = setInterval(function () {
                                console.log('waited for layer to load.');
                                if (_this2.map.loaded()) {
                                    _this2.createFramesSafely();
                                    clearInterval(interval);
                                } else {
                                    console.log('still no geo source. try refresh manually?');
                                    if (--attemptsLeft <= 0) {
                                        clearInterval(interval);
                                    }
                                }
                            }, 500);
                        }
                    }
                }, {
                    key: 'createFramesSafely',
                    value: function createFramesSafely() {
                        var _this3 = this;

                        console.log('createFramesSafely');
                        console.log('createFramesSafely', this.ctrl.dataCharacteristics.timeValues);
                        this.ctrl.dataCharacteristics.timeValues.forEach(function (time) {
                            // console.log(time)
                            console.log(_this3.ctrl.panel.thredds);
                            var frameName = 'f-' + time;
                            var wmsUrl = _this3.ctrl.panel.thredds.url + '?LAYERS=' + _this3.ctrl.panel.thredds.parameter + '&ELEVATION=0&TIME=' + time + '&TRANSPARENT=true&STYLES=boxfill%2Fsst_36&COLORSCALERANGE=' + _this3.ctrl.panel.thredds.scale_min + ',' + _this3.ctrl.panel.thredds.scale_max + '&NUMCOLORBANDS=80&LOGSCALE=false&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&SRS=EPSG%3A3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256';
                            console.log('wmsUrl', wmsUrl);
                            if (_this3.map) {
                                if (!_this3.map.getSource('f-' + time)) _this3.map.addSource('f-' + time, {
                                    type: 'raster',
                                    tiles: [wmsUrl],
                                    width: 256,
                                    height: 256
                                });
                            }

                            if (!_this3.frames.includes(time)) _this3.frames.push(time);
                        });

                        // get slider component, set min/max/value
                        var slider = d3.select('#map_' + this.ctrl.panel.id + '_slider').attr('min', 0).attr('max', this.frames.length - 1);
                    }
                }, {
                    key: 'startAnimation',
                    value: function startAnimation() {
                        var _this4 = this;

                        if (this.animation) {
                            this.stopAnimation();
                        }

                        this.animation = setInterval(function () {
                            _this4.stepFrame();
                        }, 3000);
                    }
                }, {
                    key: 'stopAnimation',
                    value: function stopAnimation() {
                        clearInterval(this.animation);
                        this.animation = null;
                    }
                }, {
                    key: 'pauseAnimation',
                    value: function pauseAnimation() {
                        clearInterval(this.animation);
                        // this.animation = null;
                    }
                }, {
                    key: 'stepFrame',
                    value: function stepFrame(goToIndex) {
                        console.log('stepFrame', this.frames.length, this.currentFrameIndex);
                        if (!this.map) {
                            return;
                        }
                        if (this.frames.length === 0) {
                            // console.log('skipping animation: no frames');
                            return;
                        }
                        var oldFrame = 'f-' + this.frames[this.currentFrameIndex];

                        if (!goToIndex && goToIndex !== 0) {
                            this.currentFrameIndex += 1;
                        } else {
                            this.currentFrameIndex = goToIndex;
                        }
                        if (this.currentFrameIndex >= this.frames.length) {
                            this.currentFrameIndex = 0;
                        }
                        var newFrame = 'f-' + this.frames[this.currentFrameIndex];

                        console.log(newFrame, oldFrame);
                        if (this.map.getLayer(oldFrame)) {
                            this.map.removeLayer(oldFrame);
                        }
                        var newLayer = {
                            id: newFrame,
                            type: 'raster',
                            source: newFrame,
                            paint: {
                                "raster-opacity": 1
                            }
                        };
                        this.map.addLayer(newLayer);
                        // this.map.setPaintProperty(newFrame, 'raster-opacity', 1);
                        // this.map.setPaintProperty(oldFrame, 'raster-opacity', 0);

                        // set time string in legend
                        d3.select('#map_' + this.ctrl.panel.id + '_date').text(moment(this.frames[this.currentFrameIndex]).format('DD-MM-YYYY HH:mm'));
                        // set slider position to indicate time-location
                        d3.select('#map_' + this.ctrl.panel.id + '_slider').property('value', this.currentFrameIndex);
                    }
                }, {
                    key: 'resize',
                    value: function resize() {
                        this.map.resize();
                    }
                }, {
                    key: 'panToMapCenter',
                    value: function panToMapCenter() {
                        this.map.panTo([parseFloat(this.ctrl.panel.mapCenterLongitude), parseFloat(this.ctrl.panel.mapCenterLatitude)]);
                        this.ctrl.mapCenterMoved = false;
                    }
                }, {
                    key: 'setZoom',
                    value: function setZoom(zoomFactor) {
                        this.map.setZoom(parseInt(zoomFactor, 10));
                    }
                }, {
                    key: 'remove',
                    value: function remove() {
                        if (this.map) {
                            this.map.remove();
                        }
                        this.map = null;
                    }
                }]);

                return Thredds;
            }();

            _export('default', Thredds);
        }
    };
});
//# sourceMappingURL=thredds.js.map
