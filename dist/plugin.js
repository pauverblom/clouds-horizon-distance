const __pluginConfig =  {
  "name": "windy-plugin-horizon-distance-fork",
  "version": "0.9.6",
  "title": "Clouds Horizon Distance (Custom Fork)",
  "description": "Displays circles on the Windy map representing horizon distances for different cloud heights with 1-minute time navigation controls.",
  "author": "Pau Verdeguer (forked from Francesco Gola)",
  "icon": "☀️",
  "desktopUI": "embedded",
  "mobileUI": "small",
  "built": 1785056075805,
  "builtReadable": "2026-07-26T08:54:35.805Z",
  "screenshot": "screenshot.jpg"
};

// transformCode: import { map } from '@windy/map';
const { map } = W.map;

// transformCode: import store from '@windy/store';
const store = W.store;

// transformCode: import { isMobileOrTablet } from '@windy/rootScope';
const { isMobileOrTablet } = W.rootScope;


/** @returns {void} */
function noop() {}

function run(fn) {
	return fn();
}

function blank_object() {
	return Object.create(null);
}

/**
 * @param {Function[]} fns
 * @returns {void}
 */
function run_all(fns) {
	fns.forEach(run);
}

/**
 * @param {any} thing
 * @returns {thing is Function}
 */
function is_function(thing) {
	return typeof thing === 'function';
}

/** @returns {boolean} */
function safe_not_equal(a, b) {
	return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
}

/** @returns {boolean} */
function is_empty(obj) {
	return Object.keys(obj).length === 0;
}

/**
 * @param {Node} target
 * @param {Node} node
 * @returns {void}
 */
function append(target, node) {
	target.appendChild(node);
}

/**
 * @param {Node} target
 * @param {string} style_sheet_id
 * @param {string} styles
 * @returns {void}
 */
function append_styles(target, style_sheet_id, styles) {
	const append_styles_to = get_root_for_style(target);
	if (!append_styles_to.getElementById(style_sheet_id)) {
		const style = element('style');
		style.id = style_sheet_id;
		style.textContent = styles;
		append_stylesheet(append_styles_to, style);
	}
}

/**
 * @param {Node} node
 * @returns {ShadowRoot | Document}
 */
function get_root_for_style(node) {
	if (!node) return document;
	const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
	if (root && /** @type {ShadowRoot} */ (root).host) {
		return /** @type {ShadowRoot} */ (root);
	}
	return node.ownerDocument;
}

/**
 * @param {ShadowRoot | Document} node
 * @param {HTMLStyleElement} style
 * @returns {CSSStyleSheet}
 */
function append_stylesheet(node, style) {
	append(/** @type {Document} */ (node).head || node, style);
	return style.sheet;
}

/**
 * @param {Node} target
 * @param {Node} node
 * @param {Node} [anchor]
 * @returns {void}
 */
function insert(target, node, anchor) {
	target.insertBefore(node, anchor || null);
}

/**
 * @param {Node} node
 * @returns {void}
 */
function detach(node) {
	if (node.parentNode) {
		node.parentNode.removeChild(node);
	}
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} name
 * @returns {HTMLElementTagNameMap[K]}
 */
function element(name) {
	return document.createElement(name);
}

/**
 * @param {string} data
 * @returns {Text}
 */
function text(data) {
	return document.createTextNode(data);
}

/**
 * @returns {Text} */
function space() {
	return text(' ');
}

/**
 * @returns {Text} */
function empty() {
	return text('');
}

/**
 * @param {EventTarget} node
 * @param {string} event
 * @param {EventListenerOrEventListenerObject} handler
 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
 * @returns {() => void}
 */
function listen(node, event, handler, options) {
	node.addEventListener(event, handler, options);
	return () => node.removeEventListener(event, handler, options);
}

/**
 * @param {Element} node
 * @param {string} attribute
 * @param {string} [value]
 * @returns {void}
 */
function attr(node, attribute, value) {
	if (value == null) node.removeAttribute(attribute);
	else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}

/**
 * @param {Element} element
 * @returns {ChildNode[]}
 */
function children(element) {
	return Array.from(element.childNodes);
}

/**
 * @param {Text} text
 * @param {unknown} data
 * @returns {void}
 */
function set_data(text, data) {
	data = '' + data;
	if (text.data === data) return;
	text.data = /** @type {string} */ (data);
}

/**
 * @typedef {Node & {
 * 	claim_order?: number;
 * 	hydrate_init?: true;
 * 	actual_end_child?: NodeEx;
 * 	childNodes: NodeListOf<NodeEx>;
 * }} NodeEx
 */

/** @typedef {ChildNode & NodeEx} ChildNodeEx */

/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

/**
 * @typedef {ChildNodeEx[] & {
 * 	claim_info?: {
 * 		last_index: number;
 * 		total_claimed: number;
 * 	};
 * }} ChildNodeArray
 */

let current_component;

/** @returns {void} */
function set_current_component(component) {
	current_component = component;
}

function get_current_component() {
	if (!current_component) throw new Error('Function called outside component initialization');
	return current_component;
}

/**
 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
 * it can be called from an external module).
 *
 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
 *
 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
 *
 * https://svelte.dev/docs/svelte#onmount
 * @template T
 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
 * @returns {void}
 */
function onMount(fn) {
	get_current_component().$$.on_mount.push(fn);
}

/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * https://svelte.dev/docs/svelte#ondestroy
 * @param {() => any} fn
 * @returns {void}
 */
function onDestroy(fn) {
	get_current_component().$$.on_destroy.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];

let render_callbacks = [];

const flush_callbacks = [];

const resolved_promise = /* @__PURE__ */ Promise.resolve();

let update_scheduled = false;

/** @returns {void} */
function schedule_update() {
	if (!update_scheduled) {
		update_scheduled = true;
		resolved_promise.then(flush);
	}
}

/** @returns {void} */
function add_render_callback(fn) {
	render_callbacks.push(fn);
}

// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();

let flushidx = 0; // Do *not* move this inside the flush() function

/** @returns {void} */
function flush() {
	// Do not reenter flush while dirty components are updated, as this can
	// result in an infinite loop. Instead, let the inner flush handle it.
	// Reentrancy is ok afterwards for bindings etc.
	if (flushidx !== 0) {
		return;
	}
	const saved_component = current_component;
	do {
		// first, call beforeUpdate functions
		// and update components
		try {
			while (flushidx < dirty_components.length) {
				const component = dirty_components[flushidx];
				flushidx++;
				set_current_component(component);
				update(component.$$);
			}
		} catch (e) {
			// reset dirty state to not end up in a deadlocked state and then rethrow
			dirty_components.length = 0;
			flushidx = 0;
			throw e;
		}
		set_current_component(null);
		dirty_components.length = 0;
		flushidx = 0;
		while (binding_callbacks.length) binding_callbacks.pop()();
		// then, once components are updated, call
		// afterUpdate functions. This may cause
		// subsequent updates...
		for (let i = 0; i < render_callbacks.length; i += 1) {
			const callback = render_callbacks[i];
			if (!seen_callbacks.has(callback)) {
				// ...so guard against infinite loops
				seen_callbacks.add(callback);
				callback();
			}
		}
		render_callbacks.length = 0;
	} while (dirty_components.length);
	while (flush_callbacks.length) {
		flush_callbacks.pop()();
	}
	update_scheduled = false;
	seen_callbacks.clear();
	set_current_component(saved_component);
}

/** @returns {void} */
function update($$) {
	if ($$.fragment !== null) {
		$$.update();
		run_all($$.before_update);
		const dirty = $$.dirty;
		$$.dirty = [-1];
		$$.fragment && $$.fragment.p($$.ctx, dirty);
		$$.after_update.forEach(add_render_callback);
	}
}

/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 * @param {Function[]} fns
 * @returns {void}
 */
function flush_render_callbacks(fns) {
	const filtered = [];
	const targets = [];
	render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
	targets.forEach((c) => c());
	render_callbacks = filtered;
}

const outroing = new Set();

/**
 * @param {import('./private.js').Fragment} block
 * @param {0 | 1} [local]
 * @returns {void}
 */
function transition_in(block, local) {
	if (block && block.i) {
		outroing.delete(block);
		block.i(local);
	}
}

/** @typedef {1} INTRO */
/** @typedef {0} OUTRO */
/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

/**
 * @typedef {Object} Outro
 * @property {number} r
 * @property {Function[]} c
 * @property {Object} p
 */

/**
 * @typedef {Object} PendingProgram
 * @property {number} start
 * @property {INTRO|OUTRO} b
 * @property {Outro} [group]
 */

/**
 * @typedef {Object} Program
 * @property {number} a
 * @property {INTRO|OUTRO} b
 * @property {1|-1} d
 * @property {number} duration
 * @property {number} start
 * @property {number} end
 * @property {Outro} [group]
 */

/** @returns {void} */
function mount_component(component, target, anchor) {
	const { fragment, after_update } = component.$$;
	fragment && fragment.m(target, anchor);
	// onMount happens before the initial afterUpdate
	add_render_callback(() => {
		const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
		// if the component was destroyed immediately
		// it will update the `$$.on_destroy` reference to `null`.
		// the destructured on_destroy may still reference to the old array
		if (component.$$.on_destroy) {
			component.$$.on_destroy.push(...new_on_destroy);
		} else {
			// Edge case - component was destroyed immediately,
			// most likely as a result of a binding initialising
			run_all(new_on_destroy);
		}
		component.$$.on_mount = [];
	});
	after_update.forEach(add_render_callback);
}

/** @returns {void} */
function destroy_component(component, detaching) {
	const $$ = component.$$;
	if ($$.fragment !== null) {
		flush_render_callbacks($$.after_update);
		run_all($$.on_destroy);
		$$.fragment && $$.fragment.d(detaching);
		// TODO null out other refs, including component.$$ (but need to
		// preserve final state?)
		$$.on_destroy = $$.fragment = null;
		$$.ctx = [];
	}
}

/** @returns {void} */
function make_dirty(component, i) {
	if (component.$$.dirty[0] === -1) {
		dirty_components.push(component);
		schedule_update();
		component.$$.dirty.fill(0);
	}
	component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
}

// TODO: Document the other params
/**
 * @param {SvelteComponent} component
 * @param {import('./public.js').ComponentConstructorOptions} options
 *
 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
 * This will be the `add_css` function from the compiled component.
 *
 * @returns {void}
 */
function init(
	component,
	options,
	instance,
	create_fragment,
	not_equal,
	props,
	append_styles = null,
	dirty = [-1]
) {
	const parent_component = current_component;
	set_current_component(component);
	/** @type {import('./private.js').T$$} */
	const $$ = (component.$$ = {
		fragment: null,
		ctx: [],
		// state
		props,
		update: noop,
		not_equal,
		bound: blank_object(),
		// lifecycle
		on_mount: [],
		on_destroy: [],
		on_disconnect: [],
		before_update: [],
		after_update: [],
		context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
		// everything else
		callbacks: blank_object(),
		dirty,
		skip_bound: false,
		root: options.target || parent_component.$$.root
	});
	append_styles && append_styles($$.root);
	let ready = false;
	$$.ctx = instance
		? instance(component, options.props || {}, (i, ret, ...rest) => {
				const value = rest.length ? rest[0] : ret;
				if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
					if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
					if (ready) make_dirty(component, i);
				}
				return ret;
		  })
		: [];
	$$.update();
	ready = true;
	run_all($$.before_update);
	// `false` as a special case of no DOM component
	$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
	if (options.target) {
		if (options.hydrate) {
			// TODO: what is the correct type here?
			// @ts-expect-error
			const nodes = children(options.target);
			$$.fragment && $$.fragment.l(nodes);
			nodes.forEach(detach);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.c();
		}
		if (options.intro) transition_in(component.$$.fragment);
		mount_component(component, options.target, options.anchor);
		flush();
	}
	set_current_component(parent_component);
}

/**
 * Base class for Svelte components. Used when dev=false.
 *
 * @template {Record<string, any>} [Props=any]
 * @template {Record<string, any>} [Events=any]
 */
class SvelteComponent {
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$ = undefined;
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$set = undefined;

	/** @returns {void} */
	$destroy() {
		destroy_component(this, 1);
		this.$destroy = noop;
	}

	/**
	 * @template {Extract<keyof Events, string>} K
	 * @param {K} type
	 * @param {((e: Events[K]) => void) | null | undefined} callback
	 * @returns {() => void}
	 */
	$on(type, callback) {
		if (!is_function(callback)) {
			return noop;
		}
		const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
		callbacks.push(callback);
		return () => {
			const index = callbacks.indexOf(callback);
			if (index !== -1) callbacks.splice(index, 1);
		};
	}

	/**
	 * @param {Partial<Props>} props
	 * @returns {void}
	 */
	$set(props) {
		if (this.$$set && !is_empty(props)) {
			this.$$.skip_bound = true;
			this.$$set(props);
			this.$$.skip_bound = false;
		}
	}
}

/**
 * @typedef {Object} CustomElementPropDefinition
 * @property {string} [attribute]
 * @property {boolean} [reflect]
 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
 */

// generated during release, do not modify

const PUBLIC_VERSION = '4';

if (typeof window !== 'undefined')
	// @ts-ignore
	(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var suncalc = {exports: {}};

/*
 (c) 2011-2015, Vladimir Agafonkin
 SunCalc is a JavaScript library for calculating sun/moon position and light phases.
 https://github.com/mourner/suncalc
*/

(function (module, exports$1) {
	(function () {
	// shortcuts for easier to read formulas

	var PI   = Math.PI,
	    sin  = Math.sin,
	    cos  = Math.cos,
	    tan  = Math.tan,
	    asin = Math.asin,
	    atan = Math.atan2,
	    acos = Math.acos,
	    rad  = PI / 180;

	// sun calculations are based on http://aa.quae.nl/en/reken/zonpositie.html formulas


	// date/time constants and conversions

	var dayMs = 1000 * 60 * 60 * 24,
	    J1970 = 2440588,
	    J2000 = 2451545;

	function toJulian(date) { return date.valueOf() / dayMs - 0.5 + J1970; }
	function fromJulian(j)  { return new Date((j + 0.5 - J1970) * dayMs); }
	function toDays(date)   { return toJulian(date) - J2000; }


	// general calculations for position

	var e = rad * 23.4397; // obliquity of the Earth

	function rightAscension(l, b) { return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l)); }
	function declination(l, b)    { return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l)); }

	function azimuth(H, phi, dec)  { return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi)); }
	function altitude(H, phi, dec) { return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)); }

	function siderealTime(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }

	function astroRefraction(h) {
	    if (h < 0) // the following formula works for positive altitudes only.
	        h = 0; // if h = -0.08901179 a div/0 would occur.

	    // formula 16.4 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
	    // 1.02 / tan(h + 10.26 / (h + 5.10)) h in degrees, result in arc minutes -> converted to rad:
	    return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
	}

	// general sun calculations

	function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }

	function eclipticLongitude(M) {

	    var C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)), // equation of center
	        P = rad * 102.9372; // perihelion of the Earth

	    return M + C + P + PI;
	}

	function sunCoords(d) {

	    var M = solarMeanAnomaly(d),
	        L = eclipticLongitude(M);

	    return {
	        dec: declination(L, 0),
	        ra: rightAscension(L, 0)
	    };
	}


	var SunCalc = {};


	// calculates sun position for a given date and latitude/longitude

	SunCalc.getPosition = function (date, lat, lng) {

	    var lw  = rad * -lng,
	        phi = rad * lat,
	        d   = toDays(date),

	        c  = sunCoords(d),
	        H  = siderealTime(d, lw) - c.ra;

	    return {
	        azimuth: azimuth(H, phi, c.dec),
	        altitude: altitude(H, phi, c.dec)
	    };
	};


	// sun times configuration (angle, morning name, evening name)

	var times = SunCalc.times = [
	    [-0.833, 'sunrise',       'sunset'      ],
	    [  -0.3, 'sunriseEnd',    'sunsetStart' ],
	    [    -6, 'dawn',          'dusk'        ],
	    [   -12, 'nauticalDawn',  'nauticalDusk'],
	    [   -18, 'nightEnd',      'night'       ],
	    [     6, 'goldenHourEnd', 'goldenHour'  ]
	];

	// adds a custom time to the times config

	SunCalc.addTime = function (angle, riseName, setName) {
	    times.push([angle, riseName, setName]);
	};


	// calculations for sun times

	var J0 = 0.0009;

	function julianCycle(d, lw) { return Math.round(d - J0 - lw / (2 * PI)); }

	function approxTransit(Ht, lw, n) { return J0 + (Ht + lw) / (2 * PI) + n; }
	function solarTransitJ(ds, M, L)  { return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L); }

	function hourAngle(h, phi, d) { return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d))); }
	function observerAngle(height) { return -2.076 * Math.sqrt(height) / 60; }

	// returns set time for the given sun altitude
	function getSetJ(h, lw, phi, dec, n, M, L) {

	    var w = hourAngle(h, phi, dec),
	        a = approxTransit(w, lw, n);
	    return solarTransitJ(a, M, L);
	}


	// calculates sun times for a given date, latitude/longitude, and, optionally,
	// the observer height (in meters) relative to the horizon

	SunCalc.getTimes = function (date, lat, lng, height) {

	    height = height || 0;

	    var lw = rad * -lng,
	        phi = rad * lat,

	        dh = observerAngle(height),

	        d = toDays(date),
	        n = julianCycle(d, lw),
	        ds = approxTransit(0, lw, n),

	        M = solarMeanAnomaly(ds),
	        L = eclipticLongitude(M),
	        dec = declination(L, 0),

	        Jnoon = solarTransitJ(ds, M, L),

	        i, len, time, h0, Jset, Jrise;


	    var result = {
	        solarNoon: fromJulian(Jnoon),
	        nadir: fromJulian(Jnoon - 0.5)
	    };

	    for (i = 0, len = times.length; i < len; i += 1) {
	        time = times[i];
	        h0 = (time[0] + dh) * rad;

	        Jset = getSetJ(h0, lw, phi, dec, n, M, L);
	        Jrise = Jnoon - (Jset - Jnoon);

	        result[time[1]] = fromJulian(Jrise);
	        result[time[2]] = fromJulian(Jset);
	    }

	    return result;
	};


	// moon calculations, based on http://aa.quae.nl/en/reken/hemelpositie.html formulas

	function moonCoords(d) { // geocentric ecliptic coordinates of the moon

	    var L = rad * (218.316 + 13.176396 * d), // ecliptic longitude
	        M = rad * (134.963 + 13.064993 * d), // mean anomaly
	        F = rad * (93.272 + 13.229350 * d),  // mean distance

	        l  = L + rad * 6.289 * sin(M), // longitude
	        b  = rad * 5.128 * sin(F),     // latitude
	        dt = 385001 - 20905 * cos(M);  // distance to the moon in km

	    return {
	        ra: rightAscension(l, b),
	        dec: declination(l, b),
	        dist: dt
	    };
	}

	SunCalc.getMoonPosition = function (date, lat, lng) {

	    var lw  = rad * -lng,
	        phi = rad * lat,
	        d   = toDays(date),

	        c = moonCoords(d),
	        H = siderealTime(d, lw) - c.ra,
	        h = altitude(H, phi, c.dec),
	        // formula 14.1 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
	        pa = atan(sin(H), tan(phi) * cos(c.dec) - sin(c.dec) * cos(H));

	    h = h + astroRefraction(h); // altitude correction for refraction

	    return {
	        azimuth: azimuth(H, phi, c.dec),
	        altitude: h,
	        distance: c.dist,
	        parallacticAngle: pa
	    };
	};


	// calculations for illumination parameters of the moon,
	// based on http://idlastro.gsfc.nasa.gov/ftp/pro/astro/mphase.pro formulas and
	// Chapter 48 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.

	SunCalc.getMoonIllumination = function (date) {

	    var d = toDays(date || new Date()),
	        s = sunCoords(d),
	        m = moonCoords(d),

	        sdist = 149598000, // distance from Earth to Sun in km

	        phi = acos(sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra)),
	        inc = atan(sdist * sin(phi), m.dist - sdist * cos(phi)),
	        angle = atan(cos(s.dec) * sin(s.ra - m.ra), sin(s.dec) * cos(m.dec) -
	                cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra));

	    return {
	        fraction: (1 + cos(inc)) / 2,
	        phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI,
	        angle: angle
	    };
	};


	function hoursLater(date, h) {
	    return new Date(date.valueOf() + h * dayMs / 24);
	}

	// calculations for moon rise/set times are based on http://www.stargazing.net/kepler/moonrise.html article

	SunCalc.getMoonTimes = function (date, lat, lng, inUTC) {
	    var t = new Date(date);
	    if (inUTC) t.setUTCHours(0, 0, 0, 0);
	    else t.setHours(0, 0, 0, 0);

	    var hc = 0.133 * rad,
	        h0 = SunCalc.getMoonPosition(t, lat, lng).altitude - hc,
	        h1, h2, rise, set, a, b, xe, ye, d, roots, x1, x2, dx;

	    // go in 2-hour chunks, each time seeing if a 3-point quadratic curve crosses zero (which means rise or set)
	    for (var i = 1; i <= 24; i += 2) {
	        h1 = SunCalc.getMoonPosition(hoursLater(t, i), lat, lng).altitude - hc;
	        h2 = SunCalc.getMoonPosition(hoursLater(t, i + 1), lat, lng).altitude - hc;

	        a = (h0 + h2) / 2 - h1;
	        b = (h2 - h0) / 2;
	        xe = -b / (2 * a);
	        ye = (a * xe + b) * xe + h1;
	        d = b * b - 4 * a * h1;
	        roots = 0;

	        if (d >= 0) {
	            dx = Math.sqrt(d) / (Math.abs(a) * 2);
	            x1 = xe - dx;
	            x2 = xe + dx;
	            if (Math.abs(x1) <= 1) roots++;
	            if (Math.abs(x2) <= 1) roots++;
	            if (x1 < -1) x1 = x2;
	        }

	        if (roots === 1) {
	            if (h0 < 0) rise = i + x1;
	            else set = i + x1;

	        } else if (roots === 2) {
	            rise = i + (ye < 0 ? x2 : x1);
	            set = i + (ye < 0 ? x1 : x2);
	        }

	        if (rise && set) break;

	        h0 = h2;
	    }

	    var result = {};

	    if (rise) result.rise = hoursLater(t, rise);
	    if (set) result.set = hoursLater(t, set);

	    if (!rise && !set) result[ye > 0 ? 'alwaysUp' : 'alwaysDown'] = true;

	    return result;
	};


	// export as Node module / AMD module / browser variable
	module.exports = SunCalc;

	}()); 
} (suncalc));

var suncalcExports = suncalc.exports;
var SunCalc = /*@__PURE__*/getDefaultExportFromCjs(suncalcExports);

/* src/plugin.svelte generated by Svelte v4.2.20 */

function add_css(target) {
	append_styles(target, "svelte-1qhzpkz", "#plugin-windy-plugin-horizon-distance{height:auto !important;min-height:min-content !important;max-height:none !important;overflow:visible !important;position:relative !important;z-index:9999 !important;margin-bottom:15px !important}.plugin__content.svelte-1qhzpkz.svelte-1qhzpkz{height:auto !important;min-height:min-content !important;max-height:none !important;overflow:visible !important;padding:10px 12px !important;box-sizing:border-box !important;display:block !important;position:relative !important;background-color:transparent !important;font-size:13px !important;line-height:1.35 !important}fieldset.svelte-1qhzpkz.svelte-1qhzpkz{border:none !important;margin-bottom:6px !important;padding:0 !important}legend.svelte-1qhzpkz.svelte-1qhzpkz{font-weight:bold;font-size:11px !important;margin-bottom:3px !important;color:#ffd700 !important;text-transform:uppercase;letter-spacing:0.3px}label.svelte-1qhzpkz.svelte-1qhzpkz{display:block;margin-bottom:3px !important;font-size:11px !important;color:white}label.svelte-1qhzpkz b.svelte-1qhzpkz{color:#64b5f6}.leaflet-tooltip.chdLabelTooltip,.chdLabelTooltip{background:transparent !important;background-color:transparent !important;border:none !important;box-shadow:none !important;padding:0 !important;z-index:200 !important;pointer-events:none !important}.leaflet-tooltip.chdLabelTooltip::before,.leaflet-tooltip.chdLabelTooltip::after,.chdLabelTooltip::before,.chdLabelTooltip::after{display:none !important}.chdLabelTooltip .leaflet-tooltip-content{margin:0 !important;padding:0 !important;background:transparent !important;background-color:transparent !important;white-space:nowrap !important;font-size:16px !important;font-weight:700 !important;line-height:1.2 !important;text-shadow:0 0 3px rgba(0, 0, 0, 0.35) !important}.leaflet-pane.leaflet-tooltip-pane{z-index:200 !important}.mobileCard.svelte-1qhzpkz.svelte-1qhzpkz{flex:0 0 auto;min-width:240px;max-width:290px;padding:8px 10px;border-radius:12px;background:rgba(0, 0, 0, 0.22);border:1px solid rgba(255, 255, 255, 0.18);scroll-snap-align:start}.mobileCardNarrow.svelte-1qhzpkz.svelte-1qhzpkz{min-width:170px;max-width:240px}.mobileCardWide.svelte-1qhzpkz.svelte-1qhzpkz{min-width:285px;max-width:340px}.mobileLine.svelte-1qhzpkz.svelte-1qhzpkz{display:flex;gap:8px;align-items:baseline;margin-bottom:6px;color:white}.mobileLine.svelte-1qhzpkz .k.svelte-1qhzpkz{opacity:0.75;font-weight:800;font-size:12px;white-space:nowrap}.mobileLine.svelte-1qhzpkz .v.svelte-1qhzpkz{font-weight:800;font-size:13px;white-space:nowrap}.elev-error.svelte-1qhzpkz.svelte-1qhzpkz{color:#ff6b6b;font-weight:800;font-size:13px}.mobileLineTwoCols.svelte-1qhzpkz.svelte-1qhzpkz{display:flex;gap:10px;margin-bottom:6px}.pairOneLine.svelte-1qhzpkz.svelte-1qhzpkz{flex:1;min-width:0;display:flex;align-items:baseline;gap:6px}.mobileLineOneCol.svelte-1qhzpkz.svelte-1qhzpkz{display:flex;align-items:baseline;gap:6px;margin-bottom:6px;min-width:0}.kBadge.svelte-1qhzpkz.svelte-1qhzpkz{flex:0 0 auto;width:18px;height:18px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;color:white;background:rgba(255, 255, 255, 0.18);border:1px solid rgba(255, 255, 255, 0.22);line-height:1}.vOneLine.svelte-1qhzpkz.svelte-1qhzpkz{flex:1 1 auto;min-width:0;font-weight:800;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:white}.chd-time-bar.svelte-1qhzpkz.svelte-1qhzpkz{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px;padding:6px 12px;background:rgba(0, 0, 0, 0.3);border:1px solid rgba(255, 255, 255, 0.2);border-radius:10px;box-sizing:border-box}.chd-time-btn.svelte-1qhzpkz.svelte-1qhzpkz{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border-radius:6px;border:1px solid rgba(255, 255, 255, 0.25);background:rgba(255, 255, 255, 0.12);color:#ffffff;cursor:pointer;transition:background 0.15s ease, border-color 0.15s ease, transform 0.1s ease}.chd-time-btn.svelte-1qhzpkz.svelte-1qhzpkz:hover{background:rgba(255, 255, 255, 0.25);border-color:rgba(255, 255, 255, 0.4)}.chd-time-btn.svelte-1qhzpkz.svelte-1qhzpkz:active{transform:scale(0.92);background:rgba(255, 165, 0, 0.5)}.chd-time-text.svelte-1qhzpkz.svelte-1qhzpkz{font-weight:700;font-size:14px;letter-spacing:0.6px;color:#ffd700;min-width:48px;text-align:center;font-variant-numeric:tabular-nums;font-family:inherit;text-shadow:0 1px 3px rgba(0, 0, 0, 0.6)}");
}

// (705:0) {:else}
function create_else_block_1(ctx) {
	let section;
	let fieldset0;
	let legend0;
	let t1;
	let t2;
	let label0;
	let t3;

	let t4_value = (/*lastClickedLat*/ ctx[6] === null
	? 'Click on the map'
	: `${/*liveSunAltitudeDeg*/ ctx[5].toFixed(1)}°`) + "";

	let t4;
	let t5;
	let fieldset1;
	let legend1;
	let t7;
	let label1;
	let b0;
	let t9;

	let t10_value = (/*lastClickedLat*/ ctx[6] === null
	? '-'
	: `between ${formatKmVal(/*distancesKm*/ ctx[4].lowMin)} and ${formatKmVal(/*distancesKm*/ ctx[4].lowMax)} km`) + "";

	let t10;
	let t11;
	let label2;
	let b1;
	let t13;

	let t14_value = (/*lastClickedLat*/ ctx[6] === null
	? '-'
	: `between ${formatKmVal(/*distancesKm*/ ctx[4].midMin)} and ${formatKmVal(/*distancesKm*/ ctx[4].midMax)} km`) + "";

	let t14;
	let t15;
	let label3;
	let b2;
	let t17;

	let t18_value = (/*lastClickedLat*/ ctx[6] === null
	? '-'
	: `between ${formatKmVal(/*distancesKm*/ ctx[4].high)} and ${formatKmVal(/*distancesKm*/ ctx[4].highMax)} km`) + "";

	let t18;
	let t19;
	let fieldset2;
	let legend2;
	let t21;
	let label4;
	let b3;
	let t23;
	let t24_value = (/*sunriseTime*/ ctx[2] || '-') + "";
	let t24;
	let t25;
	let b4;
	let t27;
	let t28_value = (/*sunsetTime*/ ctx[3] || '-') + "";
	let t28;
	let t29;
	let div;
	let button0;
	let t30;
	let span;
	let t31;
	let t32;
	let button1;
	let mounted;
	let dispose;

	function select_block_type_2(ctx, dirty) {
		if (/*elevationError*/ ctx[1]) return create_if_block_7;
		return create_else_block_2;
	}

	let current_block_type = select_block_type_2(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			section = element("section");
			fieldset0 = element("fieldset");
			legend0 = element("legend");
			legend0.textContent = "Altitude";
			t1 = space();
			if_block.c();
			t2 = space();
			label0 = element("label");
			t3 = text("Sun altitude: ");
			t4 = text(t4_value);
			t5 = space();
			fieldset1 = element("fieldset");
			legend1 = element("legend");
			legend1.textContent = "Clouds Horizon Distance";
			t7 = space();
			label1 = element("label");
			b0 = element("b");
			b0.textContent = "L";
			t9 = text(" block range: ");
			t10 = text(t10_value);
			t11 = space();
			label2 = element("label");
			b1 = element("b");
			b1.textContent = "M";
			t13 = text(" block range: ");
			t14 = text(t14_value);
			t15 = space();
			label3 = element("label");
			b2 = element("b");
			b2.textContent = "H";
			t17 = text(" block range: ");
			t18 = text(t18_value);
			t19 = space();
			fieldset2 = element("fieldset");
			legend2 = element("legend");
			legend2.textContent = "Sunrise and Sunset";
			t21 = space();
			label4 = element("label");
			b3 = element("b");
			b3.textContent = "Sunrise";
			t23 = text(": ");
			t24 = text(t24_value);
			t25 = text(" | ");
			b4 = element("b");
			b4.textContent = "Sunset";
			t27 = text(": ");
			t28 = text(t28_value);
			t29 = space();
			div = element("div");
			button0 = element("button");
			button0.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
			t30 = space();
			span = element("span");
			t31 = text(/*formattedTime*/ ctx[10]);
			t32 = space();
			button1 = element("button");
			button1.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
			attr(legend0, "class", "svelte-1qhzpkz");
			attr(label0, "class", "svelte-1qhzpkz");
			attr(fieldset0, "class", "svelte-1qhzpkz");
			attr(legend1, "class", "svelte-1qhzpkz");
			attr(b0, "class", "svelte-1qhzpkz");
			attr(label1, "class", "svelte-1qhzpkz");
			attr(b1, "class", "svelte-1qhzpkz");
			attr(label2, "class", "svelte-1qhzpkz");
			attr(b2, "class", "svelte-1qhzpkz");
			attr(label3, "class", "svelte-1qhzpkz");
			attr(fieldset1, "class", "svelte-1qhzpkz");
			attr(legend2, "class", "svelte-1qhzpkz");
			attr(b3, "class", "svelte-1qhzpkz");
			attr(b4, "class", "svelte-1qhzpkz");
			attr(label4, "class", "svelte-1qhzpkz");
			attr(fieldset2, "class", "svelte-1qhzpkz");
			attr(button0, "type", "button");
			attr(button0, "class", "chd-time-btn svelte-1qhzpkz");
			attr(button0, "title", "Decrease 1 minute");
			attr(button0, "aria-label", "Decrease 1 minute");
			attr(span, "class", "chd-time-text svelte-1qhzpkz");
			attr(button1, "type", "button");
			attr(button1, "class", "chd-time-btn svelte-1qhzpkz");
			attr(button1, "title", "Increase 1 minute");
			attr(button1, "aria-label", "Increase 1 minute");
			attr(div, "class", "chd-time-bar svelte-1qhzpkz");
			attr(section, "class", "plugin__content svelte-1qhzpkz");
			attr(section, "id", "chdInfoBox");
		},
		m(target, anchor) {
			insert(target, section, anchor);
			append(section, fieldset0);
			append(fieldset0, legend0);
			append(fieldset0, t1);
			if_block.m(fieldset0, null);
			append(fieldset0, t2);
			append(fieldset0, label0);
			append(label0, t3);
			append(label0, t4);
			append(section, t5);
			append(section, fieldset1);
			append(fieldset1, legend1);
			append(fieldset1, t7);
			append(fieldset1, label1);
			append(label1, b0);
			append(label1, t9);
			append(label1, t10);
			append(fieldset1, t11);
			append(fieldset1, label2);
			append(label2, b1);
			append(label2, t13);
			append(label2, t14);
			append(fieldset1, t15);
			append(fieldset1, label3);
			append(label3, b2);
			append(label3, t17);
			append(label3, t18);
			append(section, t19);
			append(section, fieldset2);
			append(fieldset2, legend2);
			append(fieldset2, t21);
			append(fieldset2, label4);
			append(label4, b3);
			append(label4, t23);
			append(label4, t24);
			append(label4, t25);
			append(label4, b4);
			append(label4, t27);
			append(label4, t28);
			append(section, t29);
			append(section, div);
			append(div, button0);
			append(div, t30);
			append(div, span);
			append(span, t31);
			append(div, t32);
			append(div, button1);

			if (!mounted) {
				dispose = [
					listen(button0, "click", /*click_handler_2*/ ctx[16]),
					listen(button1, "click", /*click_handler_3*/ ctx[17])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(fieldset0, t2);
				}
			}

			if (dirty[0] & /*lastClickedLat, liveSunAltitudeDeg*/ 96 && t4_value !== (t4_value = (/*lastClickedLat*/ ctx[6] === null
			? 'Click on the map'
			: `${/*liveSunAltitudeDeg*/ ctx[5].toFixed(1)}°`) + "")) set_data(t4, t4_value);

			if (dirty[0] & /*lastClickedLat, distancesKm*/ 80 && t10_value !== (t10_value = (/*lastClickedLat*/ ctx[6] === null
			? '-'
			: `between ${formatKmVal(/*distancesKm*/ ctx[4].lowMin)} and ${formatKmVal(/*distancesKm*/ ctx[4].lowMax)} km`) + "")) set_data(t10, t10_value);

			if (dirty[0] & /*lastClickedLat, distancesKm*/ 80 && t14_value !== (t14_value = (/*lastClickedLat*/ ctx[6] === null
			? '-'
			: `between ${formatKmVal(/*distancesKm*/ ctx[4].midMin)} and ${formatKmVal(/*distancesKm*/ ctx[4].midMax)} km`) + "")) set_data(t14, t14_value);

			if (dirty[0] & /*lastClickedLat, distancesKm*/ 80 && t18_value !== (t18_value = (/*lastClickedLat*/ ctx[6] === null
			? '-'
			: `between ${formatKmVal(/*distancesKm*/ ctx[4].high)} and ${formatKmVal(/*distancesKm*/ ctx[4].highMax)} km`) + "")) set_data(t18, t18_value);

			if (dirty[0] & /*sunriseTime*/ 4 && t24_value !== (t24_value = (/*sunriseTime*/ ctx[2] || '-') + "")) set_data(t24, t24_value);
			if (dirty[0] & /*sunsetTime*/ 8 && t28_value !== (t28_value = (/*sunsetTime*/ ctx[3] || '-') + "")) set_data(t28, t28_value);
			if (dirty[0] & /*formattedTime*/ 1024) set_data(t31, /*formattedTime*/ ctx[10]);
		},
		d(detaching) {
			if (detaching) {
				detach(section);
			}

			if_block.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

// (597:0) {#if isMobileOrTablet}
function create_if_block(ctx) {
	let div7;
	let div5;
	let section0;
	let div0;
	let span0;
	let t1;
	let span1;
	let t2;
	let div1;
	let span2;
	let t4;
	let span3;

	let t5_value = (/*lastClickedLat*/ ctx[6] === null
	? 'Tap map'
	: `${/*liveSunAltitudeDeg*/ ctx[5].toFixed(1)}°`) + "";

	let t5;
	let t6;
	let section1;
	let div2;
	let t8;
	let t9;
	let t10;
	let t11;
	let section2;
	let div3;
	let span4;
	let t13;
	let span5;
	let t14_value = (/*sunriseTime*/ ctx[2] || 'n/a') + "";
	let t14;
	let t15;
	let div4;
	let span6;
	let t17;
	let span7;
	let t18_value = (/*sunsetTime*/ ctx[3] || 'n/a') + "";
	let t18;
	let t19;
	let div6;
	let button0;
	let t20;
	let span8;
	let t21;
	let t22;
	let button1;
	let mounted;
	let dispose;

	function select_block_type_1(ctx, dirty) {
		if (/*elevationError*/ ctx[1]) return create_if_block_6;
		return create_else_block;
	}

	let current_block_type = select_block_type_1(ctx);
	let if_block0 = current_block_type(ctx);
	let if_block1 = (/*showLow*/ ctx[9] || /*showMid*/ ctx[8]) && create_if_block_3(ctx);
	let if_block2 = /*showHigh*/ ctx[7] && create_if_block_2(ctx);
	let if_block3 = !/*showLow*/ ctx[9] && !/*showMid*/ ctx[8] && !/*showHigh*/ ctx[7] && create_if_block_1();

	return {
		c() {
			div7 = element("div");
			div5 = element("div");
			section0 = element("section");
			div0 = element("div");
			span0 = element("span");
			span0.textContent = "Your elevation";
			t1 = space();
			span1 = element("span");
			if_block0.c();
			t2 = space();
			div1 = element("div");
			span2 = element("span");
			span2.textContent = "Sun altitude";
			t4 = space();
			span3 = element("span");
			t5 = text(t5_value);
			t6 = space();
			section1 = element("section");
			div2 = element("div");
			div2.textContent = "Clouds Horizon Distance";
			t8 = space();
			if (if_block1) if_block1.c();
			t9 = space();
			if (if_block2) if_block2.c();
			t10 = space();
			if (if_block3) if_block3.c();
			t11 = space();
			section2 = element("section");
			div3 = element("div");
			span4 = element("span");
			span4.textContent = "Sunrise";
			t13 = space();
			span5 = element("span");
			t14 = text(t14_value);
			t15 = space();
			div4 = element("div");
			span6 = element("span");
			span6.textContent = "Sunset";
			t17 = space();
			span7 = element("span");
			t18 = text(t18_value);
			t19 = space();
			div6 = element("div");
			button0 = element("button");
			button0.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
			t20 = space();
			span8 = element("span");
			t21 = text(/*formattedTime*/ ctx[10]);
			t22 = space();
			button1 = element("button");
			button1.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
			attr(span0, "class", "k svelte-1qhzpkz");
			attr(span1, "class", "v svelte-1qhzpkz");
			attr(div0, "class", "mobileLine svelte-1qhzpkz");
			attr(span2, "class", "k svelte-1qhzpkz");
			attr(span3, "class", "v svelte-1qhzpkz");
			attr(div1, "class", "mobileLine svelte-1qhzpkz");
			attr(section0, "class", "mobileCard mobileCardNarrow svelte-1qhzpkz");
			attr(div2, "class", "mobileCardTitle");
			attr(section1, "class", "mobileCard mobileCardWide svelte-1qhzpkz");
			attr(span4, "class", "k svelte-1qhzpkz");
			attr(span5, "class", "v svelte-1qhzpkz");
			attr(div3, "class", "mobileLine svelte-1qhzpkz");
			attr(span6, "class", "k svelte-1qhzpkz");
			attr(span7, "class", "v svelte-1qhzpkz");
			attr(div4, "class", "mobileLine svelte-1qhzpkz");
			attr(section2, "class", "mobileCard mobileCardNarrow svelte-1qhzpkz");
			attr(div5, "class", "mobileWrap");
			attr(button0, "type", "button");
			attr(button0, "class", "chd-time-btn svelte-1qhzpkz");
			attr(button0, "title", "Decrease 1 minute");
			attr(button0, "aria-label", "Decrease 1 minute");
			attr(span8, "class", "chd-time-text svelte-1qhzpkz");
			attr(button1, "type", "button");
			attr(button1, "class", "chd-time-btn svelte-1qhzpkz");
			attr(button1, "title", "Increase 1 minute");
			attr(button1, "aria-label", "Increase 1 minute");
			attr(div6, "class", "chd-time-bar svelte-1qhzpkz");
			attr(div7, "id", "chdInfoBox");
			attr(div7, "class", "plugin__content svelte-1qhzpkz");
		},
		m(target, anchor) {
			insert(target, div7, anchor);
			append(div7, div5);
			append(div5, section0);
			append(section0, div0);
			append(div0, span0);
			append(div0, t1);
			append(div0, span1);
			if_block0.m(span1, null);
			append(section0, t2);
			append(section0, div1);
			append(div1, span2);
			append(div1, t4);
			append(div1, span3);
			append(span3, t5);
			append(div5, t6);
			append(div5, section1);
			append(section1, div2);
			append(section1, t8);
			if (if_block1) if_block1.m(section1, null);
			append(section1, t9);
			if (if_block2) if_block2.m(section1, null);
			append(section1, t10);
			if (if_block3) if_block3.m(section1, null);
			append(div5, t11);
			append(div5, section2);
			append(section2, div3);
			append(div3, span4);
			append(div3, t13);
			append(div3, span5);
			append(span5, t14);
			append(section2, t15);
			append(section2, div4);
			append(div4, span6);
			append(div4, t17);
			append(div4, span7);
			append(span7, t18);
			append(div7, t19);
			append(div7, div6);
			append(div6, button0);
			append(div6, t20);
			append(div6, span8);
			append(span8, t21);
			append(div6, t22);
			append(div6, button1);

			if (!mounted) {
				dispose = [
					listen(button0, "click", /*click_handler*/ ctx[14]),
					listen(button1, "click", /*click_handler_1*/ ctx[15])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block0) {
				if_block0.p(ctx, dirty);
			} else {
				if_block0.d(1);
				if_block0 = current_block_type(ctx);

				if (if_block0) {
					if_block0.c();
					if_block0.m(span1, null);
				}
			}

			if (dirty[0] & /*lastClickedLat, liveSunAltitudeDeg*/ 96 && t5_value !== (t5_value = (/*lastClickedLat*/ ctx[6] === null
			? 'Tap map'
			: `${/*liveSunAltitudeDeg*/ ctx[5].toFixed(1)}°`) + "")) set_data(t5, t5_value);

			if (/*showLow*/ ctx[9] || /*showMid*/ ctx[8]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_3(ctx);
					if_block1.c();
					if_block1.m(section1, t9);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*showHigh*/ ctx[7]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_2(ctx);
					if_block2.c();
					if_block2.m(section1, t10);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (!/*showLow*/ ctx[9] && !/*showMid*/ ctx[8] && !/*showHigh*/ ctx[7]) {
				if (if_block3) ; else {
					if_block3 = create_if_block_1();
					if_block3.c();
					if_block3.m(section1, null);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}

			if (dirty[0] & /*sunriseTime*/ 4 && t14_value !== (t14_value = (/*sunriseTime*/ ctx[2] || 'n/a') + "")) set_data(t14, t14_value);
			if (dirty[0] & /*sunsetTime*/ 8 && t18_value !== (t18_value = (/*sunsetTime*/ ctx[3] || 'n/a') + "")) set_data(t18, t18_value);
			if (dirty[0] & /*formattedTime*/ 1024) set_data(t21, /*formattedTime*/ ctx[10]);
		},
		d(detaching) {
			if (detaching) {
				detach(div7);
			}

			if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

// (714:12) {:else}
function create_else_block_2(ctx) {
	let label;
	let t0;

	let t1_value = (/*lastClickedLat*/ ctx[6] === null
	? 'Click on the map'
	: `${Math.round(/*elevationMeters*/ ctx[0])} m`) + "";

	let t1;

	return {
		c() {
			label = element("label");
			t0 = text("Your Elevation: ");
			t1 = text(t1_value);
			attr(label, "class", "svelte-1qhzpkz");
		},
		m(target, anchor) {
			insert(target, label, anchor);
			append(label, t0);
			append(label, t1);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*lastClickedLat, elevationMeters*/ 65 && t1_value !== (t1_value = (/*lastClickedLat*/ ctx[6] === null
			? 'Click on the map'
			: `${Math.round(/*elevationMeters*/ ctx[0])} m`) + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) {
				detach(label);
			}
		}
	};
}

// (712:12) {#if elevationError}
function create_if_block_7(ctx) {
	let label;

	return {
		c() {
			label = element("label");
			label.innerHTML = `Your Elevation: <span class="elev-error svelte-1qhzpkz">Unavailable</span>`;
			attr(label, "class", "svelte-1qhzpkz");
		},
		m(target, anchor) {
			insert(target, label, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(label);
			}
		}
	};
}

// (610:24) {:else}
function create_else_block(ctx) {
	let t_value = (/*lastClickedLat*/ ctx[6] === null
	? 'Tap map'
	: `${Math.round(/*elevationMeters*/ ctx[0])}m`) + "";

	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*lastClickedLat, elevationMeters*/ 65 && t_value !== (t_value = (/*lastClickedLat*/ ctx[6] === null
			? 'Tap map'
			: `${Math.round(/*elevationMeters*/ ctx[0])}m`) + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) {
				detach(t);
			}
		}
	};
}

// (608:24) {#if elevationError}
function create_if_block_6(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "Unavailable";
			attr(span, "class", "elev-error svelte-1qhzpkz");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (627:16) {#if showLow || showMid}
function create_if_block_3(ctx) {
	let div;
	let t;
	let if_block0 = /*showLow*/ ctx[9] && create_if_block_5(ctx);
	let if_block1 = /*showMid*/ ctx[8] && create_if_block_4(ctx);

	return {
		c() {
			div = element("div");
			if (if_block0) if_block0.c();
			t = space();
			if (if_block1) if_block1.c();
			attr(div, "class", "mobileLineTwoCols svelte-1qhzpkz");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append(div, t);
			if (if_block1) if_block1.m(div, null);
		},
		p(ctx, dirty) {
			if (/*showLow*/ ctx[9]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_5(ctx);
					if_block0.c();
					if_block0.m(div, t);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*showMid*/ ctx[8]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_4(ctx);
					if_block1.c();
					if_block1.m(div, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
		}
	};
}

// (630:24) {#if showLow}
function create_if_block_5(ctx) {
	let div;
	let span0;
	let t1;
	let span1;

	let t2_value = (/*distancesKm*/ ctx[4].lowMin
	? `${/*distancesKm*/ ctx[4].lowMin.toFixed(0)} to ${/*distancesKm*/ ctx[4].lowMax.toFixed(0)} km`
	: 'Tap map') + "";

	let t2;

	return {
		c() {
			div = element("div");
			span0 = element("span");
			span0.textContent = "L";
			t1 = space();
			span1 = element("span");
			t2 = text(t2_value);
			attr(span0, "class", "kBadge svelte-1qhzpkz");
			attr(span1, "class", "vOneLine svelte-1qhzpkz");
			attr(div, "class", "pairOneLine svelte-1qhzpkz");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span0);
			append(div, t1);
			append(div, span1);
			append(span1, t2);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*distancesKm*/ 16 && t2_value !== (t2_value = (/*distancesKm*/ ctx[4].lowMin
			? `${/*distancesKm*/ ctx[4].lowMin.toFixed(0)} to ${/*distancesKm*/ ctx[4].lowMax.toFixed(0)} km`
			: 'Tap map') + "")) set_data(t2, t2_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (641:24) {#if showMid}
function create_if_block_4(ctx) {
	let div;
	let span0;
	let t1;
	let span1;

	let t2_value = (/*distancesKm*/ ctx[4].midMin
	? `${/*distancesKm*/ ctx[4].midMin.toFixed(0)} to ${/*distancesKm*/ ctx[4].midMax.toFixed(0)} km`
	: 'Tap map') + "";

	let t2;

	return {
		c() {
			div = element("div");
			span0 = element("span");
			span0.textContent = "M";
			t1 = space();
			span1 = element("span");
			t2 = text(t2_value);
			attr(span0, "class", "kBadge svelte-1qhzpkz");
			attr(span1, "class", "vOneLine svelte-1qhzpkz");
			attr(div, "class", "pairOneLine svelte-1qhzpkz");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span0);
			append(div, t1);
			append(div, span1);
			append(span1, t2);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*distancesKm*/ 16 && t2_value !== (t2_value = (/*distancesKm*/ ctx[4].midMin
			? `${/*distancesKm*/ ctx[4].midMin.toFixed(0)} to ${/*distancesKm*/ ctx[4].midMax.toFixed(0)} km`
			: 'Tap map') + "")) set_data(t2, t2_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (655:16) {#if showHigh}
function create_if_block_2(ctx) {
	let div;
	let span0;
	let t1;
	let span1;

	let t2_value = (/*distancesKm*/ ctx[4].high
	? `${/*distancesKm*/ ctx[4].high.toFixed(0)} to ${/*distancesKm*/ ctx[4].highMax.toFixed(0)} km`
	: 'Tap map') + "";

	let t2;

	return {
		c() {
			div = element("div");
			span0 = element("span");
			span0.textContent = "H";
			t1 = space();
			span1 = element("span");
			t2 = text(t2_value);
			attr(span0, "class", "kBadge svelte-1qhzpkz");
			attr(span1, "class", "vOneLine svelte-1qhzpkz");
			attr(div, "class", "mobileLineOneCol svelte-1qhzpkz");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span0);
			append(div, t1);
			append(div, span1);
			append(span1, t2);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*distancesKm*/ 16 && t2_value !== (t2_value = (/*distancesKm*/ ctx[4].high
			? `${/*distancesKm*/ ctx[4].high.toFixed(0)} to ${/*distancesKm*/ ctx[4].highMax.toFixed(0)} km`
			: 'Tap map') + "")) set_data(t2, t2_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (666:16) {#if !showLow && !showMid && !showHigh}
function create_if_block_1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.innerHTML = `<span class="kBadge svelte-1qhzpkz">C</span> <span class="vOneLine svelte-1qhzpkz">Tap map</span>`;
			attr(div, "class", "mobileLineOneCol svelte-1qhzpkz");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

function create_fragment(ctx) {
	let if_block_anchor;

	function select_block_type(ctx, dirty) {
		if (isMobileOrTablet) return create_if_block;
		return create_else_block_1;
	}

	let current_block_type = select_block_type();
	let if_block = current_block_type(ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if_block.p(ctx, dirty);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if_block.d(detaching);
		}
	};
}

const OBSERVER_HEIGHT_METERS = 1.7;
const LOW_CLOUDS_MIN_METERS = 400;
const LOW_CLOUDS_MAX_METERS = 1200;
const MID_CLOUDS_MIN_METERS = 2000;
const MID_CLOUDS_MAX_METERS = 4000;
const HIGH_CLOUDS_MIN_METERS = 6000;
const HIGH_CLOUDS_MAX_METERS = 12000;
const EXTRA_DISTANCE_KM = 10;
const MAX_CIRCLE_ZOOM = 19;
const LABEL_AZIMUTH_DEG = 0;
const LABEL_OFFSET_KM = 2;
const CURRENT_SUN_LINE_WEIGHT = 2;
const CURRENT_SUN_COLOR_SUNRISE = '#ffff00';
const CURRENT_SUN_COLOR_SUNSET = '#ffa500';
const CURRENT_SUN_COLOR_GAMMA = 1.35;
const SUN_UPDATE_INTERVAL_MS = 100;
const EARTH_RADIUS_KM = 6371;

function formatTimeHHMM(ts) {
	if (!ts || isNaN(ts)) return '--:--';
	const d = new Date(ts);
	const hours = d.getHours().toString().padStart(2, '0');
	const minutes = d.getMinutes().toString().padStart(2, '0');
	return `${hours}:${minutes}`;
}

function toKey(lat, lon) {
	return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function calculateHorizonDistanceKm(elevMeters, cloudMetersAGL) {
	const hObsKm = (elevMeters + OBSERVER_HEIGHT_METERS) / 1000;
	const hCloudKm = (elevMeters + cloudMetersAGL) / 1000;
	return Math.sqrt(2 * EARTH_RADIUS_KM * hObsKm + hObsKm * hObsKm) + Math.sqrt(2 * EARTH_RADIUS_KM * hCloudKm + hCloudKm * hCloudKm);
}

function calculateSunRayIntersectionKm(elevMeters, cloudMetersAGL, sunAltitudeRad) {
	const dGeom = calculateHorizonDistanceKm(elevMeters, cloudMetersAGL);
	if (!(sunAltitudeRad > 0)) return dGeom;
	const hObsKm = (elevMeters + OBSERVER_HEIGHT_METERS) / 1000;
	const hCloudKm = (elevMeters + cloudMetersAGL) / 1000;
	const rObs = EARTH_RADIUS_KM + hObsKm;
	const rCloud = EARTH_RADIUS_KM + hCloudKm;
	if (!(rCloud > rObs)) return dGeom;
	const sinAlt = Math.sin(sunAltitudeRad);
	const b = 2 * rObs * sinAlt;
	const c = rObs * rObs - rCloud * rCloud;
	const disc = b * b - 4 * c;
	if (!(disc >= 0)) return dGeom;
	const t = (-b + Math.sqrt(disc)) / 2;
	if (!(t > 0)) return dGeom;
	const z1 = rObs + t * sinAlt;
	const cosAng = Math.max(-1, Math.min(1, z1 / rCloud));
	const ang = Math.acos(cosAng);
	const dKm = ang * EARTH_RADIUS_KM;
	if (!Number.isFinite(dKm) || dKm <= 0) return dGeom;
	return Math.min(dKm, dGeom);
}

function formatKmVal(val) {
	if (!val || val <= 0) return '0';
	if (val < 10) return val.toFixed(1);
	return Math.round(val).toString();
}

function computeEndPoint(lat, lon, azimuthDeg, distanceKm) {
	const bearing = azimuthDeg * Math.PI / 180;
	const lat1 = lat * Math.PI / 180;
	const lon1 = lon * Math.PI / 180;
	const angDist = distanceKm / EARTH_RADIUS_KM;
	const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angDist) + Math.cos(lat1) * Math.sin(angDist) * Math.cos(bearing));
	const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(angDist) * Math.cos(lat1), Math.cos(angDist) - Math.sin(lat1) * Math.sin(lat2));
	return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}

function clamp01(v) {
	return Math.max(0, Math.min(1, v));
}

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function hexToRgb(hex) {
	const h = hex.replace('#', '').trim();

	const full = h.length === 3
	? h.split('').map(c => c + c).join('')
	: h;

	const n = parseInt(full, 16);

	return {
		r: n >> 16 & 255,
		g: n >> 8 & 255,
		b: n & 255
	};
}

function rgbToHex(r, g, b) {
	const toHex = x => x.toString(16).padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerpHexColor(aHex, bHex, t) {
	const a = hexToRgb(aHex);
	const b = hexToRgb(bHex);
	const tt = clamp01(t);
	const r = Math.round(lerp(a.r, b.r, tt));
	const g = Math.round(lerp(a.g, b.g, tt));
	const bb = Math.round(lerp(a.b, b.b, tt));
	return rgbToHex(r, g, bb);
}

function normalizeTimestampMs(ts) {
	if (typeof ts !== 'number' || !Number.isFinite(ts)) return null;
	if (ts > 0 && ts < 1e12) return ts * 1000;
	return ts;
}

function pickCircleIndicesForOverlay(overlayKey) {
	if (overlayKey === 'lclouds') return [0, 1];
	if (overlayKey === 'mclouds') return [2, 3];
	if (overlayKey === 'hclouds') return [4, 5];
	return [0, 1, 2, 3, 4, 5];
}

function instance($$self, $$props, $$invalidate) {
	let formattedTime;
	let showLow;
	let showMid;
	let showHigh;

	const CIRCLE_STYLES = [
		{
			color: 'blue',
			dashArray: '5, 5',
			weight: 2
		},
		{
			color: 'blue',
			dashArray: '5, 5',
			weight: 2
		},
		{
			color: 'purple',
			dashArray: '5, 5',
			weight: 2
		},
		{
			color: 'purple',
			dashArray: '5, 5',
			weight: 2
		},
		{
			color: 'red',
			dashArray: '5, 5',
			weight: 2
		},
		{
			color: 'red',
			dashArray: '5, 5',
			weight: 2
		}
	];

	const CLOUD_LABEL_TEXTS = [
		'Low Clouds 400m',
		'Low Clouds 1200m',
		'Mid Clouds 2000m',
		'Mid Clouds 4000m',
		'High clouds 6000m',
		'High clouds 12000m'
	];

	let elevationMeters = 0;
	let elevationError = false;
	let sunriseTime = '';
	let sunsetTime = '';
	let sunriseLine = null;
	let sunsetLine = null;

	let distancesKm = {
		lowMin: 0,
		lowMax: 0,
		midMin: 0,
		midMax: 0,
		high: 0,
		highMax: 0
	};

	let liveSunAltitudeDeg = 0;
	let currentTimestampMs = Date.now();

	function shiftTime(deltaMinutes) {
		const newTs = currentTimestampMs + deltaMinutes * 60 * 1000;
		$$invalidate(12, currentTimestampMs = newTs);

		if (store && store.set) {
			try {
				store.set('timestamp', newTs);
			} catch(e) {
				console.warn('Could not update Windy store timestamp', e);
			}
		}

		scheduleSunUpdate(newTs);
	}

	let horizonCircles = [];
	let labels = [];
	let currentSunLine = null;
	let circlesHiddenByZoom = false;
	let lastClickedLat = null;
	let lastClickedLon = null;
	let lastDistanceRefKm = 0;
	let pendingSunUpdateTimer = null;
	let latestPendingTsMs = null;
	let isTickScheduled = false;
	let lastDrawnTsMs = null;
	const elevationCache = new Map();
	let initTimer = null;
	let initTries = 0;
	const Leaf = globalThis.L;

	const makeCircle = (center, options) => {
		if (Leaf?.Circle) return new Leaf.Circle(center, options);
		return Leaf.circle(center, options);
	};

	const makePolyline = (latlngs, options) => {
		if (Leaf?.Polyline) return new Leaf.Polyline(latlngs, options);
		return Leaf.polyline(latlngs, options);
	};

	const makeDivIcon = options => {
		if (Leaf?.DivIcon) return new Leaf.DivIcon(options);
		return Leaf.divIcon(options);
	};

	const makeMarker = (pos, options) => {
		if (Leaf?.Marker) return new Leaf.Marker(pos, options);
		return Leaf.marker(pos, options);
	};

	async function getElevationMeters(lat, lon) {
		const key = toKey(lat, lon);
		const cached = elevationCache.get(key);
		if (cached !== undefined) return cached;
		const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Elevation http status ${response.status}`);
		const data = await response.json();
		if (data.elevation === undefined) throw new Error('Elevation missing');
		let value = data.elevation;
		if (Array.isArray(value)) value = value[0];
		if (typeof value === 'string') value = parseFloat(value.replace(',', '.'));
		if (typeof value !== 'number' || Number.isNaN(value)) throw new Error('Elevation invalid');
		elevationCache.set(key, value);
		return value;
	}

	function calculateAzimuthDegrees(lat, lon, time) {
		const sunPos = SunCalc.getPosition(time, lat, lon);
		return sunPos.azimuth * 180 / Math.PI + 180;
	}

	function clearCurrentSunLine() {
		if (currentSunLine) {
			map.removeLayer(currentSunLine);
			currentSunLine = null;
		}
	}

	function clearCirclesAndLabels() {
		horizonCircles.forEach(layer => map.removeLayer(layer));
		labels.forEach(layer => map.removeLayer(layer));
		horizonCircles = [];
		labels = [];
		circlesHiddenByZoom = false;
	}

	function clearMapOverlays() {
		clearCirclesAndLabels();
		clearCurrentSunLine();
		if (sunriseLine) map.removeLayer(sunriseLine);
		if (sunsetLine) map.removeLayer(sunsetLine);
		sunriseLine = null;
		sunsetLine = null;
	}

	function drawHorizonCircles(lat, lon, elevMeters, sunAltitudeRad = 0) {
		clearCirclesAndLabels();
		const currentZoom = map.getZoom ? map.getZoom() : 0;
		circlesHiddenByZoom = currentZoom >= MAX_CIRCLE_ZOOM;
		const indicesToDraw = pickCircleIndicesForOverlay(activeOverlayKey);

		const cloudHeights = [
			LOW_CLOUDS_MIN_METERS,
			LOW_CLOUDS_MAX_METERS,
			MID_CLOUDS_MIN_METERS,
			MID_CLOUDS_MAX_METERS,
			HIGH_CLOUDS_MIN_METERS,
			HIGH_CLOUDS_MAX_METERS
		];

		const calculatedDistancesKm = cloudHeights.map(h => calculateSunRayIntersectionKm(elevMeters, h, sunAltitudeRad));

		$$invalidate(4, distancesKm = {
			lowMin: calculatedDistancesKm[0],
			lowMax: calculatedDistancesKm[1],
			midMin: calculatedDistancesKm[2],
			midMax: calculatedDistancesKm[3],
			high: calculatedDistancesKm[4],
			highMax: calculatedDistancesKm[5]
		});

		const addCircle = (distanceKm, styleIndex, opacity, weight, dash) => {
			const circle = makeCircle([lat, lon], {
				color: CIRCLE_STYLES[styleIndex].color,
				dashArray: dash,
				weight,
				fillOpacity: 0,
				opacity,
				radius: distanceKm * 1000,
				interactive: false
			});

			if (!circlesHiddenByZoom) circle.addTo(map);
			horizonCircles.push(circle);
			return circle;
		};

		const addLabel = (distanceKm, text, styleIndex) => {
			const labelDistanceKm = distanceKm + LABEL_OFFSET_KM;
			const labelPos = computeEndPoint(lat, lon, LABEL_AZIMUTH_DEG, labelDistanceKm);

			const anchorMarker = makeMarker(labelPos, {
				interactive: false,
				icon: makeDivIcon({
					className: 'chdLabelAnchor',
					html: '',
					iconSize: [0, 0]
				})
			});

			const displayDistStr = formatKmVal(distanceKm);

			anchorMarker.bindTooltip(`<span style="color:${CIRCLE_STYLES[styleIndex].color}; font-weight:700;">${text} (${displayDistStr}km)</span>`, {
				permanent: true,
				direction: 'top',
				offset: [0, 0],
				opacity: 1,
				className: 'chdLabelTooltip'
			});

			if (!circlesHiddenByZoom) {
				anchorMarker.addTo(map);
				anchorMarker.openTooltip();
			}

			labels.push(anchorMarker);
		};

		indicesToDraw.forEach(index => {
			const distanceKm = calculatedDistancesKm[index];
			addCircle(distanceKm, index, 1, CIRCLE_STYLES[index].weight, CIRCLE_STYLES[index].dashArray);
			const isLow = index === 0;
			const isMid = index === 2;
			const isHigh = index === 4;
			const drawRange = isLow || isMid || isHigh;

			if (drawRange) {
				const start = isLow
				? LOW_CLOUDS_MIN_METERS
				: isMid ? MID_CLOUDS_MIN_METERS : HIGH_CLOUDS_MIN_METERS;

				const end = isLow
				? LOW_CLOUDS_MAX_METERS
				: isMid ? MID_CLOUDS_MAX_METERS : HIGH_CLOUDS_MAX_METERS;

				const step = isLow ? 200 : isMid ? 400 : 2000;
				const thinDash = '4, 6';
				const thinWeight = isLow ? 1.4 : 1.6;
				const thinOpacity = isLow ? 0.5 : isMid ? 0.7 : 0.6;

				for (let cloudMeters = start + step; cloudMeters < end; cloudMeters += step) {
					const extraDistanceKm = calculateSunRayIntersectionKm(elevMeters, cloudMeters, sunAltitudeRad);
					addCircle(extraDistanceKm, index, thinOpacity, thinWeight, thinDash);
				}
			}

			addLabel(distanceKm, CLOUD_LABEL_TEXTS[index], index);
		});
	}

	function drawSunriseSunsetLines(lat, lon, sunTimes, distanceRefKm) {
		const lineLengthKm = distanceRefKm + EXTRA_DISTANCE_KM;
		const sunriseAz = calculateAzimuthDegrees(lat, lon, sunTimes.sunrise);
		const sunsetAz = calculateAzimuthDegrees(lat, lon, sunTimes.sunset);
		const sunriseEnd = computeEndPoint(lat, lon, sunriseAz, lineLengthKm);
		const sunsetEnd = computeEndPoint(lat, lon, sunsetAz, lineLengthKm);
		if (sunriseLine) map.removeLayer(sunriseLine);
		if (sunsetLine) map.removeLayer(sunsetLine);
		sunriseLine = makePolyline([[lat, lon], sunriseEnd], { color: 'yellow', interactive: false }).addTo(map);
		sunsetLine = makePolyline([[lat, lon], sunsetEnd], { color: 'orange', interactive: false }).addTo(map);
	}

	function dynamicCurrentSunColor(lat, lon, timestampMs) {
		const time = new Date(timestampMs);
		const times = SunCalc.getTimes(time, lat, lon);
		const sunriseMs = times.sunrise.getTime();
		const sunsetMs = times.sunset.getTime();
		const denom = sunsetMs - sunriseMs;
		if (!(denom > 0)) return lerpHexColor(CURRENT_SUN_COLOR_SUNRISE, CURRENT_SUN_COLOR_SUNSET, 0.5);
		let t = (timestampMs - sunriseMs) / denom;
		t = clamp01(t);
		t = Math.pow(t, CURRENT_SUN_COLOR_GAMMA);
		return lerpHexColor(CURRENT_SUN_COLOR_SUNRISE, CURRENT_SUN_COLOR_SUNSET, t);
	}

	function drawOrUpdateCurrentSunLine(lat, lon, timestampMs, distanceRefKm) {
		const time = new Date(timestampMs);
		const pos = SunCalc.getPosition(time, lat, lon);
		$$invalidate(5, liveSunAltitudeDeg = +(pos.altitude * 180 / Math.PI).toFixed(1));
		drawHorizonCircles(lat, lon, elevationMeters, pos.altitude);

		if (pos.altitude <= 0) {
			clearCurrentSunLine();
			lastDrawnTsMs = timestampMs;
			return;
		}

		const azimuthDeg = pos.azimuth * 180 / Math.PI + 180;
		const lineLengthKm = distancesKm.highMax;
		const end = computeEndPoint(lat, lon, azimuthDeg, lineLengthKm);
		const color = dynamicCurrentSunColor(lat, lon, timestampMs);

		if (!currentSunLine) {
			currentSunLine = makePolyline([[lat, lon], end], {
				color,
				weight: CURRENT_SUN_LINE_WEIGHT,
				interactive: false
			}).addTo(map);
		} else {
			currentSunLine.setLatLngs([[lat, lon], end]);
			currentSunLine.setStyle({ color });
		}

		lastDrawnTsMs = timestampMs;
	}

	function scheduleSunUpdate(rawTs) {
		if (lastClickedLat === null || lastClickedLon === null) return;
		const tsMs = normalizeTimestampMs(rawTs);
		if (tsMs === null) return;
		latestPendingTsMs = tsMs;
		if (isTickScheduled) return;
		isTickScheduled = true;

		pendingSunUpdateTimer = window.setTimeout(
			() => {
				isTickScheduled = false;
				pendingSunUpdateTimer = null;
				if (latestPendingTsMs === null) return;
				drawOrUpdateCurrentSunLine(lastClickedLat, lastClickedLon, latestPendingTsMs);

				if (latestPendingTsMs !== null && lastDrawnTsMs !== null && latestPendingTsMs !== lastDrawnTsMs) {
					scheduleSunUpdate(latestPendingTsMs);
				}
			},
			SUN_UPDATE_INTERVAL_MS
		);
	}

	function onZoomEnd() {
		if (lastClickedLat === null) return;
		const zoom = map.getZoom ? map.getZoom() : 0;
		const shouldHide = zoom >= MAX_CIRCLE_ZOOM;
		if (shouldHide === circlesHiddenByZoom) return;
		circlesHiddenByZoom = shouldHide;

		if (shouldHide) {
			horizonCircles.forEach(l => {
				try {
					map.removeLayer(l);
				} catch(e) {
					
				}
			});

			labels.forEach(l => {
				try {
					map.removeLayer(l);
				} catch(e) {
					
				}
			});
		} else {
			horizonCircles.forEach(l => {
				try {
					l.addTo(map);
				} catch(e) {
					
				}
			});

			labels.forEach(l => {
				try {
					l.addTo(map);
					l.openTooltip();
				} catch(e) {
					
				}
			});
		}
	}

	async function onMapClick(event) {
		const latRaw = event.latlng.lat;
		const lonRaw = event.latlng.lng;

		try {
			$$invalidate(1, elevationError = false);
			$$invalidate(0, elevationMeters = await getElevationMeters(latRaw, lonRaw));

			$$invalidate(4, distancesKm = {
				lowMin: calculateHorizonDistanceKm(elevationMeters, LOW_CLOUDS_MIN_METERS),
				lowMax: calculateHorizonDistanceKm(elevationMeters, LOW_CLOUDS_MAX_METERS),
				midMin: calculateHorizonDistanceKm(elevationMeters, MID_CLOUDS_MIN_METERS),
				midMax: calculateHorizonDistanceKm(elevationMeters, MID_CLOUDS_MAX_METERS),
				high: calculateHorizonDistanceKm(elevationMeters, HIGH_CLOUDS_MIN_METERS),
				highMax: calculateHorizonDistanceKm(elevationMeters, HIGH_CLOUDS_MAX_METERS)
			});

			const now = new Date();
			const sunTimes = SunCalc.getTimes(now, latRaw, lonRaw);
			$$invalidate(2, sunriseTime = sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
			$$invalidate(3, sunsetTime = sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
			$$invalidate(6, lastClickedLat = latRaw);
			lastClickedLon = lonRaw;
			lastDistanceRefKm = distancesKm.highMax;
			drawHorizonCircles(latRaw, lonRaw, elevationMeters, 0);
			drawSunriseSunsetLines(latRaw, lonRaw, sunTimes, distancesKm.highMax);
			const ts = store && store.get ? store.get('timestamp') : Date.now();
			scheduleSunUpdate(ts);
		} catch(err) {
			console.error('Click processing failed', err);
			$$invalidate(1, elevationError = true);
		}
	}

	function redrawBaseAtLastClick() {
		if (lastClickedLat === null || lastClickedLon === null) return;
		const lat = lastClickedLat;
		const lon = lastClickedLon;
		const now = new Date();
		const sunTimes = SunCalc.getTimes(now, lat, lon);
		$$invalidate(2, sunriseTime = sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
		$$invalidate(3, sunsetTime = sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

		drawHorizonCircles(
			lat,
			lon,
			elevationMeters,
			[
				distancesKm.lowMin,
				distancesKm.lowMax,
				distancesKm.midMin,
				distancesKm.midMax,
				distancesKm.high,
				distancesKm.highMax
			]);

		drawSunriseSunsetLines(lat, lon, sunTimes, distancesKm.highMax);
	}

	let activeOverlayKey = 'clouds';

	function onOverlayChange(next) {
		$$invalidate(13, activeOverlayKey = typeof next === 'string' ? next : 'clouds');
		if (lastClickedLat === null || lastClickedLon === null) return;
		clearMapOverlays();
		clearCurrentSunLine();
		redrawBaseAtLastClick();
		const ts = store && store.get ? store.get('timestamp') : Date.now();
		scheduleSunUpdate(ts);
	}

	function onTimestampChange(ts) {
		if (typeof ts === 'number' && !isNaN(ts)) {
			$$invalidate(12, currentTimestampMs = ts);
		} else if (ts) {
			const parsed = new Date(ts).getTime();
			if (!isNaN(parsed)) $$invalidate(12, currentTimestampMs = parsed);
		}

		scheduleSunUpdate(currentTimestampMs);
	}

	function initWhenReady() {
		const hasMap = !!(map && map.on);
		const hasLeaflet = typeof window.L !== 'undefined';
		const hasStore = !!(store && store.on);

		if (hasMap && hasLeaflet) {
			try {
				map.on('click', onMapClick);
				map.on('zoomend', onZoomEnd);
			} catch(e) {
				
			}

			if (hasStore) {
				try {
					store.on('timestamp', onTimestampChange);
					store.on('overlay', onOverlayChange);
					const currentOverlay = store.get ? store.get('overlay') : null;

					if (typeof currentOverlay === 'string' && currentOverlay) {
						$$invalidate(13, activeOverlayKey = currentOverlay);
					}

					const initialTs = store.get ? store.get('timestamp') : null;

					if (typeof initialTs === 'number' && !isNaN(initialTs)) {
						$$invalidate(12, currentTimestampMs = initialTs);
					}
				} catch(e) {
					
				}
			}

			return;
		}

		initTries += 1;
		if (initTries > 40) return;
		initTimer = window.setTimeout(initWhenReady, 50);
	}

	onMount(() => {
		initWhenReady();
	});

	onDestroy(() => {
		if (initTimer !== null) {
			window.clearTimeout(initTimer);
			initTimer = null;
		}

		if (map && map.off) {
			try {
				map.off('click', onMapClick);
				map.off('zoomend', onZoomEnd);
			} catch(e) {
				
			}
		}

		if (store && store.off) {
			try {
				store.off('timestamp', onTimestampChange);
				store.off('overlay', onOverlayChange);
			} catch(e) {
				
			}
		}

		if (pendingSunUpdateTimer !== null) {
			window.clearTimeout(pendingSunUpdateTimer);
			pendingSunUpdateTimer = null;
		}

		isTickScheduled = false;
		latestPendingTsMs = null;
		lastDrawnTsMs = null;
		clearMapOverlays();
	});

	const click_handler = () => shiftTime(-1);
	const click_handler_1 = () => shiftTime(1);
	const click_handler_2 = () => shiftTime(-1);
	const click_handler_3 = () => shiftTime(1);

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*currentTimestampMs*/ 4096) {
			$$invalidate(10, formattedTime = formatTimeHHMM(currentTimestampMs));
		}

		if ($$self.$$.dirty[0] & /*activeOverlayKey*/ 8192) {
			$$invalidate(9, showLow = activeOverlayKey === 'clouds' || activeOverlayKey === 'lclouds');
		}

		if ($$self.$$.dirty[0] & /*activeOverlayKey*/ 8192) {
			$$invalidate(8, showMid = activeOverlayKey === 'clouds' || activeOverlayKey === 'mclouds');
		}

		if ($$self.$$.dirty[0] & /*activeOverlayKey*/ 8192) {
			$$invalidate(7, showHigh = activeOverlayKey === 'clouds' || activeOverlayKey === 'hclouds');
		}
	};

	return [
		elevationMeters,
		elevationError,
		sunriseTime,
		sunsetTime,
		distancesKm,
		liveSunAltitudeDeg,
		lastClickedLat,
		showHigh,
		showMid,
		showLow,
		formattedTime,
		shiftTime,
		currentTimestampMs,
		activeOverlayKey,
		click_handler,
		click_handler_1,
		click_handler_2,
		click_handler_3
	];
}

class Plugin extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {}, add_css, [-1, -1]);
	}
}


// transformCode: Export statement was modified
export { __pluginConfig, Plugin as default };
//# sourceMappingURL=plugin.js.map
