/* eslint-disable id-length, no-unused-vars */
import moment from 'moment';
import mapboxgl from './libs/mapbox-gl';
import * as d3 from './libs/d3';
/* eslint-disable id-length, no-unused-vars */

export default class Thredds {
    constructor(ctrl, mapContainer) {
        console.log('NEW constructor')
        this.ctrl = ctrl;
        this.mapContainer = mapContainer;
        this.createMap();
        this.frames = []; // list of timestamps
        this.currentFrameIndex = 0;
        this.animation = {};
    }

    setFrame(frameIndex)
    {
        if (this.animation) {
            this.stopAnimation();
        }
        this.currentFrameIndex = frameIndex - 1;
        this.stepFrame();
    }

    createMap() {
        console.log('rebuilding map');
        const mapCenterLonLat = [parseFloat(this.ctrl.panel.mapCenterLongitude), parseFloat(this.ctrl.panel.mapCenterLatitude)];
        mapboxgl.accessToken = this.ctrl.panel.mbApiKey;
        this.map = new mapboxgl.Map({
            container: this.mapContainer,
            style: 'mapbox://styles/mapbox/' + this.ctrl.panel.mapStyle,
            center: mapCenterLonLat,
            zoom: parseFloat(this.ctrl.panel.initialZoom),
            interactive: this.ctrl.panel.userInteractionEnabled
        });
    }

    createLegend() {
        this.legend = {};
    }

    needToRedrawFrames() {
        this.legend = {};
        return true;
    }

    drawLayerFrames() {
        const data = this.ctrl.data;
        if (this.needToRedrawFrames(data)) {
            console.log('needToRedrawFrames')
            this.stopAnimation();
            this.clearFrames();
            this.createFrames(data);
            // this.setFrame(0);
            this.startAnimation();
        }
    }

    clearFrames() {
        this.frames.forEach((item) => {
            if (this.map.getLayer('f-' + item))
                this.map.removeLayer('f-' + item);
        });
        this.frames = [];
    }

    createFrames() {
        console.log('createFrames')
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
            let attemptsLeft = 10;
            const interval = setInterval(() => {
                console.log('waited for layer to load.');
                if (this.map.loaded()) {
                    this.createFramesSafely();
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

    createFramesSafely() {
        console.log('createFramesSafely')
        console.log('createFramesSafely',this.ctrl.dataCharacteristics.timeValues)
        this.ctrl.dataCharacteristics.timeValues.forEach((time) => {
            // console.log(time)
            console.log(this.ctrl.panel.thredds)
            const frameName = 'f-' + time;
            const wmsUrl = `${this.ctrl.panel.thredds.url}?LAYERS=${this.ctrl.panel.thredds.parameter}&ELEVATION=0&TIME=${time}&TRANSPARENT=true&STYLES=boxfill%2Fsst_36&COLORSCALERANGE=${this.ctrl.panel.thredds.scale_min},${this.ctrl.panel.thredds.scale_max}&NUMCOLORBANDS=80&LOGSCALE=false&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&SRS=EPSG%3A3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256`;
            console.log('wmsUrl', wmsUrl);
            if (this.map) {
                if (!this.map.getSource('f-' + time))
                    this.map.addSource('f-' + time, {
                        type: 'raster',
                        tiles: [wmsUrl],
                        width: 256,
                        height: 256
                    });
            }

            if(!this.frames.includes(time))
                this.frames.push(time);
        });

        // get slider component, set min/max/value
        const slider = d3.select('#map_' + this.ctrl.panel.id + '_slider')
            .attr('min', 0)
            .attr('max', (this.frames.length -1))
        ;
    }


    startAnimation() {
        if (this.animation) {
            this.stopAnimation();
        }

        this.animation = setInterval(() => {
            this.stepFrame();
        }, 3000);
    }

    stopAnimation() {
        clearInterval(this.animation);
        this.animation = null;
    }

    pauseAnimation() {
        clearInterval(this.animation);
        // this.animation = null;
    }

    stepFrame(goToIndex) {
        console.log('stepFrame', this.frames.length, this.currentFrameIndex)
        if (!this.map) {
            return;
        }
        if (this.frames.length === 0) {
            // console.log('skipping animation: no frames');
            return;
        }
        const oldFrame = 'f-' + this.frames[this.currentFrameIndex];

        if(!goToIndex && goToIndex !== 0) {
            this.currentFrameIndex += 1;
        } else {
            this.currentFrameIndex = goToIndex;
        }
        if (this.currentFrameIndex >= this.frames.length) {
            this.currentFrameIndex = 0;
        }
        const newFrame = 'f-' + this.frames[this.currentFrameIndex];

        console.log(newFrame, oldFrame)
        if(this.map.getLayer(oldFrame)) {
            this.map.removeLayer(oldFrame);
        }
        const newLayer = {
            id: newFrame,
            type: 'raster',
            source: newFrame,
            paint: {
                "raster-opacity": 1,
            },
        }
        this.map.addLayer(newLayer);
        // this.map.setPaintProperty(newFrame, 'raster-opacity', 1);
        // this.map.setPaintProperty(oldFrame, 'raster-opacity', 0);

        // set time string in legend
        d3.select('#map_' + this.ctrl.panel.id + '_date').text(moment(this.frames[this.currentFrameIndex]).format('DD-MM-YYYY HH:mm'));
        // set slider position to indicate time-location
        d3.select('#map_' + this.ctrl.panel.id + '_slider').property('value', this.currentFrameIndex);
    }

    resize() {
        this.map.resize();
    }

    panToMapCenter() {
        this.map.panTo([parseFloat(this.ctrl.panel.mapCenterLongitude), parseFloat(this.ctrl.panel.mapCenterLatitude)]);
        this.ctrl.mapCenterMoved = false;
    }

    setZoom(zoomFactor) {
        this.map.setZoom(parseInt(zoomFactor, 10));
    }

    remove() {
        if (this.map) {
            this.map.remove();
        }
        this.map = null;
    }
}
