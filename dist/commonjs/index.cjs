'use strict';

/**
 * Utility constants and functions
 */
const MAX_INT = 2147483647;
const MIN_INT = -2147483648;
const MAX_LONG = Number.MAX_SAFE_INTEGER;
const MIN_LONG = Number.MIN_SAFE_INTEGER;
// special value to identify missing items. treated differently from undefined
const MISSING = Symbol("missing");
const CYCLE_FOUND_ERROR = Object.freeze(new Error("mingo: cycle detected while processing object/array"));
const ARRAY_PROTO = Object.getPrototypeOf([]);
const OBJECT_PROTO = Object.getPrototypeOf({});
const OBJECT_TAG = "[object Object]";
const OBJECT_TYPE_RE = /^\[object ([a-zA-Z0-9]+)\]$/;
class Null {}
class Undefined {}
const getConstructor = v => {
  if (v === null) return Null;
  if (v === undefined) return Undefined;
  return v.constructor;
};
/**
 * Uses the simple hash method as described in Effective Java.
 * @see https://stackoverflow.com/a/113600/1370481
 * @param value The value to hash
 * @returns {number}
 */
const DEFAULT_HASH_FUNCTION = value => {
  const s = stringify(value);
  let hash = 0;
  let i = s.length;
  while (i) hash = (hash << 5) - hash ^ s.charCodeAt(--i);
  return hash >>> 0;
};
// no array, object, or function types
const JS_SIMPLE_TYPES = new Set(["null", "undefined", "boolean", "number", "string", "date", "regexp"]);
const IMMUTABLE_TYPES_SET = new Set([Undefined, Null, Boolean, String, Number]);
/** Convert simple value to string representation. */
const toString = v => v.toString(); // eslint-disable-line @typescript-eslint/no-base-to-string
/** Convert a typed array to string representation. */
const typedArrayToString = v => `${getConstructor(v).name}[${v.toString()}]`; // eslint-disable-line @typescript-eslint/no-base-to-string
/** Map of constructors to string converter functions */
const STRING_CONVERTERS = new Map([[Number, toString], [Boolean, toString], [RegExp, toString], [Function, toString], [Symbol, toString], [Date, d => d.toISOString()], [String, JSON.stringify], [Null, _ => "null"], [Undefined, _ => "undefined"], [Int8Array, typedArrayToString], [Uint8Array, typedArrayToString], [Uint8ClampedArray, typedArrayToString], [Int16Array, typedArrayToString], [Uint16Array, typedArrayToString], [Int32Array, typedArrayToString], [Uint32Array, typedArrayToString], [Float32Array, typedArrayToString], [Float64Array, typedArrayToString]]);
/**
 * Some types like BigInt are not available on more exotic
 * JavaScript runtimes like ReactNative or QuickJS.
 * So we fill them in only if they exist so that it does not throw an error.
 */
if (typeof BigInt !== "undefined") {
  STRING_CONVERTERS.set(BigInt, n => "0x" + n.toString(16));
}
if (typeof BigInt64Array !== "undefined") {
  STRING_CONVERTERS.set(BigInt64Array, typedArrayToString);
}
if (typeof BigUint64Array !== "undefined") {
  STRING_CONVERTERS.set(BigUint64Array, typedArrayToString);
}
/** MongoDB sort comparison order. https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order */
const SORT_ORDER_BY_TYPE = {
  null: 0,
  undefined: 0,
  number: 1,
  string: 2,
  object: 3,
  array: 4,
  boolean: 5,
  date: 6,
  regexp: 7,
  function: 8
};
/**
 * Compare function which adheres to MongoDB comparison order.
 *
 * @param a The first value
 * @param b The second value
 * @returns {Number}
 */
const compare$1 = (a, b) => {
  if (a === MISSING) a = undefined;
  if (b === MISSING) b = undefined;
  const [u, v] = [a, b].map(n => SORT_ORDER_BY_TYPE[getType(n).toLowerCase()]);
  if (u !== v) return u - v;
  // number | string | date
  if (u === 1 || u === 2 || u === 6) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  // check for equivalence equality
  if (isEqual(a, b)) return 0;
  if (a < b) return -1;
  if (a > b) return 1;
  // if we get here we are comparing a type that does not make sense.
  return 0;
};
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const isTypedArray = v => {
  const proto = Object.getPrototypeOf(getConstructor(v));
  return proto && proto.name === "TypedArray";
};
/**
 * Deep clone an object. Value types and immutable objects are returned as is.
 */
const cloneDeep = obj => {
  if (IMMUTABLE_TYPES_SET.has(getConstructor(obj))) return obj;
  const cycle = new Set();
  const clone = val => {
    if (cycle.has(val)) throw CYCLE_FOUND_ERROR;
    const ctor = getConstructor(val);
    if (IMMUTABLE_TYPES_SET.has(ctor)) return val;
    try {
      // arrays
      if (isArray(val)) {
        cycle.add(val);
        return val.map(clone);
      }
      // object literals
      if (isObject(val)) {
        cycle.add(val);
        const res = {};
        for (const k in val) res[k] = clone(val[k]);
        return res;
      }
    } finally {
      cycle.delete(val);
    }
    // dates, regex, typed arrays
    if (ctor === Date || ctor === RegExp || isTypedArray(val)) {
      return new ctor(val);
    }
    return val;
  };
  return clone(obj);
};
/**
 * Returns the name of type as specified in the tag returned by a call to Object.prototype.toString
 * @param v A value
 */
const getType = v => OBJECT_TYPE_RE.exec(Object.prototype.toString.call(v))[1];
const isBoolean = v => typeof v === "boolean";
const isString = v => typeof v === "string";
const isNumber = v => !isNaN(v) && typeof v === "number";
const isArray = Array.isArray;
const isObject = v => {
  if (!v) return false;
  const proto = Object.getPrototypeOf(v);
  return (proto === OBJECT_PROTO || proto === null) && OBJECT_TAG === Object.prototype.toString.call(v);
};
//  objects, arrays, functions, date, custom object
const isObjectLike = v => v === Object(v);
const isDate = v => v instanceof Date;
const isRegExp = v => v instanceof RegExp;
const isFunction = v => typeof v === "function";
const isNil = v => v === null || v === undefined;
const inArray = (arr, item) => arr.includes(item);
const notInArray = (arr, item) => !inArray(arr, item);
const truthy = (arg, strict = true) => !!arg || strict && arg === "";
const isEmpty = x => isNil(x) || isString(x) && !x || x instanceof Array && x.length === 0 || isObject(x) && Object.keys(x).length === 0;
const isMissing = v => v === MISSING;
/** ensure a value is an array or wrapped within one. */
const ensureArray$1 = x => x instanceof Array ? x : [x];
const has = (obj, prop) => !!obj && Object.prototype.hasOwnProperty.call(obj, prop);
const mergeable = (left, right) => isObject(left) && isObject(right) || isArray(left) && isArray(right);
/**
 * Deep merge objects or arrays.
 * When the inputs have unmergeable types, the  right hand value is returned.
 * If inputs are arrays and options.flatten is set, elements in the same position are merged together. Remaining elements are appended to the target object.
 * If options.flatten is false, the right hand value is just appended to the left-hand value.
 * @param target {Object|Array} the target to merge into
 * @param obj {Object|Array} the source object
 */
function merge(target, obj, options) {
  // default options
  options = options || {
    flatten: false
  };
  // take care of missing inputs
  if (isMissing(target) || isNil(target)) return obj;
  if (isMissing(obj) || isNil(obj)) return target;
  // fail only on initial input.
  if (!mergeable(target, obj)) {
    if (options.skipValidation) return obj || target;
    throw Error("mismatched types. must both be array or object");
  }
  // skip validation after initial input.
  options.skipValidation = true;
  if (isArray(target)) {
    const result = target;
    const input = obj;
    if (options.flatten) {
      let i = 0;
      let j = 0;
      while (i < result.length && j < input.length) {
        result[i] = merge(result[i++], input[j++], options);
      }
      while (j < input.length) {
        result.push(obj[j++]);
      }
    } else {
      into(result, input);
    }
  } else {
    for (const k in obj) {
      target[k] = merge(target[k], obj[k], options);
    }
  }
  return target;
}
function buildHashIndex(arr, hashFunction = DEFAULT_HASH_FUNCTION) {
  const map = new Map();
  arr.forEach((o, i) => {
    const h = hashCode(o, hashFunction);
    if (map.has(h)) {
      if (!map.get(h).some(j => isEqual(arr[j], o))) {
        map.get(h).push(i);
      }
    } else {
      map.set(h, [i]);
    }
  });
  return map;
}
/**
 * Returns the intersection of multiple arrays.
 *
 * @param  {Array} input An array of arrays from which to find intersection.
 * @param  {Function} hashFunction Custom function to hash values, default the hashCode method
 * @return {Array} Array of intersecting values.
 */
function intersection(input, hashFunction = DEFAULT_HASH_FUNCTION) {
  // if any array is empty, there is no intersection
  if (input.some(arr => arr.length == 0)) return [];
  if (input.length === 1) return Array.from(input);
  // sort input arrays by to get smallest array
  // const sorted = sortBy(input, (a: RawArray) => a.length) as RawArray[];
  const sortedIndex = sortBy(input.map((a, i) => [i, a.length]), a => a[1]);
  // get the smallest
  const smallest = input[sortedIndex[0][0]];
  // get hash index of smallest array
  const map = buildHashIndex(smallest, hashFunction);
  // hashIndex for remaining arrays.
  const rmap = new Map();
  // final intersection results and index of first occurrence.
  const results = new Array();
  map.forEach((v, k) => {
    const lhs = v.map(j => smallest[j]);
    const res = lhs.map(_ => 0);
    // used to track first occurence of value in order of the original input array.
    const stable = lhs.map(_ => [sortedIndex[0][0], 0]);
    let found = false;
    for (let i = 1; i < input.length; i++) {
      const [currIndex, _] = sortedIndex[i];
      const arr = input[currIndex];
      if (!rmap.has(i)) rmap.set(i, buildHashIndex(arr));
      // we found a match. let's confirm.
      if (rmap.get(i).has(k)) {
        const rhs = rmap.get(i).get(k).map(j => arr[j]);
        // confirm the intersection with an equivalence check.
        found = lhs.map((s, n) => rhs.some((t, m) => {
          // we expect only one to match here since these are just collisions.
          const p = res[n];
          if (isEqual(s, t)) {
            res[n]++;
            // track position of value ordering for stability.
            if (currIndex < stable[n][0]) {
              stable[n] = [currIndex, rmap.get(i).get(k)[m]];
            }
          }
          return p < res[n];
        })).some(Boolean);
      }
      // found nothing, so exclude value. this was just a hash collision.
      if (!found) return;
    }
    // extract value into result if we found an intersection.
    // we find an intersection if the frequency counter matches the count of the remaining arrays.
    if (found) {
      into(results, res.map((n, i) => {
        return n === input.length - 1 ? [lhs[i], stable[i]] : MISSING;
      }).filter(n => n !== MISSING));
    }
  });
  return results.sort((a, b) => {
    const [_i, [u, m]] = a;
    const [_j, [v, n]] = b;
    const r = compare$1(u, v);
    if (r !== 0) return r;
    return compare$1(m, n);
  }).map(v => v[0]);
}
/**
 * Flatten the array
 *
 * @param {Array} xs The array to flatten
 * @param {Number} depth The number of nested lists to iterate
 */
function flatten(xs, depth = 0) {
  const arr = new Array();
  function flatten2(ys, n) {
    for (let i = 0, len = ys.length; i < len; i++) {
      if (isArray(ys[i]) && (n > 0 || n < 0)) {
        flatten2(ys[i], Math.max(-1, n - 1));
      } else {
        arr.push(ys[i]);
      }
    }
  }
  flatten2(xs, depth);
  return arr;
}
/** Returns all members of the value in an object literal. */
const getMembersOf = value => {
  let [proto, names] = [Object.getPrototypeOf(value), Object.getOwnPropertyNames(value)];
  // save effective prototype
  let activeProto = proto;
  // traverse the prototype hierarchy until we get property names or hit the bottom prototype.
  while (!names.length && proto !== OBJECT_PROTO && proto !== ARRAY_PROTO) {
    activeProto = proto;
    names = Object.getOwnPropertyNames(proto);
    proto = Object.getPrototypeOf(proto);
  }
  const o = {};
  names.forEach(k => o[k] = value[k]);
  return [o, activeProto];
};
/**
 * Determine whether two values are the same or strictly equivalent.
 * Checking whether values are the same only applies to built in objects.
 * For user-defined objects this checks for only referential equality so
 * two different instances with the same values are not equal.
 *
 * @param  {*}  a The first value
 * @param  {*}  b The second value
 * @return {Boolean}   Result of comparison
 */
function isEqual(a, b) {
  const args = [[a, b]];
  while (args.length > 0) {
    [a, b] = args.pop();
    // strictly equal must be equal. matches referentially equal values.
    if (a === b) continue;
    // unequal types and functions (unless referentially equivalent) cannot be equal.
    const ctor = getConstructor(a);
    if (ctor !== getConstructor(b) || isFunction(a)) return false;
    // string convertable types
    if (STRING_CONVERTERS.has(ctor)) {
      const str = STRING_CONVERTERS.get(ctor);
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      if (str(a) !== str(b)) return false;
      // values are equal, so move next
      continue;
    }
    // handle array and object types
    if (ctor === Array || ctor === Object) {
      const ka = Object.keys(a);
      const kb = Object.keys(b);
      if (ka.length !== kb.length) return false;
      if (new Set(ka.concat(kb)).size != ka.length) return false;
      for (const k of ka) args.push([a[k], b[k]]);
      // move next
      continue;
    }
    // user-defined type detected.
    // we don't try to compare user-defined types (even though we could...shhhh).
    return false;
  }
  // nothing left to compare
  return !args.length;
}
/**
 * Return a new unique version of the collection
 * @param  {Array} input The input collection
 * @return {Array}
 */
function unique(input, hashFunction = DEFAULT_HASH_FUNCTION) {
  const result = input.map(_ => MISSING);
  buildHashIndex(input, hashFunction).forEach((v, _) => {
    v.forEach(i => result[i] = input[i]);
  });
  return result.filter(v => v !== MISSING);
}
/**
 * Encode value to string using a simple non-colliding stable scheme.
 * Handles user-defined types by processing keys on first non-empty prototype.
 * If a user-defined type provides a "toJSON" function, it is used.
 *
 * @param value The value to convert to a string representation.
 * @returns {String}
 */
function stringify(value) {
  const cycle = new Set();
  // stringify with cycle check
  const str = v => {
    const ctor = getConstructor(v);
    // string convertable types
    if (STRING_CONVERTERS.has(ctor)) {
      return STRING_CONVERTERS.get(ctor)(v);
    }
    const tag = ctor === Object ? "" : ctor.name;
    // handle JSONable objects.
    if (isFunction(v["toJSON"])) {
      return `${tag}(${JSON.stringify(v)})`;
    }
    // handle cycles
    if (cycle.has(v)) throw CYCLE_FOUND_ERROR;
    cycle.add(v);
    try {
      // handle array
      if (ctor === Array) {
        return "[" + v.map(str).join(",") + "]";
      }
      // handle user-defined object
      if (ctor !== Object) {
        // handle user-defined types or object literals.
        const [members, _] = getMembersOf(v);
        // custom type derived from array.
        if (isArray(v)) {
          // include other members as part of array elements.
          return `${tag}${str([...v, members])}`;
        }
        // get members as literal
        v = members;
      }
      const objKeys = Object.keys(v);
      objKeys.sort();
      return `${tag}{` + objKeys.map(k => `${k}:${str(v[k])}`).join(",") + "}";
    } finally {
      cycle.delete(v);
    }
  };
  // convert to string
  return str(value);
}
/**
 * Generate hash code
 * This selected function is the result of benchmarking various hash functions.
 * This version performs well and can hash 10^6 documents in ~3s with on average 100 collisions.
 *
 * @param value
 * @returns {number|null}
 */
function hashCode(value, hashFunction) {
  hashFunction = hashFunction || DEFAULT_HASH_FUNCTION;
  if (isNil(value)) return null;
  return hashFunction(value).toString();
}
/**
 * Returns a (stably) sorted copy of list, ranked in ascending order by the results of running each value through iteratee
 *
 * This implementation treats null/undefined sort keys as less than every other type
 *
 * @param {Array}   collection
 * @param {Function} keyFn The sort key function used to resolve sort keys
 * @param {Function} comparator The comparator function to use for comparing keys. Defaults to standard comparison via `compare(...)`
 * @return {Array} Returns a new sorted array by the given key and comparator function
 */
function sortBy(collection, keyFn, comparator = compare$1) {
  if (isEmpty(collection)) return collection;
  const sorted = new Array();
  const result = new Array();
  for (let i = 0; i < collection.length; i++) {
    const obj = collection[i];
    const key = keyFn(obj, i);
    if (isNil(key)) {
      result.push(obj);
    } else {
      sorted.push([key, obj]);
    }
  }
  // use native array sorting but enforce stableness
  sorted.sort((a, b) => comparator(a[0], b[0]));
  return into(result, sorted.map(o => o[1]));
}
/**
 * Groups the collection into sets by the returned key
 *
 * @param collection
 * @param keyFn {Function} to compute the group key of an item in the collection
 * @returns {GroupByOutput}
 */
function groupBy(collection, keyFn, hashFunction = DEFAULT_HASH_FUNCTION) {
  if (collection.length < 1) return new Map();
  // map of hash to collided values
  const lookup = new Map();
  // map of raw key values to objects.
  const result = new Map();
  for (let i = 0; i < collection.length; i++) {
    const obj = collection[i];
    const key = keyFn(obj, i);
    const hash = hashCode(key, hashFunction);
    if (hash === null) {
      if (result.has(null)) {
        result.get(null).push(obj);
      } else {
        result.set(null, [obj]);
      }
    } else {
      // find if we can match a hash for which the value is equivalent.
      // this is used to deal with collisions.
      const existingKey = lookup.has(hash) ? lookup.get(hash).find(k => isEqual(k, key)) : null;
      // collision detected or first time seeing key
      if (isNil(existingKey)) {
        // collision detected or first entry so we create a new group.
        result.set(key, [obj]);
        // upload the lookup with the collided key
        if (lookup.has(hash)) {
          lookup.get(hash).push(key);
        } else {
          lookup.set(hash, [key]);
        }
      } else {
        // key exists
        result.get(existingKey).push(obj);
      }
    }
  }
  return result;
}
// max elements to push.
// See argument limit https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply
const MAX_ARRAY_PUSH = 50000;
/**
 * Merge elements into the dest
 *
 * @param {*} target The target object
 * @param {*} rest The array of elements to merge into dest
 */
function into(target, ...rest) {
  if (target instanceof Array) {
    return rest.reduce((acc, arr) => {
      // push arrary in batches to handle large inputs
      let i = Math.ceil(arr.length / MAX_ARRAY_PUSH);
      let begin = 0;
      while (i-- > 0) {
        Array.prototype.push.apply(acc, arr.slice(begin, begin + MAX_ARRAY_PUSH));
        begin += MAX_ARRAY_PUSH;
      }
      return acc;
    }, target);
  } else {
    // merge objects. same behaviour as Object.assign
    return rest.filter(isObjectLike).reduce((acc, item) => {
      Object.assign(acc, item);
      return acc;
    }, target);
  }
}
// mingo internal
/**
 * Retrieve the value of a given key on an object
 * @param obj
 * @param key
 * @returns {*}
 * @private
 */
function getValue(obj, key) {
  return isObjectLike(obj) ? obj[key] : undefined;
}
/**
 * Unwrap a single element array to specified depth
 * @param {Array} arr
 * @param {Number} depth
 */
function unwrap(arr, depth) {
  if (depth < 1) return arr;
  while (depth-- && arr.length === 1) arr = arr[0];
  return arr;
}
/**
 * Resolve the value of the field (dot separated) on the given object
 * @param obj {Object} the object context
 * @param selector {String} dot separated path to field
 * @returns {*}
 */
function resolve(obj, selector, options) {
  let depth = 0;
  function resolve2(o, path) {
    let value = o;
    for (let i = 0; i < path.length; i++) {
      const field = path[i];
      const isText = /^\d+$/.exec(field) === null;
      // using instanceof to aid typescript compiler
      if (isText && value instanceof Array) {
        // On the first iteration, we check if we received a stop flag.
        // If so, we stop to prevent iterating over a nested array value
        // on consecutive object keys in the selector.
        if (i === 0 && depth > 0) break;
        depth += 1;
        // only look at the rest of the path
        const subpath = path.slice(i);
        value = value.reduce((acc, item) => {
          const v = resolve2(item, subpath);
          if (v !== undefined) acc.push(v);
          return acc;
        }, []);
        break;
      } else {
        value = getValue(value, field);
      }
      if (value === undefined) break;
    }
    return value;
  }
  const result = JS_SIMPLE_TYPES.has(getType(obj).toLowerCase()) ? obj : resolve2(obj, selector.split("."));
  return result instanceof Array && (options === null || options === void 0 ? void 0 : options.unwrapArray) ? unwrap(result, depth) : result;
}
/**
 * Returns the full object to the resolved value given by the selector.
 * This function excludes empty values as they aren't practically useful.
 *
 * @param obj {Object} the object context
 * @param selector {String} dot separated path to field
 */
function resolveGraph(obj, selector, options) {
  const names = selector.split(".");
  const key = names[0];
  // get the next part of the selector
  const next = names.slice(1).join(".");
  const isIndex = /^\d+$/.exec(key) !== null;
  const hasNext = names.length > 1;
  let result;
  let value;
  if (obj instanceof Array) {
    if (isIndex) {
      result = getValue(obj, Number(key));
      if (hasNext) {
        result = resolveGraph(result, next, options);
      }
      result = [result];
    } else {
      result = [];
      for (const item of obj) {
        value = resolveGraph(item, selector, options);
        if (options === null || options === void 0 ? void 0 : options.preserveMissing) {
          if (value === undefined) {
            value = MISSING;
          }
          result.push(value);
        } else if (value !== undefined) {
          result.push(value);
        }
      }
    }
  } else {
    value = getValue(obj, key);
    if (hasNext) {
      value = resolveGraph(value, next, options);
    }
    if (value === undefined) return undefined;
    result = (options === null || options === void 0 ? void 0 : options.preserveKeys) ? Object.assign({}, obj) : {};
    result[key] = value;
  }
  return result;
}
/**
 * Filter out all MISSING values from the object in-place
 *
 * @param obj The object to filter
 */
function filterMissing(obj) {
  if (obj instanceof Array) {
    for (let i = obj.length - 1; i >= 0; i--) {
      if (obj[i] === MISSING) {
        obj.splice(i, 1);
      } else {
        filterMissing(obj[i]);
      }
    }
  } else if (isObject(obj)) {
    for (const k in obj) {
      if (has(obj, k)) {
        filterMissing(obj[k]);
      }
    }
  }
}
const NUMBER_RE = /^\d+$/;
/**
 * Walk the object graph and execute the given transform function
 *
 * @param  {Object|Array} obj   The object to traverse.
 * @param  {String} selector    The selector to navigate.
 * @param  {Callback} fn Callback to execute for value at the end the traversal.
 * @param  {WalkOptions} options The opetions to use for the function.
 * @return {*}
 */
function walk(obj, selector, fn, options) {
  const names = selector.split(".");
  const key = names[0];
  const next = names.slice(1).join(".");
  if (names.length === 1) {
    if (isObject(obj) || isArray(obj) && NUMBER_RE.test(key)) {
      fn(obj, key);
    }
  } else {
    // force the rest of the graph while traversing
    if ((options === null || options === void 0 ? void 0 : options.buildGraph) && isNil(obj[key])) {
      obj[key] = {};
    }
    // get the next item
    const item = obj[key];
    // nothing more to do
    if (!item) return;
    // we peek to see if next key is an array index.
    const isNextArrayIndex = !!(names.length > 1 && NUMBER_RE.test(names[1]));
    // if we have an array value but the next key is not an index and the 'descendArray' option is set,
    // we walk each item in the array separately. This allows for handling traversing keys for objects
    // nested within an array.
    //
    // Eg: Given { array: [ {k:1}, {k:2}, {k:3} ] }
    //  - individual objecs can be traversed with "array.k"
    //  - a specific object can be traversed with "array.1"
    if (item instanceof Array && (options === null || options === void 0 ? void 0 : options.descendArray) && !isNextArrayIndex) {
      item.forEach(e => walk(e, next, fn, options));
    } else {
      walk(item, next, fn, options);
    }
  }
}
/**
 * Set the value of the given object field
 *
 * @param obj {Object|Array} the object context
 * @param selector {String} path to field
 * @param value {*} the value to set. if it is function, it is invoked with the old value and must return the new value.
 */
function setValue(obj, selector, value) {
  walk(obj, selector, (item, key) => {
    item[key] = isFunction(value) ? value(item[key]) : value;
  }, {
    buildGraph: true
  });
}
/**
 * Removes an element from the container.
 * If the selector resolves to an array and the leaf is a non-numeric key,
 * the remove operation will be performed on objects of the array.
 *
 * @param obj {ArrayOrObject} object or array
 * @param selector {String} dot separated path to element to remove
 */
function removeValue(obj, selector, options) {
  walk(obj, selector, (item, key) => {
    if (item instanceof Array) {
      if (/^\d+$/.test(key)) {
        item.splice(parseInt(key), 1);
      } else if (options && options.descendArray) {
        for (const elem of item) {
          if (isObject(elem)) {
            delete elem[key];
          }
        }
      }
    } else if (isObject(item)) {
      delete item[key];
    }
  }, options);
}
const OPERATOR_NAME_PATTERN = /^\$[a-zA-Z0-9_]+$/;
/**
 * Check whether the given name passes for an operator. We assume AnyVal field name starting with '$' is an operator.
 * This is cheap and safe to do since keys beginning with '$' should be reserved for internal use.
 * @param {String} name
 */
function isOperator(name) {
  return OPERATOR_NAME_PATTERN.test(name);
}
/**
 * Simplify expression for easy evaluation with query operators map
 * @param expr
 * @returns {*}
 */
function normalize(expr) {
  // normalized primitives
  if (JS_SIMPLE_TYPES.has(getType(expr).toLowerCase())) {
    return isRegExp(expr) ? {
      $regex: expr
    } : {
      $eq: expr
    };
  }
  // normalize object expression. using ObjectLike handles custom types
  if (isObjectLike(expr)) {
    const exprObj = expr;
    // no valid query operator found, so we do simple comparison
    if (!Object.keys(exprObj).some(isOperator)) {
      return {
        $eq: expr
      };
    }
    // ensure valid regex
    if (has(expr, "$regex")) {
      const newExpr = Object.assign({}, expr);
      newExpr["$regex"] = new RegExp(expr["$regex"], expr["$options"]);
      delete newExpr["$options"];
      return newExpr;
    }
  }
  return expr;
}

/**
 * This controls how input and output documents are processed to meet different application needs.
 * Each mode has different trade offs for; immutability, reference sharing, and performance.
 */
var ProcessingMode;
(function (ProcessingMode) {
  /**
   * Clone inputs prior to processing, and the outputs if some objects graphs may be shared.
   * Use this option to keep input collection immutable and to get distinct output objects.
   *
   * Note: This option is expensive and reduces performance.
   */
  ProcessingMode["CLONE_ALL"] = "CLONE_ALL";
  /**
   * Clones inputs prior to processing.
   * This option will return output objects with shared graphs in their path if specific operators are used.
   * Use this option to keep the input collection immutable.
   *
   */
  ProcessingMode["CLONE_INPUT"] = "CLONE_INPUT";
  /**
   * Clones the output to return distinct objects with no shared paths.
   * This option modifies the input collection and during processing.
   */
  ProcessingMode["CLONE_OUTPUT"] = "CLONE_OUTPUT";
  /**
   * Turn off cloning and modifies the input collection as needed.
   * This option will also return output objects with shared paths in their graph when specific operators are used.
   * This option provides the greatest speedup for the biggest tradeoff.
   * When using the aggregation pipeline, you can use the "$out" operator to collect immutable intermediate results.
   *
   * @default
   */
  ProcessingMode["CLONE_OFF"] = "CLONE_OFF";
})(ProcessingMode || (ProcessingMode = {}));
/** Custom type to facilitate type checking for global options */
class ComputeOptions {
  constructor(_opts, /** Reference to the root object when processing subgraphs of the object. */
  _root, _local, /** The current time in milliseconds. Remains the same throughout all stages of the aggregation pipeline. */
  timestamp = Date.now()) {
    this._opts = _opts;
    this._root = _root;
    this._local = _local;
    this.timestamp = timestamp;
    this.update(_root, _local);
  }
  /**
   * Initialize new ComputeOptions.
   *
   * @param options
   * @param root
   * @param local
   * @returns {ComputeOptions}
   */
  static init(options, root, local) {
    return options instanceof ComputeOptions ? new ComputeOptions(options._opts, isNil(options.root) ? root : options.root, Object.assign({}, options.local, local)) : new ComputeOptions(options, root, local);
  }
  /** Updates the internal mutable state. */
  update(root, local) {
    var _a;
    // NOTE: this is done for efficiency to avoid creating too many intermediate options objects.
    this._root = root;
    this._local = local ? Object.assign({}, local, {
      variables: Object.assign({}, (_a = this._local) === null || _a === void 0 ? void 0 : _a.variables, local === null || local === void 0 ? void 0 : local.variables)
    }) : local;
    return this;
  }
  getOptions() {
    return Object.freeze(Object.assign(Object.assign({}, this._opts), {
      context: Context.from(this._opts.context)
    }));
  }
  get root() {
    return this._root;
  }
  get local() {
    return this._local;
  }
  get idKey() {
    return this._opts.idKey;
  }
  get collation() {
    var _a;
    return (_a = this._opts) === null || _a === void 0 ? void 0 : _a.collation;
  }
  get processingMode() {
    var _a;
    return ((_a = this._opts) === null || _a === void 0 ? void 0 : _a.processingMode) || ProcessingMode.CLONE_OFF;
  }
  get useStrictMode() {
    var _a;
    return (_a = this._opts) === null || _a === void 0 ? void 0 : _a.useStrictMode;
  }
  get scriptEnabled() {
    var _a;
    return (_a = this._opts) === null || _a === void 0 ? void 0 : _a.scriptEnabled;
  }
  get useGlobalContext() {
    var _a;
    return (_a = this._opts) === null || _a === void 0 ? void 0 : _a.useGlobalContext;
  }
  get hashFunction() {
    var _a;
    return (_a = this._opts) === null || _a === void 0 ? void 0 : _a.hashFunction;
  }
  get collectionResolver() {
    var _a;
    return (_a = this._opts) === null || _a === void 0 ? void 0 : _a.collectionResolver;
  }
  get jsonSchemaValidator() {
    var _a;
    return (_a = this._opts) === null || _a === void 0 ? void 0 : _a.jsonSchemaValidator;
  }
  get variables() {
    var _a;
    return (_a = this._opts) === null || _a === void 0 ? void 0 : _a.variables;
  }
  get context() {
    var _a;
    return (_a = this._opts) === null || _a === void 0 ? void 0 : _a.context;
  }
}
/**
 * Creates an Option from another where required keys are initialized.
 * @param options Options
 */
function initOptions(options) {
  return options instanceof ComputeOptions ? options.getOptions() : Object.freeze(Object.assign(Object.assign({
    idKey: "_id",
    scriptEnabled: true,
    useStrictMode: true,
    useGlobalContext: true,
    processingMode: ProcessingMode.CLONE_OFF
  }, options), {
    context: (options === null || options === void 0 ? void 0 : options.context) ? Context.from(options === null || options === void 0 ? void 0 : options.context) : Context.init({})
  }));
}
/**
 * The different groups of operators
 */
var OperatorType;
(function (OperatorType) {
  OperatorType["ACCUMULATOR"] = "accumulator";
  OperatorType["EXPRESSION"] = "expression";
  OperatorType["PIPELINE"] = "pipeline";
  OperatorType["PROJECTION"] = "projection";
  OperatorType["QUERY"] = "query";
  OperatorType["WINDOW"] = "window";
})(OperatorType || (OperatorType = {}));
class Context {
  constructor(ops) {
    this.operators = {
      [OperatorType.ACCUMULATOR]: {},
      [OperatorType.EXPRESSION]: {},
      [OperatorType.PIPELINE]: {},
      [OperatorType.PROJECTION]: {},
      [OperatorType.QUERY]: {},
      [OperatorType.WINDOW]: {}
    };
    for (const [type, operators] of Object.entries(ops)) {
      this.addOperators(type, operators);
    }
  }
  static init(ops = {}) {
    return new Context(ops);
  }
  static from(ctx) {
    return new Context(ctx.operators);
  }
  addOperators(type, ops) {
    for (const [name, fn] of Object.entries(ops)) {
      if (!this.getOperator(type, name)) {
        this.operators[type][name] = fn;
      }
    }
    return this;
  }
  // register
  addAccumulatorOps(ops) {
    return this.addOperators(OperatorType.ACCUMULATOR, ops);
  }
  addExpressionOps(ops) {
    return this.addOperators(OperatorType.EXPRESSION, ops);
  }
  addQueryOps(ops) {
    return this.addOperators(OperatorType.QUERY, ops);
  }
  addPipelineOps(ops) {
    return this.addOperators(OperatorType.PIPELINE, ops);
  }
  addProjectionOps(ops) {
    return this.addOperators(OperatorType.PROJECTION, ops);
  }
  addWindowOps(ops) {
    return this.addOperators(OperatorType.WINDOW, ops);
  }
  // getters
  getOperator(type, name) {
    return type in this.operators ? this.operators[type][name] || null : null;
  }
}
// global context
const GLOBAL_CONTEXT = Context.init();
/**
 * Register fully specified operators for the given operator class.
 *
 * @param type The operator type
 * @param operators Map of the operators
 */
function useOperators(type, operators) {
  for (const [name, fn] of Object.entries(operators)) {
    assert(isFunction(fn) && isOperator(name), `'${name}' is not a valid operator`);
    const currentFn = getOperator(type, name, null);
    assert(!currentFn || fn === currentFn, `${name} already exists for '${type}' operators. Cannot change operator function once registered.`);
  }
  // toss the operator salad :)
  switch (type) {
    case OperatorType.ACCUMULATOR:
      GLOBAL_CONTEXT.addAccumulatorOps(operators);
      break;
    case OperatorType.EXPRESSION:
      GLOBAL_CONTEXT.addExpressionOps(operators);
      break;
    case OperatorType.PIPELINE:
      GLOBAL_CONTEXT.addPipelineOps(operators);
      break;
    case OperatorType.PROJECTION:
      GLOBAL_CONTEXT.addProjectionOps(operators);
      break;
    case OperatorType.QUERY:
      GLOBAL_CONTEXT.addQueryOps(operators);
      break;
    case OperatorType.WINDOW:
      GLOBAL_CONTEXT.addWindowOps(operators);
      break;
  }
}
/**
 * Overrides the current global context with this new one.
 *
 * @param context The new context to override the global one with.
 */
// export const setGlobalContext = (context: Context): void => {
//   GLOBAL_CONTEXT = context;
// };
/**
 * Returns the operator function or undefined if it is not found
 * @param type Type of operator
 * @param operator Name of the operator
 */
function getOperator(type, operator, options) {
  const {
    context: ctx,
    useGlobalContext: fallback
  } = options || {};
  const fn = ctx ? ctx.getOperator(type, operator) : null;
  return !fn && fallback ? GLOBAL_CONTEXT.getOperator(type, operator) : fn;
}
/* eslint-disable unused-imports/no-unused-vars-ts */
/**
 * Implementation of system variables
 * @type {Object}
 */
const systemVariables = {
  $$ROOT(_obj, _expr, options) {
    return options.root;
  },
  $$CURRENT(obj, _expr, _options) {
    return obj;
  },
  $$REMOVE(_obj, _expr, _options) {
    return undefined;
  },
  $$NOW(_obj, _expr, options) {
    return new Date(options.timestamp);
  }
};
/**
 * Implementation of $redact variables
 *
 * Each function accepts 3 arguments (obj, expr, options)
 *
 * @type {Object}
 */
const redactVariables = {
  $$KEEP(obj, _expr, _options) {
    return obj;
  },
  $$PRUNE(_obj, _expr, _options) {
    return undefined;
  },
  $$DESCEND(obj, expr, options) {
    // traverse nested documents iff there is a $cond
    if (!has(expr, "$cond")) return obj;
    let result;
    for (const [key, current] of Object.entries(obj)) {
      if (isObjectLike(current)) {
        if (current instanceof Array) {
          const array = [];
          for (let elem of current) {
            if (isObject(elem)) {
              elem = redact(elem, expr, options.update(elem));
            }
            if (!isNil(elem)) {
              array.push(elem);
            }
          }
          result = array;
        } else {
          result = redact(current, expr, options.update(current));
        }
        if (isNil(result)) {
          delete obj[key]; // pruned result
        } else {
          obj[key] = result;
        }
      }
    }
    return obj;
  }
};
/* eslint-enable unused-imports/no-unused-vars-ts */
/**
 * Computes the value of the expression on the object for the given operator
 *
 * @param obj the current object from the collection
 * @param expr the expression for the given field
 * @param operator the operator to resolve the field with
 * @param options {Object} extra options
 * @returns {*}
 */
function computeValue(obj, expr, operator, options) {
  var _a;
  // ensure valid options exist on first invocation
  const copts = ComputeOptions.init(options, obj);
  operator = operator || "";
  if (isOperator(operator)) {
    // if the field of the object is a valid operator
    const callExpression = getOperator(OperatorType.EXPRESSION, operator, options);
    if (callExpression) return callExpression(obj, expr, copts);
    // we also handle $group accumulator operators
    const callAccumulator = getOperator(OperatorType.ACCUMULATOR, operator, options);
    if (callAccumulator) {
      // if object is not an array, first try to compute using the expression
      if (!(obj instanceof Array)) {
        obj = computeValue(obj, expr, null, copts);
        expr = null;
      }
      // validate that we have an array
      assert(obj instanceof Array, `'${operator}' target must be an array.`);
      // for accumulators, we use the global options since the root is specific to each element within array.
      return callAccumulator(obj, expr,
      // reset the root object for accumulators.
      copts.update(null, copts.local));
    }
    // operator was not found
    throw new Error(`operator '${operator}' is not registered`);
  }
  // if expr is a string and begins with "$$", then we have a variable.
  //  this can be one of; redact variable, system variable, user-defined variable.
  //  we check and process them in that order.
  //
  // if expr begins only a single "$", then it is a path to a field on the object.
  if (isString(expr) && expr.length > 0 && expr[0] === "$") {
    // we return redact variables as literals
    if (has(redactVariables, expr)) {
      return expr;
    }
    // default to root for resolving path.
    let context = copts.root;
    // handle selectors with explicit prefix
    const arr = expr.split(".");
    if (has(systemVariables, arr[0])) {
      // set 'root' only the first time it is required to be used for all subsequent calls
      // if it already available on the options, it will be used
      context = systemVariables[arr[0]](obj, null, copts);
      expr = expr.slice(arr[0].length + 1); //  +1 for '.'
    } else if (arr[0].slice(0, 2) === "$$") {
      // handle user-defined variables
      context = Object.assign({}, copts.variables,
      // global vars
      // current item is added before local variables because the binding may be changed.
      {
        this: obj
      }, (_a = copts.local) === null || _a === void 0 ? void 0 : _a.variables // local vars
      );
      const prefix = arr[0].slice(2);
      assert(has(context, prefix), `Use of undefined variable: ${prefix}`);
      expr = expr.slice(2);
    } else {
      // 'expr' is a path to a field on the object.
      expr = expr.slice(1);
    }
    if (expr === "") return context;
    return resolve(context, expr);
  }
  // check and return value if already in a resolved state
  if (isArray(expr)) {
    return expr.map(item => computeValue(obj, item, null, copts));
  } else if (isObject(expr)) {
    const result = {};
    for (const [key, val] of Object.entries(expr)) {
      result[key] = computeValue(obj, val, key, copts);
      // must run ONLY one aggregate operator per expression
      // if so, return result of the computed value
      if ([OperatorType.EXPRESSION, OperatorType.ACCUMULATOR].some(t => !!getOperator(t, key, options))) {
        // there should be only one operator
        assert(Object.keys(expr).length === 1, "Invalid aggregation expression '" + JSON.stringify(expr) + "'");
        return result[key];
      }
    }
    return result;
  }
  return expr;
}
/**
 * Redact an object
 * @param  {Object} obj The object to redact
 * @param  {*} expr The redact expression
 * @param  {*} options  Options for value
 * @return {*} returns the result of the redacted object
 */
function redact(obj, expr, options) {
  const result = computeValue(obj, expr, null, options);
  return has(redactVariables, result) ? redactVariables[result](obj, expr, options) : result;
}

// Boolean Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#boolean-expression-operators
/**
 * Returns true only when all its expressions evaluate to true. Accepts any number of argument expressions.
 *
 * @param obj
 * @param expr
 * @returns {boolean}
 */
const $and$1 = (obj, expr, options) => {
  const value = computeValue(obj, expr, null, options);
  return truthy(value, options.useStrictMode) && value.every(v => truthy(v, options.useStrictMode));
};

// Boolean Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#boolean-expression-operators
/**
 * Returns the boolean value that is the opposite of its argument expression. Accepts a single argument expression.
 *
 * @param obj RawObject from collection
 * @param expr Right hand side expression of operator
 * @returns {boolean}
 */
const $not$1 = (obj, expr, options) => {
  const booleanExpr = ensureArray$1(expr);
  // array values are truthy so an emty array is false
  if (booleanExpr.length == 0) return false;
  // use provided value non-array value
  if (booleanExpr.length == 1) return !computeValue(obj, booleanExpr[0], null, options);
  // expects a single argument
  throw "Expression $not takes exactly 1 argument";
};

// Boolean Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#boolean-expression-operators
/**
 * Returns true when any of its expressions evaluates to true. Accepts any number of argument expressions.
 *
 * @param obj
 * @param expr
 * @returns {boolean}
 */
const $or$1 = (obj, expr, options) => {
  const value = computeValue(obj, expr, null, options);
  const strict = options.useStrictMode;
  return truthy(value, strict) && value.some(v => truthy(v, strict));
};

var booleanOperators = /*#__PURE__*/Object.freeze({
    __proto__: null,
    $and: $and$1,
    $not: $not$1,
    $or: $or$1
});

// Comparison Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#comparison-expression-operators
/**
 * Compares two values and returns the result of the comparison as an integer.
 *
 * @param obj
 * @param expr
 * @returns {number}
 */
const $cmp = (obj, expr, options) => {
  const args = computeValue(obj, expr, null, options);
  if (args[0] > args[1]) return 1;
  if (args[0] < args[1]) return -1;
  return 0;
};

/**
 * Returns an iterator
 * @param {*} source An iterable source (Array, Function, Generator, or Iterator)
 */
function Lazy(source) {
  return source instanceof Iterator ? source : new Iterator(source);
}
function compose(...iterators) {
  let index = 0;
  return Lazy(() => {
    while (index < iterators.length) {
      const o = iterators[index].next();
      if (!o.done) return o;
      index++;
    }
    return {
      done: true
    };
  });
}
/**
 * Checks whether the given object is compatible with a generator i.e Object{next:Function}
 * @param {*} o An object
 */
function isGenerator(o) {
  return !!o && typeof o === "object" && (o === null || o === void 0 ? void 0 : o.next) instanceof Function;
}
function dropItem(array, i) {
  const rest = array.slice(i + 1);
  array.splice(i);
  Array.prototype.push.apply(array, rest);
}
// stop iteration error
const DONE = new Error();
// Lazy function actions
var Action;
(function (Action) {
  Action[Action["MAP"] = 0] = "MAP";
  Action[Action["FILTER"] = 1] = "FILTER";
  Action[Action["TAKE"] = 2] = "TAKE";
  Action[Action["DROP"] = 3] = "DROP";
})(Action || (Action = {}));
function createCallback(nextFn, iteratees, buffer) {
  let done = false;
  let index = -1;
  let bufferIndex = 0; // index for the buffer
  return function (storeResult) {
    // special hack to collect all values into buffer
    try {
      outer: while (!done) {
        let o = nextFn();
        index++;
        let i = -1;
        const size = iteratees.length;
        let innerDone = false;
        while (++i < size) {
          const r = iteratees[i];
          switch (r.action) {
            case Action.MAP:
              o = r.func(o, index);
              break;
            case Action.FILTER:
              if (!r.func(o, index)) continue outer;
              break;
            case Action.TAKE:
              --r.count;
              if (!r.count) innerDone = true;
              break;
            case Action.DROP:
              --r.count;
              if (!r.count) dropItem(iteratees, i);
              continue outer;
            default:
              break outer;
          }
        }
        done = innerDone;
        if (storeResult) {
          buffer[bufferIndex++] = o;
        } else {
          return {
            value: o,
            done: false
          };
        }
      }
    } catch (e) {
      if (e !== DONE) throw e;
    }
    done = true;
    return {
      done
    };
  };
}
/**
 * A lazy collection iterator yields a single value at a time upon request.
 */
class Iterator {
  /**
   * @param {*} source An iterable object or function.
   *    Array - return one element per cycle
   *    Object{next:Function} - call next() for the next value (this also handles generator functions)
   *    Function - call to return the next value
   * @param {Function} fn An optional transformation function
   */
  constructor(source) {
    this.iteratees = [];
    this.yieldedValues = [];
    this.isDone = false;
    let nextVal;
    if (source instanceof Function) {
      // make iterable
      source = {
        next: source
      };
    }
    if (isGenerator(source)) {
      const src = source;
      nextVal = () => {
        const o = src.next();
        if (o.done) throw DONE;
        return o.value;
      };
    } else if (source instanceof Array) {
      const data = source;
      const size = data.length;
      let index = 0;
      nextVal = () => {
        if (index < size) return data[index++];
        throw DONE;
      };
    } else if (!(source instanceof Function)) {
      throw new Error(`Lazy must be initialized with an array, generator, or function.`);
    }
    // create next function
    this.getNext = createCallback(nextVal, this.iteratees, this.yieldedValues);
  }
  /**
   * Add an iteratee to this lazy sequence
   */
  push(action, value) {
    if (typeof value === "function") {
      this.iteratees.push({
        action,
        func: value
      });
    } else if (typeof value === "number") {
      this.iteratees.push({
        action,
        count: value
      });
    }
    return this;
  }
  next() {
    return this.getNext();
  }
  // Iteratees methods
  /**
   * Transform each item in the sequence to a new value
   * @param {Function} f
   */
  map(f) {
    return this.push(Action.MAP, f);
  }
  /**
   * Select only items matching the given predicate
   * @param {Function} pred
   */
  filter(predicate) {
    return this.push(Action.FILTER, predicate);
  }
  /**
   * Take given numbe for values from sequence
   * @param {Number} n A number greater than 0
   */
  take(n) {
    return n > 0 ? this.push(Action.TAKE, n) : this;
  }
  /**
   * Drop a number of values from the sequence
   * @param {Number} n Number of items to drop greater than 0
   */
  drop(n) {
    return n > 0 ? this.push(Action.DROP, n) : this;
  }
  // Transformations
  /**
   * Returns a new lazy object with results of the transformation
   * The entire sequence is realized.
   *
   * @param {Callback<Source, RawArray>} fn Tranform function of type (Array) => (Any)
   */
  transform(fn) {
    const self = this;
    let iter;
    return Lazy(() => {
      if (!iter) {
        iter = Lazy(fn(self.value()));
      }
      return iter.next();
    });
  }
  // Terminal methods
  /**
   * Returns the fully realized values of the iterators.
   * The return value will be an array unless `lazy.first()` was used.
   * The realized values are cached for subsequent calls.
   */
  value() {
    if (!this.isDone) {
      this.isDone = this.getNext(true).done;
    }
    return this.yieldedValues;
  }
  /**
   * Execute the funcion for each value. Will stop when an execution returns false.
   * @param {Function} f
   * @returns {Boolean} false iff `f` return false for AnyVal execution, otherwise true
   */
  each(f) {
    for (;;) {
      const o = this.next();
      if (o.done) break;
      if (f(o.value) === false) return false;
    }
    return true;
  }
  /**
   * Returns the reduction of sequence according the reducing function
   *
   * @param {*} f a reducing function
   * @param {*} initialValue
   */
  reduce(f, initialValue) {
    let o = this.next();
    if (initialValue === undefined && !o.done) {
      initialValue = o.value;
      o = this.next();
    }
    while (!o.done) {
      initialValue = f(initialValue, o.value);
      o = this.next();
    }
    return initialValue;
  }
  /**
   * Returns the number of matched items in the sequence
   */
  size() {
    return this.reduce((acc, _) => ++acc, 0);
  }
  [Symbol.iterator]() {
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    return this;
  }
}

/**
 * Provides functionality for the mongoDB aggregation pipeline
 *
 * @param pipeline an Array of pipeline operators
 * @param options An optional Options to pass the aggregator
 * @constructor
 */
class Aggregator {
  constructor(pipeline, options) {
    this.pipeline = pipeline;
    this.options = initOptions(options);
  }
  /**
   * Returns an `Lazy` iterator for processing results of pipeline
   *
   * @param {*} collection An array or iterator object
   * @returns {Iterator} an iterator object
   */
  stream(collection) {
    let iterator = Lazy(collection);
    const mode = this.options.processingMode;
    if (mode == ProcessingMode.CLONE_ALL || mode == ProcessingMode.CLONE_INPUT) {
      iterator.map(cloneDeep);
    }
    const pipelineOperators = new Array();
    if (!isEmpty(this.pipeline)) {
      // run aggregation pipeline
      for (const operator of this.pipeline) {
        const operatorKeys = Object.keys(operator);
        const opName = operatorKeys[0];
        const call = getOperator(OperatorType.PIPELINE, opName, this.options);
        assert(operatorKeys.length === 1 && !!call, `invalid pipeline operator ${opName}`);
        pipelineOperators.push(opName);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        iterator = call(iterator, operator[opName], this.options);
      }
    }
    // operators that may share object graphs of inputs.
    // we only need to clone the output for these since the objects will already be distinct for other operators.
    if (mode == ProcessingMode.CLONE_OUTPUT || mode == ProcessingMode.CLONE_ALL && !!intersection([["$group", "$unwind"], pipelineOperators]).length) {
      iterator.map(cloneDeep);
    }
    return iterator;
  }
  /**
   * Return the results of the aggregation as an array.
   *
   * @param {*} collection
   * @param {*} query
   */
  run(collection) {
    return this.stream(collection).value();
  }
}

/**
 * Cursor to iterate and perform filtering on matched objects.
 * This object must not be used directly. A cursor may be obtaine from calling `find()` on an instance of `Query`.
 *
 * @param collection The input source of the collection
 * @param predicate A predicate function to test documents
 * @param projection A projection criteria
 * @param options Options
 * @constructor
 */
class Cursor {
  constructor(source, predicate, projection, options) {
    this.source = source;
    this.predicate = predicate;
    this.projection = projection;
    this.options = options;
    this.operators = [];
    this.result = null;
    this.buffer = [];
  }
  /** Returns the iterator from running the query */
  fetch() {
    if (this.result) return this.result;
    // add projection operator
    if (isObject(this.projection)) {
      this.operators.push({
        $project: this.projection
      });
    }
    // filter collection
    this.result = Lazy(this.source).filter(this.predicate);
    if (this.operators.length > 0) {
      this.result = new Aggregator(this.operators, this.options).stream(this.result);
    }
    return this.result;
  }
  /** Returns an iterator with the buffered data included */
  fetchAll() {
    const buffered = Lazy([...this.buffer]);
    this.buffer = [];
    return compose(buffered, this.fetch());
  }
  /**
   * Return remaining objects in the cursor as an array. This method exhausts the cursor
   * @returns {Array}
   */
  all() {
    return this.fetchAll().value();
  }
  /**
   * Returns the number of objects return in the cursor. This method exhausts the cursor
   * @returns {Number}
   */
  count() {
    return this.all().length;
  }
  /**
   * Returns a cursor that begins returning results only after passing or skipping a number of documents.
   * @param {Number} n the number of results to skip.
   * @return {Cursor} Returns the cursor, so you can chain this call.
   */
  skip(n) {
    this.operators.push({
      $skip: n
    });
    return this;
  }
  /**
   * Constrains the size of a cursor's result set.
   * @param {Number} n the number of results to limit to.
   * @return {Cursor} Returns the cursor, so you can chain this call.
   */
  limit(n) {
    this.operators.push({
      $limit: n
    });
    return this;
  }
  /**
   * Returns results ordered according to a sort specification.
   * @param {Object} modifier an object of key and values specifying the sort order. 1 for ascending and -1 for descending
   * @return {Cursor} Returns the cursor, so you can chain this call.
   */
  sort(modifier) {
    this.operators.push({
      $sort: modifier
    });
    return this;
  }
  /**
   * Specifies the collation for the cursor returned by the `mingo.Query.find`
   * @param {*} spec
   */
  collation(spec) {
    this.options = Object.assign(Object.assign({}, this.options), {
      collation: spec
    });
    return this;
  }
  /**
   * Returns the next document in a cursor.
   * @returns {Object | Boolean}
   */
  next() {
    // yield value obtains in hasNext()
    if (this.buffer.length > 0) {
      return this.buffer.pop();
    }
    const o = this.fetch().next();
    if (o.done) return;
    return o.value;
  }
  /**
   * Returns true if the cursor has documents and can be iterated.
   * @returns {boolean}
   */
  hasNext() {
    // there is a value in the buffer
    if (this.buffer.length > 0) return true;
    const o = this.fetch().next();
    if (o.done) return false;
    this.buffer.push(o.value);
    return true;
  }
  /**
   * Applies a function to each document in a cursor and collects the return values in an array.
   * @param fn
   * @returns {Array}
   */
  map(fn) {
    return this.all().map(fn);
  }
  /**
   * Applies a JavaScript function for every document in a cursor.
   * @param fn
   */
  forEach(fn) {
    this.all().forEach(fn);
  }
  [Symbol.iterator]() {
    return this.fetchAll();
  }
}

/**
 * An object used to filter input documents
 *
 * @param {Object} condition The condition for constructing predicates
 * @param {Options} options Options for use by operators
 * @constructor
 */
class Query {
  constructor(condition, options) {
    this.condition = condition;
    this.options = initOptions(options);
    this.compiled = [];
    this.compile();
  }
  compile() {
    assert(isObject(this.condition), `query criteria must be an object: ${JSON.stringify(this.condition)}`);
    const whereOperator = {};
    for (const [field, expr] of Object.entries(this.condition)) {
      if ("$where" === field) {
        Object.assign(whereOperator, {
          field: field,
          expr: expr
        });
      } else if (inArray(["$and", "$or", "$nor", "$expr", "$jsonSchema"], field)) {
        this.processOperator(field, field, expr);
      } else {
        // normalize expression
        assert(!isOperator(field), `unknown top level operator: ${field}`);
        for (const [operator, val] of Object.entries(normalize(expr))) {
          this.processOperator(field, operator, val);
        }
      }
      if (whereOperator.field) {
        this.processOperator(whereOperator.field, whereOperator.field, whereOperator.expr);
      }
    }
  }
  processOperator(field, operator, value) {
    const call = getOperator(OperatorType.QUERY, operator, this.options);
    if (!call) {
      throw new Error(`unknown operator ${operator}`);
    }
    const fn = call(field, value, this.options);
    this.compiled.push(fn);
  }
  /**
   * Checks if the object passes the query criteria. Returns true if so, false otherwise.
   *
   * @param obj The object to test
   * @returns {boolean} True or false
   */
  test(obj) {
    for (let i = 0, len = this.compiled.length; i < len; i++) {
      if (!this.compiled[i](obj)) {
        return false;
      }
    }
    return true;
  }
  /**
   * Returns a cursor to select matching documents from the input source.
   *
   * @param source A source providing a sequence of documents
   * @param projection An optional projection criteria
   * @returns {Cursor} A Cursor for iterating over the results
   */
  find(collection, projection) {
    return new Cursor(collection, x => this.test(x), projection || {}, this.options);
  }
  /**
   * Remove matched documents from the collection returning the remainder
   *
   * @param collection An array of documents
   * @returns {Array} A new array with matching elements removed
   */
  remove(collection) {
    return collection.reduce((acc, obj) => {
      if (!this.test(obj)) acc.push(obj);
      return acc;
    }, []);
  }
}

/**
 * Predicates used for Query and Expression operators.
 */
/**
 * Returns a query operator created from the predicate
 *
 * @param predicate Predicate function
 */
function createQueryOperator(predicate) {
  const f = (selector, value, options) => {
    const opts = {
      unwrapArray: true
    };
    const depth = Math.max(1, selector.split(".").length - 1);
    return obj => {
      // value of field must be fully resolved.
      const lhs = resolve(obj, selector, opts);
      return predicate(lhs, value, Object.assign(Object.assign({}, options), {
        depth
      }));
    };
  };
  f.op = "query";
  return f; // as QueryOperator;
}
/**
 * Returns an expression operator created from the predicate
 *
 * @param predicate Predicate function
 */
function createExpressionOperator(predicate) {
  return (obj, expr, options) => {
    const args = computeValue(obj, expr, null, options);
    return predicate(...args);
  };
}
/**
 * Checks that two values are equal.
 *
 * @param a         The lhs operand as resolved from the object by the given selector
 * @param b         The rhs operand provided by the user
 * @returns {*}
 */
function $eq$2(a, b, options) {
  // start with simple equality check
  if (isEqual(a, b)) return true;
  // https://docs.mongodb.com/manual/tutorial/query-for-null-fields/
  if (isNil(a) && isNil(b)) return true;
  // check
  if (a instanceof Array) {
    const eq = isEqual.bind(null, b);
    return a.some(eq) || flatten(a, options === null || options === void 0 ? void 0 : options.depth).some(eq);
  }
  return false;
}
/**
 * Matches all values that are not equal to the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $ne$2(a, b, options) {
  return !$eq$2(a, b, options);
}
/**
 * Matches any of the values that exist in an array specified in the query.
 *
 * @param a
 * @param b
 * @returns {*}
 */
function $in$1(a, b, options) {
  // queries for null should be able to find undefined fields
  if (isNil(a)) return b.some(v => v === null);
  return intersection([ensureArray$1(a), b], options === null || options === void 0 ? void 0 : options.hashFunction).length > 0;
}
/**
 * Matches values that do not exist in an array specified to the query.
 *
 * @param a
 * @param b
 * @returns {*|boolean}
 */
function $nin$1(a, b, options) {
  return !$in$1(a, b, options);
}
/**
 * Matches values that are less than the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $lt$2(a, b, options) {
  return compare(a, b, (x, y) => compare$1(x, y) < 0);
}
/**
 * Matches values that are less than or equal to the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $lte$2(a, b, options) {
  return compare(a, b, (x, y) => compare$1(x, y) <= 0);
}
/**
 * Matches values that are greater than the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $gt$2(a, b, options) {
  return compare(a, b, (x, y) => compare$1(x, y) > 0);
}
/**
 * Matches values that are greater than or equal to the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $gte$2(a, b, options) {
  return compare(a, b, (x, y) => compare$1(x, y) >= 0);
}
/**
 * Performs a modulo operation on the value of a field and selects documents with a specified result.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $mod$1(a, b, options) {
  return ensureArray$1(a).some(x => b.length === 2 && x % b[0] === b[1]);
}
/**
 * Selects documents where values match a specified regular expression.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $regex$1(a, b, options) {
  const lhs = ensureArray$1(a);
  const match = x => isString(x) && truthy(b.exec(x), options === null || options === void 0 ? void 0 : options.useStrictMode);
  return lhs.some(match) || flatten(lhs, 1).some(match);
}
/**
 * Matches documents that have the specified field.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $exists$1(a, b, options) {
  return (b === false || b === 0) && a === undefined || (b === true || b === 1) && a !== undefined;
}
/**
 * Matches arrays that contain all elements specified in the query.
 *
 * @param values
 * @param queries
 * @returns boolean
 */
function $all$1(values, queries, options) {
  if (!isArray(values) || !isArray(queries) || !values.length || !queries.length) {
    return false;
  }
  let matched = true;
  for (const query of queries) {
    // no need to check all the queries.
    if (!matched) break;
    if (isObject(query) && inArray(Object.keys(query), "$elemMatch")) {
      matched = $elemMatch$2(values, query["$elemMatch"], options);
    } else if (query instanceof RegExp) {
      matched = values.some(s => typeof s === "string" && query.test(s));
    } else {
      matched = values.some(v => isEqual(query, v));
    }
  }
  return matched;
}
/**
 * Selects documents if the array field is a specified size.
 *
 * @param a
 * @param b
 * @returns {*|boolean}
 */
function $size$1(a, b, options) {
  return Array.isArray(a) && a.length === b;
}
function isNonBooleanOperator(name) {
  return isOperator(name) && ["$and", "$or", "$nor"].indexOf(name) === -1;
}
/**
 * Selects documents if element in the array field matches all the specified $elemMatch condition.
 *
 * @param a {Array} element to match against
 * @param b {Object} subquery
 */
function $elemMatch$2(a, b, options) {
  // should return false for non-matching input
  if (isArray(a) && !isEmpty(a)) {
    let format = x => x;
    let criteria = b;
    // If we find a boolean operator in the subquery, we fake a field to point to it. This is an
    // attempt to ensure that it is a valid criteria. We cannot make this substitution for operators
    // like $and/$or/$nor; as otherwise, this faking will break our query.
    if (Object.keys(b).every(isNonBooleanOperator)) {
      criteria = {
        temp: b
      };
      format = x => ({
        temp: x
      });
    }
    const query = new Query(criteria, options);
    for (let i = 0, len = a.length; i < len; i++) {
      if (query.test(format(a[i]))) {
        return true;
      }
    }
  }
  return false;
}
// helper functions
const isNull = a => a === null;
const isInt = a => isNumber(a) && a >= MIN_INT && a <= MAX_INT && a.toString().indexOf(".") === -1;
const isLong = a => isNumber(a) && a >= MIN_LONG && a <= MAX_LONG && a.toString().indexOf(".") === -1;
/** Mapping of type to predicate */
const compareFuncs = {
  array: isArray,
  bool: isBoolean,
  boolean: isBoolean,
  date: isDate,
  decimal: isNumber,
  double: isNumber,
  int: isInt,
  long: isLong,
  number: isNumber,
  null: isNull,
  object: isObject,
  regex: isRegExp,
  regexp: isRegExp,
  string: isString,
  // added for completeness
  undefined: isNil,
  // deprecated
  function: _ => {
    throw new Error("unsupported type key `function`.");
  },
  // Mongo identifiers
  1: isNumber,
  //double
  2: isString,
  3: isObject,
  4: isArray,
  6: isNil,
  // deprecated
  8: isBoolean,
  9: isDate,
  10: isNull,
  11: isRegExp,
  16: isInt,
  18: isLong,
  19: isNumber //decimal
};
/**
 * Selects documents if a field is of the specified type.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function compareType(a, b, _) {
  const f = compareFuncs[b];
  return f ? f(a) : false;
}
/**
 * Selects documents if a field is of the specified type.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $type$1(a, b, options) {
  return Array.isArray(b) ? b.findIndex(t => compareType(a, t)) >= 0 : compareType(a, b);
}
function compare(a, b, f) {
  return ensureArray$1(a).some(x => getType(x) === getType(b) && f(x, b));
}

// Comparison Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#comparison-expression-operators
/**
 * Matches values that are equal to a specified value.
 */
const $eq$1 = createExpressionOperator($eq$2);

// Comparison Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#comparison-expression-operators
/**
 * Matches values that are greater than a specified value.
 */
const $gt$1 = createExpressionOperator($gt$2);

// Comparison Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#comparison-expression-operators
/**
 * 	Matches values that are greater than or equal to a specified value.
 */
const $gte$1 = createExpressionOperator($gte$2);

// Comparison Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#comparison-expression-operators
/**
 * Matches values that are less than the value specified in the query.
 */
const $lt$1 = createExpressionOperator($lt$2);

// Comparison Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#comparison-expression-operators
/**
 * Matches values that are less than or equal to the value specified in the query.
 */
const $lte$1 = createExpressionOperator($lte$2);

// Comparison Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#comparison-expression-operators
/**
 * Matches all values that are not equal to the value specified in the query.
 */
const $ne$1 = createExpressionOperator($ne$2);

var comparisonOperators = /*#__PURE__*/Object.freeze({
    __proto__: null,
    $cmp: $cmp,
    $eq: $eq$1,
    $gt: $gt$1,
    $gte: $gte$1,
    $lt: $lt$1,
    $lte: $lte$1,
    $ne: $ne$1
});

/**
 * Takes all input documents and returns them in a stream of sorted documents.
 *
 * @param collection
 * @param sortKeys
 * @param  {Object} options
 * @returns {*}
 */
const $sort = (collection, sortKeys, options) => {
  if (isEmpty(sortKeys) || !isObject(sortKeys)) return collection;
  let cmp = compare$1;
  // check for collation spec on the options
  const collationSpec = options.collation;
  // use collation comparator if provided
  if (isObject(collationSpec) && isString(collationSpec.locale)) {
    cmp = collationComparator(collationSpec);
  }
  return collection.transform(coll => {
    const modifiers = Object.keys(sortKeys);
    for (const key of modifiers.reverse()) {
      const groups = groupBy(coll, obj => resolve(obj, key), options.hashFunction);
      const sortedKeys = Array.from(groups.keys()).sort(cmp);
      if (sortKeys[key] === -1) sortedKeys.reverse();
      // reuse collection so the data is available for the next iteration of the sort modifiers.
      coll = [];
      sortedKeys.reduce((acc, key) => into(acc, groups.get(key)), coll);
    }
    return coll;
  });
};
// MongoDB collation strength to JS localeCompare sensitivity mapping.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
const COLLATION_STRENGTH = {
  // Only strings that differ in base letters compare as unequal. Examples: a ≠ b, a = á, a = A.
  1: "base",
  //  Only strings that differ in base letters or accents and other diacritic marks compare as unequal.
  // Examples: a ≠ b, a ≠ á, a = A.
  2: "accent",
  // Strings that differ in base letters, accents and other diacritic marks, or case compare as unequal.
  // Other differences may also be taken into consideration. Examples: a ≠ b, a ≠ á, a ≠ A
  3: "variant"
  // case - Only strings that differ in base letters or case compare as unequal. Examples: a ≠ b, a = á, a ≠ A.
};
/**
 * Creates a comparator function for the given collation spec. See https://docs.mongodb.com/manual/reference/collation/
 *
 * @param spec {Object} The MongoDB collation spec.
 * {
 *   locale: string,
 *   caseLevel: boolean,
 *   caseFirst: string,
 *   strength: int,
 *   numericOrdering: boolean,
 *   alternate: string,
 *   maxVariable: never, // unsupported
 *   backwards: never // unsupported
 * }
 */
function collationComparator(spec) {
  const localeOpt = {
    sensitivity: COLLATION_STRENGTH[spec.strength || 3],
    caseFirst: spec.caseFirst === "off" ? "false" : spec.caseFirst || "false",
    numeric: spec.numericOrdering || false,
    ignorePunctuation: spec.alternate === "shifted"
  };
  // when caseLevel is true for strength  1:base and 2:accent, bump sensitivity to the nearest that supports case comparison
  if ((spec.caseLevel || false) === true) {
    if (localeOpt.sensitivity === "base") localeOpt.sensitivity = "case";
    if (localeOpt.sensitivity === "accent") localeOpt.sensitivity = "variant";
  }
  const collator = new Intl.Collator(spec.locale, localeOpt);
  return (a, b) => {
    // non strings
    if (!isString(a) || !isString(b)) return compare$1(a, b);
    // only for strings
    const i = collator.compare(a, b);
    if (i < 0) return -1;
    if (i > 0) return 1;
    return 0;
  };
}

/**
 * Restricts the number of documents in an aggregation pipeline.
 *
 * @param collection
 * @param value
 * @param options
 * @returns {Object|*}
 */
const $limit = (collection, expr, options) => {
  return collection.take(expr);
};

// Array Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#array-expression-operators
/**
 * Returns a subset of an array.
 *
 * @param  {Object} obj
 * @param  {*} expr
 * @return {*}
 */
const $slice$1 = (obj, expr, options) => {
  const args = computeValue(obj, expr, null, options);
  const arr = args[0];
  let skip = args[1];
  let limit = args[2];
  // MongoDB $slice works a bit differently from Array.slice
  // Uses single argument for 'limit' and array argument [skip, limit]
  if (isNil(limit)) {
    if (skip < 0) {
      skip = Math.max(0, arr.length + skip);
      limit = arr.length - skip + 1;
    } else {
      limit = skip;
      skip = 0;
    }
  } else {
    if (skip < 0) {
      skip = Math.max(0, arr.length + skip);
    }
    assert(limit > 0, `Invalid argument for $slice operator. Limit must be a positive number`);
    limit += skip;
  }
  return arr.slice(skip, limit);
};

// Date Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#date-expression-operators
const buildMap = (letters, sign) => {
  const h = {};
  letters.split("").forEach((v, i) => h[v] = sign * (i + 1));
  return h;
};
Object.assign(Object.assign(Object.assign({}, buildMap("ABCDEFGHIKLM", 1)), buildMap("NOPQRSTUVWXY", -1)), {
  Z: 0
});

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
const FIXED_POINTS = {
  undefined: null,
  null: null,
  NaN: NaN,
  Infinity: new Error(),
  "-Infinity": new Error()
};
/**
 * Returns an operator for a given trignometric function
 *
 * @param f The trignometric function
 */
function createTrignometryOperator(f, fixedPoints = FIXED_POINTS) {
  const fp = Object.assign({}, FIXED_POINTS, fixedPoints);
  const keySet = new Set(Object.keys(fp));
  return (obj, expr, options) => {
    const n = computeValue(obj, expr, null, options);
    if (keySet.has(`${n}`)) {
      const res = fp[`${n}`];
      if (res instanceof Error) {
        throw new Error(`cannot apply $${f.name} to -inf, value must in (-inf,inf)`);
      }
      return res;
    }
    return f(n);
  };
}

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
/** Returns the inverse cosine (arc cosine) of a value in radians. */
createTrignometryOperator(Math.acos, {
  Infinity: Infinity,
  0: new Error()
});

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
/** Returns the inverse hyperbolic cosine (hyperbolic arc cosine) of a value in radians. */
createTrignometryOperator(Math.acosh, {
  Infinity: Infinity,
  0: new Error()
});

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
/** Returns the inverse sin (arc sine) of a value in radians. */
createTrignometryOperator(Math.asin);

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
/** Returns the inverse hyperbolic sine (hyperbolic arc sine) of a value in radians. */
createTrignometryOperator(Math.asinh, {
  Infinity: Infinity,
  "-Infinity": -Infinity
});

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
/** Returns the inverse tangent (arc tangent) of a value in radians. */
createTrignometryOperator(Math.atan);

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
/** Returns the inverse hyperbolic tangent (hyperbolic arc tangent) of a value in radians. */
createTrignometryOperator(Math.atanh, {
  1: Infinity,
  "-1": -Infinity
});

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
/** Returns the cosine of a value that is measured in radians. */
createTrignometryOperator(Math.cos);

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
/** Returns the hyperbolic cosine of a value that is measured in radians. */
createTrignometryOperator(Math.cosh, {
  "-Infinity": Infinity,
  Infinity: Infinity
  // [Math.PI]: -1,
});

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
const RADIANS_FACTOR = Math.PI / 180;
/** Converts a value from degrees to radians. */
createTrignometryOperator(n => n * RADIANS_FACTOR, {
  Infinity: Infinity,
  "-Infinity": Infinity
});

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
const DEGREES_FACTOR = 180 / Math.PI;
/** Converts a value from radians to degrees. */
createTrignometryOperator(n => n * DEGREES_FACTOR, {
  Infinity: Infinity,
  "-Infinity": -Infinity
});

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
/** Returns the sine of a value that is measured in radians. */
createTrignometryOperator(Math.sin);

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
/** Returns the hyperbolic sine of a value that is measured in radians. */
createTrignometryOperator(Math.sinh, {
  "-Infinity": -Infinity,
  Infinity: Infinity
});

// Trignometry Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#trigonometry-expression-operators
/** Returns the tangent of a value that is measured in radians. */
createTrignometryOperator(Math.tan);

/**
 * Reshapes a document stream.
 * $project can rename, add, or remove fields as well as create computed values and sub-documents.
 *
 * @param collection
 * @param expr
 * @param opt
 * @returns {Array}
 */
const $project = (collection, expr, options) => {
  if (isEmpty(expr)) return collection;
  // result collection
  let expressionKeys = Object.keys(expr);
  let idOnlyExcluded = false;
  // validate inclusion and exclusion
  validateExpression(expr, options);
  const ID_KEY = options.idKey;
  if (inArray(expressionKeys, ID_KEY)) {
    const id = expr[ID_KEY];
    if (id === 0 || id === false) {
      expressionKeys = expressionKeys.filter(notInArray.bind(null, [ID_KEY]));
      idOnlyExcluded = expressionKeys.length == 0;
    }
  } else {
    // if not specified the add the ID field
    expressionKeys.push(ID_KEY);
  }
  const copts = ComputeOptions.init(options);
  return collection.map(obj => processObject(obj, expr, copts.update(obj), expressionKeys, idOnlyExcluded));
};
/**
 * Process the expression value for $project operators
 *
 * @param {Object} obj The object to use as options
 * @param {Object} expr The experssion object of $project operator
 * @param {Array} expressionKeys The key in the 'expr' object
 * @param {Boolean} idOnlyExcluded Boolean value indicating whether only the ID key is excluded
 */
function processObject(obj, expr, options, expressionKeys, idOnlyExcluded) {
  let newObj = {};
  let foundSlice = false;
  let foundExclusion = false;
  const dropKeys = [];
  if (idOnlyExcluded) {
    dropKeys.push(options.idKey);
  }
  for (const key of expressionKeys) {
    // final computed value of the key
    let value = undefined;
    // expression to associate with key
    const subExpr = expr[key];
    if (key !== options.idKey && inArray([0, false], subExpr)) {
      foundExclusion = true;
    }
    if (key === options.idKey && isEmpty(subExpr)) {
      // tiny optimization here to skip over id
      value = obj[key];
    } else if (isString(subExpr)) {
      value = computeValue(obj, subExpr, key, options);
    } else if (inArray([1, true], subExpr)) ; else if (subExpr instanceof Array) {
      value = subExpr.map(v => {
        const r = computeValue(obj, v, null, options);
        if (isNil(r)) return null;
        return r;
      });
    } else if (isObject(subExpr)) {
      const subExprObj = subExpr;
      const subExprKeys = Object.keys(subExpr);
      const operator = subExprKeys.length == 1 ? subExprKeys[0] : "";
      // first try a projection operator
      const call = getOperator(OperatorType.PROJECTION, operator, options);
      if (call) {
        // apply the projection operator on the operator expression for the key
        if (operator === "$slice") {
          // $slice is handled differently for aggregation and projection operations
          if (ensureArray$1(subExprObj[operator]).every(isNumber)) {
            // $slice for projection operation
            value = call(obj, subExprObj[operator], key, options);
            foundSlice = true;
          } else {
            // $slice for aggregation operation
            value = computeValue(obj, subExprObj, key, options);
          }
        } else {
          value = call(obj, subExprObj[operator], key, options);
        }
      } else if (isOperator(operator)) {
        // compute if operator key
        value = computeValue(obj, subExprObj[operator], operator, options);
      } else if (has(obj, key)) {
        // compute the value for the sub expression for the key
        validateExpression(subExprObj, options);
        let target = obj[key];
        if (target instanceof Array) {
          value = target.map(o => processObject(o, subExprObj, options, subExprKeys, false));
        } else {
          target = isObject(target) ? target : obj;
          value = processObject(target, subExprObj, options, subExprKeys, false);
        }
      } else {
        // compute the value for the sub expression for the key
        value = computeValue(obj, subExpr, null, options);
      }
    } else {
      dropKeys.push(key);
      continue;
    }
    // get value with object graph
    const objPathGraph = resolveGraph(obj, key, {
      preserveMissing: true
    });
    // add the value at the path
    if (objPathGraph !== undefined) {
      merge(newObj, objPathGraph, {
        flatten: true
      });
    }
    // if computed add/or remove accordingly
    if (notInArray([0, 1, false, true], subExpr)) {
      if (value === undefined) {
        removeValue(newObj, key, {
          descendArray: true
        });
      } else {
        setValue(newObj, key, value);
      }
    }
  }
  // filter out all missing values preserved to support correct merging
  filterMissing(newObj);
  // For the following cases we include all keys on the object that were not explicitly excluded.
  //
  // 1. projection included $slice operator
  // 2. some fields were explicitly excluded
  // 3. only the id field was excluded
  if (foundSlice || foundExclusion || idOnlyExcluded) {
    newObj = into({}, obj, newObj);
    if (dropKeys.length > 0) {
      for (const k of dropKeys) {
        removeValue(newObj, k, {
          descendArray: true
        });
      }
    }
  }
  return newObj;
}
/**
 * Validate inclusion and exclusion values in expression
 *
 * @param {Object} expr The expression given for the projection
 */
function validateExpression(expr, options) {
  const check = [false, false];
  for (const [k, v] of Object.entries(expr)) {
    if (k === (options === null || options === void 0 ? void 0 : options.idKey)) return;
    if (v === 0 || v === false) {
      check[0] = true;
    } else if (v === 1 || v === true) {
      check[1] = true;
    }
    assert(!(check[0] && check[1]), "Projection cannot have a mix of inclusion and exclusion.");
  }
}

/**
 * Skips over a specified number of documents from the pipeline and returns the rest.
 *
 * @param collection An iterator
 * @param expr
 * @param  {Options} options
 * @returns {*}
 */
const $skip = (collection, expr, options) => {
  return collection.drop(expr);
};

// $elemMatch operator. https://docs.mongodb.com/manual/reference/operator/projection/elemMatch/#proj._S_elemMatch
/**
 * Projects only the first element from an array that matches the specified $elemMatch condition.
 *
 * @param obj
 * @param field
 * @param expr
 * @returns {*}
 */
const $elemMatch$1 = (obj, expr, field, options) => {
  const arr = resolve(obj, field);
  const query = new Query(expr, options);
  assert(arr instanceof Array, "$elemMatch: argument must resolve to array");
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (query.test(arr[i])) {
      // MongoDB projects only the first nested document when using this operator.
      // For some use cases this can lead to complicated queries to selectively project nested documents.
      // When strict mode is disabled, we return all matching nested documents.
      if (options.useStrictMode) return [arr[i]];
      result.push(arr[i]);
    }
  }
  return result.length > 0 ? result : undefined;
};

// $slice operator. https://docs.mongodb.com/manual/reference/operator/projection/slice/#proj._S_slice
/**
 * Limits the number of elements projected from an array. Supports skip and limit slices.
 *
 * @param obj
 * @param field
 * @param expr
 */
const $slice = (obj, expr, field, options) => {
  const xs = resolve(obj, field);
  const exprAsArray = expr;
  if (!isArray(xs)) return xs;
  return $slice$1(obj, expr instanceof Array ? [xs, ...exprAsArray] : [xs, expr], options);
};

// Projection Operators. https://docs.mongodb.com/manual/reference/operator/projection/

var projectionOperators = /*#__PURE__*/Object.freeze({
    __proto__: null,
    $elemMatch: $elemMatch$1,
    $slice: $slice
});

// Query Array Operators: https://docs.mongodb.com/manual/reference/operator/query-array/
/**
 * Matches arrays that contain all elements specified in the query.
 */
const $all = createQueryOperator($all$1);

// Query Array Operators: https://docs.mongodb.com/manual/reference/operator/query-array/
/**
 * Selects documents if element in the array field matches all the specified $elemMatch conditions.
 */
const $elemMatch = createQueryOperator($elemMatch$2);

// Query Array Operators: https://docs.mongodb.com/manual/reference/operator/query-array/
/**
 * Selects documents if the array field is a specified size.
 */
const $size = createQueryOperator($size$1);

const createBitwiseOperator = predicate => {
  return createQueryOperator((value, mask, options) => {
    let b = 0;
    if (mask instanceof Array) {
      for (const n of mask) b = b | 1 << n;
    } else {
      b = mask;
    }
    return predicate(value & b, b);
  });
};

// Query Bitwise Operators: https://docs.mongodb.com/manual/reference/operator/query-bitwise/
/**
 * Matches numeric or binary values in which a set of bit positions all have a value of 0.
 */
const $bitsAllClear = createBitwiseOperator((result, _) => result == 0);

// Query Bitwise Operators: https://docs.mongodb.com/manual/reference/operator/query-bitwise/
/**
 * Matches numeric or binary values in which a set of bit positions all have a value of 1.
 */
const $bitsAllSet = createBitwiseOperator((result, mask) => result == mask);

// Query Bitwise Operators: https://docs.mongodb.com/manual/reference/operator/query-bitwise/
/**
 * Matches numeric or binary values in which any bit from a set of bit positions has a value of 0.
 */
const $bitsAnyClear = createBitwiseOperator((result, mask) => result < mask);

// Query Bitwise Operators: https://docs.mongodb.com/manual/reference/operator/query-bitwise/
/**
 * Matches numeric or binary values in which any bit from a set of bit positions has a value of 1.
 */
const $bitsAnySet = createBitwiseOperator((result, _) => result > 0);

// Query Comparison Operators: https://docs.mongodb.com/manual/reference/operator/query-comparison/
/**
 * Matches values that are equal to a specified value.
 */
const $eq = createQueryOperator($eq$2);

// Query Comparison Operators: https://docs.mongodb.com/manual/reference/operator/query-comparison/
/**
 * Matches values that are greater than a specified value.
 */
const $gt = createQueryOperator($gt$2);

// Query Comparison Operators: https://docs.mongodb.com/manual/reference/operator/query-comparison/
/**
 * 	Matches values that are greater than or equal to a specified value.
 */
const $gte = createQueryOperator($gte$2);

// Query Comparison Operators: https://docs.mongodb.com/manual/reference/operator/query-comparison/
/**
 * Matches any of the values that exist in an array specified in the query.
 */
const $in = createQueryOperator($in$1);

// Query Comparison Operators: https://docs.mongodb.com/manual/reference/operator/query-comparison/
/**
 * Matches values that are less than the value specified in the query.
 */
const $lt = createQueryOperator($lt$2);

// Query Comparison Operators: https://docs.mongodb.com/manual/reference/operator/query-comparison/
/**
 * Matches values that are less than or equal to the value specified in the query.
 */
const $lte = createQueryOperator($lte$2);

// Query Comparison Operators: https://docs.mongodb.com/manual/reference/operator/query-comparison/
/**
 * Matches all values that are not equal to the value specified in the query.
 */
const $ne = createQueryOperator($ne$2);

// Query Comparison Operators: https://docs.mongodb.com/manual/reference/operator/query-comparison/
/**
 * Matches values that do not exist in an array specified to the query.
 */
const $nin = createQueryOperator($nin$1);

// Query Element Operators: https://docs.mongodb.com/manual/reference/operator/query-element/
/**
 * Matches documents that have the specified field.
 */
const $exists = createQueryOperator($exists$1);

// Query Element Operators: https://docs.mongodb.com/manual/reference/operator/query-element/
/**
 * Selects documents if a field is of the specified type.
 */
const $type = createQueryOperator($type$1);

// Query Evaluation Operators: https://docs.mongodb.com/manual/reference/operator/query-evaluation/
/**
 * Allows the use of aggregation expressions within the query language.
 *
 * @param selector
 * @param rhs
 * @returns {Function}
 */
function $expr(_, rhs, options) {
  return obj => computeValue(obj, rhs, null, options);
}

// Query Evaluation Operators: https://docs.mongodb.com/manual/reference/operator/query-evaluation/
/**
 * Validate documents against the given JSON Schema.
 *
 * @param selector
 * @param schema
 * @returns {Function}
 */
function $jsonSchema(_, schema, options) {
  if (!(options === null || options === void 0 ? void 0 : options.jsonSchemaValidator)) {
    throw new Error("Missing option 'jsonSchemaValidator'. Configure to use '$jsonSchema' operator.");
  }
  const validate = options === null || options === void 0 ? void 0 : options.jsonSchemaValidator(schema);
  return obj => validate(obj);
}

// Query Evaluation Operators: https://docs.mongodb.com/manual/reference/operator/query-evaluation/
/**
 * Performs a modulo operation on the value of a field and selects documents with a specified result.
 */
const $mod = createQueryOperator($mod$1);

// Query Evaluation Operators: https://docs.mongodb.com/manual/reference/operator/query-evaluation/
/**
 * Selects documents where values match a specified regular expression.
 */
const $regex = createQueryOperator($regex$1);

// Query Evaluation Operators: https://docs.mongodb.com/manual/reference/operator/query-evaluation/
/* eslint-disable */
/**
 * Matches documents that satisfy a JavaScript expression.
 *
 * @param selector
 * @param rhs
 * @returns {Function}
 */
function $where(_, rhs, options) {
  assert(options.scriptEnabled, "$where operator requires 'scriptEnabled' option to be true");
  const f = rhs;
  assert(isFunction(f), "$where only accepts a Function object");
  return obj => truthy(f.call(obj), options === null || options === void 0 ? void 0 : options.useStrictMode);
}

// Query Logical Operators: https://docs.mongodb.com/manual/reference/operator/query-logical/
/**
 * Joins query clauses with a logical AND returns all documents that match the conditions of both clauses.
 *
 * @param selector
 * @param rhs
 * @returns {Function}
 */
const $and = (_, rhs, options) => {
  assert(isArray(rhs), "Invalid expression: $and expects value to be an Array.");
  const queries = rhs.map(expr => new Query(expr, options));
  return obj => queries.every(q => q.test(obj));
};

// Query Logical Operators: https://docs.mongodb.com/manual/reference/operator/query-logical/
/**
 * Joins query clauses with a logical OR returns all documents that match the conditions of either clause.
 *
 * @param selector
 * @param rhs
 * @returns {Function}
 */
const $or = (_, rhs, options) => {
  assert(isArray(rhs), "Invalid expression. $or expects value to be an Array");
  const queries = rhs.map(expr => new Query(expr, options));
  return obj => queries.some(q => q.test(obj));
};

// Query Logical Operators: https://docs.mongodb.com/manual/reference/operator/query-logical/
/**
 * Joins query clauses with a logical NOR returns all documents that fail to match both clauses.
 *
 * @param selector
 * @param rhs
 * @returns {Function}
 */
const $nor = (_, rhs, options) => {
  assert(isArray(rhs), "Invalid expression. $nor expects value to be an array.");
  const f = $or("$or", rhs, options);
  return obj => !f(obj);
};

// Query Logical Operators: https://docs.mongodb.com/manual/reference/operator/query-logical/
/**
 * Inverts the effect of a query expression and returns documents that do not match the query expression.
 *
 * @param selector
 * @param rhs
 * @returns {Function}
 */
const $not = (selector, rhs, options) => {
  const criteria = {};
  criteria[selector] = normalize(rhs);
  const query = new Query(criteria, options);
  return obj => !query.test(obj);
};

var queryOperators = /*#__PURE__*/Object.freeze({
    __proto__: null,
    $all: $all,
    $and: $and,
    $bitsAllClear: $bitsAllClear,
    $bitsAllSet: $bitsAllSet,
    $bitsAnyClear: $bitsAnyClear,
    $bitsAnySet: $bitsAnySet,
    $elemMatch: $elemMatch,
    $eq: $eq,
    $exists: $exists,
    $expr: $expr,
    $gt: $gt,
    $gte: $gte,
    $in: $in,
    $jsonSchema: $jsonSchema,
    $lt: $lt,
    $lte: $lte,
    $mod: $mod,
    $ne: $ne,
    $nin: $nin,
    $nor: $nor,
    $not: $not,
    $or: $or,
    $regex: $regex,
    $size: $size,
    $type: $type,
    $where: $where
});

/**
 * Loads all Query and Projection operators
 */
useOperators(OperatorType.EXPRESSION, Object.assign(Object.assign({}, booleanOperators), comparisonOperators));
useOperators(OperatorType.PIPELINE, {
  $project,
  $skip,
  $limit,
  $sort
});
useOperators(OperatorType.PROJECTION, projectionOperators);
useOperators(OperatorType.QUERY, queryOperators);
/** The basic context for queries. */
Context.init().addExpressionOps(Object.assign(Object.assign({}, booleanOperators), comparisonOperators)).addPipelineOps({
  $project,
  $skip,
  $limit,
  $sort
}).addProjectionOps(projectionOperators).addQueryOps(queryOperators);

// loads basic operators
/**
 * Performs a query on a collection and returns a cursor object.
 * Shorthand for `Query(criteria).find(collection, projection)`
 *
 * @param collection Array of objects
 * @param criteria Query criteria
 * @param projection Projection criteria
 * @param options
 * @returns {Cursor} A cursor of results
 */
function find$1(collection, criteria, projection, options) {
  return new Query(criteria, options).find(collection, projection);
}
/**
 * Returns a new array without objects which match the criteria
 *
 * @param collection Array of objects
 * @param criteria Query criteria of objects to remove
 * @param options
 * @returns {Array} New filtered array
 */
function remove$1(collection, criteria, options) {
  return new Query(criteria, options).remove(collection);
}
/**
 * Return the result collection after running the aggregation pipeline for the given collection.
 * Shorthand for `(new Aggregator(pipeline, options)).run(collection)`
 *
 * @param collection array or stream of objects
 * @param pipeline The pipeline operators to use
 * @param options
 * @returns {Array} New array of results
 */
function aggregate(collection, pipeline, options) {
  return new Aggregator(pipeline, options).run(collection);
}
// default interface
var mingo = {
  Aggregator,
  Query,
  aggregate,
  find: find$1,
  remove: remove$1
};

const clone = (mode, val) => {
  switch (mode) {
    case "deep":
      return cloneDeep(val);
    case "copy":
      {
        if (isDate(val)) return new Date(val);
        if (isArray(val)) return [...val];
        if (isObject(val)) return Object.assign({}, val);
        return val;
      }
    default:
      return val;
  }
};
const FILTER_IDENT_RE = /^[a-z]+[a-zA-Z0-9]*$/;
/**
 * Tokenize a selector path to extract parts for the root, arrayFilter, and child
 * @param selector The path to tokenize
 * @returns {parent:string, elem:string, child:string}
 */
function tokenizePath(selector) {
  if (!selector.includes(".$")) {
    return [{
      parent: selector,
      selector
    }, []];
  }
  const begin = selector.indexOf(".$");
  const end = selector.indexOf("]");
  const parent = selector.substring(0, begin);
  // using "$" wildcard to represent every element.
  const child = selector.substring(begin + 3, end);
  assert(child === "" || FILTER_IDENT_RE.test(child), "The filter <identifier> must begin with a lowercase letter and contain only alphanumeric characters.");
  const rest = selector.substring(end + 2);
  const [next, elems] = rest ? tokenizePath(rest) : [];
  return [{
    selector,
    parent,
    child: child || "$",
    next
  }, [child, ...(elems || [])].filter(Boolean)];
}
/**
 * Applies an update function to a value to produce a new value to modify an object in-place.
 * @param o The object or array to modify.
 * @param n The path node of the update selector.
 * @param q Map of positional identifiers to queries for filtering.
 * @param f The update function which accepts containver value and key.
 * @param opts The optional {@link WalkOptions} passed to the walk function.
 */
const applyUpdate = (o, n, q, f, opts) => {
  const {
    parent,
    child: c,
    next
  } = n;
  if (!c) {
    // wrapper to collect status
    let b = false;
    const g = (u, k) => b = Boolean(f(u, k)) || b;
    walk(o, parent, g, opts);
    return b;
  }
  const t = resolve(o, parent);
  // do nothing if we don't get correct type.
  if (!isArray(t)) return false;
  // apply update to matching items.
  return t.map((e, i) => {
    // filter if applicable.
    if (q[c] && !q[c].test({
      [c]: e
    })) return false;
    // apply update.
    return next ? applyUpdate(e, next, q, f, opts) : f(t, i);
  }).some(Boolean);
};
/**
 * Walks the expression and apply the given action for each key-value pair.
 *
 * @param expr The expression for the update operator.
 * @param arrayFilter Filter conditions passed to the operator.
 * @param options The options provided by the caller.
 * @param callback The action to apply for a given path and value.
 * @returns {Array<string>}
 */
function walkExpression(expr, arrayFilter, options, callback) {
  const res = [];
  for (const [selector, val] of Object.entries(expr)) {
    const [node, vars] = tokenizePath(selector);
    if (!vars.length) {
      if (callback(val, node, {})) res.push(node.parent);
    } else {
      // extract conditions for each identifier
      const conditions = {};
      arrayFilter.forEach(o => {
        Object.keys(o).forEach(k => {
          vars.forEach(w => {
            if (k === w || k.startsWith(w + ".")) {
              conditions[w] = conditions[w] || {};
              Object.assign(conditions[w], {
                [k]: o[k]
              });
            }
          });
        });
      });
      // create queries for each identifier
      const queries = {};
      for (const [k, condition] of Object.entries(conditions)) {
        queries[k] = new Query(condition, options.queryOptions);
      }
      if (callback(val, node, queries)) res.push(node.parent);
    }
  }
  return res;
}

/** Adds a value to an array unless the value is already present. */
const $addToSet = (obj, expr, arrayFilters = [], options = {}) => {
  return walkExpression(expr, arrayFilters, options, (val, node, queries) => {
    const args = {
      $each: [val]
    };
    if (isObject(val) && has(val, "$each")) {
      Object.assign(args, val);
    }
    return applyUpdate(obj, node, queries, (o, k) => {
      const prev = o[k] || (o[k] = []);
      const common = intersection([prev, args.$each]);
      if (common.length === args.$each.length) return false;
      o[k] = clone(options.cloneMode, unique(prev.concat(args.$each)));
      return true;
    }, {
      buildGraph: true
    });
  });
};

const BIT_OPS = new Set(["and", "or", "xor"]);
/** Performs a bitwise update of a field. The operator supports AND, OR, and XOR.*/
const $bit = (obj, expr, arrayFilters = [], options = {}) => {
  return walkExpression(expr, arrayFilters, options, (val, node, queries) => {
    const op = Object.keys(val);
    assert(op.length === 1 && BIT_OPS.has(op[0]), `Invalid bit operator '${op[0]}'. Must be one of 'and', 'or', or 'xor'.`);
    return applyUpdate(obj, node, queries, (o, k) => {
      let n = o[k];
      const v = val[op[0]];
      if (n !== undefined && !(isNumber(n) && isNumber(v))) return false;
      n = n || 0;
      switch (op[0]) {
        case "and":
          o[k] = n & v;
          break;
        case "or":
          o[k] = n | v;
          break;
        case "xor":
          o[k] = n ^ v;
          break;
      }
      return o[k] !== n;
    }, {
      buildGraph: true
    });
  });
};

/** Sets the value of a field to the current date. */
const $currentDate = (obj, expr, arrayFilters = [], options = {}) => {
  const now = Date.now();
  return walkExpression(expr, arrayFilters, options, (_, node, queries) => {
    return applyUpdate(obj, node, queries, (o, k) => {
      o[k] = now;
      return true;
    }, {
      buildGraph: true
    });
  });
};

/** Increments a field by a specified value. */
const $inc = (obj, expr, arrayFilters = [], options = {}) => {
  return walkExpression(expr, arrayFilters, options, (val, node, queries) => {
    if (!node.child) {
      const n = resolve(obj, node.parent);
      assert(n === undefined || isNumber(n), `cannot apply $inc to a value of non-numeric type`);
    }
    return applyUpdate(obj, node, queries, (o, k) => {
      o[k] = (o[k] || (o[k] = 0)) + val;
      return true;
    }, {
      buildGraph: true
    });
  });
};

/** Updates the value of the field to a specified value if the specified value is greater than the current value of the field. */
const $max = (obj, expr, arrayFilters = [], options = {}) => {
  return walkExpression(expr, arrayFilters, options, (val, node, queries) => {
    // If the field does not exist, the $max operator sets the field to the specified value.
    return applyUpdate(obj, node, queries, (o, k) => {
      if (o[k] !== undefined && compare$1(o[k], val) > -1) return false;
      o[k] = val;
      return true;
    }, {
      buildGraph: true
    });
  });
};

/** Updates the value of the field to a specified value if the specified value is less than the current value of the field. */
const $min = (obj, expr, arrayFilters = [], options = {}) => {
  return walkExpression(expr, arrayFilters, options, (val, node, queries) => {
    // If the field does not exist, the $min operator sets the field to the specified value.
    return applyUpdate(obj, node, queries, (o, k) => {
      if (o[k] !== undefined && compare$1(o[k], val) < 1) return false;
      o[k] = val;
      return true;
    }, {
      buildGraph: true
    });
  });
};

/** Multiply the value of a field by a number. */
const $mul = (obj, expr, arrayFilters = [], options = {}) => {
  return walkExpression(expr, arrayFilters, options, (val, node, queries) => {
    return applyUpdate(obj, node, queries, (o, k) => {
      const prev = o[k];
      o[k] = o[k] === undefined ? 0 : o[k] * val;
      return o[k] !== prev;
    }, {
      buildGraph: true
    });
  });
};

/** Removes the first or last element of an array. */
const $pop = (obj, expr, arrayFilters = [], options = {}) => {
  return walkExpression(expr, arrayFilters, options, (val, node, queries) => {
    return applyUpdate(obj, node, queries, (o, k) => {
      const arr = o[k];
      assert(isArray(arr), `path '${node.selector}' contains an element of non-array type.`);
      if (!arr.length) return false;
      if (val === -1) {
        arr.splice(0, 1);
      } else {
        arr.pop();
      }
      return true;
    });
  });
};

/** Removes from an existing array all instances of a value or values that match a specified condition. */
const $pull = (obj, expr, arrayFilters = [], options = {}) => {
  return walkExpression(expr, arrayFilters, options, (val, node, queries) => {
    // wrap simple values or condition objects
    const wrap = !isObject(val) || Object.keys(val).some(isOperator);
    const query = new Query(wrap ? {
      k: val
    } : val, options.queryOptions);
    const pred = wrap ? v => query.test({
      k: v
    }) : v => query.test(v);
    return applyUpdate(obj, node, queries, (o, k) => {
      const prev = o[k];
      const curr = new Array();
      const found = prev.map(v => {
        const b = pred(v);
        if (!b) curr.push(v);
        return b;
      }).some(Boolean);
      if (!found) return false;
      o[k] = curr;
      return true;
    });
  });
};

/** Removes all instances of the specified values from an existing array. */
const $pullAll = (obj, expr, arrayFilters = [], options = {}) => {
  const pullExpr = {};
  Object.entries(expr).forEach(([k, v]) => {
    pullExpr[k] = {
      $in: v
    };
  });
  return $pull(obj, pullExpr, arrayFilters, options);
};

const OPERATOR_MODIFIERS = Object.freeze(["$each", "$slice", "$sort", "$position"]);
/** Appends a specified value to an array. */
const $push = (obj, expr, arrayFilters = [], options = {}) => {
  return walkExpression(expr, arrayFilters, options, (val, node, queries) => {
    const args = {
      $each: [val]
    };
    if (isObject(val) && OPERATOR_MODIFIERS.some(m => has(val, m))) {
      Object.assign(args, val);
    }
    return applyUpdate(obj, node, queries, (o, k) => {
      const arr = o[k] || (o[k] = []);
      // take a copy of sufficient length.
      const prev = arr.slice(0, args.$slice || arr.length);
      const oldsize = arr.length;
      const pos = isNumber(args.$position) ? args.$position : arr.length;
      // insert new items
      arr.splice(pos, 0, ...clone(options.cloneMode, args.$each));
      if (args.$sort) {
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        const sortKey = isObject(args.$sort) ? Object.keys(args.$sort || {}).pop() : "";
        const order = !sortKey ? args.$sort : args.$sort[sortKey];
        const f = !sortKey ? a => a : a => resolve(a, sortKey);
        arr.sort((a, b) => order * compare$1(f(a), f(b)));
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      }
      // handle slicing
      if (isNumber(args.$slice)) {
        if (args.$slice < 0) arr.splice(0, arr.length + args.$slice);else arr.splice(args.$slice);
      }
      // detect change
      return oldsize != arr.length || !isEqual(prev, arr);
    }, {
      descendArray: true,
      buildGraph: true
    });
  });
};

/** Replaces the value of a field with the specified value. */
const $set = (obj, expr, arrayFilters = [], options = {}) => {
  return walkExpression(expr, arrayFilters, options, (val, node, queries) => {
    return applyUpdate(obj, node, queries, (o, k) => {
      if (isEqual(o[k], val)) return false;
      o[k] = clone(options.cloneMode, val);
      return true;
    }, {
      buildGraph: true
    });
  });
};

/** Replaces the value of a field with the specified value. */
const $rename = (obj, expr, arrayFilters = [], options = {}) => {
  const res = [];
  const changed = walkExpression(expr, arrayFilters, options, (val, node, queries) => {
    return applyUpdate(obj, node, queries, (o, k) => {
      if (!has(o, k)) return false;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      res.push(...$set(obj, {
        [val]: o[k]
      }, arrayFilters, options));
      delete o[k];
      return true;
    });
  });
  return Array.from(new Set(changed.concat(res)));
};

/** Deletes a particular field */
const $unset = (obj, expr, arrayFilters = [], options = {}) => {
  return walkExpression(expr, arrayFilters, options, (_, node, queries) => {
    return applyUpdate(obj, node, queries, (o, k) => {
      if (!has(o, k)) return false;
      if (isArray(o)) {
        o[k] = null;
      } else {
        delete o[k];
      }
      return true;
    });
  });
};

var UPDATE_OPERATORS = /*#__PURE__*/Object.freeze({
    __proto__: null,
    $addToSet: $addToSet,
    $bit: $bit,
    $currentDate: $currentDate,
    $inc: $inc,
    $max: $max,
    $min: $min,
    $mul: $mul,
    $pop: $pop,
    $pull: $pull,
    $pullAll: $pullAll,
    $push: $push,
    $rename: $rename,
    $set: $set,
    $unset: $unset
});

/**
 * Creates a new updater function with default options.
 * @param defaultOptions The default options. Defaults to no cloning with strict mode off for queries.
 * @returns {Updater}
 */
function createUpdater(defaultOptions) {
  return (obj, expr, arrayFilters = [], conditions = {}, options = {}) => {
    const opts = Object.assign({
      cloneMode: "copy"
    }, defaultOptions, options);
    Object.assign(opts, {
      queryOptions: initOptions(Object.assign({
        useStrictMode: false
      }, opts === null || opts === void 0 ? void 0 : opts.queryOptions))
    });
    arrayFilters = arrayFilters || [];
    conditions = conditions || {};
    // validate operator
    const entry = Object.entries(expr);
    // check for single entry
    assert(entry.length === 1, "Update expression must contain only one operator.");
    const [op, args] = entry[0];
    // check operator exists
    assert(has(UPDATE_OPERATORS, op), `Update operator '${op}' is not supported.`);
    /*eslint import/namespace: ['error', { allowComputed: true }]*/
    const mutate = UPDATE_OPERATORS[op];
    // validate condition
    if (Object.keys(conditions).length) {
      const q = new Query(conditions, opts.queryOptions);
      if (!q.test(obj)) return [];
    }
    // apply updates
    return mutate(obj, args, arrayFilters, opts);
  };
}
/**
 * Updates the given object with the expression.
 *
 * @param obj The object to update.
 * @param expr The update expressions.
 * @param arrayFilters Filters to apply to nested items.
 * @param conditions Conditions to validate before performing update.
 * @param options Update options to override defaults.
 * @returns {Array<string>} A list of modified field paths in the object.
 */
const updateObject = createUpdater({});

function ensureArray(data) {
  if (Array.isArray(data) == false) {
    if (data instanceof Set) return Array.from(data);
    if (data instanceof Map) return Array.from(data.values());
    return Object.keys(data).map(key => {
      return data[key];
    });
  }
  return data;
}
function find(...args) {
  return mingo.find.apply(null, args).all();
}
function findOne(...args) {
  return mingo.find.apply(null, args).next();
}
function exists(data, query) {
  return findOne(data, query) ? true : false;
}
function remove(data, query) {
  return mingo.remove(data, query);
}
function updateDocument(data, updateCmd) {
  return updateObject(data, updateCmd);
}
function update(data, query, updateCmd) {
  return mingo.find(data, query).map(item => {
    return updateDocument(item, updateCmd);
  });
}
class Collection {
  constructor(data) {
    this.collection = ensureArray(data);
  }
  /**
   * Performs a query on a collection and returns an array.
   *
   * @param criteria Query criteria
   * @param projection Projection criteria
   * @param options
   * @returns {Array} An Array of results
   */
  find = (...args) => find.apply(this, [this.collection, ...args]);

  /**
   * Removes all matching objects from a collection and returns an array.
   * The original collection is modified.
   *
   * @param criteria Query criteria
   * @param options
   * @returns {Array} An Array of results
   */
  remove = (...args) => {
    let newData = remove.apply(this, [this.collection, ...args]);
    this.collection = newData;
    return newData;
  };
  /**
   * Performs a query on a collection
   *
   * @param criteria Query criteria
   * @param projection Projection criteria
   * @param options
   * @returns {Object} the matching object
   */
  findOne = (...args) => findOne.apply(this, [this.collection, ...args]);
  /**
   * Performs a query returning true if a matching object exists
   *
   * @param criteria Query criteria
   * @param projection Projection criteria
   * @param options
   * @returns {boolean} true if matching object exists
   */
  exists = (...args) => exists.apply(this, [this.collection, ...args]);
  /**
   * Updates the given object with the expression.
   *
   * @param expr The update expressions.
   * @param arrayFilters Filters to apply to nested items.
   * @param conditions Conditions to validate before performing update.
   * @param options Update options to override defaults.
   * @returns {Array<string>} A list of modified field paths in the object.
   */
  update = (...args) => update.apply(this, [this.collection, ...args]);
  length = () => this.collection.length;
}
function collection(data) {
  return new Collection(data);
}

exports.collection = collection;
exports.exists = exists;
exports.find = find;
exports.findOne = findOne;
exports.update = update;
exports.updateDocument = updateDocument;
