/**
 * Global maplibre-gl mock for Vitest.
 *
 * MapLibre GL requires WebGL and a real canvas, which jsdom doesn't provide.
 * This stub replaces every MapLibre class/method with no-ops so components
 * that render a map don't crash in the test environment.
 */

const noop = () => {};
const returnThis = function (this: unknown) { return this; };
const returnMap = function (this: unknown) { return mockMap; };

const mockMap = {
  on: returnThis,
  off: returnThis,
  once: returnThis,
  remove: noop,
  addControl: noop,
  removeControl: noop,
  addLayer: noop,
  removeLayer: noop,
  addSource: noop,
  removeSource: noop,
  getSource: () => null,
  getLayer: () => null,
  setStyle: noop,
  flyTo: noop,
  easeTo: noop,
  jumpTo: noop,
  fitBounds: noop,
  setBearing: noop,
  setPitch: noop,
  setZoom: noop,
  setCenter: noop,
  getCenter: () => ({ lng: 0, lat: 0 }),
  getZoom: () => 12,
  getBounds: () => ({ toArray: () => [[0, 0], [0, 0]] }),
  project: () => ({ x: 0, y: 0 }),
  unproject: () => ({ lng: 0, lat: 0 }),
  isStyleLoaded: () => true,
  loaded: () => true,
  resize: noop,
  setPaintProperty: noop,
  setLayoutProperty: noop,
  setFilter: noop,
  getCanvas: () => document.createElement('canvas'),
  getContainer: () => document.createElement('div'),
  queryRenderedFeatures: () => [],
};

class MockMap {
  constructor() { Object.assign(this, mockMap); }
}

class MockMarker {
  _lngLat = { lng: 0, lat: 0 };
  _element: HTMLElement | null = null;

  constructor(options?: { element?: HTMLElement }) {
    if (options?.element) this._element = options.element;
  }
  setLngLat(lngLat: unknown) { return this; }
  addTo(map: unknown) { return this; }
  remove() { return this; }
  getLngLat() { return this._lngLat; }
  getElement() { return this._element ?? document.createElement('div'); }
  setDraggable(v: boolean) { return this; }
  on(event: string, cb: () => void) { return this; }
}

class MockNavigationControl {
  onAdd() { return document.createElement('div'); }
  onRemove() {}
}

class MockGeolocateControl {
  on = returnThis;
  trigger = noop;
  onAdd() { return document.createElement('div'); }
  onRemove() {}
}

class MockLngLatBounds {
  extend() { return this; }
  toArray() { return [[0, 0], [0, 0]]; }
}

const maplibregl = {
  Map: MockMap,
  Marker: MockMarker,
  NavigationControl: MockNavigationControl,
  GeolocateControl: MockGeolocateControl,
  LngLatBounds: MockLngLatBounds,
  supported: () => true,
  setRTLTextPlugin: noop,
  addProtocol: noop,
  removeProtocol: noop,
};

export default maplibregl;
export const { Map, Marker, NavigationControl, GeolocateControl, LngLatBounds } = maplibregl;
