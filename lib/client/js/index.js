(function (require, global) {
require = (function (cache, modules, cx) {
return function (r) {
if (!modules[r]) throw new Error(r + ' is not a module');
return cache[r] ? cache[r].exports : ((cache[r] = {
exports: {}
}, cache[r].exports = modules[r].call(cx, require, cache[r], cache[r].exports)));
};
})({}, {
1: function (require, module, exports) {
/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013-2017 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 3.5.0
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, using, timers, filter, any, each
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule");
var Queue = _dereq_("./queue");
var util = _dereq_("./util");

function Async() {
    this._customScheduler = false;
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._haveDrainedQueues = false;
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule = schedule;
}

Async.prototype.setScheduler = function(fn) {
    var prev = this._schedule;
    this._schedule = fn;
    this._customScheduler = true;
    return prev;
};

Async.prototype.hasCustomScheduler = function() {
    return this._customScheduler;
};

Async.prototype.enableTrampoline = function() {
    this._trampolineEnabled = true;
};

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._isTickUsed || this._haveDrainedQueues;
};


Async.prototype.fatalError = function(e, isNode) {
    if (isNode) {
        process.stderr.write("Fatal " + (e instanceof Error ? e.stack : e) +
            "\n");
        process.exit(2);
    } else {
        this.throwLater(e);
    }
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._haveDrainedQueues = true;
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = Async;
module.exports.firstLineError = firstLineError;

},{"./queue":26,"./schedule":29,"./util":36}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise, debug) {
var calledBind = false;
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (((this._bitField & 50397184) === 0)) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    if (!calledBind) {
        calledBind = true;
        Promise.prototype._propagateFrom = debug.propagateFromFunction();
        Promise.prototype._boundValue = debug.boundValueFunction();
    }
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();
    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, undefined, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, undefined, ret, context);
        ret._setOnCancel(maybePromise);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 2097152;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~2097152);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
};

Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise":22}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var args = [].slice.call(arguments, 1);;
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util":36}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

Promise.prototype["break"] = Promise.prototype.cancel = function() {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");

    var promise = this;
    var child = promise;
    while (promise._isCancellable()) {
        if (!promise._cancelBy(child)) {
            if (child._isFollowing()) {
                child._followee().cancel();
            } else {
                child._cancelBranched();
            }
            break;
        }

        var parent = promise._cancellationParent;
        if (parent == null || !parent._isCancellable()) {
            if (promise._isFollowing()) {
                promise._followee().cancel();
            } else {
                promise._cancelBranched();
            }
            break;
        } else {
            if (promise._isFollowing()) promise._followee().cancel();
            promise._setWillBeCancelled();
            child = promise;
            promise = parent;
        }
    }
};

Promise.prototype._branchHasCancelled = function() {
    this._branchesRemainingToCancel--;
};

Promise.prototype._enoughBranchesHaveCancelled = function() {
    return this._branchesRemainingToCancel === undefined ||
           this._branchesRemainingToCancel <= 0;
};

Promise.prototype._cancelBy = function(canceller) {
    if (canceller === this) {
        this._branchesRemainingToCancel = 0;
        this._invokeOnCancel();
        return true;
    } else {
        this._branchHasCancelled();
        if (this._enoughBranchesHaveCancelled()) {
            this._invokeOnCancel();
            return true;
        }
    }
    return false;
};

Promise.prototype._cancelBranched = function() {
    if (this._enoughBranchesHaveCancelled()) {
        this._cancel();
    }
};

Promise.prototype._cancel = function() {
    if (!this._isCancellable()) return;
    this._setCancelled();
    async.invoke(this._cancelPromises, this, undefined);
};

Promise.prototype._cancelPromises = function() {
    if (this._length() > 0) this._settlePromises();
};

Promise.prototype._unsetOnCancel = function() {
    this._onCancelField = undefined;
};

Promise.prototype._isCancellable = function() {
    return this.isPending() && !this._isCancelled();
};

Promise.prototype.isCancellable = function() {
    return this.isPending() && !this.isCancelled();
};

Promise.prototype._doInvokeOnCancel = function(onCancelCallback, internalOnly) {
    if (util.isArray(onCancelCallback)) {
        for (var i = 0; i < onCancelCallback.length; ++i) {
            this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
        }
    } else if (onCancelCallback !== undefined) {
        if (typeof onCancelCallback === "function") {
            if (!internalOnly) {
                var e = tryCatch(onCancelCallback).call(this._boundValue());
                if (e === errorObj) {
                    this._attachExtraTrace(e.e);
                    async.throwLater(e.e);
                }
            }
        } else {
            onCancelCallback._resultCancelled(this);
        }
    }
};

Promise.prototype._invokeOnCancel = function() {
    var onCancelCallback = this._onCancel();
    this._unsetOnCancel();
    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
};

Promise.prototype._invokeInternalOnCancel = function() {
    if (this._isCancellable()) {
        this._doInvokeOnCancel(this._onCancel(), true);
        this._unsetOnCancel();
    }
};

Promise.prototype._resultCancelled = function() {
    this.cancel();
};

};

},{"./util":36}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util");
var getKeys = _dereq_("./es5").keys;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function catchFilter(instances, cb, promise) {
    return function(e) {
        var boundTo = promise._boundValue();
        predicateLoop: for (var i = 0; i < instances.length; ++i) {
            var item = instances[i];

            if (item === Error ||
                (item != null && item.prototype instanceof Error)) {
                if (e instanceof item) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (typeof item === "function") {
                var matchesPredicate = tryCatch(item).call(boundTo, e);
                if (matchesPredicate === errorObj) {
                    return matchesPredicate;
                } else if (matchesPredicate) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (util.isObject(e)) {
                var keys = getKeys(item);
                for (var j = 0; j < keys.length; ++j) {
                    var key = keys[j];
                    if (item[key] != e[key]) {
                        continue predicateLoop;
                    }
                }
                return tryCatch(cb).call(boundTo, e);
            }
        }
        return NEXT_FILTER;
    };
}

return catchFilter;
};

},{"./es5":13,"./util":36}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var longStackTraces = false;
var contextStack = [];

Promise.prototype._promiseCreated = function() {};
Promise.prototype._pushContext = function() {};
Promise.prototype._popContext = function() {return null;};
Promise._peekContext = Promise.prototype._peekContext = function() {};

function Context() {
    this._trace = new Context.CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (this._trace !== undefined) {
        this._trace._promiseCreated = null;
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (this._trace !== undefined) {
        var trace = contextStack.pop();
        var ret = trace._promiseCreated;
        trace._promiseCreated = null;
        return ret;
    }
    return null;
};

function createContext() {
    if (longStackTraces) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}
Context.CapturedTrace = null;
Context.create = createContext;
Context.deactivateLongStackTraces = function() {};
Context.activateLongStackTraces = function() {
    var Promise_pushContext = Promise.prototype._pushContext;
    var Promise_popContext = Promise.prototype._popContext;
    var Promise_PeekContext = Promise._peekContext;
    var Promise_peekContext = Promise.prototype._peekContext;
    var Promise_promiseCreated = Promise.prototype._promiseCreated;
    Context.deactivateLongStackTraces = function() {
        Promise.prototype._pushContext = Promise_pushContext;
        Promise.prototype._popContext = Promise_popContext;
        Promise._peekContext = Promise_PeekContext;
        Promise.prototype._peekContext = Promise_peekContext;
        Promise.prototype._promiseCreated = Promise_promiseCreated;
        longStackTraces = false;
    };
    longStackTraces = true;
    Promise.prototype._pushContext = Context.prototype._pushContext;
    Promise.prototype._popContext = Context.prototype._popContext;
    Promise._peekContext = Promise.prototype._peekContext = peekContext;
    Promise.prototype._promiseCreated = function() {
        var ctx = this._peekContext();
        if (ctx && ctx._promiseCreated == null) ctx._promiseCreated = this;
    };
};
return Context;
};

},{}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, Context) {
var getDomain = Promise._getDomain;
var async = Promise._async;
var Warning = _dereq_("./errors").Warning;
var util = _dereq_("./util");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
var nodeFramePattern = /\((?:timers\.js):\d+:\d+\)/;
var parseLinePattern = /[\/<\(](.+?):(\d+):(\d+)\)?\s*$/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var printWarning;
var debugging = !!(util.env("BLUEBIRD_DEBUG") != 0 &&
                        (true ||
                         util.env("BLUEBIRD_DEBUG") ||
                         util.env("NODE_ENV") === "development"));

var warnings = !!(util.env("BLUEBIRD_WARNINGS") != 0 &&
    (debugging || util.env("BLUEBIRD_WARNINGS")));

var longStackTraces = !!(util.env("BLUEBIRD_LONG_STACK_TRACES") != 0 &&
    (debugging || util.env("BLUEBIRD_LONG_STACK_TRACES")));

var wForgottenReturn = util.env("BLUEBIRD_W_FORGOTTEN_RETURN") != 0 &&
    (warnings || !!util.env("BLUEBIRD_W_FORGOTTEN_RETURN"));

Promise.prototype.suppressUnhandledRejections = function() {
    var target = this._target();
    target._bitField = ((target._bitField & (~1048576)) |
                      524288);
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 524288) !== 0) return;
    this._setRejectionIsUnhandled();
    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._setReturnedNonUndefined = function() {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._returnedNonUndefined = function() {
    return (this._bitField & 268435456) !== 0;
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._settledValue();
        this._setUnhandledRejectionIsNotified();
        fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 262144;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~262144);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 262144) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 1048576;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~1048576);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._warn = function(message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

var disableLongStackTraces = function() {};
Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (!config.longStackTraces && longStackTracesIsSupported()) {
        var Promise_captureStackTrace = Promise.prototype._captureStackTrace;
        var Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
        config.longStackTraces = true;
        disableLongStackTraces = function() {
            if (async.haveItemsQueued() && !config.longStackTraces) {
                throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
            }
            Promise.prototype._captureStackTrace = Promise_captureStackTrace;
            Promise.prototype._attachExtraTrace = Promise_attachExtraTrace;
            Context.deactivateLongStackTraces();
            async.enableTrampoline();
            config.longStackTraces = false;
        };
        Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
        Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
        Context.activateLongStackTraces();
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return config.longStackTraces && longStackTracesIsSupported();
};

var fireDomEvent = (function() {
    try {
        if (typeof CustomEvent === "function") {
            var event = new CustomEvent("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new CustomEvent(name.toLowerCase(), {
                    detail: event,
                    cancelable: true
                });
                return !util.global.dispatchEvent(domEvent);
            };
        } else if (typeof Event === "function") {
            var event = new Event("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new Event(name.toLowerCase(), {
                    cancelable: true
                });
                domEvent.detail = event;
                return !util.global.dispatchEvent(domEvent);
            };
        } else {
            var event = document.createEvent("CustomEvent");
            event.initCustomEvent("testingtheevent", false, true, {});
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = document.createEvent("CustomEvent");
                domEvent.initCustomEvent(name.toLowerCase(), false, true,
                    event);
                return !util.global.dispatchEvent(domEvent);
            };
        }
    } catch (e) {}
    return function() {
        return false;
    };
})();

var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function() {
            return process.emit.apply(process, arguments);
        };
    } else {
        if (!util.global) {
            return function() {
                return false;
            };
        }
        return function(name) {
            var methodName = "on" + name.toLowerCase();
            var method = util.global[methodName];
            if (!method) return false;
            method.apply(util.global, [].slice.call(arguments, 1));
            return true;
        };
    }
})();

function generatePromiseLifecycleEventObject(name, promise) {
    return {promise: promise};
}

var eventToObjectGenerator = {
    promiseCreated: generatePromiseLifecycleEventObject,
    promiseFulfilled: generatePromiseLifecycleEventObject,
    promiseRejected: generatePromiseLifecycleEventObject,
    promiseResolved: generatePromiseLifecycleEventObject,
    promiseCancelled: generatePromiseLifecycleEventObject,
    promiseChained: function(name, promise, child) {
        return {promise: promise, child: child};
    },
    warning: function(name, warning) {
        return {warning: warning};
    },
    unhandledRejection: function (name, reason, promise) {
        return {reason: reason, promise: promise};
    },
    rejectionHandled: generatePromiseLifecycleEventObject
};

var activeFireEvent = function (name) {
    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent.apply(null, arguments);
    } catch (e) {
        async.throwLater(e);
        globalEventFired = true;
    }

    var domEventFired = false;
    try {
        domEventFired = fireDomEvent(name,
                    eventToObjectGenerator[name].apply(null, arguments));
    } catch (e) {
        async.throwLater(e);
        domEventFired = true;
    }

    return domEventFired || globalEventFired;
};

Promise.config = function(opts) {
    opts = Object(opts);
    if ("longStackTraces" in opts) {
        if (opts.longStackTraces) {
            Promise.longStackTraces();
        } else if (!opts.longStackTraces && Promise.hasLongStackTraces()) {
            disableLongStackTraces();
        }
    }
    if ("warnings" in opts) {
        var warningsOption = opts.warnings;
        config.warnings = !!warningsOption;
        wForgottenReturn = config.warnings;

        if (util.isObject(warningsOption)) {
            if ("wForgottenReturn" in warningsOption) {
                wForgottenReturn = !!warningsOption.wForgottenReturn;
            }
        }
    }
    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
        if (async.haveItemsQueued()) {
            throw new Error(
                "cannot enable cancellation after promises are in use");
        }
        Promise.prototype._clearCancellationData =
            cancellationClearCancellationData;
        Promise.prototype._propagateFrom = cancellationPropagateFrom;
        Promise.prototype._onCancel = cancellationOnCancel;
        Promise.prototype._setOnCancel = cancellationSetOnCancel;
        Promise.prototype._attachCancellationCallback =
            cancellationAttachCancellationCallback;
        Promise.prototype._execute = cancellationExecute;
        propagateFromFunction = cancellationPropagateFrom;
        config.cancellation = true;
    }
    if ("monitoring" in opts) {
        if (opts.monitoring && !config.monitoring) {
            config.monitoring = true;
            Promise.prototype._fireEvent = activeFireEvent;
        } else if (!opts.monitoring && config.monitoring) {
            config.monitoring = false;
            Promise.prototype._fireEvent = defaultFireEvent;
        }
    }
    return Promise;
};

function defaultFireEvent() { return false; }

Promise.prototype._fireEvent = defaultFireEvent;
Promise.prototype._execute = function(executor, resolve, reject) {
    try {
        executor(resolve, reject);
    } catch (e) {
        return e;
    }
};
Promise.prototype._onCancel = function () {};
Promise.prototype._setOnCancel = function (handler) { ; };
Promise.prototype._attachCancellationCallback = function(onCancel) {
    ;
};
Promise.prototype._captureStackTrace = function () {};
Promise.prototype._attachExtraTrace = function () {};
Promise.prototype._clearCancellationData = function() {};
Promise.prototype._propagateFrom = function (parent, flags) {
    ;
    ;
};

function cancellationExecute(executor, resolve, reject) {
    var promise = this;
    try {
        executor(resolve, reject, function(onCancel) {
            if (typeof onCancel !== "function") {
                throw new TypeError("onCancel must be a function, got: " +
                                    util.toString(onCancel));
            }
            promise._attachCancellationCallback(onCancel);
        });
    } catch (e) {
        return e;
    }
}

function cancellationAttachCancellationCallback(onCancel) {
    if (!this._isCancellable()) return this;

    var previousOnCancel = this._onCancel();
    if (previousOnCancel !== undefined) {
        if (util.isArray(previousOnCancel)) {
            previousOnCancel.push(onCancel);
        } else {
            this._setOnCancel([previousOnCancel, onCancel]);
        }
    } else {
        this._setOnCancel(onCancel);
    }
}

function cancellationOnCancel() {
    return this._onCancelField;
}

function cancellationSetOnCancel(onCancel) {
    this._onCancelField = onCancel;
}

function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
}

function cancellationPropagateFrom(parent, flags) {
    if ((flags & 1) !== 0) {
        this._cancellationParent = parent;
        var branchesRemainingToCancel = parent._branchesRemainingToCancel;
        if (branchesRemainingToCancel === undefined) {
            branchesRemainingToCancel = 0;
        }
        parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}

function bindingPropagateFrom(parent, flags) {
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}
var propagateFromFunction = bindingPropagateFrom;

function boundValueFunction() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
}

function longStackTracesCaptureStackTrace() {
    this._trace = new CapturedTrace(this._peekContext());
}

function longStackTracesAttachExtraTrace(error, ignoreSelf) {
    if (canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
}

function checkForgottenReturns(returnValue, promiseCreated, name, promise,
                               parent) {
    if (returnValue === undefined && promiseCreated !== null &&
        wForgottenReturn) {
        if (parent !== undefined && parent._returnedNonUndefined()) return;
        if ((promise._bitField & 65535) === 0) return;

        if (name) name = name + " ";
        var handlerLine = "";
        var creatorLine = "";
        if (promiseCreated._trace) {
            var traceLines = promiseCreated._trace.stack.split("\n");
            var stack = cleanStack(traceLines);
            for (var i = stack.length - 1; i >= 0; --i) {
                var line = stack[i];
                if (!nodeFramePattern.test(line)) {
                    var lineMatches = line.match(parseLinePattern);
                    if (lineMatches) {
                        handlerLine  = "at " + lineMatches[1] +
                            ":" + lineMatches[2] + ":" + lineMatches[3] + " ";
                    }
                    break;
                }
            }

            if (stack.length > 0) {
                var firstUserLine = stack[0];
                for (var i = 0; i < traceLines.length; ++i) {

                    if (traceLines[i] === firstUserLine) {
                        if (i > 0) {
                            creatorLine = "\n" + traceLines[i - 1];
                        }
                        break;
                    }
                }

            }
        }
        var msg = "a promise was created in a " + name +
            "handler " + handlerLine + "but was not returned from it, " +
            "see http://goo.gl/rRqMUw" +
            creatorLine;
        promise._warn(msg, true, promiseCreated);
    }
}

function deprecated(name, replacement) {
    var message = name +
        " is deprecated and will be removed in a future version.";
    if (replacement) message += " Use " + replacement + " instead.";
    return warn(message);
}

function warn(message, shouldUseOwnTrace, promise) {
    if (!config.warnings) return;
    var warning = new Warning(message);
    var ctx;
    if (shouldUseOwnTrace) {
        promise._attachExtraTrace(warning);
    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }

    if (!activeFireEvent("warning", warning)) {
        formatAndLogError(warning, "", true);
    }
}

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = "    (No stack trace)" === line ||
            stackFramePattern.test(line);
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0 && error.name != "SyntaxError") {
        stack = stack.slice(i);
    }
    return stack;
}

function parseStackAndMessage(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: error.name == "SyntaxError" ? stack : cleanStack(stack)
    };
}

function formatAndLogError(error, title, isSoft) {
    if (typeof console !== "undefined") {
        var message;
        if (util.isObject(error)) {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof printWarning === "function") {
            printWarning(message, isSoft);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
}

function fireRejectionEvent(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    if (name === "unhandledRejection") {
        if (!activeFireEvent(name, reason, promise) && !localEventFired) {
            formatAndLogError(reason, "Unhandled rejection ");
        }
    } else {
        activeFireEvent(name, promise);
    }
}

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj && typeof obj.toString === "function"
            ? obj.toString() : util.toString(obj);
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function longStackTracesIsSupported() {
    return typeof captureStackTrace === "function";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}

function setBounds(firstLineError, lastLineError) {
    if (!longStackTracesIsSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
}

function CapturedTrace(parent) {
    this._parent = parent;
    this._promisesCreated = 0;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);
Context.CapturedTrace = CapturedTrace;

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit += 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit += 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit -= 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit += 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit -= 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        printWarning = function(message, isSoft) {
            var color = isSoft ? "\u001b[33m" : "\u001b[31m";
            console.warn(color + message + "\u001b[0m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        printWarning = function(message, isSoft) {
            console.warn("%c" + message,
                        isSoft ? "color: darkorange" : "color: red");
        };
    }
}

var config = {
    warnings: warnings,
    longStackTraces: false,
    cancellation: false,
    monitoring: false
};

if (longStackTraces) Promise.longStackTraces();

return {
    longStackTraces: function() {
        return config.longStackTraces;
    },
    warnings: function() {
        return config.warnings;
    },
    cancellation: function() {
        return config.cancellation;
    },
    monitoring: function() {
        return config.monitoring;
    },
    propagateFromFunction: function() {
        return propagateFromFunction;
    },
    boundValueFunction: function() {
        return boundValueFunction;
    },
    checkForgottenReturns: checkForgottenReturns,
    setBounds: setBounds,
    warn: warn,
    deprecated: deprecated,
    CapturedTrace: CapturedTrace,
    fireDomEvent: fireDomEvent,
    fireGlobalEvent: fireGlobalEvent
};
};

},{"./errors":12,"./util":36}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function returner() {
    return this.value;
}
function thrower() {
    throw this.reason;
}

Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value instanceof Promise) value.suppressUnhandledRejections();
    return this._then(
        returner, undefined, undefined, {value: value}, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    return this._then(
        thrower, undefined, undefined, {reason: reason}, undefined);
};

Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
        return this._then(
            undefined, thrower, undefined, {reason: reason}, undefined);
    } else {
        var _reason = arguments[1];
        var handler = function() {throw _reason;};
        return this.caught(reason, handler);
    }
};

Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
        if (value instanceof Promise) value.suppressUnhandledRejections();
        return this._then(
            undefined, returner, undefined, {value: value}, undefined);
    } else {
        var _value = arguments[1];
        if (_value instanceof Promise) _value.suppressUnhandledRejections();
        var handler = function() {return _value;};
        return this.caught(value, handler);
    }
};
};

},{}],11:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;
var PromiseAll = Promise.all;

function promiseAllThis() {
    return PromiseAll(this);
}

function PromiseMapSeries(promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, INTERNAL);
}

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, this, undefined);
};

Promise.prototype.mapSeries = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, promises, undefined);
};

Promise.mapSeries = PromiseMapSeries;
};


},{}],12:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    es5.defineProperty(Error, "__BluebirdErrorTypes__", {
        value: errorTypes,
        writable: false,
        enumerable: false,
        configurable: false
    });
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5":13,"./util":36}],13:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],14:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, tryConvertToPromise, NEXT_FILTER) {
var util = _dereq_("./util");
var CancellationError = Promise.CancellationError;
var errorObj = util.errorObj;
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);

function PassThroughHandlerContext(promise, type, handler) {
    this.promise = promise;
    this.type = type;
    this.handler = handler;
    this.called = false;
    this.cancelPromise = null;
}

PassThroughHandlerContext.prototype.isFinallyHandler = function() {
    return this.type === 0;
};

function FinallyHandlerCancelReaction(finallyHandler) {
    this.finallyHandler = finallyHandler;
}

FinallyHandlerCancelReaction.prototype._resultCancelled = function() {
    checkCancel(this.finallyHandler);
};

function checkCancel(ctx, reason) {
    if (ctx.cancelPromise != null) {
        if (arguments.length > 1) {
            ctx.cancelPromise._reject(reason);
        } else {
            ctx.cancelPromise._cancel();
        }
        ctx.cancelPromise = null;
        return true;
    }
    return false;
}

function succeed() {
    return finallyHandler.call(this, this.promise._target()._settledValue());
}
function fail(reason) {
    if (checkCancel(this, reason)) return;
    errorObj.e = reason;
    return errorObj;
}
function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    if (!this.called) {
        this.called = true;
        var ret = this.isFinallyHandler()
            ? handler.call(promise._boundValue())
            : handler.call(promise._boundValue(), reasonOrValue);
        if (ret === NEXT_FILTER) {
            return ret;
        } else if (ret !== undefined) {
            promise._setReturnedNonUndefined();
            var maybePromise = tryConvertToPromise(ret, promise);
            if (maybePromise instanceof Promise) {
                if (this.cancelPromise != null) {
                    if (maybePromise._isCancelled()) {
                        var reason =
                            new CancellationError("late cancellation observer");
                        promise._attachExtraTrace(reason);
                        errorObj.e = reason;
                        return errorObj;
                    } else if (maybePromise.isPending()) {
                        maybePromise._attachCancellationCallback(
                            new FinallyHandlerCancelReaction(this));
                    }
                }
                return maybePromise._then(
                    succeed, fail, undefined, this, undefined);
            }
        }
    }

    if (promise.isRejected()) {
        checkCancel(this);
        errorObj.e = reasonOrValue;
        return errorObj;
    } else {
        checkCancel(this);
        return reasonOrValue;
    }
}

Promise.prototype._passThrough = function(handler, type, success, fail) {
    if (typeof handler !== "function") return this.then();
    return this._then(success,
                      fail,
                      undefined,
                      new PassThroughHandlerContext(this, type, handler),
                      undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThrough(handler,
                             0,
                             finallyHandler,
                             finallyHandler);
};


Promise.prototype.tap = function (handler) {
    return this._passThrough(handler, 1, finallyHandler);
};

Promise.prototype.tapCatch = function (handlerOrPredicate) {
    var len = arguments.length;
    if(len === 1) {
        return this._passThrough(handlerOrPredicate,
                                 1,
                                 undefined,
                                 finallyHandler);
    } else {
         var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(new TypeError(
                    "tapCatch statement predicate: "
                    + "expecting an object but got " + util.classString(item)
                ));
            }
        }
        catchInstances.length = j;
        var handler = arguments[i];
        return this._passThrough(catchFilter(catchInstances, handler, this),
                                 1,
                                 undefined,
                                 finallyHandler);
    }

};

return PassThroughHandlerContext;
};

},{"./catch_filter":7,"./util":36}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise,
                          Proxyable,
                          debug) {
var errors = _dereq_("./errors");
var TypeError = errors.TypeError;
var util = _dereq_("./util");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    if (debug.cancellation()) {
        var internal = new Promise(INTERNAL);
        var _finallyPromise = this._finallyPromise = new Promise(INTERNAL);
        this._promise = internal.lastly(function() {
            return _finallyPromise;
        });
        internal._captureStackTrace();
        internal._setOnCancel(this);
    } else {
        var promise = this._promise = new Promise(INTERNAL);
        promise._captureStackTrace();
    }
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
    this._yieldedPromise = null;
    this._cancellationPhase = false;
}
util.inherits(PromiseSpawn, Proxyable);

PromiseSpawn.prototype._isResolved = function() {
    return this._promise === null;
};

PromiseSpawn.prototype._cleanup = function() {
    this._promise = this._generator = null;
    if (debug.cancellation() && this._finallyPromise !== null) {
        this._finallyPromise._fulfill();
        this._finallyPromise = null;
    }
};

PromiseSpawn.prototype._promiseCancelled = function() {
    if (this._isResolved()) return;
    var implementsReturn = typeof this._generator["return"] !== "undefined";

    var result;
    if (!implementsReturn) {
        var reason = new Promise.CancellationError(
            "generator .return() sentinel");
        Promise.coroutine.returnSentinel = reason;
        this._promise._attachExtraTrace(reason);
        this._promise._pushContext();
        result = tryCatch(this._generator["throw"]).call(this._generator,
                                                         reason);
        this._promise._popContext();
    } else {
        this._promise._pushContext();
        result = tryCatch(this._generator["return"]).call(this._generator,
                                                          undefined);
        this._promise._popContext();
    }
    this._cancellationPhase = true;
    this._yieldedPromise = null;
    this._continue(result);
};

PromiseSpawn.prototype._promiseFulfilled = function(value) {
    this._yieldedPromise = null;
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._promiseRejected = function(reason) {
    this._yieldedPromise = null;
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._resultCancelled = function() {
    if (this._yieldedPromise instanceof Promise) {
        var promise = this._yieldedPromise;
        this._yieldedPromise = null;
        promise.cancel();
    }
};

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._promiseFulfilled(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    var promise = this._promise;
    if (result === errorObj) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._rejectCallback(result.e, false);
        }
    }

    var value = result.value;
    if (result.done === true) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._resolveCallback(value);
        }
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._promiseRejected(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a\u000a".replace("%s", String(value)) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise = maybePromise._target();
        var bitField = maybePromise._bitField;
        ;
        if (((bitField & 50397184) === 0)) {
            this._yieldedPromise = maybePromise;
            maybePromise._proxy(this, null);
        } else if (((bitField & 33554432) !== 0)) {
            Promise._async.invoke(
                this._promiseFulfilled, this, maybePromise._value()
            );
        } else if (((bitField & 16777216) !== 0)) {
            Promise._async.invoke(
                this._promiseRejected, this, maybePromise._reason()
            );
        } else {
            this._promiseCancelled();
        }
    }
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        var ret = spawn.promise();
        spawn._generator = generator;
        spawn._promiseFulfilled(undefined);
        return ret;
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    debug.deprecated("Promise.spawn()", "Promise.coroutine()");
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors":12,"./util":36}],17:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL, async,
         getDomain) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var promiseSetter = function(i) {
        return new Function("promise", "holder", "                           \n\
            'use strict';                                                    \n\
            holder.pIndex = promise;                                         \n\
            ".replace(/Index/g, i));
    };

    var generateHolderClass = function(total) {
        var props = new Array(total);
        for (var i = 0; i < props.length; ++i) {
            props[i] = "this.p" + (i+1);
        }
        var assignment = props.join(" = ") + " = null;";
        var cancellationCode= "var promise;\n" + props.map(function(prop) {
            return "                                                         \n\
                promise = " + prop + ";                                      \n\
                if (promise instanceof Promise) {                            \n\
                    promise.cancel();                                        \n\
                }                                                            \n\
            ";
        }).join("\n");
        var passedArguments = props.join(", ");
        var name = "Holder$" + total;


        var code = "return function(tryCatch, errorObj, Promise, async) {    \n\
            'use strict';                                                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.asyncNeeded = true;                                     \n\
                this.now = 0;                                                \n\
            }                                                                \n\
                                                                             \n\
            [TheName].prototype._callFunction = function(promise) {          \n\
                promise._pushContext();                                      \n\
                var ret = tryCatch(this.fn)([ThePassedArguments]);           \n\
                promise._popContext();                                       \n\
                if (ret === errorObj) {                                      \n\
                    promise._rejectCallback(ret.e, false);                   \n\
                } else {                                                     \n\
                    promise._resolveCallback(ret);                           \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                var now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    if (this.asyncNeeded) {                                  \n\
                        async.invoke(this._callFunction, this, promise);     \n\
                    } else {                                                 \n\
                        this._callFunction(promise);                         \n\
                    }                                                        \n\
                                                                             \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype._resultCancelled = function() {              \n\
                [CancellationCode]                                           \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj, Promise, async);                               \n\
        ";

        code = code.replace(/\[TheName\]/g, name)
            .replace(/\[TheTotal\]/g, total)
            .replace(/\[ThePassedArguments\]/g, passedArguments)
            .replace(/\[TheProperties\]/g, assignment)
            .replace(/\[CancellationCode\]/g, cancellationCode);

        return new Function("tryCatch", "errorObj", "Promise", "async", code)
                           (tryCatch, errorObj, Promise, async);
    };

    var holderClasses = [];
    var thenCallbacks = [];
    var promiseSetters = [];

    for (var i = 0; i < 8; ++i) {
        holderClasses.push(generateHolderClass(i + 1));
        thenCallbacks.push(thenCallback(i + 1));
        promiseSetters.push(promiseSetter(i + 1));
    }

    reject = function (reason) {
        this._reject(reason);
    };
}}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last <= 8 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var HolderClass = holderClasses[last - 1];
                var holder = new HolderClass(fn);
                var callbacks = thenCallbacks;

                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        var bitField = maybePromise._bitField;
                        ;
                        if (((bitField & 50397184) === 0)) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                            promiseSetters[i](maybePromise, holder);
                            holder.asyncNeeded = false;
                        } else if (((bitField & 33554432) !== 0)) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else if (((bitField & 16777216) !== 0)) {
                            ret._reject(maybePromise._reason());
                        } else {
                            ret._cancel();
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }

                if (!ret._isFateSealed()) {
                    if (holder.asyncNeeded) {
                        var domain = getDomain();
                        if (domain !== null) {
                            holder.fn = util.domainBind(domain, holder.fn);
                        }
                    }
                    ret._setAsyncGuaranteed();
                    ret._setOnCancel(holder);
                }
                return ret;
            }
        }
    }
    var args = [].slice.call(arguments);;
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util":36}],18:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    var domain = getDomain();
    this._callback = domain === null ? fn : util.domainBind(domain, fn);
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = [];
    async.invoke(this._asyncInit, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);

MappingPromiseArray.prototype._asyncInit = function() {
    this._init$(undefined, -2);
};

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;

    if (index < 0) {
        index = (index * -1) - 1;
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return true;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return false;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var promise = this._promise;
        var callback = this._callback;
        var receiver = promise._boundValue();
        promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        var promiseCreated = promise._popContext();
        debug.checkForgottenReturns(
            ret,
            promiseCreated,
            preservedValues !== null ? "Promise.filter" : "Promise.map",
            promise
        );
        if (ret === errorObj) {
            this._reject(ret.e);
            return true;
        }

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            var bitField = maybePromise._bitField;
            ;
            if (((bitField & 50397184) === 0)) {
                if (limit >= 1) this._inFlight++;
                values[index] = maybePromise;
                maybePromise._proxy(this, (index + 1) * -1);
                return false;
            } else if (((bitField & 33554432) !== 0)) {
                ret = maybePromise._value();
            } else if (((bitField & 16777216) !== 0)) {
                this._reject(maybePromise._reason());
                return true;
            } else {
                this._cancel();
                return true;
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }
        return true;
    }
    return false;
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }

    var limit = 0;
    if (options !== undefined) {
        if (typeof options === "object" && options !== null) {
            if (typeof options.concurrency !== "number") {
                return Promise.reject(
                    new TypeError("'concurrency' must be a number but it is " +
                                    util.classString(options.concurrency)));
            }
            limit = options.concurrency;
        } else {
            return Promise.reject(new TypeError(
                            "options argument must be an object but it is " +
                             util.classString(options)));
        }
    }
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter).promise();
}

Promise.prototype.map = function (fn, options) {
    return map(this, fn, options, null);
};

Promise.map = function (promises, fn, options, _filter) {
    return map(promises, fn, options, _filter);
};


};

},{"./util":36}],19:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("expecting a function but got " + util.classString(fn));
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        var promiseCreated = ret._popContext();
        debug.checkForgottenReturns(
            value, promiseCreated, "Promise.method", ret);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value;
    if (arguments.length > 1) {
        debug.deprecated("calling Promise.try with more than 1 argument");
        var arg = arguments[1];
        var ctx = arguments[2];
        value = util.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
                                  : tryCatch(fn).call(ctx, arg);
    } else {
        value = tryCatch(fn)();
    }
    var promiseCreated = ret._popContext();
    debug.checkForgottenReturns(
        value, promiseCreated, "Promise.try", ret);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util":36}],20:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors");
var OperationalError = errors.OperationalError;
var es5 = _dereq_("./es5");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise, multiArgs) {
    return function(err, value) {
        if (promise === null) return;
        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (!multiArgs) {
            promise._fulfill(value);
        } else {
            var args = [].slice.call(arguments, 1);;
            promise._fulfill(args);
        }
        promise = null;
    };
}

module.exports = nodebackForPromise;

},{"./errors":12,"./es5":13,"./util":36}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util");
var async = Promise._async;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret =
        tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundValue();
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var newReason = new Error(reason + "");
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback = Promise.prototype.nodeify = function (nodeback,
                                                                     options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./util":36}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var reflectHandler = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};
function Proxyable() {}
var UNDEFINED_BINDING = {};
var util = _dereq_("./util");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var es5 = _dereq_("./es5");
var Async = _dereq_("./async");
var async = new Async();
es5.defineProperty(Promise, "_async", {value: async});
var errors = _dereq_("./errors");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
var CancellationError = Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {};
var tryConvertToPromise = _dereq_("./thenables")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array")(Promise, INTERNAL,
                               tryConvertToPromise, apiRejection, Proxyable);
var Context = _dereq_("./context")(Promise);
 /*jshint unused:false*/
var createContext = Context.create;
var debug = _dereq_("./debuggability")(Promise, Context);
var CapturedTrace = debug.CapturedTrace;
var PassThroughHandlerContext =
    _dereq_("./finally")(Promise, tryConvertToPromise, NEXT_FILTER);
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);
var nodebackForPromise = _dereq_("./nodeback");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function check(self, executor) {
    if (self == null || self.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (typeof executor !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(executor));
    }

}

function Promise(executor) {
    if (executor !== INTERNAL) {
        check(this, executor);
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._resolveFromExecutor(executor);
    this._promiseCreated();
    this._fireEvent("promiseCreated", this);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return apiRejection("Catch statement predicate: " +
                    "expecting an object but got " + util.classString(item));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        return this.then(undefined, catchFilter(catchInstances, fn, this));
    }
    return this.then(undefined, fn);
};

Promise.prototype.reflect = function () {
    return this._then(reflectHandler,
        reflectHandler, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject) {
    if (debug.warnings() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, undefined, undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject) {
    var promise =
        this._then(didFulfill, didReject, undefined, undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    if (arguments.length > 0) {
        this._warn(".all() was passed arguments but it does not take any");
    }
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.getNewLibraryCopy = module.exports;

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = Promise.fromCallback = function(fn) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    var multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs
                                         : false;
    var result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true);
    }
    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._setFulfilled();
        ret._rejectionHandler0 = obj;
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    return async.setScheduler(fn);
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    _,    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var promise = haveInternalData ? internalData : new Promise(INTERNAL);
    var target = this._target();
    var bitField = target._bitField;

    if (!haveInternalData) {
        promise._propagateFrom(this, 3);
        promise._captureStackTrace();
        if (receiver === undefined &&
            ((this._bitField & 2097152) !== 0)) {
            if (!((bitField & 50397184) === 0)) {
                receiver = this._boundValue();
            } else {
                receiver = target === this ? undefined : this._boundTo;
            }
        }
        this._fireEvent("promiseChained", this, promise);
    }

    var domain = getDomain();
    if (!((bitField & 50397184) === 0)) {
        var handler, value, settler = target._settlePromiseCtx;
        if (((bitField & 33554432) !== 0)) {
            value = target._rejectionHandler0;
            handler = didFulfill;
        } else if (((bitField & 16777216) !== 0)) {
            value = target._fulfillmentHandler0;
            handler = didReject;
            target._unsetRejectionIsUnhandled();
        } else {
            settler = target._settlePromiseLateCancellationObserver;
            value = new CancellationError("late cancellation observer");
            target._attachExtraTrace(value);
            handler = didReject;
        }

        async.invoke(settler, target, {
            handler: domain === null ? handler
                : (typeof handler === "function" &&
                    util.domainBind(domain, handler)),
            promise: promise,
            receiver: receiver,
            value: value
        });
    } else {
        target._addCallbacks(didFulfill, didReject, promise, receiver, domain);
    }

    return promise;
};

Promise.prototype._length = function () {
    return this._bitField & 65535;
};

Promise.prototype._isFateSealed = function () {
    return (this._bitField & 117506048) !== 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 67108864) === 67108864;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -65536) |
        (len & 65535);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 33554432;
    this._fireEvent("promiseFulfilled", this);
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 16777216;
    this._fireEvent("promiseRejected", this);
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 67108864;
    this._fireEvent("promiseResolved", this);
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._unsetCancelled = function() {
    this._bitField = this._bitField & (~65536);
};

Promise.prototype._setCancelled = function() {
    this._bitField = this._bitField | 65536;
    this._fireEvent("promiseCancelled", this);
};

Promise.prototype._setWillBeCancelled = function() {
    this._bitField = this._bitField | 8388608;
};

Promise.prototype._setAsyncGuaranteed = function() {
    if (async.hasCustomScheduler()) return;
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0 ? this._receiver0 : this[
            index * 4 - 4 + 3];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return this[
            index * 4 - 4 + 2];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 1];
};

Promise.prototype._boundValue = function() {};

Promise.prototype._migrateCallback0 = function (follower) {
    var bitField = follower._bitField;
    var fulfill = follower._fulfillmentHandler0;
    var reject = follower._rejectionHandler0;
    var promise = follower._promise0;
    var receiver = follower._receiverAt(0);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._migrateCallbackAt = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 65535 - 4) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        this._receiver0 = receiver;
        if (typeof fulfill === "function") {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    } else {
        var base = index * 4 - 4;
        this[base + 2] = promise;
        this[base + 3] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._proxy = function (proxyable, arg) {
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (((this._bitField & 117506048) !== 0)) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    if (shouldBind) this._propagateFrom(maybePromise, 2);

    var promise = maybePromise._target();

    if (promise === this) {
        this._reject(makeSelfResolutionError());
        return;
    }

    var bitField = promise._bitField;
    if (((bitField & 50397184) === 0)) {
        var len = this._length();
        if (len > 0) promise._migrateCallback0(this);
        for (var i = 1; i < len; ++i) {
            promise._migrateCallbackAt(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (((bitField & 33554432) !== 0)) {
        this._fulfill(promise._value());
    } else if (((bitField & 16777216) !== 0)) {
        this._reject(promise._reason());
    } else {
        var reason = new CancellationError("late cancellation observer");
        promise._attachExtraTrace(reason);
        this._reject(reason);
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, ignoreNonErrorWarnings) {
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
        var message = "a promise was rejected with a non-error: " +
            util.classString(reason);
        this._warn(message, true);
    }
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason);
};

Promise.prototype._resolveFromExecutor = function (executor) {
    if (executor === INTERNAL) return;
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = this._execute(executor, function(value) {
        promise._resolveCallback(value);
    }, function (reason) {
        promise._rejectCallback(reason, synchronous);
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined) {
        promise._rejectCallback(r, true);
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    var bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY) {
        if (!value || typeof value.length !== "number") {
            x = errorObj;
            x.e = new TypeError("cannot .spread() a non-array: " +
                                    util.classString(value));
        } else {
            x = tryCatch(handler).apply(this._boundValue(), value);
        }
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    var promiseCreated = promise._popContext();
    bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;

    if (x === NEXT_FILTER) {
        promise._reject(value);
    } else if (x === errorObj) {
        promise._rejectCallback(x.e, false);
    } else {
        debug.checkForgottenReturns(x, promiseCreated, "",  promise, this);
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._settlePromise = function(promise, handler, receiver, value) {
    var isPromise = promise instanceof Promise;
    var bitField = this._bitField;
    var asyncGuaranteed = ((bitField & 134217728) !== 0);
    if (((bitField & 65536) !== 0)) {
        if (isPromise) promise._invokeInternalOnCancel();

        if (receiver instanceof PassThroughHandlerContext &&
            receiver.isFinallyHandler()) {
            receiver.cancelPromise = promise;
            if (tryCatch(handler).call(receiver, value) === errorObj) {
                promise._reject(errorObj.e);
            }
        } else if (handler === reflectHandler) {
            promise._fulfill(reflectHandler.call(receiver));
        } else if (receiver instanceof Proxyable) {
            receiver._promiseCancelled(promise);
        } else if (isPromise || promise instanceof PromiseArray) {
            promise._cancel();
        } else {
            receiver.cancel();
        }
    } else if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            if (asyncGuaranteed) promise._setAsyncGuaranteed();
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof Proxyable) {
        if (!receiver._isResolved()) {
            if (((bitField & 33554432) !== 0)) {
                receiver._promiseFulfilled(value, promise);
            } else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();
        if (((bitField & 33554432) !== 0)) {
            promise._fulfill(value);
        } else {
            promise._reject(value);
        }
    }
};

Promise.prototype._settlePromiseLateCancellationObserver = function(ctx) {
    var handler = ctx.handler;
    var promise = ctx.promise;
    var receiver = ctx.receiver;
    var value = ctx.value;
    if (typeof handler === "function") {
        if (!(promise instanceof Promise)) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (promise instanceof Promise) {
        promise._reject(value);
    }
};

Promise.prototype._settlePromiseCtx = function(ctx) {
    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
};

Promise.prototype._settlePromise0 = function(handler, value, bitField) {
    var promise = this._promise0;
    var receiver = this._receiverAt(0);
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settlePromise(promise, handler, receiver, value);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    var base = index * 4 - 4;
    this[base + 2] =
    this[base + 3] =
    this[base + 0] =
    this[base + 1] = undefined;
};

Promise.prototype._fulfill = function (value) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._reject(err);
    }
    this._setFulfilled();
    this._rejectionHandler0 = value;

    if ((bitField & 65535) > 0) {
        if (((bitField & 134217728) !== 0)) {
            this._settlePromises();
        } else {
            async.settlePromises(this);
        }
    }
};

Promise.prototype._reject = function (reason) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    this._setRejected();
    this._fulfillmentHandler0 = reason;

    if (this._isFinal()) {
        return async.fatalError(reason, util.isNode);
    }

    if ((bitField & 65535) > 0) {
        async.settlePromises(this);
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._fulfillPromises = function (len, value) {
    for (var i = 1; i < len; i++) {
        var handler = this._fulfillmentHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, value);
    }
};

Promise.prototype._rejectPromises = function (len, reason) {
    for (var i = 1; i < len; i++) {
        var handler = this._rejectionHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, reason);
    }
};

Promise.prototype._settlePromises = function () {
    var bitField = this._bitField;
    var len = (bitField & 65535);

    if (len > 0) {
        if (((bitField & 16842752) !== 0)) {
            var reason = this._fulfillmentHandler0;
            this._settlePromise0(this._rejectionHandler0, reason, bitField);
            this._rejectPromises(len, reason);
        } else {
            var value = this._rejectionHandler0;
            this._settlePromise0(this._fulfillmentHandler0, value, bitField);
            this._fulfillPromises(len, value);
        }
        this._setLength(0);
    }
    this._clearCancellationData();
};

Promise.prototype._settledValue = function() {
    var bitField = this._bitField;
    if (((bitField & 33554432) !== 0)) {
        return this._rejectionHandler0;
    } else if (((bitField & 16777216) !== 0)) {
        return this._fulfillmentHandler0;
    }
};

function deferResolve(v) {this.promise._resolveCallback(v);}
function deferReject(v) {this.promise._rejectCallback(v, false);}

Promise.defer = Promise.pending = function() {
    debug.deprecated("Promise.defer", "new Promise");
    var promise = new Promise(INTERNAL);
    return {
        promise: promise,
        resolve: deferResolve,
        reject: deferReject
    };
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./method")(Promise, INTERNAL, tryConvertToPromise, apiRejection,
    debug);
_dereq_("./bind")(Promise, INTERNAL, tryConvertToPromise, debug);
_dereq_("./cancel")(Promise, PromiseArray, apiRejection, debug);
_dereq_("./direct_resolve")(Promise);
_dereq_("./synchronous_inspection")(Promise);
_dereq_("./join")(
    Promise, PromiseArray, tryConvertToPromise, INTERNAL, async, getDomain);
Promise.Promise = Promise;
Promise.version = "3.5.0";
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./call_get.js')(Promise);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug);
_dereq_('./timers.js')(Promise, INTERNAL, debug);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise, Proxyable, debug);
_dereq_('./nodeify.js')(Promise);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./settle.js')(Promise, PromiseArray, debug);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./filter.js')(Promise, INTERNAL);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./any.js')(Promise);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    debug.setBounds(Async.firstLineError, util.lastLineError);               
    return Promise;                                                          

};

},{"./any.js":1,"./async":2,"./bind":3,"./call_get.js":5,"./cancel":6,"./catch_filter":7,"./context":8,"./debuggability":9,"./direct_resolve":10,"./each.js":11,"./errors":12,"./es5":13,"./filter.js":14,"./finally":15,"./generators.js":16,"./join":17,"./map.js":18,"./method":19,"./nodeback":20,"./nodeify.js":21,"./promise_array":23,"./promisify.js":24,"./props.js":25,"./race.js":27,"./reduce.js":28,"./settle.js":30,"./some.js":31,"./synchronous_inspection":32,"./thenables":33,"./timers.js":34,"./using.js":35,"./util":36}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection, Proxyable) {
var util = _dereq_("./util");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    case -6: return new Map();
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    if (values instanceof Promise) {
        promise._propagateFrom(values, 3);
    }
    promise._setOnCancel(this);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
util.inherits(PromiseArray, Proxyable);

PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        var bitField = values._bitField;
        ;
        this._values = values;

        if (((bitField & 50397184) === 0)) {
            this._promise._setAsyncGuaranteed();
            return values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
        } else if (((bitField & 33554432) !== 0)) {
            values = values._value();
        } else if (((bitField & 16777216) !== 0)) {
            return this._reject(values._reason());
        } else {
            return this._cancel();
        }
    }
    values = util.asArray(values);
    if (values === null) {
        var err = apiRejection(
            "expecting an array or an iterable object but got " + util.classString(values)).reason();
        this._promise._rejectCallback(err, false);
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    this._iterate(values);
};

PromiseArray.prototype._iterate = function(values) {
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var result = this._promise;
    var isResolved = false;
    var bitField = null;
    for (var i = 0; i < len; ++i) {
        var maybePromise = tryConvertToPromise(values[i], result);

        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            bitField = maybePromise._bitField;
        } else {
            bitField = null;
        }

        if (isResolved) {
            if (bitField !== null) {
                maybePromise.suppressUnhandledRejections();
            }
        } else if (bitField !== null) {
            if (((bitField & 50397184) === 0)) {
                maybePromise._proxy(this, i);
                this._values[i] = maybePromise;
            } else if (((bitField & 33554432) !== 0)) {
                isResolved = this._promiseFulfilled(maybePromise._value(), i);
            } else if (((bitField & 16777216) !== 0)) {
                isResolved = this._promiseRejected(maybePromise._reason(), i);
            } else {
                isResolved = this._promiseCancelled(i);
            }
        } else {
            isResolved = this._promiseFulfilled(maybePromise, i);
        }
    }
    if (!isResolved) result._setAsyncGuaranteed();
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype._cancel = function() {
    if (this._isResolved() || !this._promise._isCancellable()) return;
    this._values = null;
    this._promise._cancel();
};

PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false);
};

PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

PromiseArray.prototype._promiseCancelled = function() {
    this._cancel();
    return true;
};

PromiseArray.prototype._promiseRejected = function (reason) {
    this._totalResolved++;
    this._reject(reason);
    return true;
};

PromiseArray.prototype._resultCancelled = function() {
    if (this._isResolved()) return;
    var values = this._values;
    this._cancel();
    if (values instanceof Promise) {
        values.cancel();
    } else {
        for (var i = 0; i < values.length; ++i) {
            if (values[i] instanceof Promise) {
                values[i].cancel();
            }
        }
    }
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util":36}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util");
var nodebackForPromise = _dereq_("./nodeback");
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyProps = [
    "arity",    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
];
var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

var defaultFilter = function(name) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        name !== "constructor";
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/MqrFmX\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn, _, multiArgs) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";
    var body = "'use strict';                                                \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise, " + multiArgs + ");   \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            if (!promise._isFateSealed()) promise._setAsyncGuaranteed();     \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
    ".replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode);
    body = body.replace("Parameters", parameterDeclaration(newParameterCount));
    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "notEnumerableProp",
                        "INTERNAL",
                        body)(
                    Promise,
                    fn,
                    receiver,
                    withAppended,
                    maybeWrapAsError,
                    nodebackForPromise,
                    util.tryCatch,
                    util.errorObj,
                    util.notEnumerableProp,
                    INTERNAL);
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn, __, multiArgs) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise, multiArgs);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        if (!promise._isFateSealed()) promise._setAsyncGuaranteed();
        return promise;
    }
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier, multiArgs) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        if (promisifier === makeNodePromisified) {
            obj[promisifiedKey] =
                makeNodePromisified(key, THIS, key, fn, suffix, multiArgs);
        } else {
            var promisified = promisifier(fn, function() {
                return makeNodePromisified(key, THIS, key,
                                           fn, suffix, multiArgs);
            });
            util.notEnumerableProp(promisified, "__isPromisified__", true);
            obj[promisifiedKey] = promisified;
        }
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver, multiArgs) {
    return makeNodePromisified(callback, receiver, undefined,
                                callback, null, multiArgs);
}

Promise.promisify = function (fn, options) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    if (isPromisified(fn)) {
        return fn;
    }
    options = Object(options);
    var receiver = options.context === undefined ? THIS : options.context;
    var multiArgs = !!options.multiArgs;
    var ret = promisify(fn, receiver, multiArgs);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    options = Object(options);
    var multiArgs = !!options.multiArgs;
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier,
                multiArgs);
            promisifyAll(value, suffix, filter, promisifier, multiArgs);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier, multiArgs);
};
};


},{"./errors":12,"./nodeback":20,"./util":36}],25:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");
var isObject = util.isObject;
var es5 = _dereq_("./es5");
var Es6Map;
if (typeof Map === "function") Es6Map = Map;

var mapToEntries = (function() {
    var index = 0;
    var size = 0;

    function extractEntry(value, key) {
        this[index] = value;
        this[index + size] = key;
        index++;
    }

    return function mapToEntries(map) {
        size = map.size;
        index = 0;
        var ret = new Array(map.size * 2);
        map.forEach(extractEntry, ret);
        return ret;
    };
})();

var entriesToMap = function(entries) {
    var ret = new Es6Map();
    var length = entries.length / 2 | 0;
    for (var i = 0; i < length; ++i) {
        var key = entries[length + i];
        var value = entries[i];
        ret.set(key, value);
    }
    return ret;
};

function PropertiesPromiseArray(obj) {
    var isMap = false;
    var entries;
    if (Es6Map !== undefined && obj instanceof Es6Map) {
        entries = mapToEntries(obj);
        isMap = true;
    } else {
        var keys = es5.keys(obj);
        var len = keys.length;
        entries = new Array(len * 2);
        for (var i = 0; i < len; ++i) {
            var key = keys[i];
            entries[i] = obj[key];
            entries[i + len] = key;
        }
    }
    this.constructor$(entries);
    this._isMap = isMap;
    this._init$(undefined, isMap ? -6 : -3);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val;
        if (this._isMap) {
            val = entriesToMap(this._values);
        } else {
            val = {};
            var keyOffset = this.length();
            for (var i = 0, len = this.length(); i < len; ++i) {
                val[this._values[i + keyOffset]] = this._values[i];
            }
        }
        this._resolve(val);
        return true;
    }
    return false;
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 2);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5":13,"./util":36}],26:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else {
        promises = util.asArray(promises);
        if (promises === null)
            return apiRejection("expecting an array or an iterable object but got " + util.classString(promises));
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 3);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util":36}],28:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

function ReductionPromiseArray(promises, fn, initialValue, _each) {
    this.constructor$(promises);
    var domain = getDomain();
    this._fn = domain === null ? fn : util.domainBind(domain, fn);
    if (initialValue !== undefined) {
        initialValue = Promise.resolve(initialValue);
        initialValue._attachCancellationCallback(this);
    }
    this._initialValue = initialValue;
    this._currentCancellable = null;
    if(_each === INTERNAL) {
        this._eachValues = Array(this._length);
    } else if (_each === 0) {
        this._eachValues = null;
    } else {
        this._eachValues = undefined;
    }
    this._promise._captureStackTrace();
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._gotAccum = function(accum) {
    if (this._eachValues !== undefined && 
        this._eachValues !== null && 
        accum !== INTERNAL) {
        this._eachValues.push(accum);
    }
};

ReductionPromiseArray.prototype._eachComplete = function(value) {
    if (this._eachValues !== null) {
        this._eachValues.push(value);
    }
    return this._eachValues;
};

ReductionPromiseArray.prototype._init = function() {};

ReductionPromiseArray.prototype._resolveEmptyArray = function() {
    this._resolve(this._eachValues !== undefined ? this._eachValues
                                                 : this._initialValue);
};

ReductionPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

ReductionPromiseArray.prototype._resolve = function(value) {
    this._promise._resolveCallback(value);
    this._values = null;
};

ReductionPromiseArray.prototype._resultCancelled = function(sender) {
    if (sender === this._initialValue) return this._cancel();
    if (this._isResolved()) return;
    this._resultCancelled$();
    if (this._currentCancellable instanceof Promise) {
        this._currentCancellable.cancel();
    }
    if (this._initialValue instanceof Promise) {
        this._initialValue.cancel();
    }
};

ReductionPromiseArray.prototype._iterate = function (values) {
    this._values = values;
    var value;
    var i;
    var length = values.length;
    if (this._initialValue !== undefined) {
        value = this._initialValue;
        i = 0;
    } else {
        value = Promise.resolve(values[0]);
        i = 1;
    }

    this._currentCancellable = value;

    if (!value.isRejected()) {
        for (; i < length; ++i) {
            var ctx = {
                accum: null,
                value: values[i],
                index: i,
                length: length,
                array: this
            };
            value = value._then(gotAccum, undefined, undefined, ctx, undefined);
        }
    }

    if (this._eachValues !== undefined) {
        value = value
            ._then(this._eachComplete, undefined, undefined, this, undefined);
    }
    value._then(completed, completed, undefined, value, this);
};

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};

function completed(valueOrReason, array) {
    if (this.isFulfilled()) {
        array._resolve(valueOrReason);
    } else {
        array._reject(valueOrReason);
    }
}

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

function gotAccum(accum) {
    this.accum = accum;
    this.array._gotAccum(accum);
    var value = tryConvertToPromise(this.value, this.array._promise);
    if (value instanceof Promise) {
        this.array._currentCancellable = value;
        return value._then(gotValue, undefined, undefined, this, undefined);
    } else {
        return gotValue.call(this, value);
    }
}

function gotValue(value) {
    var array = this.array;
    var promise = array._promise;
    var fn = tryCatch(array._fn);
    promise._pushContext();
    var ret;
    if (array._eachValues !== undefined) {
        ret = fn.call(promise._boundValue(), value, this.index, this.length);
    } else {
        ret = fn.call(promise._boundValue(),
                              this.accum, value, this.index, this.length);
    }
    if (ret instanceof Promise) {
        array._currentCancellable = ret;
    }
    var promiseCreated = promise._popContext();
    debug.checkForgottenReturns(
        ret,
        promiseCreated,
        array._eachValues !== undefined ? "Promise.each" : "Promise.reduce",
        promise
    );
    return ret;
}
};

},{"./util":36}],29:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var schedule;
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var NativePromise = util.getNativePromise();
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if (typeof NativePromise === "function" &&
           typeof NativePromise.resolve === "function") {
    var nativePromise = NativePromise.resolve();
    schedule = function(fn) {
        nativePromise.then(fn);
    };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            (window.navigator.standalone || window.cordova))) {
    schedule = (function() {
        var div = document.createElement("div");
        var opts = {attributes: true};
        var toggleScheduled = false;
        var div2 = document.createElement("div");
        var o2 = new MutationObserver(function() {
            div.classList.toggle("foo");
            toggleScheduled = false;
        });
        o2.observe(div2, opts);

        var scheduleToggle = function() {
            if (toggleScheduled) return;
            toggleScheduled = true;
            div2.classList.toggle("foo");
        };

        return function schedule(fn) {
            var o = new MutationObserver(function() {
                o.disconnect();
                fn();
            });
            o.observe(div, opts);
            scheduleToggle();
        };
    })();
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":36}],30:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray, debug) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 33554432;
    ret._settledValueField = value;
    return this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 16777216;
    ret._settledValueField = reason;
    return this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    debug.deprecated(".settle()", ".reflect()");
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return Promise.settle(this);
};
};

},{"./util":36}],31:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util");
var RangeError = _dereq_("./errors").RangeError;
var AggregateError = _dereq_("./errors").AggregateError;
var isArray = util.isArray;
var CANCELLATION = {};


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
        return true;
    }
    return false;

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    return this._checkOutcome();
};

SomePromiseArray.prototype._promiseCancelled = function () {
    if (this._values instanceof Promise || this._values == null) {
        return this._cancel();
    }
    this._addRejected(CANCELLATION);
    return this._checkOutcome();
};

SomePromiseArray.prototype._checkOutcome = function() {
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            if (this._values[i] !== CANCELLATION) {
                e.push(this._values[i]);
            }
        }
        if (e.length > 0) {
            this._reject(e);
        } else {
            this._cancel();
        }
        return true;
    }
    return false;
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors":12,"./util":36}],32:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValueField = promise._isFateSealed()
            ? promise._settledValue() : undefined;
    }
    else {
        this._bitField = 0;
        this._settledValueField = undefined;
    }
}

PromiseInspection.prototype._settledValue = function() {
    return this._settledValueField;
};

var value = PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var reason = PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var isFulfilled = PromiseInspection.prototype.isFulfilled = function() {
    return (this._bitField & 33554432) !== 0;
};

var isRejected = PromiseInspection.prototype.isRejected = function () {
    return (this._bitField & 16777216) !== 0;
};

var isPending = PromiseInspection.prototype.isPending = function () {
    return (this._bitField & 50397184) === 0;
};

var isResolved = PromiseInspection.prototype.isResolved = function () {
    return (this._bitField & 50331648) !== 0;
};

PromiseInspection.prototype.isCancelled = function() {
    return (this._bitField & 8454144) !== 0;
};

Promise.prototype.__isCancelled = function() {
    return (this._bitField & 65536) === 65536;
};

Promise.prototype._isCancelled = function() {
    return this._target().__isCancelled();
};

Promise.prototype.isCancelled = function() {
    return (this._target()._bitField & 8454144) !== 0;
};

Promise.prototype.isPending = function() {
    return isPending.call(this._target());
};

Promise.prototype.isRejected = function() {
    return isRejected.call(this._target());
};

Promise.prototype.isFulfilled = function() {
    return isFulfilled.call(this._target());
};

Promise.prototype.isResolved = function() {
    return isResolved.call(this._target());
};

Promise.prototype.value = function() {
    return value.call(this._target());
};

Promise.prototype.reason = function() {
    var target = this._target();
    target._unsetRejectionIsUnhandled();
    return reason.call(target);
};

Promise.prototype._value = function() {
    return this._settledValue();
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue();
};

Promise.PromiseInspection = PromiseInspection;
};

},{}],33:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) return obj;
        var then = getThen(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            if (isAnyBluebirdPromise(obj)) {
                var ret = new Promise(INTERNAL);
                obj._then(
                    ret._fulfill,
                    ret._reject,
                    undefined,
                    ret,
                    null
                );
                return ret;
            }
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function doGetThen(obj) {
    return obj.then;
}

function getThen(obj) {
    try {
        return doGetThen(obj);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    try {
        return hasProp.call(obj, "_promise0");
    } catch (e) {
        return false;
    }
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x, resolve, reject);
    synchronous = false;

    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolve(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function reject(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util":36}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, debug) {
var util = _dereq_("./util");
var TimeoutError = Promise.TimeoutError;

function HandleWrapper(handle)  {
    this.handle = handle;
}

HandleWrapper.prototype._resultCancelled = function() {
    clearTimeout(this.handle);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (ms, value) {
    var ret;
    var handle;
    if (value !== undefined) {
        ret = Promise.resolve(value)
                ._then(afterValue, null, null, ms, undefined);
        if (debug.cancellation() && value instanceof Promise) {
            ret._setOnCancel(value);
        }
    } else {
        ret = new Promise(INTERNAL);
        handle = setTimeout(function() { ret._fulfill(); }, +ms);
        if (debug.cancellation()) {
            ret._setOnCancel(new HandleWrapper(handle));
        }
        ret._captureStackTrace();
    }
    ret._setAsyncGuaranteed();
    return ret;
};

Promise.prototype.delay = function (ms) {
    return delay(ms, this);
};

var afterTimeout = function (promise, message, parent) {
    var err;
    if (typeof message !== "string") {
        if (message instanceof Error) {
            err = message;
        } else {
            err = new TimeoutError("operation timed out");
        }
    } else {
        err = new TimeoutError(message);
    }
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._reject(err);

    if (parent != null) {
        parent.cancel();
    }
};

function successClear(value) {
    clearTimeout(this.handle);
    return value;
}

function failureClear(reason) {
    clearTimeout(this.handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret, parent;

    var handleWrapper = new HandleWrapper(setTimeout(function timeoutTimeout() {
        if (ret.isPending()) {
            afterTimeout(ret, message, parent);
        }
    }, ms));

    if (debug.cancellation()) {
        parent = this.then();
        ret = parent._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
        ret._setOnCancel(handleWrapper);
    } else {
        ret = this._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
    }

    return ret;
};

};

},{"./util":36}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext, INTERNAL, debug) {
    var util = _dereq_("./util");
    var TypeError = _dereq_("./errors").TypeError;
    var inherits = _dereq_("./util").inherits;
    var errorObj = util.errorObj;
    var tryCatch = util.tryCatch;
    var NULL = {};

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = new Promise(INTERNAL);
        function iterator() {
            if (i >= len) return ret._fulfill();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret;
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return NULL;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== NULL
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    function ResourceList(length) {
        this.length = length;
        this.promise = null;
        this[length-1] = null;
    }

    ResourceList.prototype._resultCancelled = function() {
        var len = this.length;
        for (var i = 0; i < len; ++i) {
            var item = this[i];
            if (item instanceof Promise) {
                item.cancel();
            }
        }
    };

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") {
            return apiRejection("expecting a function but got " + util.classString(fn));
        }
        var input;
        var spreadArgs = true;
        if (len === 2 && Array.isArray(arguments[0])) {
            input = arguments[0];
            len = input.length;
            spreadArgs = false;
        } else {
            input = arguments;
            len--;
        }
        var resources = new ResourceList(len);
        for (var i = 0; i < len; ++i) {
            var resource = input[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var reflectedResources = new Array(resources.length);
        for (var i = 0; i < reflectedResources.length; ++i) {
            reflectedResources[i] = Promise.resolve(resources[i]).reflect();
        }

        var resultPromise = Promise.all(reflectedResources)
            .then(function(inspections) {
                for (var i = 0; i < inspections.length; ++i) {
                    var inspection = inspections[i];
                    if (inspection.isRejected()) {
                        errorObj.e = inspection.error();
                        return errorObj;
                    } else if (!inspection.isFulfilled()) {
                        resultPromise.cancel();
                        return;
                    }
                    inspections[i] = inspection.value();
                }
                promise._pushContext();

                fn = tryCatch(fn);
                var ret = spreadArgs
                    ? fn.apply(undefined, inspections) : fn(inspections);
                var promiseCreated = promise._popContext();
                debug.checkForgottenReturns(
                    ret, promiseCreated, "Promise.using", promise);
                return ret;
            });

        var promise = resultPromise.lastly(function() {
            var inspection = new Promise.PromiseInspection(resultPromise);
            return dispose(resources, inspection);
        });
        resources.promise = promise;
        promise._setOnCancel(resources);
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 131072;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 131072) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~131072);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors":12,"./util":36}],36:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var canEvaluate = typeof navigator == "undefined";

var errorObj = {e: {}};
var tryCatchTarget;
var globalObject = typeof self !== "undefined" ? self :
    typeof window !== "undefined" ? window :
    typeof global !== "undefined" ? global :
    this !== undefined ? this : null;

function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return typeof value === "function" ||
           typeof value === "object" && value !== null;
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function FakeConstructor() {}
    FakeConstructor.prototype = obj;
    var l = 8;
    while (l--) new FakeConstructor();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function isError(obj) {
    return obj !== null &&
           typeof obj === "object" &&
           typeof obj.message === "string" &&
           typeof obj.name === "string";
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return isError(obj) && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var asArray = function(v) {
    if (es5.isArray(v)) {
        return v;
    }
    return null;
};

if (typeof Symbol !== "undefined" && Symbol.iterator) {
    var ArrayFrom = typeof Array.from === "function" ? function(v) {
        return Array.from(v);
    } : function(v) {
        var ret = [];
        var it = v[Symbol.iterator]();
        var itResult;
        while (!((itResult = it.next()).done)) {
            ret.push(itResult.value);
        }
        return ret;
    };

    asArray = function(v) {
        if (es5.isArray(v)) {
            return v;
        } else if (v != null && typeof v[Symbol.iterator] === "function") {
            return ArrayFrom(v);
        }
        return null;
    };
}

var isNode = typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]";

var hasEnvVariables = typeof process !== "undefined" &&
    typeof process.env !== "undefined";

function env(key) {
    return hasEnvVariables ? process.env[key] : undefined;
}

function getNativePromise() {
    if (typeof Promise === "function") {
        try {
            var promise = new Promise(function(){});
            if ({}.toString.call(promise) === "[object Promise]") {
                return Promise;
            }
        } catch (e) {}
    }
}

function domainBind(self, cb) {
    return self.bind(cb);
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    asArray: asArray,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    isError: isError,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: isNode,
    hasEnvVariables: hasEnvVariables,
    env: env,
    global: globalObject,
    getNativePromise: getNativePromise,
    domainBind: domainBind
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5":13}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         };
return module.exports;
},
9: function (require, module, exports) {
module.exports = function(options) {
  var allChartData, allDrilldownData, categories, chartData, currentBrowser, el$, elMarkup, gapEl$, test, testName, tests;
  gapEl$ = chartsContainer$.children().last();
  chartsContainer$.empty().append(gapEl$);
  currentBrowser = serverResponse.selfUA;
  tests = sortTests(serverResponse.tests, options.chartsOrderMap);
  allChartData = [];
  for (testName in tests) {
    test = tests[testName];
    if (!test.values[currentBrowser]) {
      continue;
    }
    allChartData.push(chartData = createChartDataForTest(testName, test, options, currentBrowser));
    categories = chartData.map(function(item) {
      return item.name;
    });
    elMarkup = markup.item.replace('{{title}}', testName).replace('{{subtitle}}', test.desc).replace('{{fullWidth}}', '').replace('{{nonSharedTest}}', test.nonSharedTest ? 'nonSharedTest' : '');
    el$ = $(elMarkup).insertBefore(chartsContainer$.children().last());
    el$.after(' ').find('.__chart').highcharts(genChartSettings(options, chartData, categories));
  }
  allChartData = allChartData.filter(function(series) {
    return !series.nonSharedTest;
  });
  allDrilldownData = allChartData.map(function(series) {
    return series.drilldown;
  });
  if (allChartData.length) {
    allChartData = allChartData.map(function(series) {
      var i, len, output, point;
      output = {};
      for (i = 0, len = series.length; i < len; i++) {
        point = series[i];
        output[point.name] = point;
      }
      return output;
    }).reduce(function(a, b) {
      var combined, point, pointName, ref, ref1;
      combined = {};
      for (pointName in a) {
        point = a[pointName];
        combined[pointName] = {
          'y': (((ref = a[pointName]) != null ? ref.y : void 0) || 0) + (((ref1 = b[pointName]) != null ? ref1.y : void 0) || 0),
          'x': point.x,
          'color': point.color,
          'name': point.name,
          'library': point.library
        };
      }
      return combined;
    });
  }
  categories = Object.keys(allChartData);
  allChartData = categories.map(function(name) {
    return allChartData[name];
  });
  elMarkup = markup.item.replace('{{title}}', 'Combined Results').replace('{{subtitle}}', 'Data from all benchmarks aggregated together for each library').replace('{{fullWidth}}', 'isFullWidth').replace('{{nonSharedTest}}', '');
  el$ = $(elMarkup).prependTo(chartsContainer$);
  return el$.after(' ').find('.__chart').highcharts(genChartSettings(options, allChartData, categories, true));
};

;
return module.exports;
},
10: function (require, module, exports) {
module.exports = function(options, chartData, categories, showDataLabels) {
  var obj;
  if (showDataLabels == null) {
    showDataLabels = false;
  }
  return {
    'series': [
      {
        data: chartData
      }
    ],
    'chart': {
      'type': options.chartType
    },
    'colors': options.colors,
    'credits': {
      'enabled': false
    },
    'legend': {
      'enabled': false
    },
    'title': {
      'text': null
    },
    'subtitle': {
      'text': null
    },
    'xAxis': {
      'type': 'category',
      'allowDecimals': false,
      'tickWidth': 0,
      'crosshair': {
        'color': 'rgba(0,0,0,0.1)'
      }
    },
    'yAxis': {
      'allowDecimals': false,
      'gridLineColor': 'rgba(0,0,0,0.08)',
      'reversedStacks': false,
      'title': {
        'text': options.valueType === 'ops' ? 'Operations per second' : 'Points'
      }
    },
    'plotOptions': (
      obj = {},
      obj["" + options.chartType] = {
        'stacking': null,
        'colorByPoint': true,
        'pointPadding': 0.05,
        'groupPadding': 0.1,
        'borderWidth': 0,
        'minPointLength': 4,
        'marker': {
          'enabled': false,
          'state': {
            'hover': {
              'enabled': false
            }
          }
        },
        'dataLabels': false
      },
      obj
    ),
    'drilldown': {
      'activeAxisLabelStyle': null,
      'activeDataLabelStyle': null,
      'allowPointDrilldown': false,
      'series': chartData.drilldown
    },
    'tooltip': {
      'formatter': function() {
        var color, key, name, point, pointValue, suffix, value;
        point = this.point || this.points[0];
        color = point.color;
        key = point.key;
        name = point.name;
        pointValue = humanize.numberFormat(point.y, 0) || 0;
        suffix = options.valueType === 'ops' ? 'op/s' : 'points';
        value = "<b>" + pointValue + " " + suffix + "</b>";
        return "<span style=\"color: " + color + "\">\u25CF</span> " + name + ": " + value + "<br/>";
      }
    }
  };
};

;
return module.exports;
},
8: function (require, module, exports) {
module.exports = {
  'colors': ['#ff5e3a', '#ff9500', '#ffdb4c', '#87fc70', '#52edc7', '#1ad6fd', '#c644fc', '#ef4db6', '#4a4a4a', '#dbddde'],
  'browserData': 'current',
  'valueType': 'ops',
  'chartType': 'column',
  'chartsOrderMap': [],
  'itemsMap': {}
};

Highcharts.setOptions({
  'global': {
    'useUTC': false
  },
  'lang': {
    'thousandsSep': ','
  }
});

;
return module.exports;
},
4: function (require, module, exports) {
/*
 Highcharts JS v5.0.2-modified (2017-03-20)
 Highcharts Drilldown module

 Author: Torstein Honsi
 License: www.highcharts.com/license

*/
(function(n){"object"===typeof module&&module.exports?module.exports=n:n(Highcharts)})(function(n){(function(f){function n(b,a,d){var c;a.rgba.length&&b.rgba.length?(b=b.rgba,a=a.rgba,c=1!==a[3]||1!==b[3],b=(c?"rgba(":"rgb(")+Math.round(a[0]+(b[0]-a[0])*(1-d))+","+Math.round(a[1]+(b[1]-a[1])*(1-d))+","+Math.round(a[2]+(b[2]-a[2])*(1-d))+(c?","+(a[3]+(b[3]-a[3])*(1-d)):"")+")"):b=a.input||"none";return b}var B=f.noop,v=f.color,w=f.defaultOptions,l=f.each,p=f.extend,H=f.format,C=f.pick,x=f.wrap,q=f.Chart,
t=f.seriesTypes,D=t.pie,r=t.column,E=f.Tick,y=f.fireEvent,F=f.inArray,G=1;l(["fill","stroke"],function(b){f.Fx.prototype[b+"Setter"]=function(){this.elem.attr(b,n(v(this.start),v(this.end),this.pos))}});p(w.lang,{drillUpText:"\u25c1 Back to {series.name}"});w.drilldown={activeAxisLabelStyle:{cursor:"pointer",color:"#003399",fontWeight:"bold",textDecoration:"underline"},activeDataLabelStyle:{cursor:"pointer",color:"#003399",fontWeight:"bold",textDecoration:"underline"},animation:{duration:500},drillUpButton:{position:{align:"right",
x:-10,y:10}}};f.SVGRenderer.prototype.Element.prototype.fadeIn=function(b){this.attr({opacity:.1,visibility:"inherit"}).animate({opacity:C(this.newOpacity,1)},b||{duration:250})};q.prototype.addSeriesAsDrilldown=function(b,a){this.addSingleSeriesAsDrilldown(b,a);this.applyDrilldown()};q.prototype.addSingleSeriesAsDrilldown=function(b,a){var d=b.series,c=d.xAxis,e=d.yAxis,h,g=[],k=[],u,m,z;z={color:b.color||d.color};this.drilldownLevels||(this.drilldownLevels=[]);u=d.options._levelNumber||0;(m=this.drilldownLevels[this.drilldownLevels.length-
1])&&m.levelNumber!==u&&(m=void 0);a=p(p({_ddSeriesId:G++},z),a);h=F(b,d.points);l(d.chart.series,function(a){a.xAxis!==c||a.isDrilling||(a.options._ddSeriesId=a.options._ddSeriesId||G++,a.options._colorIndex=a.userOptions._colorIndex,a.options._levelNumber=a.options._levelNumber||u,m?(g=m.levelSeries,k=m.levelSeriesOptions):(g.push(a),k.push(a.options)))});b=p({levelNumber:u,seriesOptions:d.options,levelSeriesOptions:k,levelSeries:g,shapeArgs:b.shapeArgs,bBox:b.graphic?b.graphic.getBBox():{},color:b.isNull?
(new f.Color(v)).setOpacity(0).get():v,lowerSeriesOptions:a,pointOptions:d.options.data[h],pointIndex:h,oldExtremes:{xMin:c&&c.userMin,xMax:c&&c.userMax,yMin:e&&e.userMin,yMax:e&&e.userMax}},z);this.drilldownLevels.push(b);a=b.lowerSeries=this.addSeries(a,!1);a.options._levelNumber=u+1;c&&(c.oldPos=c.pos,c.userMin=c.userMax=null,e.userMin=e.userMax=null);d.type===a.type&&(a.animate=a.animateDrilldown||B,a.options.animation=!0)};q.prototype.applyDrilldown=function(){var b=this.drilldownLevels,a;b&&
0<b.length&&(a=b[b.length-1].levelNumber,l(this.drilldownLevels,function(b){b.levelNumber===a&&l(b.levelSeries,function(c){c.options&&c.options._levelNumber===a&&c.remove(!1)})}));this.redraw();this.showDrillUpButton()};q.prototype.getDrilldownBackText=function(){var b=this.drilldownLevels;if(b&&0<b.length)return b=b[b.length-1],b.series=b.seriesOptions,H(this.options.lang.drillUpText,b)};q.prototype.showDrillUpButton=function(){var b=this,a=this.getDrilldownBackText(),d=b.options.drilldown.drillUpButton,
c,e;this.drillUpButton?this.drillUpButton.attr({text:a}).align():(e=(c=d.theme)&&c.states,this.drillUpButton=this.renderer.button(a,null,null,function(){b.drillUp()},c,e&&e.hover,e&&e.select).addClass("highcharts-drillup-button").attr({align:d.position.align,zIndex:7}).add().align(d.position,!1,d.relativeTo||"plotBox"))};q.prototype.drillUp=function(){for(var b=this,a=b.drilldownLevels,d=a[a.length-1].levelNumber,c=a.length,e=b.series,h,g,k,f,m=function(a){var c;l(e,function(b){b.options._ddSeriesId===
a._ddSeriesId&&(c=b)});c=c||b.addSeries(a,!1);c.type===k.type&&c.animateDrillupTo&&(c.animate=c.animateDrillupTo);a===g.seriesOptions&&(f=c)};c--;)if(g=a[c],g.levelNumber===d){a.pop();k=g.lowerSeries;if(!k.chart)for(h=e.length;h--;)if(e[h].options.id===g.lowerSeriesOptions.id&&e[h].options._levelNumber===d+1){k=e[h];break}k.xData=[];l(g.levelSeriesOptions,m);y(b,"drillup",{seriesOptions:g.seriesOptions});f.type===k.type&&(f.drilldownLevel=g,f.options.animation=b.options.drilldown.animation,k.animateDrillupFrom&&
k.chart&&k.animateDrillupFrom(g));f.options._levelNumber=d;k.remove(!1);f.xAxis&&(h=g.oldExtremes,f.xAxis.setExtremes(h.xMin,h.xMax,!1),f.yAxis.setExtremes(h.yMin,h.yMax,!1))}y(b,"drillupall");this.redraw();0===this.drilldownLevels.length?this.drillUpButton=this.drillUpButton.destroy():this.drillUpButton.attr({text:this.getDrilldownBackText()}).align();this.ddDupes.length=[]};r.prototype.supportsDrilldown=!0;r.prototype.animateDrillupTo=function(b){if(!b){var a=this,d=a.drilldownLevel;l(this.points,
function(a){a.graphic&&a.graphic.hide();a.dataLabel&&a.dataLabel.hide();a.connector&&a.connector.hide()});setTimeout(function(){a.points&&l(a.points,function(a,b){b=b===(d&&d.pointIndex)?"show":"fadeIn";var c="show"===b?!0:void 0;if(a.graphic)a.graphic[b](c);if(a.dataLabel)a.dataLabel[b](c);if(a.connector)a.connector[b](c)})},Math.max(this.chart.options.drilldown.animation.duration-50,0));this.animate=B}};r.prototype.animateDrilldown=function(b){var a=this,d=this.chart.drilldownLevels,c,e=this.chart.options.drilldown.animation,
h=this.xAxis;b||(l(d,function(b){a.options._ddSeriesId===b.lowerSeriesOptions._ddSeriesId&&(c=b.shapeArgs,c.fill=b.color)}),c.x+=C(h.oldPos,h.pos)-h.pos,l(this.points,function(b){b.shapeArgs.fill=b.color;b.graphic&&b.graphic.attr(c).animate(p(b.shapeArgs,{fill:b.color||a.color}),e);b.dataLabel&&b.dataLabel.fadeIn(e)}),this.animate=null)};r.prototype.animateDrillupFrom=function(b){var a=this.chart.options.drilldown.animation,d=this.group,c=this;l(c.trackerGroups,function(a){if(c[a])c[a].on("mouseover")});
delete this.group;l(this.points,function(c){var e=c.graphic,g=b.shapeArgs,k=function(){e.destroy();d&&(d=d.destroy())};e&&(delete c.graphic,g.fill=b.color,a?e.animate(g,f.merge(a,{complete:k})):(e.attr(g),k()))})};D&&p(D.prototype,{supportsDrilldown:!0,animateDrillupTo:r.prototype.animateDrillupTo,animateDrillupFrom:r.prototype.animateDrillupFrom,animateDrilldown:function(b){var a=this.chart.drilldownLevels[this.chart.drilldownLevels.length-1],d=this.chart.options.drilldown.animation,c=a.shapeArgs,
e=c.start,h=(c.end-e)/this.points.length;b||(l(this.points,function(b,k){var g=b.shapeArgs;c.fill=a.color;g.fill=b.color;if(b.graphic)b.graphic.attr(f.merge(c,{start:e+k*h,end:e+(k+1)*h}))[d?"animate":"attr"](g,d)}),this.animate=null)}});f.Point.prototype.doDrilldown=function(b,a,d){var c=this.series.chart,e=c.options.drilldown,f=(e.series||[]).length,g;c.ddDupes||(c.ddDupes=[]);for(;f--&&!g;)e.series[f].id===this.drilldown&&-1===F(this.drilldown,c.ddDupes)&&(g=e.series[f],c.ddDupes.push(this.drilldown));
y(c,"drilldown",{point:this,seriesOptions:g,category:a,originalEvent:d,points:void 0!==a&&this.series.xAxis.getDDPoints(a).slice(0)},function(a){var c=a.point.series&&a.point.series.chart,d=a.seriesOptions;c&&d&&(b?c.addSingleSeriesAsDrilldown(a.point,d):c.addSeriesAsDrilldown(a.point,d))})};f.Axis.prototype.drilldownCategory=function(b,a){var d,c,e=this.getDDPoints(b);for(d in e)(c=e[d])&&c.series&&c.series.visible&&c.doDrilldown&&c.doDrilldown(!0,b,a);this.chart.applyDrilldown()};f.Axis.prototype.getDDPoints=
function(b){var a=[];l(this.series,function(d){var c,e=d.xData,f=d.points;for(c=0;c<e.length;c++)if(e[c]===b&&d.options.data[c]&&d.options.data[c].drilldown){a.push(f?f[c]:!0);break}});return a};E.prototype.drillable=function(){var b=this.pos,a=this.label,d=this.axis,c="xAxis"===d.coll&&d.getDDPoints,e=c&&d.getDDPoints(b);c&&(a&&e.length?(a.drillable=!0,a.basicStyles||(a.basicStyles=f.merge(a.styles)),a.addClass("highcharts-drilldown-axis-label").css(d.chart.options.drilldown.activeAxisLabelStyle).on("click",
function(a){d.drilldownCategory(b,a)})):a&&a.drillable&&(a.styles={},a.css(a.basicStyles),a.on("click",null),a.removeClass("highcharts-drilldown-axis-label")))};x(E.prototype,"addLabel",function(b){b.call(this);this.drillable()});x(f.Point.prototype,"init",function(b,a,d,c){var e=b.call(this,a,d,c);c=(b=a.xAxis)&&b.ticks[c];e.drilldown&&f.addEvent(e,"click",function(b){a.xAxis&&!1===a.chart.options.drilldown.allowPointDrilldown?a.xAxis.drilldownCategory(e.x,b):e.doDrilldown(void 0,void 0,b)});c&&
c.drillable();return e});x(f.Series.prototype,"drawDataLabels",function(b){var a=this.chart.options.drilldown.activeDataLabelStyle,d=this.chart.renderer;b.call(this);l(this.points,function(b){var c={};b.drilldown&&b.dataLabel&&("contrast"===a.color&&(c.color=d.getContrast(b.color||this.color)),b.dataLabel.addClass("highcharts-drilldown-data-label"),b.dataLabel.css(a).css(c))},this)});var A,w=function(b){b.call(this);l(this.points,function(a){a.drilldown&&a.graphic&&(a.graphic.addClass("highcharts-drilldown-point"),
a.graphic.css({cursor:"pointer"}))})};for(A in t)t[A].prototype.supportsDrilldown&&x(t[A].prototype,"drawTracker",w)})(n)});;
return module.exports;
},
2: function (require, module, exports) {
!function(){var x,U=0,C="push pop shift unshift splice reverse sort".split(" "),V={},p={},K=["{{","}}"],r=Object.create({silent:!1},{placeholder:{get:function(){return K},set:function(a){g.iA(a)&&2===a.length&&(K=a,L())}}}),y={delay:!1,throttle:!1,simpleSelector:!1,promiseTransforms:!1,dispatchEvents:!1,sendArrayCopies:!1,updateEvenIfSame:!1,updateOnBind:!0},t=Object.defineProperty,D=Object.getOwnPropertyDescriptor,E=null,F=function(){if(!E){var a=E=document.createEvent("Event");a.initEvent("change",!0,!1),a._sb=!0}return E},W=!("className"in Element.prototype&&D(Element.prototype,"className").get),X="innerWidth innerHeight outerWidth outerHeight scrollX scrollY pageXOffset pageYOffset screenX screenY screenLeft screenTop".split(" "),Y=function(a,b){return this.uAS(b||this)},Z=function(){return""+ ++U},n=function(){return Object.create(null)},u=function(a,b){return function(c,d,e){return m(c,d,e,a,b)}},aa=function(a,b){return a.sU||(a.sU=new v(function(){return b?a.sV(a.fDV(),a,!0):a.uAS(a)},"Func",{}))},h=function(a,b){return a&&-1!==a.indexOf(b)},g={iD:function(a){return void 0!==a},iA:function(a){return a instanceof Array},iO:function(a){return"object"==typeof a&&a},iS:function(a){return"string"==typeof a},iN:function(a){return"number"==typeof a},iF:function(a){return"function"==typeof a},iBI:function(a){return a instanceof z},iB:function(a){return a instanceof v},isI:function(a){return g.iO(a)&&g.iN(a.length)},DM:function(a){return a.nodeName&&1===a.nodeType},dI:function(a){return"INPUT"===(a=a.nodeName)||"TEXTAREA"===a||"SELECT"===a},dR:function(a){return"radio"===a.type},dC:function(a){return"checkbox"===a.type},eC:function(a){return a instanceof NodeList||a instanceof HTMLCollection||window.jQuery&&a instanceof jQuery},eAS:function(a){var b=a[0].type;return[].filter.call(a,function(a){return a.type===b}).length===a.length},dN:function(a){return g.DM(a)||a===window||a===document}},M=function(a,b,c){var d;return(d=D(a,b))?(c&&(d.configurable=!0),d):(a=Object.getPrototypeOf(a))?M(a,b,!0):void 0},A=function(a,b,c){var d;if(a.OD||(a.OD=M(b,a.pr)),c)C.forEach(function(c){return t(b,c,{configurable:!0,value:function(){var d=Array.prototype[c].apply(b,arguments);return a.uAS(a),d}})});else if("Proxy"===a.type){var e=a.oR=a.value;if(a.value={result:null,args:null},g.iF(e)){var f=[].slice,k=d=function(){var c=f.call(arguments);return a.value.args=c=a.tfS?a.tfS(c):c,a.value.result=c=e.apply(b,c),a.uAS(a),c};t(b,a.pr,{configurable:a.isL=!0,get:function(){return k},set:function(b){g.iF(b)?b!==e&&(b!==d&&(e=a.oR=b),k!==d&&(k=d)):k=b}})}}else if(!(h(a.type,"DOM")||a.object===window&&h(X,a.pr))){c=a.OD||V,c.get&&(a.OG=c.get.bind(b)),c.set&&(a.OS=c.set.bind(b));var l=(l=c.configurable)&&b.constructor!==CSSStyleDeclaration;if(W&&a.DM&&a.pr in b.cloneNode(!1)&&(a.OD=l=!1,a.isL=!0,a.OG=function(){return a.object[a.pr]},a.OS=function(b){return a.object[a.pr]=b}),l){l="Array"===a.type;var q=!a.OS&&!l;t(b,a.pr,{configurable:a.isL=!0,enumerable:c.enumerable,get:a.OG||function(){return a.value},set:function(b){a.sV(b,a,q)}}),l&&A(a,b[a.pr],!0)}}},G=function(a,b,c){if(c){var d=[];for(a=0,c=C.length;a<c;a++){var e=C[a];d.push(delete b[e])}return d}return c=a.OD,c.set||c.get||(c.value=a.oR||a.value),t(b,a.pr,c)},ba=function(a){var b,c=n();for(b in a)c[b]=a[b];return c},H=function(a,b){var c,d=Object.keys(b),e=0;for(c=d.length;e<c;e++){var f=d[e];a[f]=b[f]}},N={get:function(a,b,c,d){return b?p[a._sb_ID]:d&&a[0]._sb_map&&(b=p[a[0]._sb_map[c]],b.gB)?b.gB:a._sb_map&&a._sb_map[c]?p[a._sb_map[c]]:void 0},set:function(a,b){if(b)t(a.object,"_sb_ID",{configurable:!0,value:a.ID});else{var c=a.se;if(a.object._sb_map)a.object._sb_map[c]=a.ID;else{var d={};d[c]=a.ID,t(a.object,"_sb_map",{configurable:!0,value:d})}}}},O=/[.*+?^${}()|[\]\\]/g,I=x=null,L=function(){var a=r.placeholder[0].replace(O,"\\$&"),b=r.placeholder[1].replace(O,"\\$&"),c="[^"+b+"]+";I=new RegExp(a+"("+c+")"+b,"g"),x=new RegExp(""+a+c+b,"g")};L();var ca=function(a,b,c){var d,e,f="",k=d=0;for(e=a.length;d<e;k=++d){f+=a[k],c[k]&&(f+=b[c[k]])}return f},P=function(a,b,c){null==a[c]&&(a[c]=[]),a[c].push(b)},Q=function(a,b){var c,d,e,f=Array.prototype.slice.call(a.childNodes),k=0;for(d=f.length;k<d;k++){var g=f[k];if(3!==g.nodeType)Q(g,b);else if(g.textContent.match(x)){var q=g.textContent.split(I);if(3===q.length&&""===q[0]+q[2])P(b,g,q[1]);else{var h=document.createDocumentFragment(),m=c=0;for(e=q.length;c<e;m=++c){var n=q[m],p=h.appendChild(document.createTextNode(n));m%2&&P(b,p,n)}g.parentNode.replaceChild(h,g)}}}},B=function(a){throw Error("SimplyBind: "+(R[a]||a))},w=function(a,b){if(!r.silent){var c=da(b),d=R[a];console.warn("SimplyBind: "+d+"\n\n"+c)}},ea=function(a){B("Invalid argument/s ("+a+")")},da=function(a){return(Error().stack||"").split("\n").slice(a+3).join("\n")},R={erIP:"SimplyBind() and .to() only accept a function, an array, a bound object, a string, or a number.",erFN:"Only functions are allowed for .transform/.condition/All()",erEV:"Invalid argument number in .ofEvent()",emptyList:"Empty collection provided",erOD:"You can only pass a single DOM element to a binding",erMX:"'checked' of Mixed list of element cannot be bound"},m=function(a,b,c,d,e){return(a||0===a)&&(g.iS(a)||g.iN(a)||g.iF(a)||a instanceof Array)||g.iBI(a)||B("erIP"),!g.iO(a)||a instanceof Array?(b=new z(b),b.so=c,b.IS=d,b.cC=e,a=g.iF(a)?b.sS(a,!0):b.sP(a)):a=e?e(a):a.sC(),a};m.version="1.15.6",m.settings=r,m.defaultOptions=y,m.unBindAll=function(a,b){var c;if(a&&(g.iO(a)||g.iF(a))){g.isI(a)&&!a._sb_ID&&a[0]&&g.DM(a[0])&&(a=a[0]);var d=a._sb_map;if(a._sb_ID&&p[a._sb_ID].rAS(b),d)for(c in d){var e=d[c];p[e].rAS(b)}}};var v=function(a,b,c){return H(this,c),this.oD=this.so?this.options:y,this.type=b,this.object=a,this.ID=Z(),this.subs=[],this.sM=n(),this.pM=n(),this.atEV=[],"Proxy"===this.type&&(this.sV=Y),this.mC&&(this.cH=n(),this.object.forEach(function(a){return function(b){var c=a.cH[b.value]=m("checked").of(b)._;c.aS(a),c.sM[a.ID].tF=function(){return c},c.gB=a}}(this))),"Event"===this.type||"Func"===this.type&&this.IS||("Pholder"===this.type?(b=this.de&&!h(this.de,"multi")?this.de+":"+this.pr:this.pr,a=this.pB=m(b).of(a)._,a.sPH(),this.value=a.pVL[this.Ph],a.txN&&(this.txN=a.txN[this.Ph])):(this.value=a=this.fDV(),"ObjectProp"!==this.type||g.iD(a)||D(this.object,this.pr)||(this.object[this.pr]=a),A(this,this.object))),this.aEV(),p[this.ID]=this};v.prototype={aS:function(a,b,c,d){var e;if(a.isMulti){var f=a.bindings;for(a=0,e=f.length;a<e;a++){var g=f[a];this.aS(g,b,c,d)}}else if(this.sM[a.ID])var l=!0;else a.pM[this.ID]=this,this.subs.unshift(a),e=this.sM[a.ID]=n(),e.uO=c,e.opts=ba(b),(d||"Event"===this.type||"Proxy"===this.type||"Array"===this.type)&&(e.opts.updateEvenIfSame=!0),e.VR="Func"===a.type?"ps":"value";return l},rS:function(a,b){var c;if(a.isMulti){var d=a.bindings,e=0;for(c=d.length;e<c;e++){var f=d[e];this.rS(f,b)}}else this.sM[a.ID]&&(this.subs.splice(this.subs.indexOf(a),1),delete this.sM[a.ID],delete a.pM[this.ID]),b&&(a.rS(this),delete this.pM[a.ID]);0===this.subs.length&&0===Object.keys(this.pM).length&&this.DES()},rAS:function(a){var b,c=this.subs.slice(),d=0;for(b=c.length;d<b;d++){var e=c[d];this.rS(e,a)}},DES:function(){var a;if(delete p[this.ID],this.rPI(),"Event"===this.type){var b=this.atEV,c=0;for(a=b.length;c<a;c++){var d=b[c];this.urEVE(d)}}else"Func"===this.type&&delete this.object._sb_ID;this.isL&&this.OD&&G(this,this.object),"Array"===this.type&&G(this,this.value,!0),this.object._sb_map&&(delete this.object._sb_map[this.se],0===Object.keys(this.object._sb_map).length&&delete this.object._sb_map)},fDV:function(){var a,b=this.type;switch(!1){case"Func"!==b:return this.object();case"DOMAttr"!==b:return this.object.getAttribute(this.pr)||"";case!this.mC:var c=[],d=this.cH;for(a in d){if(d[a].object.checked){if("DOMRadio"===b)return a;c.push(a)}}return c;default:return this.object[this.pr]}},sV:function(a,b,c,d){if(b||(b=this),this.tfS&&(a=this.tfS(a)),!c)switch(this.type){case"ObjectProp":if(this.isL)if(this.dI)if(d){if(a!==this.OG()){var e=this.object.selectionStart;this.OS(a),e&&this.object.setSelectionRange(e,e)}}else this.OS(a),r.dispatchEvents&&this.object.dispatchEvent(F());else this.OS&&this.OS(a);else a!==this.value&&(this.object[this.pr]=a);break;case"Pholder":if(d=this.pB,d.pVL[this.Ph]=a,e=ca(d.pCT,d.pVL,d.pIM),this.txN&&a!==this.value){var f=this.txN,k=0;for(c=f.length;k<c;k++){var l=f[k];l.textContent=a}}"textContent"!==this.pr&&d.sV(e,b);break;case"Array":a!==this.value&&(g.iA(a)||(a=Array.prototype.concat(a)),G(this,this.value,!0),A(this,a=a.slice(),!0),this.OS&&this.OS(a));break;case"Func":e=this.ps,this.ps=a,a=this.object(a,e);break;case"Event":this.iE=!0,this.eE(a),this.iE=!1;break;case"DOMRadio":if(this.mC)if(d=g.iB(a)?a:this.cH[a])for(k in a=d.object.value,e=this.cH)c=e[k],c.sV(c.ID===d.ID,b);else a=this.value;else{if((a=!!a)===this.value)return;this.object.checked!==a&&(this.object.checked=a),a&&r.dispatchEvents&&this.object.dispatchEvent(F())}break;case"DOMCheckbox":if(this.mC){for(k=!g.iB(a),a=[].concat(a),c=d=0,f=a.length;d<f;c=++d)l=a[c],a[c]=g.iB(l)?l:this.cH[l];f=[],l=this.cH;for(e in l)c=l[e],d=k?h(a,c):c.value,c.sV(d,b),d&&f.push(e);a=f}else{if((a=!!a)===this.value)return;this.object.checked!==a&&(this.object.checked=a,r.dispatchEvents&&this.object.dispatchEvent(F()))}break;case"DOMAttr":this.object.setAttribute(this.pr,a)}this.value=a,this.uAS(b)},uAS:function(a){var b,c;if(c=(b=this.subs).length)for(;c--;)this.uS(b[c],a)},uS:function(a,b,c){var d;if(!(b===a||b!==this&&b.sM[a.ID])){var e=this.sM[a.ID];if(!e.dL||!e.dL[b.ID]){if(e.opts.throttle){c=+new Date;var f=c-e.lU;if(f<e.opts.throttle)return clearTimeout(e.uT),e.uT=setTimeout(function(c){return function(){if(c.sM[a.ID])return c.uS(a,b)}}(this),e.opts.throttle-f);e.lU=c}else if(e.opts.delay&&!c)return setTimeout(function(c){return function(){if(c.sM[a.ID])return c.uS(a,b,!0)}}(this),e.opts.delay);c="Array"===this.type&&e.opts.sendArrayCopies?this.value.slice():this.value,f=a[e.VR],c=(d=e.tF)?d(c,f,a.object):c,c===f&&!e.opts.updateEvenIfSame||e.cN&&!e.cN(c,f,a.object)||(e.opts.promiseTransforms&&c&&g.iF(c.then)?c.then(function(c){a.sV(c,b)}):a.sV(c,b),e.uO&&this.rS(a))}}},aM:function(a,b,c,d){var e,f;if(g.iF(c)){var k=0;for(f=b.length;k<f;k++){var l=b[k],h=l._||l;h.isMulti?this.aM(a,h.bindings,c,d):(l=this.sM[h.ID],l[a]=c,d=d&&!l.uO,this.pM[h.ID]&&((e=h.sM[this.ID])[a]||(e[a]=c)),!d&&"Func"!==this.type||"tF"!==a||this.uS(h,this))}return!0}return w("erFN",2)},ss:function(a,b){this.tfS=a,b&&this.sV(this.value)},aD:function(a,b){var c;(null!=(c=this.sM[a.ID]).dL?c.dL:c.dL=n())[b.ID]=1},sPH:function(){if(!this.pVL){if(this.pVL=n(),this.pIM=n(),this.pCT=[],g.iS(this.value)){this.pCT=this.value.split(x);var a=0;this.value=this.value.replace(I,function(b){return function(c,d){return b.pIM[a++]=d,b.pVL[d]=d}}(this))}this.DM&&"textContent"===this.pr&&Q(this.object,this.txN=n())}},aPI:function(a){if("Event"!==this.type)return this.rPI(),this.PI=setInterval(function(a){return function(){var b=a.fDV();return a.sV(b)}}(this),a)},rPI:function(){return clearInterval(this.PI),this.PI=null},aUV:function(a,b){this.object.addEventListener(a,function(a){return function(c){c._sb||(c=a.tfS&&a.dI,a.sV(a.object[b],null,!c,!0))}}(this),!1)},aEV:function(){this.evN?this.rEVE(this.evN):this.dI?(this.aUV("input","value"),this.aUV("change","value")):this.mC||"DOMRadio"!==this.type&&"DOMCheckbox"!==this.type||this.aUV("change","checked")},rEVE:function(a){this.atEV.push(a),this.evH||(this.evH=fa.bind(this)),this.object[this.eM.listen](a,this.evH)},urEVE:function(a){this.atEV.splice(this.atEV.indexOf(a),1),this.object[this.eM.remove](a,this.evH)},eE:function(a){var b=this.evN;"dispatchEvent"===this.eM.emit&&(this.evO||(this.evO=document.createEvent("Event"),this.evO.initEvent(this.evN,!0,!0)),this.evO.bindingData=a,b=this.evO),this.object[this.eM.emit](b,a)}};var fa=function(){this.iE||this.sV(arguments[this.pr],null,!0)},z=function(a,b){var c;if(b)H(this,b),this.sG=1;else for(c in this.sG=0,this.subs=[],this.oP=a||(a={}),this.options={},y)this.options[c]=null!=a[c]?a[c]:y[c];return this},S={sC:function(){return new z(null,this)},dM:function(a){return this._=a,Object.defineProperties(this,{value:{get:function(){return a.value}},original:{get:function(){return a.objects||a.object}},subscribers:{get:function(){return a.subs.slice().map(function(a){return a.object})}}})},createBP:function(a,b,c,d){var e;return this.object=a,(e=N.get(a,d,this.se,this.mC))?this.patchCachedBP(e):(a=new v(a,b,c),N.set(a,d),a)},patchCachedBP:function(a){var b;if("ObjectProp"!==a.type||this.pr in this.object||A(a,this.object),this.so){var c=this.oP;for(e in c){var d=c[e];a.oD[e]=d}}var e=a.oD;for(b in e)d=e[b],this.options[b]=g.iD(this.oP[b])?this.oP[b]:d;return a},sP:function(a){if(g.iN(a)&&(a=a.toString()),this.se=this.pr=a,!this.options.simpleSelector){if(h(a,":")){var b=a.split(":");this.de=b.slice(0,-1).join(":"),this.pr=b[b.length-1]}h(a,".")&&(b=this.pr.split("."),this.pr=b[0],this.Ph=b.slice(1).join(".")),h(this.de,"event")&&(h(a,"#")?(b=this.pr.split("#"),this.evN=b[0],this.pr=b[1]):(this.evN=this.pr,this.pr=0),isNaN(parseInt(this.pr))&&w("erEV",1))}return this},sS:function(a,b){var c;this.sG=1;var d=(c=a!==window&&g.isI(a)&&!a.nodeType)?a[0]:a;if(d){if(this.DM=g.DM(d)){if("checked"===this.pr)var e=d&&g.dR(d),f=!e&&d&&g.dC(d);else"value"===this.pr&&(this.dI=g.dI(d));if(c&&!h(this.de,"multi"))if(1===a.length)a=a[0];else{if((e||f)&&!g.eAS(a))return w("erMX",3);e||f?(this.mC=!0,a=[].slice.call(a)):(a=a[0],w("erOD",3))}}}else c&&g.eC(a)&&B("emptyList");switch(!1){case!b:f="Func";break;case!this.Ph:f="Pholder";break;case!(h(this.de,"array")&&g.iA(a[this.pr])):f="Array";break;case!h(this.de,"event"):f="Event",this.eM={listen:this.oP.listenMethod,remove:this.oP.removeMethod,emit:this.oP.emitMethod},a[this.eM.listen]||(this.eM.listen=g.dN(a)?"addEventListener":"on"),a[this.eM.remove]||(this.eM.remove=g.dN(a)?"removeEventListener":"removeListener"),a[this.eM.emit]||(this.eM.emit=g.dN(a)?"dispatchEvent":"emit");break;case!h(this.de,"func"):f="Proxy";break;case!e:f="DOMRadio";break;case!f:f="DOMCheckbox";break;case!h(this.de,"attr"):f="DOMAttr";break;default:f="ObjectProp"}return h(this.de,"multi")?(a.length||B("emptyList"),this.dM(new J(this,a,f))):this.dM(this.createBP(a,f,this,b)),h(this._.type,"Event")||h(this._.type,"Proxy")?this.options.updateOnBind=!1:h(this._.type,"Func")&&(this.options.updateOnBind=!0),this.cC?this.cC(this):this},aP:function(a){var b;a.sG=2,a.subs.push(this);var c=a._.aS(this._,a.options,a.uO);if(a.uO)delete a.uO;else if(a.options.updateOnBind&&!c)if(this._.isMulti){var d=this._.bindings,e=0;for(b=d.length;e<b;e++)c=d[e],a._.uS(c,a._)}else a._.uS(this._,a._)}};z.prototype=Object.create(S,{of:{get:function(){if(!this.sG)return ga}},set:{get:function(){if(this.sG)return ha}},chainTo:{get:function(){if(2===this.sG)return ia}},transformSelf:{get:function(){if(1===this.sG)return ja}},transform:{get:function(){if(2===this.sG)return ka}},transformAll:{get:function(){if(2===this.sG)return la}},condition:{get:function(){if(2===this.sG)return ma}},conditionAll:{get:function(){if(2===this.sG)return na}},bothWays:{get:function(){if(2===this.sG)return oa}},unBind:{get:function(){if(2===this.sG)return pa}},pollEvery:{get:function(){if(this.sG)return qa}},stopPolling:{get:function(){if(this.sG)return ra}},setOption:{get:function(){if(2===this.sG)return sa}},disallowFrom:{get:function(){var a;if(2===this.sG&&(a=this))return u(!1,function(b){return a._.aD(a.subs[a.subs.length-1]._,b._),a})}},updateOn:{get:function(){var a;if(this.sG&&(a=this))return u(!1,function(b){return b._!==a._&&(a._.pM[b._.ID]=b._,b._.aS(aa(a._,!0),b.options,!1,!0)),a})}},removeUpdater:{get:function(){var a,b;if(this.sG&&(b=this)&&(a=this._.sU))return u(!1,function(c){c._.sM[a.ID]&&(delete b._.pM[c._.ID],c._.rS(a))})}},to:{get:function(){var a;if(1===this.sG&&(a=this))return u(!0,function(b){return b._!==a._&&b.aP(a),a})}},and:{get:function(){var a=this.sC();if(2===this.sG)return a;if(1===this.sG){if(!a._.isMulti){var b=a._;a._=a._=new J(a),a._.addBP(b)}return u(!1,function(b){return a._.addBP(b._),a})}}},once:{get:function(){if(1===this.sG){var a=this.sC();return a.uO=!0,a}}},update:{get:function(){return this.set}},twoWay:{get:function(){return this.bothWays}},pipe:{get:function(){return this.chainTo}}});var ga=function(a){return g.iO(a)||g.iF(a)||ea(a),g.iBI(a)&&(a=a.object),this.sG=1,this.sS(a)},ia=function(a,b,c){return m(this.subs[this.subs.length-1]).to(a,b,c)},ha=function(a){return this._.sV(a),this},ja=function(a){return g.iF(a)?this._.ss(a,this.options.updateOnBind):w("erFN",1),this},ka=function(a){return this._.aM("tF",this.subs.slice(-1),a,this.options.updateOnBind),this},la=function(a){return this._.aM("tF",this.subs,a,this.options.updateOnBind),this},ma=function(a){return this._.aM("cN",this.subs.slice(-1),a),this},na=function(a){return this._.aM("cN",this.subs,a),this},oa=function(a){var b,c=this.subs[this.subs.length-1],d=c._,e=this._.isMulti?this._.bindings:[this._];for(d.aS(this._,c.options),c=0,b=e.length;c<b;c++){var f=e[c],k=f.sM[d.ID].tF;f=f.sM[d.ID].cN,(k||a)&&(k=g.iF(a)?a:k)&&!1!==a&&(d.sM[this._.ID].tF=k),f&&(d.sM[this._.ID].cN=f)}return this},pa=function(a){var b,c=this.subs,d=0;for(b=c.length;d<b;d++){var e=c[d];this._.rS(e._,a)}return this},qa=function(a){return this._.aPI(a),this},ra=function(){return this._.rPI(),this},sa=function(a,b){return this._.sM[this.subs[this.subs.length-1]._.ID].opts[a]=b,this},J=function(a,b,c){var d,e;if(a.se=a.se.slice(6),H(this,this.In=a),this.isMulti=!0,this.bindings=d=[],b)for(a=0,e=b.length;a<e;a++){var f=b[a];this.addBP(f,c)}return Object.defineProperties(this,{type:{get:function(){return d.map(function(a){return a.type})}},value:{get:function(){return d.map(function(a){return a.value})}}})},T=J.prototype=Object.create(S);Object.keys(v.prototype).forEach(function(a){return T[a]=function(b,c,d,e){var f,g=this.bindings,h=0;for(f=g.length;h<f;h++){var m=g[h];"uS"===a&&(c=m),m[a](b,c,d,e)}}}),T.addBP=function(a,b){this.bindings.push(b?this.createBP(a,b,this.In):a)},null!=("undefined"!=typeof module&&null!==module?module.exports:void 0)?module.exports=m:"function"==typeof define&&define.amd?define(["simplybind"],function(){return m}):this.SimplyBind=m}();
;
return module.exports;
},
0: function (require, module, exports) {
var Highcharts, HighchartsDrilldown, Promise, PromiseB, SimplyBind, UAParser;

Promise = PromiseB = require(1);

SimplyBind = require(2);

Highcharts = require(3);

HighchartsDrilldown = require(4);

UAParser = require(5);

(function($) {
  var chartsContainer$, defaultOptions, genChartSettings, genIndex, markup;
  var combineAllBrowserData, convertValuesToPoints, createChartDataForTest, createDrilldown, extendDefaultOptions, parseName, parseValue, parseVersion, sortByVersionString, sortChartData, sortTests, sortVersions;

extendDefaultOptions = function(options) {
  var k;
  options = $.extend({}, defaultOptions, options);
  options.itemsMap.length = ((function() {
    var results;
    results = [];
    for (k in options.itemsMap) {
      results.push(1);
    }
    return results;
  })()).length;
  return options;
};

parseValue = function(value) {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/,/g, ''));
  } else {
    return value;
  }
};

convertValuesToPoints = function(chartData) {
  var maxValue;
  maxValue = Math.max.apply(null, chartData.map(function(plot) {
    return plot.y;
  }));
  chartData.forEach(function(plot) {
    var realValue;
    realValue = plot.y;
    return plot.y = (plot.y / maxValue) * 100;
  });
  return chartData;
};

sortTests = function(tests, chartsOrderMap) {
  var output;
  output = {};
  Object.keys(tests).map(function(name) {
    tests[name].name = name;
    return tests[name];
  }).sort(function(a, b) {
    var aIndex, bIndex;
    aIndex = chartsOrderMap.indexOf(a.name);
    if (aIndex === -1) {
      aIndex = 100;
    }
    bIndex = chartsOrderMap.indexOf(b.name);
    if (bIndex === -1) {
      bIndex = 100;
    }
    switch (false) {
      case !(aIndex > bIndex):
        return 1;
      case !(aIndex < bIndex):
        return -1;
      default:
        return 0;
    }
  }).forEach(function(test) {
    output[test.name] = test;
    return delete test.name;
  });
  return output;
};

sortVersions = function(versions) {
  var output;
  output = {};
  Object.keys(versions).sort(sortByVersionString).forEach(function(versionNumber) {
    return output[versionNumber] = versions[versionNumber];
  });
  return output;
};

sortByVersionString = function(a, b) {
  switch (false) {
    case !(parseVersion(a, 'major') > parseVersion(b, 'major')):
      return 1;
    case !(parseVersion(a, 'major') < parseVersion(b, 'major')):
      return -1;
    default:
      switch (false) {
        case !(parseVersion(a, 'minor') > parseVersion(b, 'minor')):
          return 1;
        case !(parseVersion(a, 'minor') < parseVersion(b, 'minor')):
          return -1;
        default:
          switch (false) {
            case !(parseVersion(a, 'patch') > parseVersion(b, 'patch')):
              return 1;
            case !(parseVersion(a, 'patch') < parseVersion(b, 'patch')):
              return -1;
            case !(/\w/.test(a) || /\w/.test(b)):
              switch (false) {
                case !(parseVersion(a, 'patch-word') > parseVersion(b, 'patch-word')):
                  return 1;
                case !(parseVersion(a, 'patch-word') < parseVersion(b, 'patch-word')):
                  return -1;
                default:
                  return 0;
              }
              break;
            default:
              return 0;
          }
      }
  }
};

parseVersion = function(versionString, level) {
  var versionBreakdown;
  versionBreakdown = versionString.split('.');
  switch (level) {
    case 'major':
      return parseFloat(versionBreakdown[0]) || 0;
    case 'minor':
      return parseFloat(versionBreakdown[1]) || 0;
    case 'patch':
      return parseFloat(versionBreakdown[2]) || 0;
    case 'patch-word':
      return versionBreakdown[2].split(/^\d+/)[1];
  }
};

parseName = function(libraryObject) {
  return libraryObject.name.replace(libraryObject.name + ' ', '');
};

sortChartData = function(chartData, itemsMap) {
  var sorted;
  sorted = chartData.slice();
  sorted.sort(function(a, b) {
    if (a.library === b.library) {
      return sortByVersionString(parseName(a), parseName(b));
    } else {
      switch (false) {
        case !(itemsMap[a.library].index > itemsMap[b.library].index):
          return 1;
        case !(itemsMap[a.library].index < itemsMap[b.library].index):
          return -1;
        default:
          return 0;
      }
    }
  });
  sorted.forEach(function(point, index) {
    return point.x = index;
  });
  return sorted;
};

createDrilldown = function(test) {
  var browser, existingItem, item, libraries, library, name, output, ref, value, version, versions;
  output = [];
  ref = test.values;
  for (browser in ref) {
    libraries = ref[browser];
    for (library in libraries) {
      versions = libraries[library];
      for (version in versions) {
        value = versions[version];
        name = library + " " + version;
        existingItem = output.find(function(item) {
          return item.id === name;
        });
        item = existingItem ? existingItem : {
          id: name,
          data: []
        };
        item.data.push([browser, parseValue(value)]);
        if (!existingItem) {
          output.push(item);
        }
      }
    }
  }
  return output;
};

combineAllBrowserData = function(testValues, currentBrowser) {
  var base, browser, data, libraries, library, output, value, version, versions;
  output = {};
  for (browser in testValues) {
    libraries = testValues[browser];
    for (library in libraries) {
      versions = libraries[library];
      if (!testValues[currentBrowser][library]) {
        continue;
      }
      if (output[library] == null) {
        output[library] = {};
      }
      for (version in versions) {
        value = versions[version];
        if (!testValues[currentBrowser][library][version]) {
          continue;
        }
        if ((base = output[library])[version] == null) {
          base[version] = {
            value: 0,
            count: 0
          };
        }
        output[library][version].value += parseValue(value);
        output[library][version].count += 1;
      }
    }
  }
  for (library in output) {
    versions = output[library];
    for (version in versions) {
      data = versions[version];
      output[library][version] = data.value / data.count;
    }
  }
  return output;
};

createChartDataForTest = function(testName, test, options, currentBrowser) {
  var chartData, color, index, lastIndex, library, name, ref, testValues, value, version, versions;
  chartData = [];
  testValues = options.browserData === 'current' ? test.values[currentBrowser] : combineAllBrowserData(test.values, currentBrowser);
  lastIndex = 0;
  for (library in testValues) {
    versions = testValues[library];
    ref = sortVersions(versions);
    for (version in ref) {
      value = ref[version];
      if (ignoreList.includes(library + "@" + version)) {
        continue;
      }
      value = parseValue(value);
      name = library + ' ' + version;
      if (options.itemsMap[library]) {
        lastIndex++;
        color = options.itemsMap[library].color;
      } else {
        index = ++lastIndex;
        color = options.colors[index] || options.colors[index % options.colors.length];
        options.itemsMap[library] = {
          index: index,
          color: color
        };
      }
      chartData.push({
        'x': null,
        'y': value,
        'drilldown': name,
        color: color,
        name: name,
        library: library
      });
    }
  }
  chartData = sortChartData(chartData, options.itemsMap);
  if (options.valueType === 'points') {
    chartData = convertValuesToPoints(chartData);
  }
  chartData.drilldown = options.browserData === 'current' ? void 0 : createDrilldown(test);
  chartData.nonSharedTest = test.nonSharedTest;
  return chartData;
};

;
  markup = require(7);
  defaultOptions = require(8);
  genIndex = require(9);
  genChartSettings = require(10);
  chartsContainer$ = $('.BenchmarksDashboard-charts');
  return window.indexCharts = function(options) {
    if (options == null) {
      options = {};
    }
    options = extendDefaultOptions(options);
    return $.get('/get', {
      UA: navigator.userAgent
    }, function(response) {
      window.serverResponse = response;
      var fn, i, len, passedInitalLoad, ref, settingEl, settingsBar$, settingsBarWrapper$;

settingsBarWrapper$ = $('.BenchmarksDashboard-settingsBar');

settingsBar$ = $('#settingsBar');

passedInitalLoad = false;

ref = settingsBar$.children();
fn = function(settingEl) {
  var j, len1, ref1, results, settingOption;
  SimplyBind(settingEl.id).of(options).to('value').of(settingEl).bothWays().chainTo(function() {
    var currentScrollPos;
    if (passedInitalLoad) {
      currentScrollPos = window.scrollY;
      genIndex(options);
      return window.scrollTo(window.scrollX, currentScrollPos);
    }
  });
  ref1 = settingEl.children[1].children;
  results = [];
  for (j = 0, len1 = ref1.length; j < len1; j++) {
    settingOption = ref1[j];
    results.push((function(settingOption) {
      SimplyBind('value').of(settingEl).to('className.state').of(settingOption).transform(function(value) {
        if (value === settingOption.dataset.name) {
          return 'active';
        } else {
          return '';
        }
      });
      return SimplyBind('event:click').of(settingOption).to('value').of(settingEl).transform(function(event) {
        return event.currentTarget.dataset.name;
      });
    })(settingOption));
  }
  return results;
};
for (i = 0, len = ref.length; i < len; i++) {
  settingEl = ref[i];
  fn(settingEl);
}

setTimeout(function() {
  SimplyBind(function() {
    return chartsContainer$.css('padding-bottom', (settingsBarWrapper$.height()) + "px");
  }).updateOn('event:resize').of(window);
  return passedInitalLoad = true;
}, 300);

;
      return genIndex(options);
    });
  };
})(jQuery);

;
return module.exports;
},
5: function (require, module, exports) {
/**
 * UAParser.js v0.7.13
 * Lightweight JavaScript-based User-Agent string parser
 * https://github.com/faisalman/ua-parser-js
 *
 * Copyright © 2012-2016 Faisal Salman <fyzlman@gmail.com>
 * Dual licensed under GPLv2 & MIT
 */

(function (window, undefined) {

    'use strict';

    //////////////
    // Constants
    /////////////


    var LIBVERSION  = '0.7.13',
        EMPTY       = '',
        UNKNOWN     = '?',
        FUNC_TYPE   = 'function',
        UNDEF_TYPE  = 'undefined',
        OBJ_TYPE    = 'object',
        STR_TYPE    = 'string',
        MAJOR       = 'major', // deprecated
        MODEL       = 'model',
        NAME        = 'name',
        TYPE        = 'type',
        VENDOR      = 'vendor',
        VERSION     = 'version',
        ARCHITECTURE= 'architecture',
        CONSOLE     = 'console',
        MOBILE      = 'mobile',
        TABLET      = 'tablet',
        SMARTTV     = 'smarttv',
        WEARABLE    = 'wearable',
        EMBEDDED    = 'embedded';


    ///////////
    // Helper
    //////////


    var util = {
        extend : function (regexes, extensions) {
            var margedRegexes = {};
            for (var i in regexes) {
                if (extensions[i] && extensions[i].length % 2 === 0) {
                    margedRegexes[i] = extensions[i].concat(regexes[i]);
                } else {
                    margedRegexes[i] = regexes[i];
                }
            }
            return margedRegexes;
        },
        has : function (str1, str2) {
          if (typeof str1 === "string") {
            return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
          } else {
            return false;
          }
        },
        lowerize : function (str) {
            return str.toLowerCase();
        },
        major : function (version) {
            return typeof(version) === STR_TYPE ? version.replace(/[^\d\.]/g,'').split(".")[0] : undefined;
        },
        trim : function (str) {
          return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
    };


    ///////////////
    // Map helper
    //////////////


    var mapper = {

        rgx : function (ua, arrays) {

            //var result = {},
            var i = 0, j, k, p, q, matches, match;//, args = arguments;

            /*// construct object barebones
            for (p = 0; p < args[1].length; p++) {
                q = args[1][p];
                result[typeof q === OBJ_TYPE ? q[0] : q] = undefined;
            }*/

            // loop through all regexes maps
            while (i < arrays.length && !matches) {

                var regex = arrays[i],       // even sequence (0,2,4,..)
                    props = arrays[i + 1];   // odd sequence (1,3,5,..)
                j = k = 0;

                // try matching uastring with regexes
                while (j < regex.length && !matches) {

                    matches = regex[j++].exec(ua);

                    if (!!matches) {
                        for (p = 0; p < props.length; p++) {
                            match = matches[++k];
                            q = props[p];
                            // check if given property is actually array
                            if (typeof q === OBJ_TYPE && q.length > 0) {
                                if (q.length == 2) {
                                    if (typeof q[1] == FUNC_TYPE) {
                                        // assign modified match
                                        this[q[0]] = q[1].call(this, match);
                                    } else {
                                        // assign given value, ignore regex match
                                        this[q[0]] = q[1];
                                    }
                                } else if (q.length == 3) {
                                    // check whether function or regex
                                    if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                                        // call function (usually string mapper)
                                        this[q[0]] = match ? q[1].call(this, match, q[2]) : undefined;
                                    } else {
                                        // sanitize match using given regex
                                        this[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
                                    }
                                } else if (q.length == 4) {
                                        this[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined;
                                }
                            } else {
                                this[q] = match ? match : undefined;
                            }
                        }
                    }
                }
                i += 2;
            }
            //console.log(this);
            //return this;
        },

        str : function (str, map) {

            for (var i in map) {
                // check if array
                if (typeof map[i] === OBJ_TYPE && map[i].length > 0) {
                    for (var j = 0; j < map[i].length; j++) {
                        if (util.has(map[i][j], str)) {
                            return (i === UNKNOWN) ? undefined : i;
                        }
                    }
                } else if (util.has(map[i], str)) {
                    return (i === UNKNOWN) ? undefined : i;
                }
            }
            return str;
        }
    };


    ///////////////
    // String map
    //////////////


    var maps = {

        browser : {
            oldsafari : {
                version : {
                    '1.0'   : '/8',
                    '1.2'   : '/1',
                    '1.3'   : '/3',
                    '2.0'   : '/412',
                    '2.0.2' : '/416',
                    '2.0.3' : '/417',
                    '2.0.4' : '/419',
                    '?'     : '/'
                }
            }
        },

        device : {
            amazon : {
                model : {
                    'Fire Phone' : ['SD', 'KF']
                }
            },
            sprint : {
                model : {
                    'Evo Shift 4G' : '7373KT'
                },
                vendor : {
                    'HTC'       : 'APA',
                    'Sprint'    : 'Sprint'
                }
            }
        },

        os : {
            windows : {
                version : {
                    'ME'        : '4.90',
                    'NT 3.11'   : 'NT3.51',
                    'NT 4.0'    : 'NT4.0',
                    '2000'      : 'NT 5.0',
                    'XP'        : ['NT 5.1', 'NT 5.2'],
                    'Vista'     : 'NT 6.0',
                    '7'         : 'NT 6.1',
                    '8'         : 'NT 6.2',
                    '8.1'       : 'NT 6.3',
                    '10'        : ['NT 6.4', 'NT 10.0'],
                    'RT'        : 'ARM'
                }
            }
        }
    };


    //////////////
    // Regex map
    /////////////


    var regexes = {

        browser : [[

            // Presto based
            /(opera\smini)\/([\w\.-]+)/i,                                       // Opera Mini
            /(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,                      // Opera Mobi/Tablet
            /(opera).+version\/([\w\.]+)/i,                                     // Opera > 9.80
            /(opera)[\/\s]+([\w\.]+)/i                                          // Opera < 9.80
            ], [NAME, VERSION], [

            /(opios)[\/\s]+([\w\.]+)/i                                          // Opera mini on iphone >= 8.0
            ], [[NAME, 'Opera Mini'], VERSION], [

            /\s(opr)\/([\w\.]+)/i                                               // Opera Webkit
            ], [[NAME, 'Opera'], VERSION], [

            // Mixed
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]+)*/i,
                                                                                // Lunascape/Maxthon/Netfront/Jasmine/Blazer

            // Trident based
            /(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,
                                                                                // Avant/IEMobile/SlimBrowser/Baidu
            /(?:ms|\()(ie)\s([\w\.]+)/i,                                        // Internet Explorer

            // Webkit/KHTML based
            /(rekonq)\/([\w\.]+)*/i,                                            // Rekonq
            /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser)\/([\w\.-]+)/i
                                                                                // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser
            ], [NAME, VERSION], [

            /(trident).+rv[:\s]([\w\.]+).+like\sgecko/i                         // IE11
            ], [[NAME, 'IE'], VERSION], [

            /(edge)\/((\d+)?[\w\.]+)/i                                          // Microsoft Edge
            ], [NAME, VERSION], [

            /(yabrowser)\/([\w\.]+)/i                                           // Yandex
            ], [[NAME, 'Yandex'], VERSION], [

            /(puffin)\/([\w\.]+)/i                                              // Puffin
            ], [[NAME, 'Puffin'], VERSION], [

            /(uc\s?browser)[\/\s]?([\w\.]+)/i,
            /ucweb.+(ucbrowser)[\/\s]?([\w\.]+)/i,
            /juc.+(ucweb)[\/\s]?([\w\.]+)/i,
            /(ucbrowser)\/([\w\.]+)/i
                                                                                // UCBrowser
            ], [[NAME, 'UCBrowser'], VERSION], [

            /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
            ], [[NAME, /_/g, ' '], VERSION], [

            /(micromessenger)\/([\w\.]+)/i                                      // WeChat
            ], [[NAME, 'WeChat'], VERSION], [

            /m?(qqbrowser)[\/\s]?([\w\.]+)/i                                    // QQBrowser
            ], [NAME, VERSION], [

            /xiaomi\/miuibrowser\/([\w\.]+)/i                                   // MIUI Browser
            ], [VERSION, [NAME, 'MIUI Browser']], [

            /;fbav\/([\w\.]+);/i                                                // Facebook App for iOS & Android
            ], [VERSION, [NAME, 'Facebook']], [

            /(headlesschrome) ([\w\.]+)/i                                       // Chrome Headless
            ], [VERSION, [NAME, 'Chrome Headless']], [

            /\swv\).+(chrome)\/([\w\.]+)/i                                      // Chrome WebView
            ], [[NAME, /(.+)/, '$1 WebView'], VERSION], [

            /android.+samsungbrowser\/([\w\.]+)/i,
            /android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)*/i        // Android Browser
            ], [VERSION, [NAME, 'Android Browser']], [

            /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i
                                                                                // Chrome/OmniWeb/Arora/Tizen/Nokia
            ], [NAME, VERSION], [

            /(dolfin)\/([\w\.]+)/i                                              // Dolphin
            ], [[NAME, 'Dolphin'], VERSION], [

            /((?:android.+)crmo|crios)\/([\w\.]+)/i                             // Chrome for Android/iOS
            ], [[NAME, 'Chrome'], VERSION], [

            /(coast)\/([\w\.]+)/i                                               // Opera Coast
            ], [[NAME, 'Opera Coast'], VERSION], [

            /fxios\/([\w\.-]+)/i                                                // Firefox for iOS
            ], [VERSION, [NAME, 'Firefox']], [

            /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i                       // Mobile Safari
            ], [VERSION, [NAME, 'Mobile Safari']], [

            /version\/([\w\.]+).+?(mobile\s?safari|safari)/i                    // Safari & Safari Mobile
            ], [VERSION, NAME], [

            /webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i                     // Safari < 3.0
            ], [NAME, [VERSION, mapper.str, maps.browser.oldsafari.version]], [

            /(konqueror)\/([\w\.]+)/i,                                          // Konqueror
            /(webkit|khtml)\/([\w\.]+)/i
            ], [NAME, VERSION], [

            // Gecko based
            /(navigator|netscape)\/([\w\.-]+)/i                                 // Netscape
            ], [[NAME, 'Netscape'], VERSION], [
            /(swiftfox)/i,                                                      // Swiftfox
            /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,
                                                                                // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
            /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/([\w\.-]+)/i,
                                                                                // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
            /(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,                          // Mozilla

            // Other
            /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir)[\/\s]?([\w\.]+)/i,
                                                                                // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Sleipnir
            /(links)\s\(([\w\.]+)/i,                                            // Links
            /(gobrowser)\/?([\w\.]+)*/i,                                        // GoBrowser
            /(ice\s?browser)\/v?([\w\._]+)/i,                                   // ICE Browser
            /(mosaic)[\/\s]([\w\.]+)/i                                          // Mosaic
            ], [NAME, VERSION]

            /* /////////////////////
            // Media players BEGIN
            ////////////////////////

            , [

            /(apple(?:coremedia|))\/((\d+)[\w\._]+)/i,                          // Generic Apple CoreMedia
            /(coremedia) v((\d+)[\w\._]+)/i
            ], [NAME, VERSION], [

            /(aqualung|lyssna|bsplayer)\/((\d+)?[\w\.-]+)/i                     // Aqualung/Lyssna/BSPlayer
            ], [NAME, VERSION], [

            /(ares|ossproxy)\s((\d+)[\w\.-]+)/i                                 // Ares/OSSProxy
            ], [NAME, VERSION], [

            /(audacious|audimusicstream|amarok|bass|core|dalvik|gnomemplayer|music on console|nsplayer|psp-internetradioplayer|videos)\/((\d+)[\w\.-]+)/i,
                                                                                // Audacious/AudiMusicStream/Amarok/BASS/OpenCORE/Dalvik/GnomeMplayer/MoC
                                                                                // NSPlayer/PSP-InternetRadioPlayer/Videos
            /(clementine|music player daemon)\s((\d+)[\w\.-]+)/i,               // Clementine/MPD
            /(lg player|nexplayer)\s((\d+)[\d\.]+)/i,
            /player\/(nexplayer|lg player)\s((\d+)[\w\.-]+)/i                   // NexPlayer/LG Player
            ], [NAME, VERSION], [
            /(nexplayer)\s((\d+)[\w\.-]+)/i                                     // Nexplayer
            ], [NAME, VERSION], [

            /(flrp)\/((\d+)[\w\.-]+)/i                                          // Flip Player
            ], [[NAME, 'Flip Player'], VERSION], [

            /(fstream|nativehost|queryseekspider|ia-archiver|facebookexternalhit)/i
                                                                                // FStream/NativeHost/QuerySeekSpider/IA Archiver/facebookexternalhit
            ], [NAME], [

            /(gstreamer) souphttpsrc (?:\([^\)]+\)){0,1} libsoup\/((\d+)[\w\.-]+)/i
                                                                                // Gstreamer
            ], [NAME, VERSION], [

            /(htc streaming player)\s[\w_]+\s\/\s((\d+)[\d\.]+)/i,              // HTC Streaming Player
            /(java|python-urllib|python-requests|wget|libcurl)\/((\d+)[\w\.-_]+)/i,
                                                                                // Java/urllib/requests/wget/cURL
            /(lavf)((\d+)[\d\.]+)/i                                             // Lavf (FFMPEG)
            ], [NAME, VERSION], [

            /(htc_one_s)\/((\d+)[\d\.]+)/i                                      // HTC One S
            ], [[NAME, /_/g, ' '], VERSION], [

            /(mplayer)(?:\s|\/)(?:(?:sherpya-){0,1}svn)(?:-|\s)(r\d+(?:-\d+[\w\.-]+){0,1})/i
                                                                                // MPlayer SVN
            ], [NAME, VERSION], [

            /(mplayer)(?:\s|\/|[unkow-]+)((\d+)[\w\.-]+)/i                      // MPlayer
            ], [NAME, VERSION], [

            /(mplayer)/i,                                                       // MPlayer (no other info)
            /(yourmuze)/i,                                                      // YourMuze
            /(media player classic|nero showtime)/i                             // Media Player Classic/Nero ShowTime
            ], [NAME], [

            /(nero (?:home|scout))\/((\d+)[\w\.-]+)/i                           // Nero Home/Nero Scout
            ], [NAME, VERSION], [

            /(nokia\d+)\/((\d+)[\w\.-]+)/i                                      // Nokia
            ], [NAME, VERSION], [

            /\s(songbird)\/((\d+)[\w\.-]+)/i                                    // Songbird/Philips-Songbird
            ], [NAME, VERSION], [

            /(winamp)3 version ((\d+)[\w\.-]+)/i,                               // Winamp
            /(winamp)\s((\d+)[\w\.-]+)/i,
            /(winamp)mpeg\/((\d+)[\w\.-]+)/i
            ], [NAME, VERSION], [

            /(ocms-bot|tapinradio|tunein radio|unknown|winamp|inlight radio)/i  // OCMS-bot/tap in radio/tunein/unknown/winamp (no other info)
                                                                                // inlight radio
            ], [NAME], [

            /(quicktime|rma|radioapp|radioclientapplication|soundtap|totem|stagefright|streamium)\/((\d+)[\w\.-]+)/i
                                                                                // QuickTime/RealMedia/RadioApp/RadioClientApplication/
                                                                                // SoundTap/Totem/Stagefright/Streamium
            ], [NAME, VERSION], [

            /(smp)((\d+)[\d\.]+)/i                                              // SMP
            ], [NAME, VERSION], [

            /(vlc) media player - version ((\d+)[\w\.]+)/i,                     // VLC Videolan
            /(vlc)\/((\d+)[\w\.-]+)/i,
            /(xbmc|gvfs|xine|xmms|irapp)\/((\d+)[\w\.-]+)/i,                    // XBMC/gvfs/Xine/XMMS/irapp
            /(foobar2000)\/((\d+)[\d\.]+)/i,                                    // Foobar2000
            /(itunes)\/((\d+)[\d\.]+)/i                                         // iTunes
            ], [NAME, VERSION], [

            /(wmplayer)\/((\d+)[\w\.-]+)/i,                                     // Windows Media Player
            /(windows-media-player)\/((\d+)[\w\.-]+)/i
            ], [[NAME, /-/g, ' '], VERSION], [

            /windows\/((\d+)[\w\.-]+) upnp\/[\d\.]+ dlnadoc\/[\d\.]+ (home media server)/i
                                                                                // Windows Media Server
            ], [VERSION, [NAME, 'Windows']], [

            /(com\.riseupradioalarm)\/((\d+)[\d\.]*)/i                          // RiseUP Radio Alarm
            ], [NAME, VERSION], [

            /(rad.io)\s((\d+)[\d\.]+)/i,                                        // Rad.io
            /(radio.(?:de|at|fr))\s((\d+)[\d\.]+)/i
            ], [[NAME, 'rad.io'], VERSION]

            //////////////////////
            // Media players END
            ////////////////////*/

        ],

        cpu : [[

            /(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i                     // AMD64
            ], [[ARCHITECTURE, 'amd64']], [

            /(ia32(?=;))/i                                                      // IA32 (quicktime)
            ], [[ARCHITECTURE, util.lowerize]], [

            /((?:i[346]|x)86)[;\)]/i                                            // IA32
            ], [[ARCHITECTURE, 'ia32']], [

            // PocketPC mistakenly identified as PowerPC
            /windows\s(ce|mobile);\sppc;/i
            ], [[ARCHITECTURE, 'arm']], [

            /((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i                           // PowerPC
            ], [[ARCHITECTURE, /ower/, '', util.lowerize]], [

            /(sun4\w)[;\)]/i                                                    // SPARC
            ], [[ARCHITECTURE, 'sparc']], [

            /((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+;))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i
                                                                                // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
            ], [[ARCHITECTURE, util.lowerize]]
        ],

        device : [[

            /\((ipad|playbook);[\w\s\);-]+(rim|apple)/i                         // iPad/PlayBook
            ], [MODEL, VENDOR, [TYPE, TABLET]], [

            /applecoremedia\/[\w\.]+ \((ipad)/                                  // iPad
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, TABLET]], [

            /(apple\s{0,1}tv)/i                                                 // Apple TV
            ], [[MODEL, 'Apple TV'], [VENDOR, 'Apple']], [

            /(archos)\s(gamepad2?)/i,                                           // Archos
            /(hp).+(touchpad)/i,                                                // HP TouchPad
            /(hp).+(tablet)/i,                                                  // HP Tablet
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /\s(nook)[\w\s]+build\/(\w+)/i,                                     // Nook
            /(dell)\s(strea[kpr\s\d]*[\dko])/i                                  // Dell Streak
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i                               // Kindle Fire HD
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [
            /(sd|kf)[0349hijorstuw]+\sbuild\/[\w\.]+.*silk\//i                  // Fire Phone
            ], [[MODEL, mapper.str, maps.device.amazon.model], [VENDOR, 'Amazon'], [TYPE, MOBILE]], [

            /\((ip[honed|\s\w*]+);.+(apple)/i                                   // iPod/iPhone
            ], [MODEL, VENDOR, [TYPE, MOBILE]], [
            /\((ip[honed|\s\w*]+);/i                                            // iPod/iPhone
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, MOBILE]], [

            /(blackberry)[\s-]?(\w+)/i,                                         // BlackBerry
            /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|huawei|meizu|motorola|polytron)[\s_-]?([\w-]+)*/i,
                                                                                // BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Huawei/Meizu/Motorola/Polytron
            /(hp)\s([\w\s]+\w)/i,                                               // HP iPAQ
            /(asus)-?(\w+)/i                                                    // Asus
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /\(bb10;\s(\w+)/i                                                   // BlackBerry 10
            ], [MODEL, [VENDOR, 'BlackBerry'], [TYPE, MOBILE]], [
                                                                                // Asus Tablets
            /android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7|padfone)/i
            ], [MODEL, [VENDOR, 'Asus'], [TYPE, TABLET]], [

            /(sony)\s(tablet\s[ps])\sbuild\//i,                                  // Sony
            /(sony)?(?:sgp.+)\sbuild\//i
            ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Tablet'], [TYPE, TABLET]], [
            /(?:sony)?(?:(?:(?:c|d)\d{4})|(?:so[-l].+))\sbuild\//i
            ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Phone'], [TYPE, MOBILE]], [

            /\s(ouya)\s/i,                                                      // Ouya
            /(nintendo)\s([wids3u]+)/i                                          // Nintendo
            ], [VENDOR, MODEL, [TYPE, CONSOLE]], [

            /android.+;\s(shield)\sbuild/i                                      // Nvidia
            ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, CONSOLE]], [

            /(playstation\s[34portablevi]+)/i                                   // Playstation
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, CONSOLE]], [

            /(sprint\s(\w+))/i                                                  // Sprint Phones
            ], [[VENDOR, mapper.str, maps.device.sprint.vendor], [MODEL, mapper.str, maps.device.sprint.model], [TYPE, MOBILE]], [

            /(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i                         // Lenovo tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,                               // HTC
            /(zte)-(\w+)*/i,                                                    // ZTE
            /(alcatel|geeksphone|huawei|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i
                                                                                // Alcatel/GeeksPhone/Huawei/Lenovo/Nexian/Panasonic/Sony
            ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [

            /(nexus\s9)/i                                                       // HTC Nexus 9
            ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [

            /(nexus\s6p)/i                                                      // Huawei Nexus 6P
            ], [MODEL, [VENDOR, 'Huawei'], [TYPE, MOBILE]], [

            /(microsoft);\s(lumia[\s\w]+)/i                                     // Microsoft Lumia
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /[\s\(;](xbox(?:\sone)?)[\s\);]/i                                   // Microsoft Xbox
            ], [MODEL, [VENDOR, 'Microsoft'], [TYPE, CONSOLE]], [
            /(kin\.[onetw]{3})/i                                                // Microsoft Kin
            ], [[MODEL, /\./g, ' '], [VENDOR, 'Microsoft'], [TYPE, MOBILE]], [

                                                                                // Motorola
            /\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?)[\w\s]+build\//i,
            /mot[\s-]?(\w+)*/i,
            /(XT\d{3,4}) build\//i,
            /(nexus\s6)/i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, MOBILE]], [
            /android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, TABLET]], [

            /hbbtv\/\d+\.\d+\.\d+\s+\([\w\s]*;\s*(\w[^;]*);([^;]*)/i            // HbbTV devices
            ], [[VENDOR, util.trim], [MODEL, util.trim], [TYPE, SMARTTV]], [

            /hbbtv.+maple;(\d+)/i
            ], [[MODEL, /^/, 'SmartTV'], [VENDOR, 'Samsung'], [TYPE, SMARTTV]], [

            /\(dtv[\);].+(aquos)/i                                              // Sharp
            ], [MODEL, [VENDOR, 'Sharp'], [TYPE, SMARTTV]], [

            /android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n\d+|sgh-t8[56]9|nexus 10))/i,
            /((SM-T\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, TABLET]], [                  // Samsung
            /smart-tv.+(samsung)/i
            ], [VENDOR, [TYPE, SMARTTV], MODEL], [
            /((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-\w[\w\d]+))/i,
            /(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,
            /sec-((sgh\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, MOBILE]], [

            /sie-(\w+)*/i                                                       // Siemens
            ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [

            /(maemo|nokia).*(n900|lumia\s\d+)/i,                                // Nokia
            /(nokia)[\s_-]?([\w-]+)*/i
            ], [[VENDOR, 'Nokia'], MODEL, [TYPE, MOBILE]], [

            /android\s3\.[\s\w;-]{10}(a\d{3})/i                                 // Acer
            ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [

            /android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i                     // LG Tablet
            ], [[VENDOR, 'LG'], MODEL, [TYPE, TABLET]], [
            /(lg) netcast\.tv/i                                                 // LG SmartTV
            ], [VENDOR, MODEL, [TYPE, SMARTTV]], [
            /(nexus\s[45])/i,                                                   // LG
            /lg[e;\s\/-]+(\w+)*/i
            ], [MODEL, [VENDOR, 'LG'], [TYPE, MOBILE]], [

            /android.+(ideatab[a-z0-9\-\s]+)/i                                  // Lenovo
            ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [

            /linux;.+((jolla));/i                                               // Jolla
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /((pebble))app\/[\d\.]+\s/i                                         // Pebble
            ], [VENDOR, MODEL, [TYPE, WEARABLE]], [

            /android.+;\s(oppo)\s?([\w\s]+)\sbuild/i                            // OPPO
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /crkey/i                                                            // Google Chromecast
            ], [[MODEL, 'Chromecast'], [VENDOR, 'Google']], [

            /android.+;\s(glass)\s\d/i                                          // Google Glass
            ], [MODEL, [VENDOR, 'Google'], [TYPE, WEARABLE]], [

            /android.+;\s(pixel c)\s/i                                          // Google Pixel C
            ], [MODEL, [VENDOR, 'Google'], [TYPE, TABLET]], [

            /android.+;\s(pixel xl|pixel)\s/i                                   // Google Pixel
            ], [MODEL, [VENDOR, 'Google'], [TYPE, MOBILE]], [

            /android.+(\w+)\s+build\/hm\1/i,                                    // Xiaomi Hongmi 'numeric' models
            /android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,               // Xiaomi Hongmi
            /android.+(mi[\s\-_]*(?:one|one[\s_]plus|note lte)?[\s_]*(?:\d\w)?)\s+build/i    // Xiaomi Mi
            ], [[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, MOBILE]], [

            /android.+a000(1)\s+build/i                                         // OnePlus
            ], [MODEL, [VENDOR, 'OnePlus'], [TYPE, MOBILE]], [

            /\s(tablet)[;\/]/i,                                                 // Unidentifiable Tablet
            /\s(mobile)(?:[;\/]|\ssafari)/i                                     // Unidentifiable Mobile
            ], [[TYPE, util.lowerize], VENDOR, MODEL]

            /*//////////////////////////
            // TODO: move to string map
            ////////////////////////////

            /(C6603)/i                                                          // Sony Xperia Z C6603
            ], [[MODEL, 'Xperia Z C6603'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [
            /(C6903)/i                                                          // Sony Xperia Z 1
            ], [[MODEL, 'Xperia Z 1'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /(SM-G900[F|H])/i                                                   // Samsung Galaxy S5
            ], [[MODEL, 'Galaxy S5'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G7102)/i                                                       // Samsung Galaxy Grand 2
            ], [[MODEL, 'Galaxy Grand 2'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G530H)/i                                                       // Samsung Galaxy Grand Prime
            ], [[MODEL, 'Galaxy Grand Prime'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G313HZ)/i                                                      // Samsung Galaxy V
            ], [[MODEL, 'Galaxy V'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T805)/i                                                        // Samsung Galaxy Tab S 10.5
            ], [[MODEL, 'Galaxy Tab S 10.5'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [
            /(SM-G800F)/i                                                       // Samsung Galaxy S5 Mini
            ], [[MODEL, 'Galaxy S5 Mini'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T311)/i                                                        // Samsung Galaxy Tab 3 8.0
            ], [[MODEL, 'Galaxy Tab 3 8.0'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [

            /(T3C)/i                                                            // Advan Vandroid T3C
            ], [MODEL, [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN T1J\+)/i                                                    // Advan Vandroid T1J+
            ], [[MODEL, 'Vandroid T1J+'], [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN S4A)/i                                                      // Advan Vandroid S4A
            ], [[MODEL, 'Vandroid S4A'], [VENDOR, 'Advan'], [TYPE, MOBILE]], [

            /(V972M)/i                                                          // ZTE V972M
            ], [MODEL, [VENDOR, 'ZTE'], [TYPE, MOBILE]], [

            /(i-mobile)\s(IQ\s[\d\.]+)/i                                        // i-mobile IQ
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(IQ6.3)/i                                                          // i-mobile IQ IQ 6.3
            ], [[MODEL, 'IQ 6.3'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [
            /(i-mobile)\s(i-style\s[\d\.]+)/i                                   // i-mobile i-STYLE
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(i-STYLE2.1)/i                                                     // i-mobile i-STYLE 2.1
            ], [[MODEL, 'i-STYLE 2.1'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [

            /(mobiistar touch LAI 512)/i                                        // mobiistar touch LAI 512
            ], [[MODEL, 'Touch LAI 512'], [VENDOR, 'mobiistar'], [TYPE, MOBILE]], [

            /////////////
            // END TODO
            ///////////*/

        ],

        engine : [[

            /windows.+\sedge\/([\w\.]+)/i                                       // EdgeHTML
            ], [VERSION, [NAME, 'EdgeHTML']], [

            /(presto)\/([\w\.]+)/i,                                             // Presto
            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,     // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m
            /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
            /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
            ], [NAME, VERSION], [

            /rv\:([\w\.]+).*(gecko)/i                                           // Gecko
            ], [VERSION, NAME]
        ],

        os : [[

            // Windows based
            /microsoft\s(windows)\s(vista|xp)/i                                 // Windows (iTunes)
            ], [NAME, VERSION], [
            /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
            /(windows\sphone(?:\sos)*)[\s\/]?([\d\.\s]+\w)*/i,                  // Windows Phone
            /(windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
            ], [NAME, [VERSION, mapper.str, maps.os.windows.version]], [
            /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
            ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

            // Mobile/Embedded OS
            /\((bb)(10);/i                                                      // BlackBerry 10
            ], [[NAME, 'BlackBerry'], VERSION], [
            /(blackberry)\w*\/?([\w\.]+)*/i,                                    // Blackberry
            /(tizen)[\/\s]([\w\.]+)/i,                                          // Tizen
            /(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]+)*/i,
                                                                                // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo/Contiki
            /linux;.+(sailfish);/i                                              // Sailfish OS
            ], [NAME, VERSION], [
            /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i                 // Symbian
            ], [[NAME, 'Symbian'], VERSION], [
            /\((series40);/i                                                    // Series 40
            ], [NAME], [
            /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
            ], [[NAME, 'Firefox OS'], VERSION], [

            // Console
            /(nintendo|playstation)\s([wids34portablevu]+)/i,                   // Nintendo/Playstation

            // GNU/Linux based
            /(mint)[\/\s\(]?(\w+)*/i,                                           // Mint
            /(mageia|vectorlinux)[;\s]/i,                                       // Mageia/VectorLinux
            /(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|(?=\s)arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?(?!chrom)([\w\.-]+)*/i,
                                                                                // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
                                                                                // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus
            /(hurd|linux)\s?([\w\.]+)*/i,                                       // Hurd/Linux
            /(gnu)\s?([\w\.]+)*/i                                               // GNU
            ], [NAME, VERSION], [

            /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
            ], [[NAME, 'Chromium OS'], VERSION],[

            // Solaris
            /(sunos)\s?([\w\.]+\d)*/i                                           // Solaris
            ], [[NAME, 'Solaris'], VERSION], [

            // BSD based
            /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i                   // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
            ], [NAME, VERSION],[

            /(haiku)\s(\w+)/i                                                  // Haiku
            ], [NAME, VERSION],[

            /(ip[honead]+)(?:.*os\s([\w]+)*\slike\smac|;\sopera)/i              // iOS
            ], [[NAME, 'iOS'], [VERSION, /_/g, '.']], [

            /(mac\sos\sx)\s?([\w\s\.]+\w)*/i,
            /(macintosh|mac(?=_powerpc)\s)/i                                    // Mac OS
            ], [[NAME, 'Mac OS'], [VERSION, /_/g, '.']], [

            // Other
            /((?:open)?solaris)[\/\s-]?([\w\.]+)*/i,                            // Solaris
            /(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,                               // AIX
            /(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,
                                                                                // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS/OpenVMS
            /(unix)\s?([\w\.]+)*/i                                              // UNIX
            ], [NAME, VERSION]
        ]
    };


    /////////////////
    // Constructor
    ////////////////

    var Browser = function (name, version) {
        this[NAME] = name;
        this[VERSION] = version;
    };
    var CPU = function (arch) {
        this[ARCHITECTURE] = arch;
    };
    var Device = function (vendor, model, type) {
        this[VENDOR] = vendor;
        this[MODEL] = model;
        this[TYPE] = type;
    };
    var Engine = Browser;
    var OS = Browser;

    var UAParser = function (uastring, extensions) {

        if (!(this instanceof UAParser)) {
            return new UAParser(uastring, extensions).getResult();
        }

        var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);
        var rgxmap = extensions ? util.extend(regexes, extensions) : regexes;
        var browser = new Browser();
        var cpu = new CPU();
        var device = new Device();
        var engine = new Engine();
        var os = new OS();

        this.getBrowser = function () {
            mapper.rgx.call(browser, ua, rgxmap.browser);
            browser.major = util.major(browser.version); // deprecated
            return browser;
        };
        this.getCPU = function () {
            mapper.rgx.call(cpu, ua, rgxmap.cpu);
            return cpu;
        };
        this.getDevice = function () {
            mapper.rgx.call(device, ua, rgxmap.device);
            return device;
        };
        this.getEngine = function () {
            mapper.rgx.call(engine, ua, rgxmap.engine);
            return engine;
        };
        this.getOS = function () {
            mapper.rgx.call(os, ua, rgxmap.os);
            return os;
        };
        this.getResult = function () {
            return {
                ua      : this.getUA(),
                browser : this.getBrowser(),
                engine  : this.getEngine(),
                os      : this.getOS(),
                device  : this.getDevice(),
                cpu     : this.getCPU()
            };
        };
        this.getUA = function () {
            return ua;
        };
        this.setUA = function (uastring) {
            ua = uastring;
            browser = new Browser();
            cpu = new CPU();
            device = new Device();
            engine = new Engine();
            os = new OS();
            return this;
        };
        return this;
    };

    UAParser.VERSION = LIBVERSION;
    UAParser.BROWSER = {
        NAME    : NAME,
        MAJOR   : MAJOR, // deprecated
        VERSION : VERSION
    };
    UAParser.CPU = {
        ARCHITECTURE : ARCHITECTURE
    };
    UAParser.DEVICE = {
        MODEL   : MODEL,
        VENDOR  : VENDOR,
        TYPE    : TYPE,
        CONSOLE : CONSOLE,
        MOBILE  : MOBILE,
        SMARTTV : SMARTTV,
        TABLET  : TABLET,
        WEARABLE: WEARABLE,
        EMBEDDED: EMBEDDED
    };
    UAParser.ENGINE = {
        NAME    : NAME,
        VERSION : VERSION
    };
    UAParser.OS = {
        NAME    : NAME,
        VERSION : VERSION
    };
    //UAParser.Utils = util;

    ///////////
    // Export
    //////////


    // check js environment
    if (typeof(exports) !== UNDEF_TYPE) {
        // nodejs env
        if (typeof module !== UNDEF_TYPE && module.exports) {
            exports = module.exports = UAParser;
        }
        exports.UAParser = UAParser;
    } else {
        // requirejs env (optional)
        if (typeof(define) === FUNC_TYPE && define.amd) {
            define(function () {
                return UAParser;
            });
        } else {
            // browser env
            window.UAParser = UAParser;
        }
    }

    // jQuery/Zepto specific (optional)
    // Note:
    //   In AMD env the global scope should be kept clean, but jQuery is an exception.
    //   jQuery always exports to global scope, unless jQuery.noConflict(true) is used,
    //   and we should catch that.
    var $ = window.jQuery || window.Zepto;
    if (typeof $ !== UNDEF_TYPE) {
        var parser = new UAParser();
        $.ua = parser.getResult();
        $.ua.get = function () {
            return parser.getUA();
        };
        $.ua.set = function (uastring) {
            parser.setUA(uastring);
            var result = parser.getResult();
            for (var prop in result) {
                $.ua[prop] = result[prop];
            }
        };
    }

})(typeof window === 'object' ? window : this);
;
return module.exports;
},
7: function (require, module, exports) {
module.exports = {
  item: "<div class='BenchmarksDashboard-charts-item {{nonSharedTest}} {{fullWidth}}'> <div class='BenchmarksDashboard-charts-item-innerwrap'> <div class='BenchmarksDashboard-charts-item-title'>{{title}}</div> <div class='BenchmarksDashboard-charts-item-subtitle'>{{subtitle}}</div> <div class='BenchmarksDashboard-charts-item-chart __chart'></div> </div> </div>&nbsp;"
};

;
return module.exports;
},
3: function (require, module, exports) {
/*
 Highcharts JS v5.0.2-modified (2017-03-20)

 (c) 2009-2016 Torstein Honsi

 License: www.highcharts.com/license
*/
(function(M,a){"object"===typeof module&&module.exports?module.exports=M.document?a(M):a:M.Highcharts=a(M)})("undefined"!==typeof window?window:this,function(M){M=function(){var a=window,C=a.document,A=a.navigator&&a.navigator.userAgent||"",E=C&&C.createElementNS&&!!C.createElementNS("http://www.w3.org/2000/svg","svg").createSVGRect,H=/(edge|msie|trident)/i.test(A)&&!window.opera,k=!E,d=/Firefox/.test(A),g=d&&4>parseInt(A.split("Firefox/")[1],10);return a.Highcharts?a.Highcharts.error(16,!0):{product:"Highcharts",
version:"5.0.2-modified",deg2rad:2*Math.PI/360,doc:C,hasBidiBug:g,hasTouch:C&&void 0!==C.documentElement.ontouchstart,isMS:H,isWebKit:/AppleWebKit/.test(A),isFirefox:d,isTouchDevice:/(Mobile|Android|Windows Phone)/.test(A),SVG_NS:"http://www.w3.org/2000/svg",chartCount:0,seriesTypes:{},symbolSizes:{},svg:E,vml:k,win:a,charts:[],marginNames:["plotTop","marginRight","marginBottom","plotLeft"],noop:function(){}}}();(function(a){var C=[],A=a.charts,E=a.doc,H=a.win;a.error=function(a,d){a="Highcharts error #"+
a+": www.highcharts.com/errors/"+a;if(d)throw Error(a);H.console&&console.log(a)};a.Fx=function(a,d,g){this.options=d;this.elem=a;this.prop=g};a.Fx.prototype={dSetter:function(){var a=this.paths[0],d=this.paths[1],g=[],v=this.now,l=a.length,r;if(1===v)g=this.toD;else if(l===d.length&&1>v)for(;l--;)r=parseFloat(a[l]),g[l]=isNaN(r)?a[l]:v*parseFloat(d[l]-r)+r;else g=d;this.elem.attr("d",g)},update:function(){var a=this.elem,d=this.prop,g=this.now,v=this.options.step;if(this[d+"Setter"])this[d+"Setter"]();
else a.attr?a.element&&a.attr(d,g):a.style[d]=g+this.unit;v&&v.call(a,g,this)},run:function(a,d,g){var k=this,l=function(a){return l.stopped?!1:k.step(a)},r;this.startTime=+new Date;this.start=a;this.end=d;this.unit=g;this.now=this.start;this.pos=0;l.elem=this.elem;l()&&1===C.push(l)&&(l.timerId=setInterval(function(){for(r=0;r<C.length;r++)C[r]()||C.splice(r--,1);C.length||clearInterval(l.timerId)},13))},step:function(a){var d=+new Date,g,k=this.options;g=this.elem;var l=k.complete,r=k.duration,
q=k.curAnim,f;if(g.attr&&!g.element)g=!1;else if(a||d>=r+this.startTime){this.now=this.end;this.pos=1;this.update();a=q[this.prop]=!0;for(f in q)!0!==q[f]&&(a=!1);a&&l&&l.call(g);g=!1}else this.pos=k.easing((d-this.startTime)/r),this.now=this.start+(this.end-this.start)*this.pos,this.update(),g=!0;return g},initPath:function(k,d,g){function v(a){for(m=a.length;m--;)"M"!==a[m]&&"L"!==a[m]||a.splice(m+1,0,a[m+1],a[m+2],a[m+1],a[m+2])}function l(a,b){for(;a.length<c;){a[0]=b[c-a.length];var e=a.slice(0,
F);[].splice.apply(a,[0,0].concat(e));w&&(e=a.slice(a.length-F),[].splice.apply(a,[a.length,0].concat(e)),m--)}a[0]="M"}function r(a,b){for(var p=(c-a.length)/F;0<p&&p--;)e=a.slice().splice(a.length/G-F,F*G),e[0]=b[c-F-p*F],u&&(e[F-6]=e[F-2],e[F-5]=e[F-1]),[].splice.apply(a,[a.length/G,0].concat(e)),w&&p--}d=d||"";var q,f=k.startX,h=k.endX,u=-1<d.indexOf("C"),F=u?7:3,c,e,m;d=d.split(" ");g=g.slice();var w=k.isArea,G=w?2:1,b;u&&(v(d),v(g));if(f&&h){for(m=0;m<f.length;m++)if(f[m]===h[0]){q=m;break}else if(f[0]===
h[h.length-f.length+m]){q=m;b=!0;break}void 0===q&&(d=[])}d.length&&a.isNumber(q)&&(c=g.length+q*G*F,b?(l(d,g),r(g,d)):(l(g,d),r(d,g)));return[d,g]}};a.extend=function(a,d){var g;a||(a={});for(g in d)a[g]=d[g];return a};a.merge=function(){var k,d=arguments,g,v={},l=function(d,g){var f,h;"object"!==typeof d&&(d={});for(h in g)g.hasOwnProperty(h)&&(f=g[h],a.isObject(f,!0)&&"renderTo"!==h&&"number"!==typeof f.nodeType?d[h]=l(d[h]||{},f):d[h]=g[h]);return d};!0===d[0]&&(v=d[1],d=Array.prototype.slice.call(d,
2));g=d.length;for(k=0;k<g;k++)v=l(v,d[k]);return v};a.pInt=function(a,d){return parseInt(a,d||10)};a.isString=function(a){return"string"===typeof a};a.isArray=function(a){a=Object.prototype.toString.call(a);return"[object Array]"===a||"[object Array Iterator]"===a};a.isObject=function(k,d){return k&&"object"===typeof k&&(!d||!a.isArray(k))};a.isNumber=function(a){return"number"===typeof a&&!isNaN(a)};a.erase=function(a,d){for(var g=a.length;g--;)if(a[g]===d){a.splice(g,1);break}};a.defined=function(a){return void 0!==
a&&null!==a};a.attr=function(k,d,g){var v,l;if(a.isString(d))a.defined(g)?k.setAttribute(d,g):k&&k.getAttribute&&(l=k.getAttribute(d));else if(a.defined(d)&&a.isObject(d))for(v in d)k.setAttribute(v,d[v]);return l};a.splat=function(k){return a.isArray(k)?k:[k]};a.syncTimeout=function(a,d,g){if(d)return setTimeout(a,d,g);a.call(0,g)};a.pick=function(){var a=arguments,d,g,v=a.length;for(d=0;d<v;d++)if(g=a[d],void 0!==g&&null!==g)return g};a.css=function(k,d){a.isMS&&!a.svg&&d&&void 0!==d.opacity&&(d.filter=
"alpha(opacity\x3d"+100*d.opacity+")");a.extend(k.style,d)};a.createElement=function(k,d,g,v,l){k=E.createElement(k);var r=a.css;d&&a.extend(k,d);l&&r(k,{padding:0,border:"none",margin:0});g&&r(k,g);v&&v.appendChild(k);return k};a.extendClass=function(k,d){var g=function(){};g.prototype=new k;a.extend(g.prototype,d);return g};a.pad=function(a,d,g){return Array((d||2)+1-String(a).length).join(g||0)+a};a.relativeLength=function(a,d){return/%$/.test(a)?d*parseFloat(a)/100:parseFloat(a)};a.wrap=function(a,
d,g){var k=a[d];a[d]=function(){var a=Array.prototype.slice.call(arguments);a.unshift(k);return g.apply(this,a)}};a.getTZOffset=function(k){var d=a.Date;return 6E4*(d.hcGetTimezoneOffset&&d.hcGetTimezoneOffset(k)||d.hcTimezoneOffset||0)};a.dateFormat=function(k,d,g){if(!a.defined(d)||isNaN(d))return a.defaultOptions.lang.invalidDate||"";k=a.pick(k,"%Y-%m-%d %H:%M:%S");var v=a.Date,l=new v(d-a.getTZOffset(d)),r,q=l[v.hcGetHours](),f=l[v.hcGetDay](),h=l[v.hcGetDate](),u=l[v.hcGetMonth](),F=l[v.hcGetFullYear](),
c=a.defaultOptions.lang,e=c.weekdays,m=c.shortWeekdays,w=a.pad,v=a.extend({a:m?m[f]:e[f].substr(0,3),A:e[f],d:w(h),e:w(h,2," "),w:f,b:c.shortMonths[u],B:c.months[u],m:w(u+1),y:F.toString().substr(2,2),Y:F,H:w(q),k:q,I:w(q%12||12),l:q%12||12,M:w(l[v.hcGetMinutes]()),p:12>q?"AM":"PM",P:12>q?"am":"pm",S:w(l.getSeconds()),L:w(Math.round(d%1E3),3)},a.dateFormats);for(r in v)for(;-1!==k.indexOf("%"+r);)k=k.replace("%"+r,"function"===typeof v[r]?v[r](d):v[r]);return g?k.substr(0,1).toUpperCase()+k.substr(1):
k};a.formatSingle=function(k,d){var g=/\.([0-9])/,v=a.defaultOptions.lang;/f$/.test(k)?(g=(g=k.match(g))?g[1]:-1,null!==d&&(d=a.numberFormat(d,g,v.decimalPoint,-1<k.indexOf(",")?v.thousandsSep:""))):d=a.dateFormat(k,d);return d};a.format=function(k,d){for(var g="{",v=!1,l,r,q,f,h=[],u;k;){g=k.indexOf(g);if(-1===g)break;l=k.slice(0,g);if(v){l=l.split(":");r=l.shift().split(".");f=r.length;u=d;for(q=0;q<f;q++)u=u[r[q]];l.length&&(u=a.formatSingle(l.join(":"),u));h.push(u)}else h.push(l);k=k.slice(g+
1);g=(v=!v)?"}":"{"}h.push(k);return h.join("")};a.getMagnitude=function(a){return Math.pow(10,Math.floor(Math.log(a)/Math.LN10))};a.normalizeTickInterval=function(k,d,g,v,l){var r,q=k;g=a.pick(g,1);r=k/g;d||(d=l?[1,1.2,1.5,2,2.5,3,4,5,6,8,10]:[1,2,2.5,5,10],!1===v&&(1===g?d=a.grep(d,function(a){return 0===a%1}):.1>=g&&(d=[1/g])));for(v=0;v<d.length&&!(q=d[v],l&&q*g>=k||!l&&r<=(d[v]+(d[v+1]||d[v]))/2);v++);return q*g};a.stableSort=function(a,d){var g=a.length,k,l;for(l=0;l<g;l++)a[l].safeI=l;a.sort(function(a,
l){k=d(a,l);return 0===k?a.safeI-l.safeI:k});for(l=0;l<g;l++)delete a[l].safeI};a.arrayMin=function(a){for(var d=a.length,g=a[0];d--;)a[d]<g&&(g=a[d]);return g};a.arrayMax=function(a){for(var d=a.length,g=a[0];d--;)a[d]>g&&(g=a[d]);return g};a.destroyObjectProperties=function(a,d){for(var g in a)a[g]&&a[g]!==d&&a[g].destroy&&a[g].destroy(),delete a[g]};a.discardElement=function(k){var d=a.garbageBin;d||(d=a.createElement("div"));k&&d.appendChild(k);d.innerHTML=""};a.correctFloat=function(a,d){return parseFloat(a.toPrecision(d||
14))};a.setAnimation=function(k,d){d.renderer.globalAnimation=a.pick(k,d.options.chart.animation,!0)};a.animObject=function(k){return a.isObject(k)?a.merge(k):{duration:k?500:0}};a.timeUnits={millisecond:1,second:1E3,minute:6E4,hour:36E5,day:864E5,week:6048E5,month:24192E5,year:314496E5};a.numberFormat=function(k,d,g,v){k=+k||0;d=+d;var l=a.defaultOptions.lang,r=(k.toString().split(".")[1]||"").length,q,f,h=Math.abs(k);-1===d?d=Math.min(r,20):a.isNumber(d)||(d=2);q=String(a.pInt(h.toFixed(d)));f=
3<q.length?q.length%3:0;g=a.pick(g,l.decimalPoint);v=a.pick(v,l.thousandsSep);k=(0>k?"-":"")+(f?q.substr(0,f)+v:"");k+=q.substr(f).replace(/(\d{3})(?=\d)/g,"$1"+v);d&&(v=Math.abs(h-q+Math.pow(10,-Math.max(d,r)-1)),k+=g+v.toFixed(d).slice(2));return k};Math.easeInOutSine=function(a){return-.5*(Math.cos(Math.PI*a)-1)};a.getStyle=function(k,d){return"width"===d?Math.min(k.offsetWidth,k.scrollWidth)-a.getStyle(k,"padding-left")-a.getStyle(k,"padding-right"):"height"===d?Math.min(k.offsetHeight,k.scrollHeight)-
a.getStyle(k,"padding-top")-a.getStyle(k,"padding-bottom"):(k=H.getComputedStyle(k,void 0))&&a.pInt(k.getPropertyValue(d))};a.inArray=function(a,d){return d.indexOf?d.indexOf(a):[].indexOf.call(d,a)};a.grep=function(a,d){return[].filter.call(a,d)};a.map=function(a,d){for(var g=[],k=0,l=a.length;k<l;k++)g[k]=d.call(a[k],a[k],k,a);return g};a.offset=function(a){var d=E.documentElement;a=a.getBoundingClientRect();return{top:a.top+(H.pageYOffset||d.scrollTop)-(d.clientTop||0),left:a.left+(H.pageXOffset||
d.scrollLeft)-(d.clientLeft||0)}};a.stop=function(a){for(var d=C.length;d--;)C[d].elem===a&&(C[d].stopped=!0)};a.each=function(a,d,g){return Array.prototype.forEach.call(a,d,g)};a.addEvent=function(k,d,g){function v(a){a.target=a.srcElement||H;g.call(k,a)}var l=k.hcEvents=k.hcEvents||{};k.addEventListener?k.addEventListener(d,g,!1):k.attachEvent&&(k.hcEventsIE||(k.hcEventsIE={}),k.hcEventsIE[g.toString()]=v,k.attachEvent("on"+d,v));l[d]||(l[d]=[]);l[d].push(g);return function(){a.removeEvent(k,d,
g)}};a.removeEvent=function(k,d,g){function v(a,f){k.removeEventListener?k.removeEventListener(a,f,!1):k.attachEvent&&(f=k.hcEventsIE[f.toString()],k.detachEvent("on"+a,f))}function l(){var a,f;if(k.nodeName)for(f in d?(a={},a[d]=!0):a=q,a)if(q[f])for(a=q[f].length;a--;)v(f,q[f][a])}var r,q=k.hcEvents,f;q&&(d?(r=q[d]||[],g?(f=a.inArray(g,r),-1<f&&(r.splice(f,1),q[d]=r),v(d,g)):(l(),q[d]=[])):(l(),k.hcEvents={}))};a.fireEvent=function(k,d,g,v){var l;l=k.hcEvents;var r,q;g=g||{};if(E.createEvent&&(k.dispatchEvent||
k.fireEvent))l=E.createEvent("Events"),l.initEvent(d,!0,!0),a.extend(l,g),k.dispatchEvent?k.dispatchEvent(l):k.fireEvent(d,l);else if(l)for(l=l[d]||[],r=l.length,g.target||a.extend(g,{preventDefault:function(){g.defaultPrevented=!0},target:k,type:d}),d=0;d<r;d++)(q=l[d])&&!1===q.call(k,g)&&g.preventDefault();v&&!g.defaultPrevented&&v(g)};a.animate=function(k,d,g){var v,l="",r,q,f;a.isObject(g)||(v=arguments,g={duration:v[2],easing:v[3],complete:v[4]});a.isNumber(g.duration)||(g.duration=400);g.easing=
"function"===typeof g.easing?g.easing:Math[g.easing]||Math.easeInOutSine;g.curAnim=a.merge(d);for(f in d)q=new a.Fx(k,g,f),r=null,"d"===f?(q.paths=q.initPath(k,k.d,d.d),q.toD=d.d,v=0,r=1):k.attr?v=k.attr(f):(v=parseFloat(a.getStyle(k,f))||0,"opacity"!==f&&(l="px")),r||(r=d[f]),r.match&&r.match("px")&&(r=r.replace(/px/g,"")),q.run(v,r,l)};a.seriesType=function(k,d,g,v,l){var r=a.getOptions(),q=a.seriesTypes;r.plotOptions[k]=a.merge(r.plotOptions[d],g);q[k]=a.extendClass(q[d]||function(){},v);q[k].prototype.type=
k;l&&(q[k].prototype.pointClass=a.extendClass(a.Point,l));return q[k]};a.uniqueKey=function(){var a=Math.random().toString(36).substring(2,9),d=0;return function(){return"highcharts-"+a+"-"+d++}}();H.jQuery&&(H.jQuery.fn.highcharts=function(){var k=[].slice.call(arguments);if(this[0])return k[0]?(new (a[a.isString(k[0])?k.shift():"Chart"])(this[0],k[0],k[1]),this):A[a.attr(this[0],"data-highcharts-chart")]});E&&!E.defaultView&&(a.getStyle=function(k,d){var g={width:"clientWidth",height:"clientHeight"}[d];
if(k.style[d])return a.pInt(k.style[d]);"opacity"===d&&(d="filter");if(g)return k.style.zoom=1,Math.max(k[g]-2*a.getStyle(k,"padding"),0);k=k.currentStyle[d.replace(/\-(\w)/g,function(a,l){return l.toUpperCase()})];"filter"===d&&(k=k.replace(/alpha\(opacity=([0-9]+)\)/,function(a,l){return l/100}));return""===k?1:a.pInt(k)});Array.prototype.forEach||(a.each=function(a,d,g){for(var k=0,l=a.length;k<l;k++)if(!1===d.call(g,a[k],k,a))return k});Array.prototype.indexOf||(a.inArray=function(a,d){var g,
k=0;if(d)for(g=d.length;k<g;k++)if(d[k]===a)return k;return-1});Array.prototype.filter||(a.grep=function(a,d){for(var g=[],k=0,l=a.length;k<l;k++)d(a[k],k)&&g.push(a[k]);return g})})(M);(function(a){var C=a.each,A=a.isNumber,E=a.map,H=a.merge,k=a.pInt;a.Color=function(d){if(!(this instanceof a.Color))return new a.Color(d);this.init(d)};a.Color.prototype={parsers:[{regex:/rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]?(?:\.[0-9]+)?)\s*\)/,parse:function(a){return[k(a[1]),
k(a[2]),k(a[3]),parseFloat(a[4],10)]}},{regex:/#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/,parse:function(a){return[k(a[1],16),k(a[2],16),k(a[3],16),1]}},{regex:/rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/,parse:function(a){return[k(a[1]),k(a[2]),k(a[3]),1]}}],names:{white:"#ffffff",black:"#000000"},init:function(d){var g,k,l,r;if((this.input=d=this.names[d]||d)&&d.stops)this.stops=E(d.stops,function(l){return new a.Color(l[1])});else for(l=this.parsers.length;l--&&!k;)r=
this.parsers[l],(g=r.regex.exec(d))&&(k=r.parse(g));this.rgba=k||[]},get:function(a){var g=this.input,d=this.rgba,l;this.stops?(l=H(g),l.stops=[].concat(l.stops),C(this.stops,function(d,g){l.stops[g]=[l.stops[g][0],d.get(a)]})):l=d&&A(d[0])?"rgb"===a||!a&&1===d[3]?"rgb("+d[0]+","+d[1]+","+d[2]+")":"a"===a?d[3]:"rgba("+d.join(",")+")":g;return l},brighten:function(a){var g,d=this.rgba;if(this.stops)C(this.stops,function(l){l.brighten(a)});else if(A(a)&&0!==a)for(g=0;3>g;g++)d[g]+=k(255*a),0>d[g]&&
(d[g]=0),255<d[g]&&(d[g]=255);return this},setOpacity:function(a){this.rgba[3]=a;return this}};a.color=function(d){return new a.Color(d)}})(M);(function(a){var C,A,E=a.addEvent,H=a.animate,k=a.attr,d=a.charts,g=a.color,v=a.css,l=a.createElement,r=a.defined,q=a.deg2rad,f=a.destroyObjectProperties,h=a.doc,u=a.each,F=a.extend,c=a.erase,e=a.grep,m=a.hasTouch,w=a.isArray,G=a.isFirefox,b=a.isMS,p=a.isObject,t=a.isString,L=a.isWebKit,D=a.merge,K=a.noop,x=a.pick,I=a.pInt,J=a.removeEvent,N=a.stop,n=a.svg,
z=a.SVG_NS,P=a.symbolSizes,O=a.win;C=a.SVGElement=function(){return this};C.prototype={opacity:1,SVG_NS:z,textProps:"direction fontSize fontWeight fontFamily fontStyle color lineHeight width textDecoration textOverflow textShadow".split(" "),init:function(a,b){this.element="span"===b?l(b):h.createElementNS(this.SVG_NS,b);this.renderer=a},animate:function(a,b,n){b=x(b,this.renderer.globalAnimation,!0);N(this);b?(n&&(b.complete=n),H(this,a,b)):this.attr(a,null,n);return this},colorGradient:function(B,
b,n){var y=this.renderer,e,z,c,p,f,t,m,R,h,x,l,d=[],g;B.linearGradient?z="linearGradient":B.radialGradient&&(z="radialGradient");if(z){c=B[z];f=y.gradients;m=B.stops;x=n.radialReference;w(c)&&(B[z]=c={x1:c[0],y1:c[1],x2:c[2],y2:c[3],gradientUnits:"userSpaceOnUse"});"radialGradient"===z&&x&&!r(c.gradientUnits)&&(p=c,c=D(c,y.getRadialAttr(x,p),{gradientUnits:"userSpaceOnUse"}));for(l in c)"id"!==l&&d.push(l,c[l]);for(l in m)d.push(m[l]);d=d.join(",");f[d]?x=f[d].attr("id"):(c.id=x=a.uniqueKey(),f[d]=
t=y.createElement(z).attr(c).add(y.defs),t.radAttr=p,t.stops=[],u(m,function(B){0===B[1].indexOf("rgba")?(e=a.color(B[1]),R=e.get("rgb"),h=e.get("a")):(R=B[1],h=1);B=y.createElement("stop").attr({offset:B[0],"stop-color":R,"stop-opacity":h}).add(t);t.stops.push(B)}));g="url("+y.url+"#"+x+")";n.setAttribute(b,g);n.gradient=d;B.toString=function(){return g}}},applyTextShadow:function(a){var B=this.element,n,e=-1!==a.indexOf("contrast"),z={},c=this.renderer.forExport,p=this.renderer.forExport||void 0!==
B.style.textShadow&&!b;e&&(z.textShadow=a=a.replace(/contrast/g,this.renderer.getContrast(B.style.fill)));if(L||c)z.textRendering="geometricPrecision";p?this.css(z):(this.fakeTS=!0,this.ySetter=this.xSetter,n=[].slice.call(B.getElementsByTagName("tspan")),u(a.split(/\s?,\s?/g),function(a){var b=B.firstChild,y,e;a=a.split(" ");y=a[a.length-1];(e=a[a.length-2])&&u(n,function(a,n){0===n&&(a.setAttribute("x",B.getAttribute("x")),n=B.getAttribute("y"),a.setAttribute("y",n||0),null===n&&B.setAttribute("y",
0));a=a.cloneNode(1);k(a,{"class":"highcharts-text-shadow",fill:y,stroke:y,"stroke-opacity":1/Math.max(I(e),3),"stroke-width":e,"stroke-linejoin":"round"});B.insertBefore(a,b)})}))},attr:function(a,b,n){var B,y=this.element,e,z=this,c;"string"===typeof a&&void 0!==b&&(B=a,a={},a[B]=b);if("string"===typeof a)z=(this[a+"Getter"]||this._defaultGetter).call(this,a,y);else{for(B in a)b=a[B],c=!1,this.symbolName&&/^(x|y|width|height|r|start|end|innerR|anchorX|anchorY)/.test(B)&&(e||(this.symbolAttr(a),
e=!0),c=!0),!this.rotation||"x"!==B&&"y"!==B||(this.doTransform=!0),c||(c=this[B+"Setter"]||this._defaultSetter,c.call(this,b,B,y),this.shadows&&/^(width|height|visibility|x|y|d|transform|cx|cy|r)$/.test(B)&&this.updateShadows(B,b,c));this.doTransform&&(this.updateTransform(),this.doTransform=!1)}n&&n();return z},updateShadows:function(a,b,n){for(var B=this.shadows,y=B.length;y--;)n.call(B[y],"height"===a?Math.max(b-(B[y].cutHeight||0),0):"d"===a?this.d:b,a,B[y])},addClass:function(a,b){var B=this.attr("class")||
"";-1===B.indexOf(a)&&(b||(a=(B+(B?" ":"")+a).replace("  "," ")),this.attr("class",a));return this},hasClass:function(a){return-1!==k(this.element,"class").indexOf(a)},removeClass:function(a){k(this.element,"class",(k(this.element,"class")||"").replace(a,""));return this},symbolAttr:function(a){var B=this;u("x y r start end width height innerR anchorX anchorY".split(" "),function(b){B[b]=x(a[b],B[b])});B.attr({d:B.renderer.symbols[B.symbolName](B.x,B.y,B.width,B.height,B)})},clip:function(a){return this.attr("clip-path",
a?"url("+this.renderer.url+"#"+a.id+")":"none")},crisp:function(a,b){var B,y={},n;b=b||a.strokeWidth||0;n=Math.round(b)%2/2;a.x=Math.floor(a.x||this.x||0)+n;a.y=Math.floor(a.y||this.y||0)+n;a.width=Math.floor((a.width||this.width||0)-2*n);a.height=Math.floor((a.height||this.height||0)-2*n);r(a.strokeWidth)&&(a.strokeWidth=b);for(B in a)this[B]!==a[B]&&(this[B]=y[B]=a[B]);return y},css:function(a){var B=this.styles,e={},z=this.element,c,p,f="";c=!B;a&&a.color&&(a.fill=a.color);if(B)for(p in a)a[p]!==
B[p]&&(e[p]=a[p],c=!0);if(c){c=this.textWidth=a&&a.width&&"text"===z.nodeName.toLowerCase()&&I(a.width)||this.textWidth;B&&(a=F(B,e));this.styles=a;c&&!n&&this.renderer.forExport&&delete a.width;if(b&&!n)v(this.element,a);else{B=function(a,b){return"-"+b.toLowerCase()};for(p in a)f+=p.replace(/([A-Z])/g,B)+":"+a[p]+";";k(z,"style",f)}this.added&&c&&this.renderer.buildText(this)}return this},strokeWidth:function(){return this["stroke-width"]||0},on:function(a,b){var B=this,n=B.element;m&&"click"===
a?(n.ontouchstart=function(a){B.touchEventFired=Date.now();a.preventDefault();b.call(n,a)},n.onclick=function(a){(-1===O.navigator.userAgent.indexOf("Android")||1100<Date.now()-(B.touchEventFired||0))&&b.call(n,a)}):n["on"+a]=b;return this},setRadialReference:function(a){var b=this.renderer.gradients[this.element.gradient];this.element.radialReference=a;b&&b.radAttr&&b.animate(this.renderer.getRadialAttr(a,b.radAttr));return this},translate:function(a,b){return this.attr({translateX:a,translateY:b})},
invert:function(a){this.inverted=a;this.updateTransform();return this},updateTransform:function(){var a=this.translateX||0,b=this.translateY||0,n=this.scaleX,e=this.scaleY,z=this.inverted,c=this.rotation,p=this.element;z&&(a+=this.attr("width"),b+=this.attr("height"));a=["translate("+a+","+b+")"];z?a.push("rotate(90) scale(-1,1)"):c&&a.push("rotate("+c+" "+(p.getAttribute("x")||0)+" "+(p.getAttribute("y")||0)+")");(r(n)||r(e))&&a.push("scale("+x(n,1)+" "+x(e,1)+")");a.length&&p.setAttribute("transform",
a.join(" "))},toFront:function(){var a=this.element;a.parentNode.appendChild(a);return this},align:function(a,b,n){var B,y,e,z,p={};y=this.renderer;e=y.alignedObjects;var f,m;if(a){if(this.alignOptions=a,this.alignByTranslate=b,!n||t(n))this.alignTo=B=n||"renderer",c(e,this),e.push(this),n=null}else a=this.alignOptions,b=this.alignByTranslate,B=this.alignTo;n=x(n,y[B],y);B=a.align;y=a.verticalAlign;e=(n.x||0)+(a.x||0);z=(n.y||0)+(a.y||0);"right"===B?f=1:"center"===B&&(f=2);f&&(e+=(n.width-(a.width||
0))/f);p[b?"translateX":"x"]=Math.round(e);"bottom"===y?m=1:"middle"===y&&(m=2);m&&(z+=(n.height-(a.height||0))/m);p[b?"translateY":"y"]=Math.round(z);this[this.placed?"animate":"attr"](p);this.placed=!0;this.alignAttr=p;return this},getBBox:function(a,n){var B,y=this.renderer,e,z=this.element,c=this.styles,p,f=this.textStr,m,t=z.style,h,w=y.cache,l=y.cacheKeys,d;n=x(n,this.rotation);e=n*q;p=c&&c.fontSize;void 0!==f&&(d=f.toString(),-1===d.indexOf("\x3c")&&(d=d.replace(/[0-9]/g,"0")),d+=["",n||0,
p,z.style.width].join());d&&!a&&(B=w[d]);if(!B){if(z.namespaceURI===this.SVG_NS||y.forExport){try{h=this.fakeTS&&function(a){u(z.querySelectorAll(".highcharts-text-shadow"),function(b){b.style.display=a})},G&&t.textShadow?(m=t.textShadow,t.textShadow=""):h&&h("none"),B=z.getBBox?F({},z.getBBox()):{width:z.offsetWidth,height:z.offsetHeight},m?t.textShadow=m:h&&h("")}catch(W){}if(!B||0>B.width)B={width:0,height:0}}else B=this.htmlGetBBox();y.isSVG&&(a=B.width,y=B.height,b&&c&&"11px"===c.fontSize&&"16.9"===
y.toPrecision(3)&&(B.height=y=14),n&&(B.width=Math.abs(y*Math.sin(e))+Math.abs(a*Math.cos(e)),B.height=Math.abs(y*Math.cos(e))+Math.abs(a*Math.sin(e))));if(d&&0<B.height){for(;250<l.length;)delete w[l.shift()];w[d]||l.push(d);w[d]=B}}return B},show:function(a){return this.attr({visibility:a?"inherit":"visible"})},hide:function(){return this.attr({visibility:"hidden"})},fadeOut:function(a){var b=this;b.animate({opacity:0},{duration:a||150,complete:function(){b.attr({y:-9999})}})},add:function(a){var b=
this.renderer,B=this.element,n;a&&(this.parentGroup=a);this.parentInverted=a&&a.inverted;void 0!==this.textStr&&b.buildText(this);this.added=!0;if(!a||a.handleZ||this.zIndex)n=this.zIndexSetter();n||(a?a.element:b.box).appendChild(B);if(this.onAdd)this.onAdd();return this},safeRemoveChild:function(a){var b=a.parentNode;b&&b.removeChild(a)},destroy:function(){var a=this.element||{},b=this.renderer.isSVG&&"SPAN"===a.nodeName&&this.parentGroup,n,e;a.onclick=a.onmouseout=a.onmouseover=a.onmousemove=a.point=
null;N(this);this.clipPath&&(this.clipPath=this.clipPath.destroy());if(this.stops){for(e=0;e<this.stops.length;e++)this.stops[e]=this.stops[e].destroy();this.stops=null}this.safeRemoveChild(a);for(this.destroyShadows();b&&b.div&&0===b.div.childNodes.length;)a=b.parentGroup,this.safeRemoveChild(b.div),delete b.div,b=a;this.alignTo&&c(this.renderer.alignedObjects,this);for(n in this)delete this[n];return null},shadow:function(a,b,n){var B=[],e,y,z=this.element,c,p,f,m;if(!a)this.destroyShadows();else if(!this.shadows){p=
x(a.width,3);f=(a.opacity||.15)/p;m=this.parentInverted?"(-1,-1)":"("+x(a.offsetX,1)+", "+x(a.offsetY,1)+")";for(e=1;e<=p;e++)y=z.cloneNode(0),c=2*p+1-2*e,k(y,{isShadow:"true",stroke:a.color||"#000000","stroke-opacity":f*e,"stroke-width":c,transform:"translate"+m,fill:"none"}),n&&(k(y,"height",Math.max(k(y,"height")-c,0)),y.cutHeight=c),b?b.element.appendChild(y):z.parentNode.insertBefore(y,z),B.push(y);this.shadows=B}return this},destroyShadows:function(){u(this.shadows||[],function(a){this.safeRemoveChild(a)},
this);this.shadows=void 0},xGetter:function(a){"circle"===this.element.nodeName&&("x"===a?a="cx":"y"===a&&(a="cy"));return this._defaultGetter(a)},_defaultGetter:function(a){a=x(this[a],this.element?this.element.getAttribute(a):null,0);/^[\-0-9\.]+$/.test(a)&&(a=parseFloat(a));return a},dSetter:function(a,b,n){a&&a.join&&(a=a.join(" "));/(NaN| {2}|^$)/.test(a)&&(a="M 0 0");n.setAttribute(b,a);this[b]=a},dashstyleSetter:function(a){var b,n=this["stroke-width"];"inherit"===n&&(n=1);if(a=a&&a.toLowerCase()){a=
a.replace("shortdashdotdot","3,1,1,1,1,1,").replace("shortdashdot","3,1,1,1").replace("shortdot","1,1,").replace("shortdash","3,1,").replace("longdash","8,3,").replace(/dot/g,"1,3,").replace("dash","4,3,").replace(/,$/,"").split(",");for(b=a.length;b--;)a[b]=I(a[b])*n;a=a.join(",").replace(/NaN/g,"none");this.element.setAttribute("stroke-dasharray",a)}},alignSetter:function(a){this.element.setAttribute("text-anchor",{left:"start",center:"middle",right:"end"}[a])},opacitySetter:function(a,b,n){this[b]=
a;n.setAttribute(b,a)},titleSetter:function(a){var b=this.element.getElementsByTagName("title")[0];b||(b=h.createElementNS(this.SVG_NS,"title"),this.element.appendChild(b));b.firstChild&&b.removeChild(b.firstChild);b.appendChild(h.createTextNode(String(x(a),"").replace(/<[^>]*>/g,"")))},textSetter:function(a){a!==this.textStr&&(delete this.bBox,this.textStr=a,this.added&&this.renderer.buildText(this))},fillSetter:function(a,b,n){"string"===typeof a?n.setAttribute(b,a):a&&this.colorGradient(a,b,n)},
visibilitySetter:function(a,b,n){"inherit"===a?n.removeAttribute(b):n.setAttribute(b,a)},zIndexSetter:function(a,b){var n=this.renderer,e=this.parentGroup,B=(e||n).element||n.box,y,z=this.element,c;y=this.added;var p;r(a)&&(z.zIndex=a,a=+a,this[b]===a&&(y=!1),this[b]=a);if(y){(a=this.zIndex)&&e&&(e.handleZ=!0);b=B.childNodes;for(p=0;p<b.length&&!c;p++)e=b[p],y=e.zIndex,e!==z&&(I(y)>a||!r(a)&&r(y)||0>a&&!r(y)&&B!==n.box)&&(B.insertBefore(z,e),c=!0);c||B.appendChild(z)}return c},_defaultSetter:function(a,
b,n){n.setAttribute(b,a)}};C.prototype.yGetter=C.prototype.xGetter;C.prototype.translateXSetter=C.prototype.translateYSetter=C.prototype.rotationSetter=C.prototype.verticalAlignSetter=C.prototype.scaleXSetter=C.prototype.scaleYSetter=function(a,b){this[b]=a;this.doTransform=!0};C.prototype["stroke-widthSetter"]=C.prototype.strokeSetter=function(a,b,n){this[b]=a;this.stroke&&this["stroke-width"]?(C.prototype.fillSetter.call(this,this.stroke,"stroke",n),n.setAttribute("stroke-width",this["stroke-width"]),
this.hasStroke=!0):"stroke-width"===b&&0===a&&this.hasStroke&&(n.removeAttribute("stroke"),this.hasStroke=!1)};A=a.SVGRenderer=function(){this.init.apply(this,arguments)};A.prototype={Element:C,SVG_NS:z,init:function(a,b,n,e,z,c){var B;e=this.createElement("svg").attr({version:"1.1","class":"highcharts-root"}).css(this.getStyle(e));B=e.element;a.appendChild(B);-1===a.innerHTML.indexOf("xmlns")&&k(B,"xmlns",this.SVG_NS);this.isSVG=!0;this.box=B;this.boxWrapper=e;this.alignedObjects=[];this.url=(G||
L)&&h.getElementsByTagName("base").length?O.location.href.replace(/#.*?$/,"").replace(/([\('\)])/g,"\\$1").replace(/ /g,"%20"):"";this.createElement("desc").add().element.appendChild(h.createTextNode("Created with Highcharts 5.0.2-modified"));this.defs=this.createElement("defs").add();this.allowHTML=c;this.forExport=z;this.gradients={};this.cache={};this.cacheKeys=[];this.imgCount=0;this.setSize(b,n,!1);var y;G&&a.getBoundingClientRect&&(b=function(){v(a,{left:0,top:0});y=a.getBoundingClientRect();
v(a,{left:Math.ceil(y.left)-y.left+"px",top:Math.ceil(y.top)-y.top+"px"})},b(),this.unSubPixelFix=E(O,"resize",b))},getStyle:function(a){return this.style=F({fontFamily:'"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif',fontSize:"12px"},a)},setStyle:function(a){this.boxWrapper.css(this.getStyle(a))},isHidden:function(){return!this.boxWrapper.getBBox().width},destroy:function(){var a=this.defs;this.box=null;this.boxWrapper=this.boxWrapper.destroy();f(this.gradients||{});this.gradients=
null;a&&(this.defs=a.destroy());this.unSubPixelFix&&this.unSubPixelFix();return this.alignedObjects=null},createElement:function(a){var b=new this.Element;b.init(this,a);return b},draw:K,getRadialAttr:function(a,b){return{cx:a[0]-a[2]/2+b.cx*a[2],cy:a[1]-a[2]/2+b.cy*a[2],r:b.r*a[2]}},buildText:function(a){for(var b=a.element,c=this,B=c.forExport,p=x(a.textStr,"").toString(),f=-1!==p.indexOf("\x3c"),m=b.childNodes,t,w,d,l,g=k(b,"x"),D=a.styles,J=a.textWidth,r=D&&D.lineHeight,q=D&&D.textShadow,L=D&&
"ellipsis"===D.textOverflow,O=m.length,P=J&&!a.added&&this.box,F=function(a){var b;b=/(px|em)$/.test(a&&a.style.fontSize)?a.style.fontSize:D&&D.fontSize||c.style.fontSize||12;return r?I(r):c.fontMetrics(b,a).h};O--;)b.removeChild(m[O]);f||q||L||J||-1!==p.indexOf(" ")?(t=/<.*class="([^"]+)".*>/,w=/<.*style="([^"]+)".*>/,d=/<.*href="(http[^"]+)".*>/,P&&P.appendChild(b),p=f?p.replace(/<(b|strong)>/g,'\x3cspan style\x3d"font-weight:bold"\x3e').replace(/<(i|em)>/g,'\x3cspan style\x3d"font-style:italic"\x3e').replace(/<a/g,
"\x3cspan").replace(/<\/(b|strong|i|em|a)>/g,"\x3c/span\x3e").split(/<br.*?>/g):[p],p=e(p,function(a){return""!==a}),u(p,function(e,y){var p,f=0;e=e.replace(/^\s+|\s+$/g,"").replace(/<span/g,"|||\x3cspan").replace(/<\/span>/g,"\x3c/span\x3e|||");p=e.split("|||");u(p,function(e){if(""!==e||1===p.length){var m={},x=h.createElementNS(c.SVG_NS,"tspan"),u,I;t.test(e)&&(u=e.match(t)[1],k(x,"class",u));w.test(e)&&(I=e.match(w)[1].replace(/(;| |^)color([ :])/,"$1fill$2"),k(x,"style",I));d.test(e)&&!B&&(k(x,
"onclick",'location.href\x3d"'+e.match(d)[1]+'"'),v(x,{cursor:"pointer"}));e=(e.replace(/<(.|\n)*?>/g,"")||" ").replace(/&lt;/g,"\x3c").replace(/&gt;/g,"\x3e");if(" "!==e){x.appendChild(h.createTextNode(e));f?m.dx=0:y&&null!==g&&(m.x=g);k(x,m);b.appendChild(x);!f&&y&&(!n&&B&&v(x,{display:"block"}),k(x,"dy",F(x)));if(J){m=e.replace(/([^\^])-/g,"$1- ").split(" ");u="nowrap"===D.whiteSpace;for(var r=1<p.length||y||1<m.length&&!u,R,q,O=[],S=F(x),P=a.rotation,Q=e,K=Q.length;(r||L)&&(m.length||O.length);)a.rotation=
0,R=a.getBBox(!0),q=R.width,!n&&c.forExport&&(q=c.measureSpanWidth(x.firstChild.data,a.styles)),R=q>J,void 0===l&&(l=R),L&&l?(K/=2,""===Q||!R&&.5>K?m=[]:(Q=e.substring(0,Q.length+(R?-1:1)*Math.ceil(K)),m=[Q+(3<J?"\u2026":"")],x.removeChild(x.firstChild))):R&&1!==m.length?(x.removeChild(x.firstChild),O.unshift(m.pop())):(m=O,O=[],m.length&&!u&&(x=h.createElementNS(z,"tspan"),k(x,{dy:S,x:g}),I&&k(x,"style",I),b.appendChild(x)),q>J&&(J=q)),m.length&&x.appendChild(h.createTextNode(m.join(" ").replace(/- /g,
"-")));a.rotation=P}f++}}})}),l&&a.attr("title",a.textStr),P&&P.removeChild(b),q&&a.applyTextShadow&&a.applyTextShadow(q)):b.appendChild(h.createTextNode(p.replace(/&lt;/g,"\x3c").replace(/&gt;/g,"\x3e")))},getContrast:function(a){a=g(a).rgba;return 510<a[0]+a[1]+a[2]?"#000000":"#FFFFFF"},button:function(a,n,e,z,c,p,f,m,t){var y=this.label(a,n,e,t,null,null,null,null,"button"),B=0;y.attr(D({padding:8,r:2},c));var x,h,w,l;c=D({fill:"#f7f7f7",stroke:"#cccccc","stroke-width":1,style:{color:"#333333",
cursor:"pointer",fontWeight:"normal"}},c);x=c.style;delete c.style;p=D(c,{fill:"#e6e6e6"},p);h=p.style;delete p.style;f=D(c,{fill:"#e6ebf5",style:{color:"#000000",fontWeight:"bold"}},f);w=f.style;delete f.style;m=D(c,{style:{color:"#cccccc"}},m);l=m.style;delete m.style;E(y.element,b?"mouseover":"mouseenter",function(){3!==B&&y.setState(1)});E(y.element,b?"mouseout":"mouseleave",function(){3!==B&&y.setState(B)});y.setState=function(a){1!==a&&(y.state=B=a);y.removeClass(/highcharts-button-(normal|hover|pressed|disabled)/).addClass("highcharts-button-"+
["normal","hover","pressed","disabled"][a||0]);y.attr([c,p,f,m][a||0]).css([x,h,w,l][a||0])};y.attr(c).css(F({cursor:"default"},x));return y.on("click",function(a){3!==B&&z.call(y,a)})},crispLine:function(a,b){a[1]===a[4]&&(a[1]=a[4]=Math.round(a[1])-b%2/2);a[2]===a[5]&&(a[2]=a[5]=Math.round(a[2])+b%2/2);return a},path:function(a){var b={fill:"none"};w(a)?b.d=a:p(a)&&F(b,a);return this.createElement("path").attr(b)},circle:function(a,b,n){a=p(a)?a:{x:a,y:b,r:n};b=this.createElement("circle");b.xSetter=
b.ySetter=function(a,b,n){n.setAttribute("c"+b,a)};return b.attr(a)},arc:function(a,b,n,e,c,z){p(a)&&(b=a.y,n=a.r,e=a.innerR,c=a.start,z=a.end,a=a.x);a=this.symbol("arc",a||0,b||0,n||0,n||0,{innerR:e||0,start:c||0,end:z||0});a.r=n;return a},rect:function(a,b,n,e,c,z){c=p(a)?a.r:c;var y=this.createElement("rect");a=p(a)?a:void 0===a?{}:{x:a,y:b,width:Math.max(n,0),height:Math.max(e,0)};void 0!==z&&(a.strokeWidth=z,a=y.crisp(a));a.fill="none";c&&(a.r=c);y.rSetter=function(a,b,n){k(n,{rx:a,ry:a})};return y.attr(a)},
setSize:function(a,b,n){var e=this.alignedObjects,c=e.length;this.width=a;this.height=b;for(this.boxWrapper.animate({width:a,height:b},{step:function(){this.attr({viewBox:"0 0 "+this.attr("width")+" "+this.attr("height")})},duration:x(n,!0)?void 0:0});c--;)e[c].align()},g:function(a){var b=this.createElement("g");return a?b.attr({"class":"highcharts-"+a}):b},image:function(a,b,n,e,c){var z={preserveAspectRatio:"none"};1<arguments.length&&F(z,{x:b,y:n,width:e,height:c});z=this.createElement("image").attr(z);
z.element.setAttributeNS?z.element.setAttributeNS("http://www.w3.org/1999/xlink","href",a):z.element.setAttribute("hc-svg-href",a);return z},symbol:function(a,b,n,e,c,z){var p=this,y,f=this.symbols[a],m=r(b)&&f&&f(Math.round(b),Math.round(n),e,c,z),t=/^url\((.*?)\)$/,B,w;f?(y=this.path(m),y.attr("fill","none"),F(y,{symbolName:a,x:b,y:n,width:e,height:c}),z&&F(y,z)):t.test(a)&&(B=a.match(t)[1],y=this.image(B),y.imgwidth=x(P[B]&&P[B].width,z&&z.width),y.imgheight=x(P[B]&&P[B].height,z&&z.height),w=
function(){y.attr({width:y.width,height:y.height})},u(["width","height"],function(a){y[a+"Setter"]=function(a,b){var n={},e=this["img"+b],c="width"===b?"translateX":"translateY";this[b]=a;r(e)&&(this.element&&this.element.setAttribute(b,e),this.alignByTranslate||(n[c]=((this[b]||0)-e)/2,this.attr(n)))}}),r(b)&&y.attr({x:b,y:n}),y.isImg=!0,r(y.imgwidth)&&r(y.imgheight)?w():(y.attr({width:0,height:0}),l("img",{onload:function(){var a=d[p.chartIndex];0===this.width&&(v(this,{position:"absolute",top:"-999em"}),
h.body.appendChild(this));P[B]={width:this.width,height:this.height};y.imgwidth=this.width;y.imgheight=this.height;y.element&&w();this.parentNode&&this.parentNode.removeChild(this);p.imgCount--;if(!p.imgCount&&a&&a.onload)a.onload()},src:B}),this.imgCount++));return y},symbols:{circle:function(a,b,n,e){var c=.166*n;return["M",a+n/2,b,"C",a+n+c,b,a+n+c,b+e,a+n/2,b+e,"C",a-c,b+e,a-c,b,a+n/2,b,"Z"]},square:function(a,b,n,e){return["M",a,b,"L",a+n,b,a+n,b+e,a,b+e,"Z"]},triangle:function(a,b,n,e){return["M",
a+n/2,b,"L",a+n,b+e,a,b+e,"Z"]},"triangle-down":function(a,b,n,e){return["M",a,b,"L",a+n,b,a+n/2,b+e,"Z"]},diamond:function(a,b,n,e){return["M",a+n/2,b,"L",a+n,b+e/2,a+n/2,b+e,a,b+e/2,"Z"]},arc:function(a,b,n,e,c){var z=c.start;n=c.r||n||e;var p=c.end-.001;e=c.innerR;var f=c.open,y=Math.cos(z),m=Math.sin(z),t=Math.cos(p),p=Math.sin(p);c=c.end-z<Math.PI?0:1;return["M",a+n*y,b+n*m,"A",n,n,0,c,1,a+n*t,b+n*p,f?"M":"L",a+e*t,b+e*p,"A",e,e,0,c,0,a+e*y,b+e*m,f?"":"Z"]},callout:function(a,b,n,e,c){var z=
Math.min(c&&c.r||0,n,e),p=z+6,f=c&&c.anchorX;c=c&&c.anchorY;var m;m=["M",a+z,b,"L",a+n-z,b,"C",a+n,b,a+n,b,a+n,b+z,"L",a+n,b+e-z,"C",a+n,b+e,a+n,b+e,a+n-z,b+e,"L",a+z,b+e,"C",a,b+e,a,b+e,a,b+e-z,"L",a,b+z,"C",a,b,a,b,a+z,b];f&&f>n?c>b+p&&c<b+e-p?m.splice(13,3,"L",a+n,c-6,a+n+6,c,a+n,c+6,a+n,b+e-z):m.splice(13,3,"L",a+n,e/2,f,c,a+n,e/2,a+n,b+e-z):f&&0>f?c>b+p&&c<b+e-p?m.splice(33,3,"L",a,c+6,a-6,c,a,c-6,a,b+z):m.splice(33,3,"L",a,e/2,f,c,a,e/2,a,b+z):c&&c>e&&f>a+p&&f<a+n-p?m.splice(23,3,"L",f+6,b+
e,f,b+e+6,f-6,b+e,a+z,b+e):c&&0>c&&f>a+p&&f<a+n-p&&m.splice(3,3,"L",f-6,b,f,b-6,f+6,b,n-z,b);return m}},clipRect:function(b,n,e,c){var z=a.uniqueKey(),p=this.createElement("clipPath").attr({id:z}).add(this.defs);b=this.rect(b,n,e,c,0).add(p);b.id=z;b.clipPath=p;b.count=0;return b},text:function(a,b,e,c){var z=!n&&this.forExport,p={};if(c&&(this.allowHTML||!this.forExport))return this.html(a,b,e);p.x=Math.round(b||0);e&&(p.y=Math.round(e));if(a||0===a)p.text=a;a=this.createElement("text").attr(p);
z&&a.css({position:"absolute"});c||(a.xSetter=function(a,b,n){var e=n.getElementsByTagName("tspan"),c,z=n.getAttribute(b),p;for(p=0;p<e.length;p++)c=e[p],c.getAttribute(b)===z&&c.setAttribute(b,a);n.setAttribute(b,a)});return a},fontMetrics:function(a,b){a=a||b&&b.style&&b.style.fontSize||this.style&&this.style.fontSize;a=/px/.test(a)?I(a):/em/.test(a)?parseFloat(a)*this.fontMetrics(null,b.parentNode).f:12;b=24>a?a+3:Math.round(1.2*a);return{h:b,b:Math.round(.8*b),f:a}},rotCorr:function(a,b,n){var e=
a;b&&n&&(e=Math.max(e*Math.cos(b*q),4));return{x:-a/3*Math.sin(b*q),y:e}},label:function(a,b,n,e,c,z,p,f,m){var t=this,y=t.g("button"!==m&&"label"),x=y.text=t.text("",0,0,p).attr({zIndex:1}),h,w,l=0,d=3,B=0,g,I,q,L,O,P={},k,K,R=/^url\((.*?)\)$/.test(e),G=R,N,S,v,Q;m&&y.addClass("highcharts-"+m);G=R;N=function(){return(k||0)%2/2};S=function(){var a=x.element.style,b={};w=(void 0===g||void 0===I||O)&&r(x.textStr)&&x.getBBox();y.width=(g||w.width||0)+2*d+B;y.height=(I||w.height||0)+2*d;K=d+t.fontMetrics(a&&
a.fontSize,x).b;G&&(h||(y.box=h=t.symbols[e]||R?t.symbol(e):t.rect(),h.addClass(("button"===m?"":"highcharts-label-box")+(m?" highcharts-"+m+"-box":"")),h.add(y),a=N(),b.x=a,b.y=(f?-K:0)+a),b.width=Math.round(y.width),b.height=Math.round(y.height),h.attr(F(b,P)),P={})};v=function(){var a=B+d,b;b=f?0:K;r(g)&&w&&("center"===O||"right"===O)&&(a+={center:.5,right:1}[O]*(g-w.width));if(a!==x.x||b!==x.y)x.attr("x",a),void 0!==b&&x.attr("y",b);x.x=a;x.y=b};Q=function(a,b){h?h.attr(a,b):P[a]=b};y.onAdd=function(){x.add(y);
y.attr({text:a||0===a?a:"",x:b,y:n});h&&r(c)&&y.attr({anchorX:c,anchorY:z})};y.widthSetter=function(a){g=a};y.heightSetter=function(a){I=a};y["text-alignSetter"]=function(a){O=a};y.paddingSetter=function(a){r(a)&&a!==d&&(d=y.padding=a,v())};y.paddingLeftSetter=function(a){r(a)&&a!==B&&(B=a,v())};y.alignSetter=function(a){a={left:0,center:.5,right:1}[a];a!==l&&(l=a,w&&y.attr({x:q}))};y.textSetter=function(a){void 0!==a&&x.textSetter(a);S();v()};y["stroke-widthSetter"]=function(a,b){a&&(G=!0);k=this["stroke-width"]=
a;Q(b,a)};y.strokeSetter=y.fillSetter=y.rSetter=function(a,b){"fill"===b&&a&&(G=!0);Q(b,a)};y.anchorXSetter=function(a,b){c=a;Q(b,Math.round(a)-N()-q)};y.anchorYSetter=function(a,b){z=a;Q(b,a-L)};y.xSetter=function(a){y.x=a;l&&(a-=l*((g||w.width)+2*d));q=Math.round(a);y.attr("translateX",q)};y.ySetter=function(a){L=y.y=Math.round(a);y.attr("translateY",L)};var T=y.css;return F(y,{css:function(a){if(a){var b={};a=D(a);u(y.textProps,function(n){void 0!==a[n]&&(b[n]=a[n],delete a[n])});x.css(b)}return T.call(y,
a)},getBBox:function(){return{width:w.width+2*d,height:w.height+2*d,x:w.x-d,y:w.y-d}},shadow:function(a){a&&(S(),h&&h.shadow(a));return y},destroy:function(){J(y.element,"mouseenter");J(y.element,"mouseleave");x&&(x=x.destroy());h&&(h=h.destroy());C.prototype.destroy.call(y);y=t=S=v=Q=null}})}};a.Renderer=A})(M);(function(a){var C=a.attr,A=a.createElement,E=a.css,H=a.defined,k=a.each,d=a.extend,g=a.isFirefox,v=a.isMS,l=a.isWebKit,r=a.pInt,q=a.SVGRenderer,f=a.win,h=a.wrap;d(a.SVGElement.prototype,
{htmlCss:function(a){var f=this.element;if(f=a&&"SPAN"===f.tagName&&a.width)delete a.width,this.textWidth=f,this.updateTransform();a&&"ellipsis"===a.textOverflow&&(a.whiteSpace="nowrap",a.overflow="hidden");this.styles=d(this.styles,a);E(this.element,a);return this},htmlGetBBox:function(){var a=this.element;"text"===a.nodeName&&(a.style.position="absolute");return{x:a.offsetLeft,y:a.offsetTop,width:a.offsetWidth,height:a.offsetHeight}},htmlUpdateTransform:function(){if(this.added){var a=this.renderer,
f=this.element,c=this.translateX||0,e=this.translateY||0,m=this.x||0,h=this.y||0,d=this.textAlign||"left",b={left:0,center:.5,right:1}[d],p=this.styles;E(f,{marginLeft:c,marginTop:e});this.shadows&&k(this.shadows,function(a){E(a,{marginLeft:c+1,marginTop:e+1})});this.inverted&&k(f.childNodes,function(b){a.invertChild(b,f)});if("SPAN"===f.tagName){var t=this.rotation,g=r(this.textWidth),D=p&&p.whiteSpace,q=[t,d,f.innerHTML,this.textWidth,this.textAlign].join();q!==this.cTT&&(p=a.fontMetrics(f.style.fontSize).b,
H(t)&&this.setSpanRotation(t,b,p),E(f,{width:"",whiteSpace:D||"nowrap"}),f.offsetWidth>g&&/[ \-]/.test(f.textContent||f.innerText)&&E(f,{width:g+"px",display:"block",whiteSpace:D||"normal"}),this.getSpanCorrection(f.offsetWidth,p,b,t,d));E(f,{left:m+(this.xCorr||0)+"px",top:h+(this.yCorr||0)+"px"});l&&(p=f.offsetHeight);this.cTT=q}}else this.alignOnAdd=!0},setSpanRotation:function(a,h,c){var e={},m=v?"-ms-transform":l?"-webkit-transform":g?"MozTransform":f.opera?"-o-transform":"";e[m]=e.transform=
"rotate("+a+"deg)";e[m+(g?"Origin":"-origin")]=e.transformOrigin=100*h+"% "+c+"px";E(this.element,e)},getSpanCorrection:function(a,f,c){this.xCorr=-a*c;this.yCorr=-f}});d(q.prototype,{html:function(a,f,c){var e=this.createElement("span"),m=e.element,w=e.renderer,l=w.isSVG,b=function(a,b){k(["opacity","visibility"],function(e){h(a,e+"Setter",function(a,e,c,p){a.call(this,e,c,p);b[c]=e})})};e.textSetter=function(a){a!==m.innerHTML&&delete this.bBox;m.innerHTML=this.textStr=a;e.htmlUpdateTransform()};
l&&b(e,e.element.style);e.xSetter=e.ySetter=e.alignSetter=e.rotationSetter=function(a,b){"align"===b&&(b="textAlign");e[b]=a;e.htmlUpdateTransform()};e.attr({text:a,x:Math.round(f),y:Math.round(c)}).css({fontFamily:this.style.fontFamily,fontSize:this.style.fontSize,position:"absolute"});m.style.whiteSpace="nowrap";e.css=e.htmlCss;l&&(e.add=function(a){var c,f=w.box.parentNode,p=[];if(this.parentGroup=a){if(c=a.div,!c){for(;a;)p.push(a),a=a.parentGroup;k(p.reverse(),function(a){var e,p=C(a.element,
"class");p&&(p={className:p});c=a.div=a.div||A("div",p,{position:"absolute",left:(a.translateX||0)+"px",top:(a.translateY||0)+"px",display:a.display,opacity:a.opacity,pointerEvents:a.styles&&a.styles.pointerEvents},c||f);e=c.style;d(a,{translateXSetter:function(b,c){e.left=b+"px";a[c]=b;a.doTransform=!0},translateYSetter:function(b,c){e.top=b+"px";a[c]=b;a.doTransform=!0}});b(a,e)})}}else c=f;c.appendChild(m);e.added=!0;e.alignOnAdd&&e.htmlUpdateTransform();return e});return e}})})(M);(function(a){var C,
A,E=a.createElement,H=a.css,k=a.defined,d=a.deg2rad,g=a.discardElement,v=a.doc,l=a.each,r=a.erase,q=a.extend;C=a.extendClass;var f=a.isArray,h=a.isNumber,u=a.isObject,F=a.merge;A=a.noop;var c=a.pick,e=a.pInt,m=a.SVGElement,w=a.SVGRenderer,G=a.win;a.svg||(A={docMode8:v&&8===v.documentMode,init:function(a,e){var b=["\x3c",e,' filled\x3d"f" stroked\x3d"f"'],c=["position: ","absolute",";"],f="div"===e;("shape"===e||f)&&c.push("left:0;top:0;width:1px;height:1px;");c.push("visibility: ",f?"hidden":"visible");
b.push(' style\x3d"',c.join(""),'"/\x3e');e&&(b=f||"span"===e||"img"===e?b.join(""):a.prepVML(b),this.element=E(b));this.renderer=a},add:function(a){var b=this.renderer,e=this.element,c=b.box,f=a&&a.inverted,c=a?a.element||a:c;a&&(this.parentGroup=a);f&&b.invertChild(e,c);c.appendChild(e);this.added=!0;this.alignOnAdd&&!this.deferUpdateTransform&&this.updateTransform();if(this.onAdd)this.onAdd();this.className&&this.attr("class",this.className);return this},updateTransform:m.prototype.htmlUpdateTransform,
setSpanRotation:function(){var a=this.rotation,e=Math.cos(a*d),c=Math.sin(a*d);H(this.element,{filter:a?["progid:DXImageTransform.Microsoft.Matrix(M11\x3d",e,", M12\x3d",-c,", M21\x3d",c,", M22\x3d",e,", sizingMethod\x3d'auto expand')"].join(""):"none"})},getSpanCorrection:function(a,e,f,m,h){var b=m?Math.cos(m*d):1,p=m?Math.sin(m*d):0,t=c(this.elemHeight,this.element.offsetHeight),w;this.xCorr=0>b&&-a;this.yCorr=0>p&&-t;w=0>b*p;this.xCorr+=p*e*(w?1-f:f);this.yCorr-=b*e*(m?w?f:1-f:1);h&&"left"!==
h&&(this.xCorr-=a*f*(0>b?-1:1),m&&(this.yCorr-=t*f*(0>p?-1:1)),H(this.element,{textAlign:h}))},pathToVML:function(a){for(var b=a.length,e=[];b--;)h(a[b])?e[b]=Math.round(10*a[b])-5:"Z"===a[b]?e[b]="x":(e[b]=a[b],!a.isArc||"wa"!==a[b]&&"at"!==a[b]||(e[b+5]===e[b+7]&&(e[b+7]+=a[b+7]>a[b+5]?1:-1),e[b+6]===e[b+8]&&(e[b+8]+=a[b+8]>a[b+6]?1:-1)));return e.join(" ")||"x"},clip:function(a){var b=this,e;a?(e=a.members,r(e,b),e.push(b),b.destroyClip=function(){r(e,b)},a=a.getCSS(b)):(b.destroyClip&&b.destroyClip(),
a={clip:b.docMode8?"inherit":"rect(auto)"});return b.css(a)},css:m.prototype.htmlCss,safeRemoveChild:function(a){a.parentNode&&g(a)},destroy:function(){this.destroyClip&&this.destroyClip();return m.prototype.destroy.apply(this)},on:function(a,e){this.element["on"+a]=function(){var a=G.event;a.target=a.srcElement;e(a)};return this},cutOffPath:function(a,c){var b;a=a.split(/[ ,]/);b=a.length;if(9===b||11===b)a[b-4]=a[b-2]=e(a[b-2])-10*c;return a.join(" ")},shadow:function(a,f,m){var b=[],p,h=this.element,
x=this.renderer,w,t=h.style,d,n=h.path,z,l,g,B;n&&"string"!==typeof n.value&&(n="x");l=n;if(a){g=c(a.width,3);B=(a.opacity||.15)/g;for(p=1;3>=p;p++)z=2*g+1-2*p,m&&(l=this.cutOffPath(n.value,z+.5)),d=['\x3cshape isShadow\x3d"true" strokeweight\x3d"',z,'" filled\x3d"false" path\x3d"',l,'" coordsize\x3d"10 10" style\x3d"',h.style.cssText,'" /\x3e'],w=E(x.prepVML(d),null,{left:e(t.left)+c(a.offsetX,1),top:e(t.top)+c(a.offsetY,1)}),m&&(w.cutOff=z+1),d=['\x3cstroke color\x3d"',a.color||"#000000",'" opacity\x3d"',
B*p,'"/\x3e'],E(x.prepVML(d),null,null,w),f?f.element.appendChild(w):h.parentNode.insertBefore(w,h),b.push(w);this.shadows=b}return this},updateShadows:A,setAttr:function(a,e){this.docMode8?this.element[a]=e:this.element.setAttribute(a,e)},classSetter:function(a){(this.added?this.element:this).className=a},dashstyleSetter:function(a,e,c){(c.getElementsByTagName("stroke")[0]||E(this.renderer.prepVML(["\x3cstroke/\x3e"]),null,null,c))[e]=a||"solid";this[e]=a},dSetter:function(a,e,c){var b=this.shadows;
a=a||[];this.d=a.join&&a.join(" ");c.path=a=this.pathToVML(a);if(b)for(c=b.length;c--;)b[c].path=b[c].cutOff?this.cutOffPath(a,b[c].cutOff):a;this.setAttr(e,a)},fillSetter:function(a,e,c){var b=c.nodeName;"SPAN"===b?c.style.color=a:"IMG"!==b&&(c.filled="none"!==a,this.setAttr("fillcolor",this.renderer.color(a,c,e,this)))},"fill-opacitySetter":function(a,e,c){E(this.renderer.prepVML(["\x3c",e.split("-")[0],' opacity\x3d"',a,'"/\x3e']),null,null,c)},opacitySetter:A,rotationSetter:function(a,e,c){c=
c.style;this[e]=c[e]=a;c.left=-Math.round(Math.sin(a*d)+1)+"px";c.top=Math.round(Math.cos(a*d))+"px"},strokeSetter:function(a,e,c){this.setAttr("strokecolor",this.renderer.color(a,c,e,this))},"stroke-widthSetter":function(a,e,c){c.stroked=!!a;this[e]=a;h(a)&&(a+="px");this.setAttr("strokeweight",a)},titleSetter:function(a,e){this.setAttr(e,a)},visibilitySetter:function(a,e,c){"inherit"===a&&(a="visible");this.shadows&&l(this.shadows,function(b){b.style[e]=a});"DIV"===c.nodeName&&(a="hidden"===a?"-999em":
0,this.docMode8||(c.style[e]=a?"visible":"hidden"),e="top");c.style[e]=a},xSetter:function(a,e,c){this[e]=a;"x"===e?e="left":"y"===e&&(e="top");this.updateClipping?(this[e]=a,this.updateClipping()):c.style[e]=a},zIndexSetter:function(a,e,c){c.style[e]=a}},A["stroke-opacitySetter"]=A["fill-opacitySetter"],a.VMLElement=A=C(m,A),A.prototype.ySetter=A.prototype.widthSetter=A.prototype.heightSetter=A.prototype.xSetter,A={Element:A,isIE8:-1<G.navigator.userAgent.indexOf("MSIE 8.0"),init:function(a,e,c){var b,
f;this.alignedObjects=[];b=this.createElement("div").css({position:"relative"});f=b.element;a.appendChild(b.element);this.isVML=!0;this.box=f;this.boxWrapper=b;this.gradients={};this.cache={};this.cacheKeys=[];this.imgCount=0;this.setSize(e,c,!1);if(!v.namespaces.hcv){v.namespaces.add("hcv","urn:schemas-microsoft-com:vml");try{v.createStyleSheet().cssText="hcv\\:fill, hcv\\:path, hcv\\:shape, hcv\\:stroke{ behavior:url(#default#VML); display: inline-block; } "}catch(K){v.styleSheets[0].cssText+="hcv\\:fill, hcv\\:path, hcv\\:shape, hcv\\:stroke{ behavior:url(#default#VML); display: inline-block; } "}}},
isHidden:function(){return!this.box.offsetWidth},clipRect:function(a,e,c,f){var b=this.createElement(),m=u(a);return q(b,{members:[],count:0,left:(m?a.x:a)+1,top:(m?a.y:e)+1,width:(m?a.width:c)-1,height:(m?a.height:f)-1,getCSS:function(a){var b=a.element,e=b.nodeName,c=a.inverted,n=this.top-("shape"===e?b.offsetTop:0),z=this.left,b=z+this.width,f=n+this.height,n={clip:"rect("+Math.round(c?z:n)+"px,"+Math.round(c?f:b)+"px,"+Math.round(c?b:f)+"px,"+Math.round(c?n:z)+"px)"};!c&&a.docMode8&&"DIV"===e&&
q(n,{width:b+"px",height:f+"px"});return n},updateClipping:function(){l(b.members,function(a){a.element&&a.css(b.getCSS(a))})}})},color:function(b,e,c,f){var m=this,p,h=/^rgba/,w,d,g="none";b&&b.linearGradient?d="gradient":b&&b.radialGradient&&(d="pattern");if(d){var n,z,t=b.linearGradient||b.radialGradient,q,B,y,r,u,k="";b=b.stops;var L,G=[],F=function(){w=['\x3cfill colors\x3d"'+G.join(",")+'" opacity\x3d"',y,'" o:opacity2\x3d"',B,'" type\x3d"',d,'" ',k,'focus\x3d"100%" method\x3d"any" /\x3e'];
E(m.prepVML(w),null,null,e)};q=b[0];L=b[b.length-1];0<q[0]&&b.unshift([0,q[1]]);1>L[0]&&b.push([1,L[1]]);l(b,function(b,e){h.test(b[1])?(p=a.color(b[1]),n=p.get("rgb"),z=p.get("a")):(n=b[1],z=1);G.push(100*b[0]+"% "+n);e?(y=z,r=n):(B=z,u=n)});if("fill"===c)if("gradient"===d)c=t.x1||t[0]||0,b=t.y1||t[1]||0,q=t.x2||t[2]||0,t=t.y2||t[3]||0,k='angle\x3d"'+(90-180*Math.atan((t-b)/(q-c))/Math.PI)+'"',F();else{var g=t.r,v=2*g,A=2*g,C=t.cx,H=t.cy,V=e.radialReference,U,g=function(){V&&(U=f.getBBox(),C+=(V[0]-
U.x)/U.width-.5,H+=(V[1]-U.y)/U.height-.5,v*=V[2]/U.width,A*=V[2]/U.height);k='src\x3d"'+a.getOptions().global.VMLRadialGradientURL+'" size\x3d"'+v+","+A+'" origin\x3d"0.5,0.5" position\x3d"'+C+","+H+'" color2\x3d"'+u+'" ';F()};f.added?g():f.onAdd=g;g=r}else g=n}else h.test(b)&&"IMG"!==e.tagName?(p=a.color(b),f[c+"-opacitySetter"](p.get("a"),c,e),g=p.get("rgb")):(g=e.getElementsByTagName(c),g.length&&(g[0].opacity=1,g[0].type="solid"),g=b);return g},prepVML:function(a){var b=this.isIE8;a=a.join("");
b?(a=a.replace("/\x3e",' xmlns\x3d"urn:schemas-microsoft-com:vml" /\x3e'),a=-1===a.indexOf('style\x3d"')?a.replace("/\x3e",' style\x3d"display:inline-block;behavior:url(#default#VML);" /\x3e'):a.replace('style\x3d"','style\x3d"display:inline-block;behavior:url(#default#VML);')):a=a.replace("\x3c","\x3chcv:");return a},text:w.prototype.html,path:function(a){var b={coordsize:"10 10"};f(a)?b.d=a:u(a)&&q(b,a);return this.createElement("shape").attr(b)},circle:function(a,e,c){var b=this.symbol("circle");
u(a)&&(c=a.r,e=a.y,a=a.x);b.isCircle=!0;b.r=c;return b.attr({x:a,y:e})},g:function(a){var b;a&&(b={className:"highcharts-"+a,"class":"highcharts-"+a});return this.createElement("div").attr(b)},image:function(a,e,c,f,m){var b=this.createElement("img").attr({src:a});1<arguments.length&&b.attr({x:e,y:c,width:f,height:m});return b},createElement:function(a){return"rect"===a?this.symbol(a):w.prototype.createElement.call(this,a)},invertChild:function(a,c){var b=this;c=c.style;var f="IMG"===a.tagName&&a.style;
H(a,{flip:"x",left:e(c.width)-(f?e(f.top):1),top:e(c.height)-(f?e(f.left):1),rotation:-90});l(a.childNodes,function(e){b.invertChild(e,a)})},symbols:{arc:function(a,e,c,f,m){var b=m.start,h=m.end,p=m.r||c||f;c=m.innerR;f=Math.cos(b);var w=Math.sin(b),d=Math.cos(h),n=Math.sin(h);if(0===h-b)return["x"];b=["wa",a-p,e-p,a+p,e+p,a+p*f,e+p*w,a+p*d,e+p*n];m.open&&!c&&b.push("e","M",a,e);b.push("at",a-c,e-c,a+c,e+c,a+c*d,e+c*n,a+c*f,e+c*w,"x","e");b.isArc=!0;return b},circle:function(a,e,c,f,m){m&&k(m.r)&&
(c=f=2*m.r);m&&m.isCircle&&(a-=c/2,e-=f/2);return["wa",a,e,a+c,e+f,a+c,e+f/2,a+c,e+f/2,"e"]},rect:function(a,e,c,f,m){return w.prototype.symbols[k(m)&&m.r?"callout":"square"].call(0,a,e,c,f,m)}}},a.VMLRenderer=C=function(){this.init.apply(this,arguments)},C.prototype=F(w.prototype,A),a.Renderer=C);w.prototype.measureSpanWidth=function(a,e){var b=v.createElement("span");a=v.createTextNode(a);b.appendChild(a);H(b,e);this.box.appendChild(b);e=b.offsetWidth;g(b);return e}})(M);(function(a){function C(){var k=
a.defaultOptions.global,l,r=k.useUTC,q=r?"getUTC":"get",f=r?"setUTC":"set";a.Date=l=k.Date||g.Date;l.hcTimezoneOffset=r&&k.timezoneOffset;l.hcGetTimezoneOffset=r&&k.getTimezoneOffset;l.hcMakeTime=function(a,f,g,c,e,m){var h;r?(h=l.UTC.apply(0,arguments),h+=H(h)):h=(new l(a,f,d(g,1),d(c,0),d(e,0),d(m,0))).getTime();return h};E("Minutes Hours Day Date Month FullYear".split(" "),function(a){l["hcGet"+a]=q+a});E("Milliseconds Seconds Minutes Hours Date Month FullYear".split(" "),function(a){l["hcSet"+
a]=f+a})}var A=a.color,E=a.each,H=a.getTZOffset,k=a.merge,d=a.pick,g=a.win;a.defaultOptions={colors:"#7cb5ec #434348 #90ed7d #f7a35c #8085e9 #f15c80 #e4d354 #2b908f #f45b5b #91e8e1".split(" "),symbols:["circle","diamond","square","triangle","triangle-down"],lang:{loading:"Loading...",months:"January February March April May June July August September October November December".split(" "),shortMonths:"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "),weekdays:"Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),
decimalPoint:".",numericSymbols:"kMGTPE".split(""),resetZoom:"Reset zoom",resetZoomTitle:"Reset zoom level 1:1",thousandsSep:" "},global:{useUTC:!0,VMLRadialGradientURL:"http://code.highcharts.com/5.0.2-modified/gfx/vml-radial-gradient.png"},chart:{borderRadius:0,defaultSeriesType:"line",ignoreHiddenSeries:!0,spacing:[10,10,15,10],resetZoomButton:{theme:{zIndex:20},position:{align:"right",x:-10,y:10}},width:null,height:null,borderColor:"#335cad",backgroundColor:"#ffffff",plotBorderColor:"#cccccc"},
title:{text:"Chart title",align:"center",margin:15,style:{color:"#333333",fontSize:"18px"},widthAdjust:-44},subtitle:{text:"",align:"center",style:{color:"#666666"},widthAdjust:-44},plotOptions:{},labels:{style:{position:"absolute",color:"#333333"}},legend:{enabled:!0,align:"center",layout:"horizontal",labelFormatter:function(){return this.name},borderColor:"#999999",borderRadius:0,navigation:{activeColor:"#003399",inactiveColor:"#cccccc"},itemStyle:{color:"#333333",fontSize:"12px",fontWeight:"bold"},
itemHoverStyle:{color:"#000000"},itemHiddenStyle:{color:"#cccccc"},shadow:!1,itemCheckboxStyle:{position:"absolute",width:"13px",height:"13px"},squareSymbol:!0,symbolPadding:5,verticalAlign:"bottom",x:0,y:0,title:{style:{fontWeight:"bold"}}},loading:{labelStyle:{fontWeight:"bold",position:"relative",top:"45%"},style:{position:"absolute",backgroundColor:"#ffffff",opacity:.5,textAlign:"center"}},tooltip:{enabled:!0,animation:a.svg,borderRadius:3,dateTimeLabelFormats:{millisecond:"%A, %b %e, %H:%M:%S.%L",
second:"%A, %b %e, %H:%M:%S",minute:"%A, %b %e, %H:%M",hour:"%A, %b %e, %H:%M",day:"%A, %b %e, %Y",week:"Week from %A, %b %e, %Y",month:"%B %Y",year:"%Y"},footerFormat:"",padding:8,snap:a.isTouchDevice?25:10,backgroundColor:A("#f7f7f7").setOpacity(.85).get(),borderWidth:1,headerFormat:'\x3cspan style\x3d"font-size: 10px"\x3e{point.key}\x3c/span\x3e\x3cbr/\x3e',pointFormat:'\x3cspan style\x3d"color:{point.color}"\x3e\u25cf\x3c/span\x3e {series.name}: \x3cb\x3e{point.y}\x3c/b\x3e\x3cbr/\x3e',shadow:!0,
style:{color:"#333333",cursor:"default",fontSize:"12px",pointerEvents:"none",whiteSpace:"nowrap"}},credits:{enabled:!0,href:"http://www.highcharts.com",position:{align:"right",x:-10,verticalAlign:"bottom",y:-5},style:{cursor:"pointer",color:"#999999",fontSize:"9px"},text:"Highcharts.com"}};a.setOptions=function(d){a.defaultOptions=k(!0,a.defaultOptions,d);C();return a.defaultOptions};a.getOptions=function(){return a.defaultOptions};a.defaultPlotOptions=a.defaultOptions.plotOptions;C()})(M);(function(a){var C=
a.arrayMax,A=a.arrayMin,E=a.defined,H=a.destroyObjectProperties,k=a.each,d=a.erase,g=a.merge,v=a.pick;a.PlotLineOrBand=function(a,d){this.axis=a;d&&(this.options=d,this.id=d.id)};a.PlotLineOrBand.prototype={render:function(){var a=this,d=a.axis,q=d.horiz,f=a.options,h=f.label,u=a.label,k=f.to,c=f.from,e=f.value,m=E(c)&&E(k),w=E(e),G=a.svgElem,b=!G,p=[],t,L=f.color,D=v(f.zIndex,0),K=f.events,p={"class":"highcharts-plot-"+(m?"band ":"line ")+(f.className||"")},x={},I=d.chart.renderer,J=m?"bands":"lines",
N=d.log2lin;d.isLog&&(c=N(c),k=N(k),e=N(e));w?(p={stroke:L,"stroke-width":f.width},f.dashStyle&&(p.dashstyle=f.dashStyle)):m&&(L&&(p.fill=L),f.borderWidth&&(p.stroke=f.borderColor,p["stroke-width"]=f.borderWidth));x.zIndex=D;J+="-"+D;(L=d[J])||(d[J]=L=I.g("plot-"+J).attr(x).add());b&&(a.svgElem=G=I.path().attr(p).add(L));if(w)p=d.getPlotLinePath(e,G.strokeWidth());else if(m)p=d.getPlotBandPath(c,k,f);else return;if(b&&p&&p.length){if(G.attr({d:p}),K)for(t in f=function(b){G.on(b,function(e){K[b].apply(a,
[e])})},K)f(t)}else G&&(p?(G.show(),G.animate({d:p})):(G.hide(),u&&(a.label=u=u.destroy())));h&&E(h.text)&&p&&p.length&&0<d.width&&0<d.height&&!p.flat?(h=g({align:q&&m&&"center",x:q?!m&&4:10,verticalAlign:!q&&m&&"middle",y:q?m?16:10:m?6:-4,rotation:q&&!m&&90},h),this.renderLabel(h,p,m,D)):u&&u.hide();return a},renderLabel:function(a,d,g,f){var h=this.label,l=this.axis.chart.renderer;h||(h={align:a.textAlign||a.align,rotation:a.rotation,"class":"highcharts-plot-"+(g?"band":"line")+"-label "+(a.className||
"")},h.zIndex=f,this.label=h=l.text(a.text,0,0,a.useHTML).attr(h).add(),h.css(a.style));f=[d[1],d[4],g?d[6]:d[1]];d=[d[2],d[5],g?d[7]:d[2]];g=A(f);l=A(d);h.align(a,!1,{x:g,y:l,width:C(f)-g,height:C(d)-l});h.show()},destroy:function(){d(this.axis.plotLinesAndBands,this);delete this.axis;H(this)}};a.AxisPlotLineOrBandExtension={getPlotBandPath:function(a,d){d=this.getPlotLinePath(d,null,null,!0);(a=this.getPlotLinePath(a,null,null,!0))&&d?(a.flat=a.toString()===d.toString(),a.push(d[4],d[5],d[1],d[2],
"z")):a=null;return a},addPlotBand:function(a){return this.addPlotBandOrLine(a,"plotBands")},addPlotLine:function(a){return this.addPlotBandOrLine(a,"plotLines")},addPlotBandOrLine:function(d,g){var l=(new a.PlotLineOrBand(this,d)).render(),f=this.userOptions;l&&(g&&(f[g]=f[g]||[],f[g].push(d)),this.plotLinesAndBands.push(l));return l},removePlotBandOrLine:function(a){for(var g=this.plotLinesAndBands,l=this.options,f=this.userOptions,h=g.length;h--;)g[h].id===a&&g[h].destroy();k([l.plotLines||[],
f.plotLines||[],l.plotBands||[],f.plotBands||[]],function(f){for(h=f.length;h--;)f[h].id===a&&d(f,f[h])})}}})(M);(function(a){var C=a.correctFloat,A=a.defined,E=a.destroyObjectProperties,H=a.isNumber,k=a.merge,d=a.pick,g=a.stop,v=a.deg2rad;a.Tick=function(a,d,g,f){this.axis=a;this.pos=d;this.type=g||"";this.isNew=!0;g||f||this.addLabel()};a.Tick.prototype={addLabel:function(){var a=this.axis,g=a.options,q=a.chart,f=a.categories,h=a.names,u=this.pos,F=g.labels,c=a.tickPositions,e=u===c[0],m=u===c[c.length-
1],h=f?d(f[u],h[u],u):u,f=this.label,c=c.info,w;a.isDatetimeAxis&&c&&(w=g.dateTimeLabelFormats[c.higherRanks[u]||c.unitName]);this.isFirst=e;this.isLast=m;g=a.labelFormatter.call({axis:a,chart:q,isFirst:e,isLast:m,dateTimeLabelFormat:w,value:a.isLog?C(a.lin2log(h)):h});A(f)?f&&f.attr({text:g}):(this.labelLength=(this.label=f=A(g)&&F.enabled?q.renderer.text(g,0,0,F.useHTML).css(k(F.style)).add(a.labelGroup):null)&&f.getBBox().width,this.rotation=0)},getLabelSize:function(){return this.label?this.label.getBBox()[this.axis.horiz?
"height":"width"]:0},handleOverflow:function(a){var g=this.axis,l=a.x,f=g.chart.chartWidth,h=g.chart.spacing,u=d(g.labelLeft,Math.min(g.pos,h[3])),h=d(g.labelRight,Math.max(g.pos+g.len,f-h[1])),k=this.label,c=this.rotation,e={left:0,center:.5,right:1}[g.labelAlign],m=k.getBBox().width,w=g.getSlotWidth(),G=w,b=1,p,t={};if(c)0>c&&l-e*m<u?p=Math.round(l/Math.cos(c*v)-u):0<c&&l+e*m>h&&(p=Math.round((f-l)/Math.cos(c*v)));else if(f=l+(1-e)*m,l-e*m<u?G=a.x+G*(1-e)-u:f>h&&(G=h-a.x+G*e,b=-1),G=Math.min(w,
G),G<w&&"center"===g.labelAlign&&(a.x+=b*(w-G-e*(w-Math.min(m,G)))),m>G||g.autoRotation&&(k.styles||{}).width)p=G;p&&(t.width=p,(g.options.labels.style||{}).textOverflow||(t.textOverflow="ellipsis"),k.css(t))},getPosition:function(a,d,g,f){var h=this.axis,l=h.chart,q=f&&l.oldChartHeight||l.chartHeight;return{x:a?h.translate(d+g,null,null,f)+h.transB:h.left+h.offset+(h.opposite?(f&&l.oldChartWidth||l.chartWidth)-h.right-h.left:0),y:a?q-h.bottom+h.offset-(h.opposite?h.height:0):q-h.translate(d+g,null,
null,f)-h.transB}},getLabelPosition:function(a,d,g,f,h,u,k,c){var e=this.axis,m=e.transA,w=e.reversed,l=e.staggerLines,b=e.tickRotCorr||{x:0,y:0},p=h.y;A(p)||(p=0===e.side?g.rotation?-8:-g.getBBox().height:2===e.side?b.y+8:Math.cos(g.rotation*v)*(b.y-g.getBBox(!1,0).height/2));a=a+h.x+b.x-(u&&f?u*m*(w?-1:1):0);d=d+p-(u&&!f?u*m*(w?1:-1):0);l&&(g=k/(c||1)%l,e.opposite&&(g=l-g-1),d+=e.labelOffset/l*g);return{x:a,y:Math.round(d)}},getMarkPath:function(a,d,g,f,h,u){return u.crispLine(["M",a,d,"L",a+(h?
0:-g),d+(h?g:0)],f)},render:function(a,k,q){var f=this.axis,h=f.options,l=f.chart.renderer,r=f.horiz,c=this.type,e=this.label,m=this.pos,w=h.labels,G=this.gridLine,b=c?c+"Tick":"tick",p=f.tickSize(b),t=this.mark,L=!t,D=w.step,v={},x=!0,I=f.tickmarkOffset,J=this.getPosition(r,m,I,k),N=J.x,J=J.y,n=r&&N===f.pos+f.len||!r&&J===f.pos?-1:1,z=c?c+"Grid":"grid",P=h[z+"LineWidth"],O=h[z+"LineColor"],B=h[z+"LineDashStyle"],z=d(h[b+"Width"],!c&&f.isXAxis?1:0),b=h[b+"Color"];q=d(q,1);this.isActive=!0;G||(v.stroke=
O,v["stroke-width"]=P,B&&(v.dashstyle=B),c||(v.zIndex=1),k&&(v.opacity=0),this.gridLine=G=l.path().attr(v).addClass("highcharts-"+(c?c+"-":"")+"grid-line").add(f.gridGroup));if(!k&&G&&(m=f.getPlotLinePath(m+I,G.strokeWidth()*n,k,!0)))G[this.isNew?"attr":"animate"]({d:m,opacity:q});p&&(f.opposite&&(p[0]=-p[0]),L&&(this.mark=t=l.path().addClass("highcharts-"+(c?c+"-":"")+"tick").add(f.axisGroup),t.attr({stroke:b,"stroke-width":z})),t[L?"attr":"animate"]({d:this.getMarkPath(N,J,p[0],t.strokeWidth()*
n,r,l),opacity:q}));e&&H(N)&&(e.xy=J=this.getLabelPosition(N,J,e,r,w,I,a,D),this.isFirst&&!this.isLast&&!d(h.showFirstLabel,1)||this.isLast&&!this.isFirst&&!d(h.showLastLabel,1)?x=!1:!r||f.isRadial||w.step||w.rotation||k||0===q||this.handleOverflow(J),D&&a%D&&(x=!1),x&&H(J.y)?(J.opacity=q,e[this.isNew?"attr":"animate"](J)):(g(e),e.attr("y",-9999)),this.isNew=!1)},destroy:function(){E(this,this.axis)}}})(M);(function(a){var C=a.addEvent,A=a.animObject,E=a.arrayMax,H=a.arrayMin,k=a.AxisPlotLineOrBandExtension,
d=a.color,g=a.correctFloat,v=a.defaultOptions,l=a.defined,r=a.deg2rad,q=a.destroyObjectProperties,f=a.each,h=a.error,u=a.extend,F=a.fireEvent,c=a.format,e=a.getMagnitude,m=a.grep,w=a.inArray,G=a.isArray,b=a.isNumber,p=a.isString,t=a.merge,L=a.normalizeTickInterval,D=a.pick,K=a.PlotLineOrBand,x=a.removeEvent,I=a.splat,J=a.syncTimeout,N=a.Tick;a.Axis=function(){this.init.apply(this,arguments)};a.Axis.prototype={defaultOptions:{dateTimeLabelFormats:{millisecond:"%H:%M:%S.%L",second:"%H:%M:%S",minute:"%H:%M",
hour:"%H:%M",day:"%e. %b",week:"%e. %b",month:"%b '%y",year:"%Y"},endOnTick:!1,labels:{enabled:!0,style:{color:"#666666",cursor:"default",fontSize:"11px"},x:0},minPadding:.01,maxPadding:.01,minorTickLength:2,minorTickPosition:"outside",startOfWeek:1,startOnTick:!1,tickLength:10,tickmarkPlacement:"between",tickPixelInterval:100,tickPosition:"outside",title:{align:"middle",style:{color:"#666666"}},type:"linear",minorGridLineColor:"#f2f2f2",minorGridLineWidth:1,minorTickColor:"#999999",lineColor:"#ccd6eb",
lineWidth:1,gridLineColor:"#e6e6e6",tickColor:"#ccd6eb"},defaultYAxisOptions:{endOnTick:!0,tickPixelInterval:72,showLastLabel:!0,labels:{x:-8},maxPadding:.05,minPadding:.05,startOnTick:!0,title:{rotation:270,text:"Values"},stackLabels:{enabled:!1,formatter:function(){return a.numberFormat(this.total,-1)},style:{fontSize:"11px",fontWeight:"bold",color:"#000000",textShadow:"1px 1px contrast, -1px -1px contrast, -1px 1px contrast, 1px -1px contrast"}},gridLineWidth:1,lineWidth:0},defaultLeftAxisOptions:{labels:{x:-15},
title:{rotation:270}},defaultRightAxisOptions:{labels:{x:15},title:{rotation:90}},defaultBottomAxisOptions:{labels:{autoRotation:[-45],x:0},title:{rotation:0}},defaultTopAxisOptions:{labels:{autoRotation:[-45],x:0},title:{rotation:0}},init:function(a,b){var e=b.isX;this.chart=a;this.horiz=a.inverted?!e:e;this.isXAxis=e;this.coll=this.coll||(e?"xAxis":"yAxis");this.opposite=b.opposite;this.side=b.side||(this.horiz?this.opposite?0:2:this.opposite?1:3);this.setOptions(b);var n=this.options,c=n.type;
this.labelFormatter=n.labels.formatter||this.defaultLabelFormatter;this.userOptions=b;this.minPixelPadding=0;this.reversed=n.reversed;this.visible=!1!==n.visible;this.zoomEnabled=!1!==n.zoomEnabled;this.hasNames="category"===c||!0===n.categories;this.categories=n.categories||this.hasNames;this.names=this.names||[];this.isLog="logarithmic"===c;this.isDatetimeAxis="datetime"===c;this.isLinked=l(n.linkedTo);this.ticks={};this.labelEdge=[];this.minorTicks={};this.plotLinesAndBands=[];this.alternateBands=
{};this.len=0;this.minRange=this.userMinRange=n.minRange||n.maxZoom;this.range=n.range;this.offset=n.offset||0;this.stacks={};this.oldStacks={};this.stacksTouched=0;this.min=this.max=null;this.crosshair=D(n.crosshair,I(a.options.tooltip.crosshairs)[e?0:1],!1);var f;b=this.options.events;-1===w(this,a.axes)&&(e?a.axes.splice(a.xAxis.length,0,this):a.axes.push(this),a[this.coll].push(this));this.series=this.series||[];a.inverted&&e&&void 0===this.reversed&&(this.reversed=!0);this.removePlotLine=this.removePlotBand=
this.removePlotBandOrLine;for(f in b)C(this,f,b[f]);this.isLog&&(this.val2lin=this.log2lin,this.lin2val=this.lin2log)},setOptions:function(a){this.options=t(this.defaultOptions,"yAxis"===this.coll&&this.defaultYAxisOptions,[this.defaultTopAxisOptions,this.defaultRightAxisOptions,this.defaultBottomAxisOptions,this.defaultLeftAxisOptions][this.side],t(v[this.coll],a))},defaultLabelFormatter:function(){var b=this.axis,e=this.value,f=b.categories,m=this.dateTimeLabelFormat,d=v.lang,y=d.numericSymbols,
d=d.numericSymbolMagnitude||1E3,h=y&&y.length,g,p=b.options.labels.format,b=b.isLog?e:b.tickInterval;if(p)g=c(p,this);else if(f)g=e;else if(m)g=a.dateFormat(m,e);else if(h&&1E3<=b)for(;h--&&void 0===g;)f=Math.pow(d,h+1),b>=f&&0===10*e%f&&null!==y[h]&&0!==e&&(g=a.numberFormat(e/f,-1)+y[h]);void 0===g&&(g=1E4<=Math.abs(e)?a.numberFormat(e,-1):a.numberFormat(e,-1,void 0,""));return g},getSeriesExtremes:function(){var a=this,e=a.chart;a.hasVisibleSeries=!1;a.dataMin=a.dataMax=a.threshold=null;a.softThreshold=
!a.isXAxis;a.buildStacks&&a.buildStacks();f(a.series,function(c){if(c.visible||!e.options.chart.ignoreHiddenSeries){var n=c.options,f=n.threshold,z;a.hasVisibleSeries=!0;a.isLog&&0>=f&&(f=null);if(a.isXAxis)n=c.xData,n.length&&(c=H(n),b(c)||c instanceof Date||(n=m(n,function(a){return b(a)}),c=H(n)),a.dataMin=Math.min(D(a.dataMin,n[0]),c),a.dataMax=Math.max(D(a.dataMax,n[0]),E(n)));else if(c.getExtremes(),z=c.dataMax,c=c.dataMin,l(c)&&l(z)&&(a.dataMin=Math.min(D(a.dataMin,c),c),a.dataMax=Math.max(D(a.dataMax,
z),z)),l(f)&&(a.threshold=f),!n.softThreshold||a.isLog)a.softThreshold=!1}})},translate:function(a,e,c,f,m,y){var n=this.linkedParent||this,z=1,d=0,h=f?n.oldTransA:n.transA;f=f?n.oldMin:n.min;var g=n.minPixelPadding;m=(n.isOrdinal||n.isBroken||n.isLog&&m)&&n.lin2val;h||(h=n.transA);c&&(z*=-1,d=n.len);n.reversed&&(z*=-1,d-=z*(n.sector||n.len));e?(a=(a*z+d-g)/h+f,m&&(a=n.lin2val(a))):(m&&(a=n.val2lin(a)),a=z*(a-f)*h+d+z*g+(b(y)?h*y:0));return a},toPixels:function(a,b){return this.translate(a,!1,!this.horiz,
null,!0)+(b?0:this.pos)},toValue:function(a,b){return this.translate(a-(b?0:this.pos),!0,!this.horiz,null,!0)},getPlotLinePath:function(a,e,c,f,m){var n=this.chart,z=this.left,h=this.top,d,g,p=c&&n.oldChartHeight||n.chartHeight,w=c&&n.oldChartWidth||n.chartWidth,x;d=this.transB;var l=function(a,b,e){if(a<b||a>e)f?a=Math.min(Math.max(b,a),e):x=!0;return a};m=D(m,this.translate(a,null,null,c));a=c=Math.round(m+d);d=g=Math.round(p-m-d);b(m)?this.horiz?(d=h,g=p-this.bottom,a=c=l(a,z,z+this.width)):(a=
z,c=w-this.right,d=g=l(d,h,h+this.height)):x=!0;return x&&!f?null:n.renderer.crispLine(["M",a,d,"L",c,g],e||1)},getLinearTickPositions:function(a,e,c){var n,f=g(Math.floor(e/a)*a),z=g(Math.ceil(c/a)*a),m=[];if(e===c&&b(e))return[e];for(e=f;e<=z;){m.push(e);e=g(e+a);if(e===n)break;n=e}return m},getMinorTickPositions:function(){var a=this.options,b=this.tickPositions,e=this.minorTickInterval,c=[],f,m=this.pointRangePadding||0;f=this.min-m;var m=this.max+m,d=m-f;if(d&&d/e<this.len/3)if(this.isLog)for(m=
b.length,f=1;f<m;f++)c=c.concat(this.getLogTickPositions(e,b[f-1],b[f],!0));else if(this.isDatetimeAxis&&"auto"===a.minorTickInterval)c=c.concat(this.getTimeTicks(this.normalizeTimeTickInterval(e),f,m,a.startOfWeek));else for(b=f+(b[0]-f)%e;b<=m;b+=e)c.push(b);0!==c.length&&this.trimTicks(c,a.startOnTick,a.endOnTick);return c},adjustForMinRange:function(){var a=this.options,b=this.min,e=this.max,c,m=this.dataMax-this.dataMin>=this.minRange,d,h,g,p,w,x;this.isXAxis&&void 0===this.minRange&&!this.isLog&&
(l(a.min)||l(a.max)?this.minRange=null:(f(this.series,function(a){p=a.xData;for(h=w=a.xIncrement?1:p.length-1;0<h;h--)if(g=p[h]-p[h-1],void 0===d||g<d)d=g}),this.minRange=Math.min(5*d,this.dataMax-this.dataMin)));e-b<this.minRange&&(x=this.minRange,c=(x-e+b)/2,c=[b-c,D(a.min,b-c)],m&&(c[2]=this.isLog?this.log2lin(this.dataMin):this.dataMin),b=E(c),e=[b+x,D(a.max,b+x)],m&&(e[2]=this.isLog?this.log2lin(this.dataMax):this.dataMax),e=H(e),e-b<x&&(c[0]=e-x,c[1]=D(a.min,e-x),b=E(c)));this.min=b;this.max=
e},getClosest:function(){var a;this.categories?a=1:f(this.series,function(b){var e=b.closestPointRange;!b.noSharedTooltip&&l(e)&&(a=l(a)?Math.min(a,e):e)});return a},nameToX:function(a){var b=G(this.categories),e=b?this.categories:this.names,c=a.options.x,n;a.series.requireSorting=!1;l(c)||(c=!1===this.options.uniqueNames?a.series.autoIncrement():w(a.name,e));-1===c?b||(n=e.length):n=c;this.names[n]=a.name;return n},updateNames:function(){var a=this;0<this.names.length&&(this.names.length=0,this.minRange=
void 0,f(this.series||[],function(b){b.xIncrement=null;if(!b.points||b.isDirtyData)b.processData(),b.generatePoints();f(b.points,function(e,c){var n;e.options&&void 0===e.options.x&&(n=a.nameToX(e),n!==e.x&&(e.x=n,b.xData[c]=n))})}))},setAxisTranslation:function(a){var b=this,e=b.max-b.min,c=b.axisPointRange||0,n,m=0,d=0,h=b.linkedParent,g=!!b.categories,x=b.transA,w=b.isXAxis;if(w||g||c)h?(m=h.minPointOffset,d=h.pointRangePadding):(n=b.getClosest(),f(b.series,function(a){var e=g?1:w?D(a.options.pointRange,
n,0):b.axisPointRange||0;a=a.options.pointPlacement;c=Math.max(c,e);b.single||(m=Math.max(m,p(a)?0:e/2),d=Math.max(d,"on"===a?0:e))})),h=b.ordinalSlope&&n?b.ordinalSlope/n:1,b.minPointOffset=m*=h,b.pointRangePadding=d*=h,b.pointRange=Math.min(c,e),w&&(b.closestPointRange=n);a&&(b.oldTransA=x);b.translationSlope=b.transA=x=b.len/(e+d||1);b.transB=b.horiz?b.left:b.bottom;b.minPixelPadding=x*m},minFromRange:function(){return this.max-this.range},setTickInterval:function(a){var c=this,n=c.chart,m=c.options,
d=c.isLog,y=c.log2lin,p=c.isDatetimeAxis,x=c.isXAxis,w=c.isLinked,t=m.maxPadding,J=m.minPadding,u=m.tickInterval,q=m.tickPixelInterval,I=c.categories,k=c.threshold,r=c.softThreshold,G,v,N,K;p||I||w||this.getTickAmount();N=D(c.userMin,m.min);K=D(c.userMax,m.max);w?(c.linkedParent=n[c.coll][m.linkedTo],n=c.linkedParent.getExtremes(),c.min=D(n.min,n.dataMin),c.max=D(n.max,n.dataMax),m.type!==c.linkedParent.options.type&&h(11,1)):(!r&&l(k)&&(c.dataMin>=k?(G=k,J=0):c.dataMax<=k&&(v=k,t=0)),c.min=D(N,G,
c.dataMin),c.max=D(K,v,c.dataMax));d&&(!a&&0>=Math.min(c.min,D(c.dataMin,c.min))&&h(10,1),c.min=g(y(c.min),15),c.max=g(y(c.max),15));c.range&&l(c.max)&&(c.userMin=c.min=N=Math.max(c.min,c.minFromRange()),c.userMax=K=c.max,c.range=null);F(c,"foundExtremes");c.beforePadding&&c.beforePadding();c.adjustForMinRange();!(I||c.axisPointRange||c.usePercentage||w)&&l(c.min)&&l(c.max)&&(y=c.max-c.min)&&(!l(N)&&J&&(c.min-=y*J),!l(K)&&t&&(c.max+=y*t));b(m.floor)?c.min=Math.max(c.min,m.floor):b(m.softMin)&&(c.min=
Math.min(c.min,m.softMin));b(m.ceiling)?c.max=Math.min(c.max,m.ceiling):b(m.softMax)&&(c.max=Math.max(c.max,m.softMax));r&&l(c.dataMin)&&(k=k||0,!l(N)&&c.min<k&&c.dataMin>=k?c.min=k:!l(K)&&c.max>k&&c.dataMax<=k&&(c.max=k));c.tickInterval=c.min===c.max||void 0===c.min||void 0===c.max?1:w&&!u&&q===c.linkedParent.options.tickPixelInterval?u=c.linkedParent.tickInterval:D(u,this.tickAmount?(c.max-c.min)/Math.max(this.tickAmount-1,1):void 0,I?1:(c.max-c.min)*q/Math.max(c.len,q));x&&!a&&f(c.series,function(a){a.processData(c.min!==
c.oldMin||c.max!==c.oldMax)});c.setAxisTranslation(!0);c.beforeSetTickPositions&&c.beforeSetTickPositions();c.postProcessTickInterval&&(c.tickInterval=c.postProcessTickInterval(c.tickInterval));c.pointRange&&!u&&(c.tickInterval=Math.max(c.pointRange,c.tickInterval));a=D(m.minTickInterval,c.isDatetimeAxis&&c.closestPointRange);!u&&c.tickInterval<a&&(c.tickInterval=a);p||d||u||(c.tickInterval=L(c.tickInterval,null,e(c.tickInterval),D(m.allowDecimals,!(.5<c.tickInterval&&5>c.tickInterval&&1E3<c.max&&
9999>c.max)),!!this.tickAmount));this.tickAmount||(c.tickInterval=c.unsquish());this.setTickPositions()},setTickPositions:function(){var a=this.options,b,c=a.tickPositions,e=a.tickPositioner,f=a.startOnTick,m=a.endOnTick,d;this.tickmarkOffset=this.categories&&"between"===a.tickmarkPlacement&&1===this.tickInterval?.5:0;this.minorTickInterval="auto"===a.minorTickInterval&&this.tickInterval?this.tickInterval/5:a.minorTickInterval;this.tickPositions=b=c&&c.slice();!b&&(b=this.isDatetimeAxis?this.getTimeTicks(this.normalizeTimeTickInterval(this.tickInterval,
a.units),this.min,this.max,a.startOfWeek,this.ordinalPositions,this.closestPointRange,!0):this.isLog?this.getLogTickPositions(this.tickInterval,this.min,this.max):this.getLinearTickPositions(this.tickInterval,this.min,this.max),b.length>this.len&&(b=[b[0],b.pop()]),this.tickPositions=b,e&&(e=e.apply(this,[this.min,this.max])))&&(this.tickPositions=b=e);this.isLinked||(this.trimTicks(b,f,m),this.min===this.max&&l(this.min)&&!this.tickAmount&&(d=!0,this.min-=.5,this.max+=.5),this.single=d,c||e||this.adjustTickAmount())},
trimTicks:function(a,b,c){var e=a[0],n=a[a.length-1],f=this.minPointOffset||0;if(b)this.min=e;else for(;this.min-f>a[0];)a.shift();if(c)this.max=n;else for(;this.max+f<a[a.length-1];)a.pop();0===a.length&&l(e)&&a.push((n+e)/2)},alignToOthers:function(){var a={},b,c=this.options;!1!==this.chart.options.chart.alignTicks&&!1!==c.alignTicks&&f(this.chart[this.coll],function(c){var e=c.options,e=[c.horiz?e.left:e.top,e.width,e.height,e.pane].join();c.series.length&&(a[e]?b=!0:a[e]=1)});return b},getTickAmount:function(){var a=
this.options,b=a.tickAmount,c=a.tickPixelInterval;!l(a.tickInterval)&&this.len<c&&!this.isRadial&&!this.isLog&&a.startOnTick&&a.endOnTick&&(b=2);!b&&this.alignToOthers()&&(b=Math.ceil(this.len/c)+1);4>b&&(this.finalTickAmt=b,b=5);this.tickAmount=b},adjustTickAmount:function(){var a=this.tickInterval,b=this.tickPositions,c=this.tickAmount,e=this.finalTickAmt,f=b&&b.length;if(f<c){for(;b.length<c;)b.push(g(b[b.length-1]+a));this.transA*=(f-1)/(c-1);this.max=b[b.length-1]}else f>c&&(this.tickInterval*=
2,this.setTickPositions());if(l(e)){for(a=c=b.length;a--;)(3===e&&1===a%2||2>=e&&0<a&&a<c-1)&&b.splice(a,1);this.finalTickAmt=void 0}},setScale:function(){var a,b;this.oldMin=this.min;this.oldMax=this.max;this.oldAxisLength=this.len;this.setAxisSize();b=this.len!==this.oldAxisLength;f(this.series,function(b){if(b.isDirtyData||b.isDirty||b.xAxis.isDirty)a=!0});b||a||this.isLinked||this.forceRedraw||this.userMin!==this.oldUserMin||this.userMax!==this.oldUserMax||this.alignToOthers()?(this.resetStacks&&
this.resetStacks(),this.forceRedraw=!1,this.getSeriesExtremes(),this.setTickInterval(),this.oldUserMin=this.userMin,this.oldUserMax=this.userMax,this.isDirty||(this.isDirty=b||this.min!==this.oldMin||this.max!==this.oldMax)):this.cleanStacks&&this.cleanStacks()},setExtremes:function(a,b,c,e,m){var n=this,d=n.chart;c=D(c,!0);f(n.series,function(a){delete a.kdTree});m=u(m,{min:a,max:b});F(n,"setExtremes",m,function(){n.userMin=a;n.userMax=b;n.eventArgs=m;c&&d.redraw(e)})},zoom:function(a,b){var c=this.dataMin,
e=this.dataMax,n=this.options,f=Math.min(c,D(n.min,c)),n=Math.max(e,D(n.max,e));if(a!==this.min||b!==this.max)this.allowZoomOutside||(l(c)&&a<=f&&(a=f),l(e)&&b>=n&&(b=n)),this.displayBtn=void 0!==a||void 0!==b,this.setExtremes(a,b,!1,void 0,{trigger:"zoom"});return!0},setAxisSize:function(){var a=this.chart,b=this.options,c=b.offsetLeft||0,e=this.horiz,f=D(b.width,a.plotWidth-c+(b.offsetRight||0)),m=D(b.height,a.plotHeight),d=D(b.top,a.plotTop),b=D(b.left,a.plotLeft+c),c=/%$/;c.test(m)&&(m=Math.round(parseFloat(m)/
100*a.plotHeight));c.test(d)&&(d=Math.round(parseFloat(d)/100*a.plotHeight+a.plotTop));this.left=b;this.top=d;this.width=f;this.height=m;this.bottom=a.chartHeight-m-d;this.right=a.chartWidth-f-b;this.len=Math.max(e?f:m,0);this.pos=e?b:d},getExtremes:function(){var a=this.isLog,b=this.lin2log;return{min:a?g(b(this.min)):this.min,max:a?g(b(this.max)):this.max,dataMin:this.dataMin,dataMax:this.dataMax,userMin:this.userMin,userMax:this.userMax}},getThreshold:function(a){var b=this.isLog,c=this.lin2log,
e=b?c(this.min):this.min,b=b?c(this.max):this.max;null===a?a=e:e>a?a=e:b<a&&(a=b);return this.translate(a,0,1,0,1)},autoLabelAlign:function(a){a=(D(a,0)-90*this.side+720)%360;return 15<a&&165>a?"right":195<a&&345>a?"left":"center"},tickSize:function(a){var b=this.options,c=b[a+"Length"],e=D(b[a+"Width"],"tick"===a&&this.isXAxis?1:0);if(e&&c)return"inside"===b[a+"Position"]&&(c=-c),[c,e]},labelMetrics:function(){return this.chart.renderer.fontMetrics(this.options.labels.style&&this.options.labels.style.fontSize,
this.ticks[0]&&this.ticks[0].label)},unsquish:function(){var a=this.options.labels,b=this.horiz,c=this.tickInterval,e=c,m=this.len/(((this.categories?1:0)+this.max-this.min)/c),d,h=a.rotation,g=this.labelMetrics(),p,x=Number.MAX_VALUE,w,t=function(a){a/=m||1;a=1<a?Math.ceil(a):1;return a*c};b?(w=!a.staggerLines&&!a.step&&(l(h)?[h]:m<D(a.autoRotationLimit,80)&&a.autoRotation))&&f(w,function(a){var b;if(a===h||a&&-90<=a&&90>=a)p=t(Math.abs(g.h/Math.sin(r*a))),b=p+Math.abs(a/360),b<x&&(x=b,d=a,e=p)}):
a.step||(e=t(g.h));this.autoRotation=w;this.labelRotation=D(d,h);return e},getSlotWidth:function(){var a=this.chart,b=this.horiz,c=this.options.labels,e=Math.max(this.tickPositions.length-(this.categories?0:1),1),f=a.margin[3];return b&&2>(c.step||0)&&!c.rotation&&(this.staggerLines||1)*a.plotWidth/e||!b&&(f&&f-a.spacing[3]||.33*a.chartWidth)},renderUnsquish:function(){var a=this.chart,b=a.renderer,c=this.tickPositions,e=this.ticks,m=this.options.labels,d=this.horiz,h=this.getSlotWidth(),g=Math.max(1,
Math.round(h-2*(m.padding||5))),x={},w=this.labelMetrics(),l=m.style&&m.style.textOverflow,J,u=0,k,q;p(m.rotation)||(x.rotation=m.rotation||0);f(c,function(a){(a=e[a])&&a.labelLength>u&&(u=a.labelLength)});this.maxLabelLength=u;if(this.autoRotation)u>g&&u>w.h?x.rotation=this.labelRotation:this.labelRotation=0;else if(h&&(J={width:g+"px"},!l))for(J.textOverflow="clip",k=c.length;!d&&k--;)if(q=c[k],g=e[q].label)g.styles&&"ellipsis"===g.styles.textOverflow?g.css({textOverflow:"clip"}):e[q].labelLength>
h&&g.css({width:h+"px"}),g.getBBox().height>this.len/c.length-(w.h-w.f)&&(g.specCss={textOverflow:"ellipsis"});x.rotation&&(J={width:(u>.5*a.chartHeight?.33*a.chartHeight:a.chartHeight)+"px"},l||(J.textOverflow="ellipsis"));if(this.labelAlign=m.align||this.autoLabelAlign(this.labelRotation))x.align=this.labelAlign;f(c,function(a){var b=(a=e[a])&&a.label;b&&(b.attr(x),J&&b.css(t(J,b.specCss)),delete b.specCss,a.rotation=x.rotation)});this.tickRotCorr=b.rotCorr(w.b,this.labelRotation||0,0!==this.side)},
hasData:function(){return this.hasVisibleSeries||l(this.min)&&l(this.max)&&!!this.tickPositions},getOffset:function(){var a=this,b=a.chart,c=b.renderer,e=a.options,m=a.tickPositions,d=a.ticks,h=a.horiz,g=a.side,x=b.inverted?[1,0,3,2][g]:g,p,w,t=0,J,u=0,k=e.title,q=e.labels,I=0,r=a.opposite,G=b.axisOffset,b=b.clipOffset,L=[-1,1,1,-1][g],F,v=e.className,K=a.axisParent,A=this.tickSize("tick");p=a.hasData();a.showAxis=w=p||D(e.showEmpty,!0);a.staggerLines=a.horiz&&q.staggerLines;a.axisGroup||(a.gridGroup=
c.g("grid").attr({zIndex:e.gridZIndex||1}).addClass("highcharts-"+this.coll.toLowerCase()+"-grid "+(v||"")).add(K),a.axisGroup=c.g("axis").attr({zIndex:e.zIndex||2}).addClass("highcharts-"+this.coll.toLowerCase()+" "+(v||"")).add(K),a.labelGroup=c.g("axis-labels").attr({zIndex:q.zIndex||7}).addClass("highcharts-"+a.coll.toLowerCase()+"-labels "+(v||"")).add(K));if(p||a.isLinked)f(m,function(b){d[b]?d[b].addLabel():d[b]=new N(a,b)}),a.renderUnsquish(),!1===q.reserveSpace||0!==g&&2!==g&&{1:"left",3:"right"}[g]!==
a.labelAlign&&"center"!==a.labelAlign||f(m,function(a){I=Math.max(d[a].getLabelSize(),I)}),a.staggerLines&&(I*=a.staggerLines,a.labelOffset=I*(a.opposite?-1:1));else for(F in d)d[F].destroy(),delete d[F];k&&k.text&&!1!==k.enabled&&(a.axisTitle||((F=k.textAlign)||(F=(h?{low:"left",middle:"center",high:"right"}:{low:r?"right":"left",middle:"center",high:r?"left":"right"})[k.align]),a.axisTitle=c.text(k.text,0,0,k.useHTML).attr({zIndex:7,rotation:k.rotation||0,align:F}).addClass("highcharts-axis-title").css(k.style).add(a.axisGroup),
a.axisTitle.isNew=!0),w&&(t=a.axisTitle.getBBox()[h?"height":"width"],J=k.offset,u=l(J)?0:D(k.margin,h?5:10)),a.axisTitle[w?"show":"hide"](!0));a.renderLine();a.offset=L*D(e.offset,G[g]);a.tickRotCorr=a.tickRotCorr||{x:0,y:0};c=0===g?-a.labelMetrics().h:2===g?a.tickRotCorr.y:0;u=Math.abs(I)+u;I&&(u=u-c+L*(h?D(q.y,a.tickRotCorr.y+8*L):q.x));a.axisTitleMargin=D(J,u);G[g]=Math.max(G[g],a.axisTitleMargin+t+L*a.offset,u,p&&m.length&&A?A[0]:0);e=e.offset?0:2*Math.floor(a.axisLine.strokeWidth()/2);b[x]=
Math.max(b[x],e)},getLinePath:function(a){var b=this.chart,c=this.opposite,e=this.offset,f=this.horiz,m=this.left+(c?this.width:0)+e,e=b.chartHeight-this.bottom-(c?this.height:0)+e;c&&(a*=-1);return b.renderer.crispLine(["M",f?this.left:m,f?e:this.top,"L",f?b.chartWidth-this.right:m,f?e:b.chartHeight-this.bottom],a)},renderLine:function(){this.axisLine||(this.axisLine=this.chart.renderer.path().addClass("highcharts-axis-line").add(this.axisGroup),this.axisLine.attr({stroke:this.options.lineColor,
"stroke-width":this.options.lineWidth,zIndex:7}))},getTitlePosition:function(){var a=this.horiz,b=this.left,c=this.top,e=this.len,f=this.options.title,m=a?b:c,d=this.opposite,h=this.offset,g=f.x||0,p=f.y||0,x=this.chart.renderer.fontMetrics(f.style&&f.style.fontSize,this.axisTitle).f,e={low:m+(a?0:e),middle:m+e/2,high:m+(a?e:0)}[f.align],b=(a?c+this.height:b)+(a?1:-1)*(d?-1:1)*this.axisTitleMargin+(2===this.side?x:0);return{x:a?e+g:b+(d?this.width:0)+h+g,y:a?b+p-(d?this.height:0)+h:e+p}},render:function(){var a=
this,c=a.chart,e=c.renderer,m=a.options,d=a.isLog,h=a.lin2log,g=a.isLinked,p=a.tickPositions,x=a.axisTitle,w=a.ticks,l=a.minorTicks,t=a.alternateBands,u=m.stackLabels,k=m.alternateGridColor,q=a.tickmarkOffset,I=a.axisLine,D=c.hasRendered&&b(a.oldMin),r=a.showAxis,G=A(e.globalAnimation),L,F;a.labelEdge.length=0;a.overlap=!1;f([w,l,t],function(a){for(var b in a)a[b].isActive=!1});if(a.hasData()||g)a.minorTickInterval&&!a.categories&&f(a.getMinorTickPositions(),function(b){l[b]||(l[b]=new N(a,b,"minor"));
D&&l[b].isNew&&l[b].render(null,!0);l[b].render(null,!1,1)}),p.length&&(f(p,function(b,c){if(!g||b>=a.min&&b<=a.max)w[b]||(w[b]=new N(a,b)),D&&w[b].isNew&&w[b].render(c,!0,.1),w[b].render(c)}),q&&(0===a.min||a.single)&&(w[-1]||(w[-1]=new N(a,-1,null,!0)),w[-1].render(-1))),k&&f(p,function(b,e){F=void 0!==p[e+1]?p[e+1]+q:a.max-q;0===e%2&&b<a.max&&F<=a.max+(c.polar?-q:q)&&(t[b]||(t[b]=new K(a)),L=b+q,t[b].options={from:d?h(L):L,to:d?h(F):F,color:k},t[b].render(),t[b].isActive=!0)}),a._addedPlotLB||
(f((m.plotLines||[]).concat(m.plotBands||[]),function(b){a.addPlotBandOrLine(b)}),a._addedPlotLB=!0);f([w,l,t],function(a){var b,e,f=[],m=G.duration;for(b in a)a[b].isActive||(a[b].render(b,!1,0),a[b].isActive=!1,f.push(b));J(function(){for(e=f.length;e--;)a[f[e]]&&!a[f[e]].isActive&&(a[f[e]].destroy(),delete a[f[e]])},a!==t&&c.hasRendered&&m?m:0)});I&&(I[I.isPlaced?"animate":"attr"]({d:this.getLinePath(I.strokeWidth())}),I.isPlaced=!0,I[r?"show":"hide"](!0));x&&r&&(x[x.isNew?"attr":"animate"](a.getTitlePosition()),
x.isNew=!1);u&&u.enabled&&a.renderStackTotals();a.isDirty=!1},redraw:function(){this.visible&&(this.render(),f(this.plotLinesAndBands,function(a){a.render()}));f(this.series,function(a){a.isDirty=!0})},keepProps:"extKey hcEvents names series userMax userMin".split(" "),destroy:function(a){var b=this,c=b.stacks,e,m=b.plotLinesAndBands,d;a||x(b);for(e in c)q(c[e]),c[e]=null;f([b.ticks,b.minorTicks,b.alternateBands],function(a){q(a)});if(m)for(a=m.length;a--;)m[a].destroy();f("stackTotalGroup axisLine axisTitle axisGroup gridGroup labelGroup cross".split(" "),
function(a){b[a]&&(b[a]=b[a].destroy())});for(d in b)b.hasOwnProperty(d)&&-1===w(d,b.keepProps)&&delete b[d]},drawCrosshair:function(a,b){var c,e=this.crosshair,f=D(e.snap,!0),m,n=this.cross;a||(a=this.cross&&this.cross.e);this.crosshair&&!1!==(l(b)||!f)?(f?l(b)&&(m=this.isXAxis?b.plotX:this.len-b.plotY):m=a&&(this.horiz?a.chartX-this.pos:this.len-a.chartY+this.pos),l(m)&&(c=this.getPlotLinePath(b&&(this.isXAxis?b.x:D(b.stackY,b.y)),null,null,null,m)||null),l(c)?(b=this.categories&&!this.isRadial,
n||(this.cross=n=this.chart.renderer.path().addClass("highcharts-crosshair highcharts-crosshair-"+(b?"category ":"thin ")+e.className).attr({zIndex:D(e.zIndex,2)}).add(),n.attr({stroke:e.color||(b?d("#ccd6eb").setOpacity(.25).get():"#cccccc"),"stroke-width":D(e.width,1)}),e.dashStyle&&n.attr({dashstyle:e.dashStyle})),n.show().attr({d:c}),b&&!e.width&&n.attr({"stroke-width":this.transA}),this.cross.e=a):this.hideCrosshair()):this.hideCrosshair()},hideCrosshair:function(){this.cross&&this.cross.hide()}};
u(a.Axis.prototype,k)})(M);(function(a){var C=a.Axis,A=a.Date,E=a.dateFormat,H=a.defaultOptions,k=a.defined,d=a.each,g=a.extend,v=a.getMagnitude,l=a.getTZOffset,r=a.normalizeTickInterval,q=a.pick,f=a.timeUnits;C.prototype.getTimeTicks=function(a,u,r,c){var e=[],m={},h=H.global.useUTC,G,b=new A(u-l(u)),p=A.hcMakeTime,t=a.unitRange,L=a.count,D;if(k(u)){b[A.hcSetMilliseconds](t>=f.second?0:L*Math.floor(b.getMilliseconds()/L));if(t>=f.second)b[A.hcSetSeconds](t>=f.minute?0:L*Math.floor(b.getSeconds()/
L));if(t>=f.minute)b[A.hcSetMinutes](t>=f.hour?0:L*Math.floor(b[A.hcGetMinutes]()/L));if(t>=f.hour)b[A.hcSetHours](t>=f.day?0:L*Math.floor(b[A.hcGetHours]()/L));if(t>=f.day)b[A.hcSetDate](t>=f.month?1:L*Math.floor(b[A.hcGetDate]()/L));t>=f.month&&(b[A.hcSetMonth](t>=f.year?0:L*Math.floor(b[A.hcGetMonth]()/L)),G=b[A.hcGetFullYear]());if(t>=f.year)b[A.hcSetFullYear](G-G%L);if(t===f.week)b[A.hcSetDate](b[A.hcGetDate]()-b[A.hcGetDay]()+q(c,1));G=b[A.hcGetFullYear]();c=b[A.hcGetMonth]();var F=b[A.hcGetDate](),
x=b[A.hcGetHours]();if(A.hcTimezoneOffset||A.hcGetTimezoneOffset)D=(!h||!!A.hcGetTimezoneOffset)&&(r-u>4*f.month||l(u)!==l(r)),b=b.getTime(),b=new A(b+l(b));h=b.getTime();for(u=1;h<r;)e.push(h),h=t===f.year?p(G+u*L,0):t===f.month?p(G,c+u*L):!D||t!==f.day&&t!==f.week?D&&t===f.hour?p(G,c,F,x+u*L):h+t*L:p(G,c,F+u*L*(t===f.day?1:7)),u++;e.push(h);t<=f.hour&&d(e,function(a){"000000000"===E("%H%M%S%L",a)&&(m[a]="day")})}e.info=g(a,{higherRanks:m,totalRange:t*L});return e};C.prototype.normalizeTimeTickInterval=
function(a,d){var h=d||[["millisecond",[1,2,5,10,20,25,50,100,200,500]],["second",[1,2,5,10,15,30]],["minute",[1,2,5,10,15,30]],["hour",[1,2,3,4,6,8,12,24]],["day",[1,2]],["week",[1,2]],["month",[1,2,3,4,6]],["year",null]];d=h[h.length-1];var c=f[d[0]],e=d[1],m;for(m=0;m<h.length&&!(d=h[m],c=f[d[0]],e=d[1],h[m+1]&&a<=(c*e[e.length-1]+f[h[m+1][0]])/2);m++);c===f.year&&a<5*c&&(e=[1,2,5]);a=r(a/c,e,"year"===d[0]?Math.max(v(a/c),1):1);return{unitRange:c,count:a,unitName:d[0]}}})(M);(function(a){var C=
a.Axis,A=a.getMagnitude,E=a.map,H=a.normalizeTickInterval,k=a.pick;C.prototype.getLogTickPositions=function(a,g,v,l){var d=this.options,q=this.len,f=this.lin2log,h=this.log2lin,u=[];l||(this._minorAutoInterval=null);if(.5<=a)a=Math.round(a),u=this.getLinearTickPositions(a,g,v);else if(.08<=a)for(var q=Math.floor(g),F,c,e,m,w,d=.3<a?[1,2,4]:.15<a?[1,2,4,6,8]:[1,2,3,4,5,6,7,8,9];q<v+1&&!w;q++)for(c=d.length,F=0;F<c&&!w;F++)e=h(f(q)*d[F]),e>g&&(!l||m<=v)&&void 0!==m&&u.push(m),m>v&&(w=!0),m=e;else g=
f(g),v=f(v),a=d[l?"minorTickInterval":"tickInterval"],a=k("auto"===a?null:a,this._minorAutoInterval,d.tickPixelInterval/(l?5:1)*(v-g)/((l?q/this.tickPositions.length:q)||1)),a=H(a,null,A(a)),u=E(this.getLinearTickPositions(a,g,v),h),l||(this._minorAutoInterval=a/5);l||(this.tickInterval=a);return u};C.prototype.log2lin=function(a){return Math.log(a)/Math.LN10};C.prototype.lin2log=function(a){return Math.pow(10,a)}})(M);(function(a){var C=a.dateFormat,A=a.each,E=a.extend,H=a.format,k=a.isNumber,d=
a.map,g=a.merge,v=a.pick,l=a.splat,r=a.stop,q=a.syncTimeout,f=a.timeUnits;a.Tooltip=function(){this.init.apply(this,arguments)};a.Tooltip.prototype={init:function(a,f){this.chart=a;this.options=f;this.crosshairs=[];this.now={x:0,y:0};this.isHidden=!0;this.split=f.split&&!a.inverted;this.shared=f.shared||this.split},cleanSplit:function(a){A(this.chart.series,function(f){var d=f&&f.tt;d&&(!d.isActive||a?f.tt=d.destroy():d.isActive=!1)})},getLabel:function(){var a=this.chart.renderer,f=this.options;
this.label||(this.split?this.label=a.g("tooltip"):(this.label=a.label("",0,0,f.shape||"callout",null,null,f.useHTML,null,"tooltip").attr({padding:f.padding,r:f.borderRadius}),this.label.attr({fill:f.backgroundColor,"stroke-width":f.borderWidth}).css(f.style).shadow(f.shadow)),this.label.attr({zIndex:8}).add());return this.label},update:function(a){this.destroy();this.init(this.chart,g(!0,this.options,a))},destroy:function(){this.label&&(this.label=this.label.destroy());this.split&&this.tt&&(this.cleanSplit(this.chart,
!0),this.tt=this.tt.destroy());clearTimeout(this.hideTimer);clearTimeout(this.tooltipTimeout)},move:function(a,f,d,c){var e=this,m=e.now,h=!1!==e.options.animation&&!e.isHidden&&(1<Math.abs(a-m.x)||1<Math.abs(f-m.y)),g=e.followPointer||1<e.len;E(m,{x:h?(2*m.x+a)/3:a,y:h?(m.y+f)/2:f,anchorX:g?void 0:h?(2*m.anchorX+d)/3:d,anchorY:g?void 0:h?(m.anchorY+c)/2:c});e.getLabel().attr(m);h&&(clearTimeout(this.tooltipTimeout),this.tooltipTimeout=setTimeout(function(){e&&e.move(a,f,d,c)},32))},hide:function(a){var f=
this;clearTimeout(this.hideTimer);a=v(a,this.options.hideDelay,500);this.isHidden||(this.hideTimer=q(function(){f.getLabel()[a?"fadeOut":"hide"]();f.isHidden=!0},a))},getAnchor:function(a,f){var g,c=this.chart,e=c.inverted,m=c.plotTop,h=c.plotLeft,k=0,b=0,p,t;a=l(a);g=a[0].tooltipPos;this.followPointer&&f&&(void 0===f.chartX&&(f=c.pointer.normalize(f)),g=[f.chartX-c.plotLeft,f.chartY-m]);g||(A(a,function(a){p=a.series.yAxis;t=a.series.xAxis;k+=a.plotX+(!e&&t?t.left-h:0);b+=(a.plotLow?(a.plotLow+a.plotHigh)/
2:a.plotY)+(!e&&p?p.top-m:0)}),k/=a.length,b/=a.length,g=[e?c.plotWidth-b:k,this.shared&&!e&&1<a.length&&f?f.chartY-m:e?c.plotHeight-k:b]);return d(g,Math.round)},getPosition:function(a,f,d){var c=this.chart,e=this.distance,m={},g=d.h||0,h,b=["y",c.chartHeight,f,d.plotY+c.plotTop,c.plotTop,c.plotTop+c.plotHeight],p=["x",c.chartWidth,a,d.plotX+c.plotLeft,c.plotLeft,c.plotLeft+c.plotWidth],l=!this.followPointer&&v(d.ttBelow,!c.inverted===!!d.negative),k=function(a,b,c,f,d,h){var n=c<f-e,p=f+e+c<b,x=
f-e-c;f+=e;if(l&&p)m[a]=f;else if(!l&&n)m[a]=x;else if(n)m[a]=Math.min(h-c,0>x-g?x:x-g);else if(p)m[a]=Math.max(d,f+g+c>b?f:f+g);else return!1},q=function(a,b,c,f){var d;f<e||f>b-e?d=!1:m[a]=f<c/2?1:f>b-c/2?b-c-2:f-c/2;return d},u=function(a){var c=b;b=p;p=c;h=a},x=function(){!1!==k.apply(0,b)?!1!==q.apply(0,p)||h||(u(!0),x()):h?m.x=m.y=0:(u(!0),x())};(c.inverted||1<this.len)&&u();x();return m},defaultFormatter:function(a){var f=this.points||l(this),d;d=[a.tooltipFooterHeaderFormatter(f[0])];d=d.concat(a.bodyFormatter(f));
d.push(a.tooltipFooterHeaderFormatter(f[0],!0));return d},refresh:function(a,f){var d=this.chart,c,e=this.options,m,g,h={},b=[];c=e.formatter||this.defaultFormatter;var h=d.hoverPoints,p=this.shared;clearTimeout(this.hideTimer);this.followPointer=l(a)[0].series.tooltipOptions.followPointer;g=this.getAnchor(a,f);f=g[0];m=g[1];!p||a.series&&a.series.noSharedTooltip?h=a.getLabelConfig():(d.hoverPoints=a,h&&A(h,function(a){a.setState()}),A(a,function(a){a.setState("hover");b.push(a.getLabelConfig())}),
h={x:a[0].category,y:a[0].y},h.points=b,this.len=b.length,a=a[0]);h=c.call(h,this);p=a.series;this.distance=v(p.tooltipOptions.distance,16);!1===h?this.hide():(c=this.getLabel(),this.isHidden&&(r(c),c.attr({opacity:1}).show()),this.split?this.renderSplit(h,d.hoverPoints):(c.attr({text:h&&h.join?h.join(""):h}),c.removeClass(/highcharts-color-[\d]+/g).addClass("highcharts-color-"+v(a.colorIndex,p.colorIndex)),c.attr({stroke:e.borderColor||a.color||p.color||"#666666"}),this.updatePosition({plotX:f,plotY:m,
negative:a.negative,ttBelow:a.ttBelow,h:g[2]||0})),this.isHidden=!1)},renderSplit:function(f,d){var g=this,c=[],e=this.chart,m=e.renderer,h=!0,l=this.options,b,p=this.getLabel();A(f.slice(0,f.length-1),function(a,f){f=d[f-1]||{isHeader:!0,plotX:d[0].plotX};var w=f.series||g,t=w.tt,x=f.series||{},k="highcharts-color-"+v(f.colorIndex,x.colorIndex,"none");t||(w.tt=t=m.label(null,null,null,"callout").addClass("highcharts-tooltip-box "+k).attr({padding:l.padding,r:l.borderRadius,fill:l.backgroundColor,
stroke:f.color||x.color||"#333333","stroke-width":l.borderWidth}).add(p));t.isActive=!0;t.attr({text:a});t.css(l.style);a=t.getBBox();x=a.width+t.strokeWidth();f.isHeader?(b=a.height,x=Math.max(0,Math.min(f.plotX+e.plotLeft-x/2,e.chartWidth-x))):x=f.plotX+e.plotLeft-v(l.distance,16)-x;0>x&&(h=!1);a=(f.series&&f.series.yAxis&&f.series.yAxis.pos)+(f.plotY||0);a-=e.plotTop;c.push({target:f.isHeader?e.plotHeight+b:a,rank:f.isHeader?1:0,size:w.tt.getBBox().height+1,point:f,x:x,tt:t})});this.cleanSplit();
a.distribute(c,e.plotHeight+b);A(c,function(a){var b=a.point;a.tt.attr({visibility:void 0===a.pos?"hidden":"inherit",x:h||b.isHeader?a.x:b.plotX+e.plotLeft+v(l.distance,16),y:a.pos+e.plotTop,anchorX:b.plotX+e.plotLeft,anchorY:b.isHeader?a.pos+e.plotTop-15:b.plotY+e.plotTop})})},updatePosition:function(a){var f=this.chart,d=this.getLabel(),d=(this.options.positioner||this.getPosition).call(this,d.width,d.height,a);this.move(Math.round(d.x),Math.round(d.y||0),a.plotX+f.plotLeft,a.plotY+f.plotTop)},
getXDateFormat:function(a,d,g){var c;d=d.dateTimeLabelFormats;var e=g&&g.closestPointRange,m,h={millisecond:15,second:12,minute:9,hour:6,day:3},l,b="millisecond";if(e){l=C("%m-%d %H:%M:%S.%L",a.x);for(m in f){if(e===f.week&&+C("%w",a.x)===g.options.startOfWeek&&"00:00:00.000"===l.substr(6)){m="week";break}if(f[m]>e){m=b;break}if(h[m]&&l.substr(h[m])!=="01-01 00:00:00.000".substr(h[m]))break;"week"!==m&&(b=m)}m&&(c=d[m])}else c=d.day;return c||d.year},tooltipFooterHeaderFormatter:function(a,f){var d=
f?"footer":"header";f=a.series;var c=f.tooltipOptions,e=c.xDateFormat,m=f.xAxis,g=m&&"datetime"===m.options.type&&k(a.key),d=c[d+"Format"];g&&!e&&(e=this.getXDateFormat(a,c,m));g&&e&&(d=d.replace("{point.key}","{point.key:"+e+"}"));return H(d,{point:a,series:f})},bodyFormatter:function(a){return d(a,function(a){var f=a.series.tooltipOptions;return(f.pointFormatter||a.point.tooltipFormatter).call(a.point,f.pointFormat)})}}})(M);(function(a){var C=a.addEvent,A=a.attr,E=a.charts,H=a.color,k=a.css,d=
a.defined,g=a.doc,v=a.each,l=a.extend,r=a.fireEvent,q=a.offset,f=a.pick,h=a.removeEvent,u=a.splat,F=a.Tooltip,c=a.win;a.Pointer=function(a,c){this.init(a,c)};a.Pointer.prototype={init:function(a,c){this.options=c;this.chart=a;this.runChartClick=c.chart.events&&!!c.chart.events.click;this.pinchDown=[];this.lastValidTouch={};F&&c.tooltip.enabled&&(a.tooltip=new F(a,c.tooltip),this.followTouchMove=f(c.tooltip.followTouchMove,!0));this.setDOMEvents()},zoomOption:function(a){var c=this.chart,e=c.options.chart,
d=e.zoomType||"",c=c.inverted;/touch/.test(a.type)&&(d=f(e.pinchType,d));this.zoomX=a=/x/.test(d);this.zoomY=d=/y/.test(d);this.zoomHor=a&&!c||d&&c;this.zoomVert=d&&!c||a&&c;this.hasZoom=a||d},normalize:function(a,f){var e,m;a=a||c.event;a.target||(a.target=a.srcElement);m=a.touches?a.touches.length?a.touches.item(0):a.changedTouches[0]:a;f||(this.chartPosition=f=q(this.chart.container));void 0===m.pageX?(e=Math.max(a.x,a.clientX-f.left),f=a.y):(e=m.pageX-f.left,f=m.pageY-f.top);return l(a,{chartX:Math.round(e),
chartY:Math.round(f)})},getCoordinates:function(a){var c={xAxis:[],yAxis:[]};v(this.chart.axes,function(e){c[e.isXAxis?"xAxis":"yAxis"].push({axis:e,value:e.toValue(a[e.horiz?"chartX":"chartY"])})});return c},runPointActions:function(c){var e=this.chart,d=e.series,h=e.tooltip,b=h?h.shared:!1,p=!0,l=e.hoverPoint,k=e.hoverSeries,q,r,x,I=[],J;if(!b&&!k)for(q=0;q<d.length;q++)if(d[q].directTouch||!d[q].options.stickyTracking)d=[];k&&(b?k.noSharedTooltip:k.directTouch)&&l?I=[l]:(b||!k||k.options.stickyTracking||
(d=[k]),v(d,function(a){r=a.noSharedTooltip&&b;x=!b&&a.directTouch;a.visible&&!r&&!x&&f(a.options.enableMouseTracking,!0)&&(J=a.searchPoint(c,!r&&1===a.kdDimensions))&&J.series&&I.push(J)}),I.sort(function(a,c){var e=a.distX-c.distX,f=a.dist-c.dist,m=c.series.group.zIndex-a.series.group.zIndex;return 0!==e&&b?e:0!==f?f:0!==m?m:a.series.index>c.series.index?-1:1}));if(b)for(q=I.length;q--;)(I[q].x!==I[0].x||I[q].series.noSharedTooltip)&&I.splice(q,1);if(I[0]&&(I[0]!==this.prevKDPoint||h&&h.isHidden)){if(b&&
!I[0].series.noSharedTooltip){for(q=0;q<I.length;q++)I[q].onMouseOver(c,I[q]!==(k&&k.directTouch&&l||I[0]));I.length&&h&&h.refresh(I.sort(function(a,b){return a.series.index-b.series.index}),c)}else if(h&&h.refresh(I[0],c),!k||!k.directTouch)I[0].onMouseOver(c);this.prevKDPoint=I[0];p=!1}p&&(d=k&&k.tooltipOptions.followPointer,h&&d&&!h.isHidden&&(d=h.getAnchor([{}],c),h.updatePosition({plotX:d[0],plotY:d[1]})));this.unDocMouseMove||(this.unDocMouseMove=C(g,"mousemove",function(b){if(E[a.hoverChartIndex])E[a.hoverChartIndex].pointer.onDocumentMouseMove(b)}));
v(b?I:[f(l,I[0])],function(a){v(e.axes,function(b){(!a||a.series&&a.series[b.coll]===b)&&b.drawCrosshair(c,a)})})},reset:function(a,c){var e=this.chart,f=e.hoverSeries,b=e.hoverPoint,m=e.hoverPoints,d=e.tooltip,g=d&&d.shared?m:b;a&&g&&v(u(g),function(b){b.series.isCartesian&&void 0===b.plotX&&(a=!1)});if(a)d&&g&&(d.refresh(g),b&&(b.setState(b.state,!0),v(e.axes,function(a){a.crosshair&&a.drawCrosshair(null,b)})));else{if(b)b.onMouseOut();m&&v(m,function(a){a.setState()});if(f)f.onMouseOut();d&&d.hide(c);
this.unDocMouseMove&&(this.unDocMouseMove=this.unDocMouseMove());v(e.axes,function(a){a.hideCrosshair()});this.hoverX=this.prevKDPoint=e.hoverPoints=e.hoverPoint=null}},scaleGroups:function(a,c){var e=this.chart,f;v(e.series,function(b){f=a||b.getPlotBox();b.xAxis&&b.xAxis.zoomEnabled&&b.group&&(b.group.attr(f),b.markerGroup&&(b.markerGroup.attr(f),b.markerGroup.clip(c?e.clipRect:null)),b.dataLabelsGroup&&b.dataLabelsGroup.attr(f))});e.clipRect.attr(c||e.clipBox)},dragStart:function(a){var c=this.chart;
c.mouseIsDown=a.type;c.cancelClick=!1;c.mouseDownX=this.mouseDownX=a.chartX;c.mouseDownY=this.mouseDownY=a.chartY},drag:function(a){var c=this.chart,e=c.options.chart,f=a.chartX,b=a.chartY,d=this.zoomHor,g=this.zoomVert,h=c.plotLeft,l=c.plotTop,k=c.plotWidth,x=c.plotHeight,q,J=this.selectionMarker,r=this.mouseDownX,n=this.mouseDownY,u=e.panKey&&a[e.panKey+"Key"];J&&J.touch||(f<h?f=h:f>h+k&&(f=h+k),b<l?b=l:b>l+x&&(b=l+x),this.hasDragged=Math.sqrt(Math.pow(r-f,2)+Math.pow(n-b,2)),10<this.hasDragged&&
(q=c.isInsidePlot(r-h,n-l),c.hasCartesianSeries&&(this.zoomX||this.zoomY)&&q&&!u&&!J&&(this.selectionMarker=J=c.renderer.rect(h,l,d?1:k,g?1:x,0).attr({fill:e.selectionMarkerFill||H("#335cad").setOpacity(.25).get(),"class":"highcharts-selection-marker",zIndex:7}).add()),J&&d&&(f-=r,J.attr({width:Math.abs(f),x:(0<f?0:f)+r})),J&&g&&(f=b-n,J.attr({height:Math.abs(f),y:(0<f?0:f)+n})),q&&!J&&e.panning&&c.pan(a,e.panning)))},drop:function(a){var c=this,e=this.chart,f=this.hasPinched;if(this.selectionMarker){var b=
{originalEvent:a,xAxis:[],yAxis:[]},g=this.selectionMarker,h=g.attr?g.attr("x"):g.x,q=g.attr?g.attr("y"):g.y,D=g.attr?g.attr("width"):g.width,u=g.attr?g.attr("height"):g.height,x;if(this.hasDragged||f)v(e.axes,function(e){if(e.zoomEnabled&&d(e.min)&&(f||c[{xAxis:"zoomX",yAxis:"zoomY"}[e.coll]])){var m=e.horiz,g="touchend"===a.type?e.minPixelPadding:0,n=e.toValue((m?h:q)+g),m=e.toValue((m?h+D:q+u)-g);b[e.coll].push({axis:e,min:Math.min(n,m),max:Math.max(n,m)});x=!0}}),x&&r(e,"selection",b,function(a){e.zoom(l(a,
f?{animation:!1}:null))});this.selectionMarker=this.selectionMarker.destroy();f&&this.scaleGroups()}e&&(k(e.container,{cursor:e._cursor}),e.cancelClick=10<this.hasDragged,e.mouseIsDown=this.hasDragged=this.hasPinched=!1,this.pinchDown=[])},onContainerMouseDown:function(a){a=this.normalize(a);this.zoomOption(a);a.preventDefault&&a.preventDefault();this.dragStart(a)},onDocumentMouseUp:function(c){E[a.hoverChartIndex]&&E[a.hoverChartIndex].pointer.drop(c)},onDocumentMouseMove:function(a){var c=this.chart,
e=this.chartPosition;a=this.normalize(a,e);!e||this.inClass(a.target,"highcharts-tracker")||c.isInsidePlot(a.chartX-c.plotLeft,a.chartY-c.plotTop)||this.reset()},onContainerMouseLeave:function(c){var e=E[a.hoverChartIndex];e&&(c.relatedTarget||c.toElement)&&(e.pointer.reset(),e.pointer.chartPosition=null)},onContainerMouseMove:function(c){var e=this.chart;d(a.hoverChartIndex)&&E[a.hoverChartIndex]&&E[a.hoverChartIndex].mouseIsDown||(a.hoverChartIndex=e.index);c=this.normalize(c);c.returnValue=!1;
"mousedown"===e.mouseIsDown&&this.drag(c);!this.inClass(c.target,"highcharts-tracker")&&!e.isInsidePlot(c.chartX-e.plotLeft,c.chartY-e.plotTop)||e.openMenu||this.runPointActions(c)},inClass:function(a,c){for(var e;a;){if(e=A(a,"class")){if(-1!==e.indexOf(c))return!0;if(-1!==e.indexOf("highcharts-container"))return!1}a=a.parentNode}},onTrackerMouseOut:function(a){var c=this.chart.hoverSeries;a=a.relatedTarget||a.toElement;if(!(!c||!a||c.options.stickyTracking||this.inClass(a,"highcharts-tooltip")||
this.inClass(a,"highcharts-series-"+c.index)&&this.inClass(a,"highcharts-tracker")))c.onMouseOut()},onContainerClick:function(a){var c=this.chart,e=c.hoverPoint,f=c.plotLeft,b=c.plotTop;a=this.normalize(a);c.cancelClick||(e&&this.inClass(a.target,"highcharts-tracker")?(r(e.series,"click",l(a,{point:e})),c.hoverPoint&&e.firePointEvent("click",a)):(l(a,this.getCoordinates(a)),c.isInsidePlot(a.chartX-f,a.chartY-b)&&r(c,"click",a)))},setDOMEvents:function(){var c=this,f=c.chart.container;f.onmousedown=
function(a){c.onContainerMouseDown(a)};f.onmousemove=function(a){c.onContainerMouseMove(a)};f.onclick=function(a){c.onContainerClick(a)};C(f,"mouseleave",c.onContainerMouseLeave);1===a.chartCount&&C(g,"mouseup",c.onDocumentMouseUp);a.hasTouch&&(f.ontouchstart=function(a){c.onContainerTouchStart(a)},f.ontouchmove=function(a){c.onContainerTouchMove(a)},1===a.chartCount&&C(g,"touchend",c.onDocumentTouchEnd))},destroy:function(){var c;h(this.chart.container,"mouseleave",this.onContainerMouseLeave);a.chartCount||
(h(g,"mouseup",this.onDocumentMouseUp),h(g,"touchend",this.onDocumentTouchEnd));clearInterval(this.tooltipTimeout);for(c in this)this[c]=null}}})(M);(function(a){var C=a.charts,A=a.each,E=a.extend,H=a.map,k=a.noop,d=a.pick;E(a.Pointer.prototype,{pinchTranslate:function(a,d,l,k,q,f){this.zoomHor&&this.pinchTranslateDirection(!0,a,d,l,k,q,f);this.zoomVert&&this.pinchTranslateDirection(!1,a,d,l,k,q,f)},pinchTranslateDirection:function(a,d,l,k,q,f,h,u){var g=this.chart,c=a?"x":"y",e=a?"X":"Y",m="chart"+
e,w=a?"width":"height",r=g["plot"+(a?"Left":"Top")],b,p,t=u||1,v=g.inverted,D=g.bounds[a?"h":"v"],K=1===d.length,x=d[0][m],I=l[0][m],J=!K&&d[1][m],N=!K&&l[1][m],n;l=function(){!K&&20<Math.abs(x-J)&&(t=u||Math.abs(I-N)/Math.abs(x-J));p=(r-I)/t+x;b=g["plot"+(a?"Width":"Height")]/t};l();d=p;d<D.min?(d=D.min,n=!0):d+b>D.max&&(d=D.max-b,n=!0);n?(I-=.8*(I-h[c][0]),K||(N-=.8*(N-h[c][1])),l()):h[c]=[I,N];v||(f[c]=p-r,f[w]=b);f=v?1/t:t;q[w]=b;q[c]=d;k[v?a?"scaleY":"scaleX":"scale"+e]=t;k["translate"+e]=f*
r+(I-f*x)},pinch:function(a){var g=this,l=g.chart,r=g.pinchDown,q=a.touches,f=q.length,h=g.lastValidTouch,u=g.hasZoom,F=g.selectionMarker,c={},e=1===f&&(g.inClass(a.target,"highcharts-tracker")&&l.runTrackerClick||g.runChartClick),m={};1<f&&(g.initiated=!0);u&&g.initiated&&!e&&a.preventDefault();H(q,function(a){return g.normalize(a)});"touchstart"===a.type?(A(q,function(a,c){r[c]={chartX:a.chartX,chartY:a.chartY}}),h.x=[r[0].chartX,r[1]&&r[1].chartX],h.y=[r[0].chartY,r[1]&&r[1].chartY],A(l.axes,function(a){if(a.zoomEnabled){var c=
l.bounds[a.horiz?"h":"v"],b=a.minPixelPadding,e=a.toPixels(d(a.options.min,a.dataMin)),f=a.toPixels(d(a.options.max,a.dataMax)),m=Math.max(e,f);c.min=Math.min(a.pos,Math.min(e,f)-b);c.max=Math.max(a.pos+a.len,m+b)}}),g.res=!0):g.followTouchMove&&1===f?this.runPointActions(g.normalize(a)):r.length&&(F||(g.selectionMarker=F=E({destroy:k,touch:!0},l.plotBox)),g.pinchTranslate(r,q,c,F,m,h),g.hasPinched=u,g.scaleGroups(c,m),g.res&&(g.res=!1,this.reset(!1,0)))},touch:function(g,k){var l=this.chart,r,q;
a.hoverChartIndex=l.index;1===g.touches.length?(g=this.normalize(g),(q=l.isInsidePlot(g.chartX-l.plotLeft,g.chartY-l.plotTop))&&!l.openMenu?(k&&this.runPointActions(g),"touchmove"===g.type&&(k=this.pinchDown,r=k[0]?4<=Math.sqrt(Math.pow(k[0].chartX-g.chartX,2)+Math.pow(k[0].chartY-g.chartY,2)):!1),d(r,!0)&&this.pinch(g)):k&&this.reset()):2===g.touches.length&&this.pinch(g)},onContainerTouchStart:function(a){this.zoomOption(a);this.touch(a,!0)},onContainerTouchMove:function(a){this.touch(a)},onDocumentTouchEnd:function(d){C[a.hoverChartIndex]&&
C[a.hoverChartIndex].pointer.drop(d)}})})(M);(function(a){var C=a.addEvent,A=a.charts,E=a.css,H=a.doc,k=a.extend,d=a.noop,g=a.Pointer,v=a.removeEvent,l=a.win,r=a.wrap;if(l.PointerEvent||l.MSPointerEvent){var q={},f=!!l.PointerEvent,h=function(){var a,c=[];c.item=function(a){return this[a]};for(a in q)q.hasOwnProperty(a)&&c.push({pageX:q[a].pageX,pageY:q[a].pageY,target:q[a].target});return c},u=function(f,c,e,m){"touch"!==f.pointerType&&f.pointerType!==f.MSPOINTER_TYPE_TOUCH||!A[a.hoverChartIndex]||
(m(f),m=A[a.hoverChartIndex].pointer,m[c]({type:e,target:f.currentTarget,preventDefault:d,touches:h()}))};k(g.prototype,{onContainerPointerDown:function(a){u(a,"onContainerTouchStart","touchstart",function(a){q[a.pointerId]={pageX:a.pageX,pageY:a.pageY,target:a.currentTarget}})},onContainerPointerMove:function(a){u(a,"onContainerTouchMove","touchmove",function(a){q[a.pointerId]={pageX:a.pageX,pageY:a.pageY};q[a.pointerId].target||(q[a.pointerId].target=a.currentTarget)})},onDocumentPointerUp:function(a){u(a,
"onDocumentTouchEnd","touchend",function(a){delete q[a.pointerId]})},batchMSEvents:function(a){a(this.chart.container,f?"pointerdown":"MSPointerDown",this.onContainerPointerDown);a(this.chart.container,f?"pointermove":"MSPointerMove",this.onContainerPointerMove);a(H,f?"pointerup":"MSPointerUp",this.onDocumentPointerUp)}});r(g.prototype,"init",function(a,c,e){a.call(this,c,e);this.hasZoom&&E(c.container,{"-ms-touch-action":"none","touch-action":"none"})});r(g.prototype,"setDOMEvents",function(a){a.apply(this);
(this.hasZoom||this.followTouchMove)&&this.batchMSEvents(C)});r(g.prototype,"destroy",function(a){this.batchMSEvents(v);a.call(this)})}})(M);(function(a){var C,A=a.addEvent,E=a.css,H=a.discardElement,k=a.defined,d=a.each,g=a.extend,v=a.isFirefox,l=a.marginNames,r=a.merge,q=a.pick,f=a.setAnimation,h=a.stableSort,u=a.win,F=a.wrap;C=a.Legend=function(a,e){this.init(a,e)};C.prototype={init:function(a,e){this.chart=a;this.setOptions(e);e.enabled&&(this.render(),A(this.chart,"endResize",function(){this.legend.positionCheckboxes()}))},
setOptions:function(a){var c=q(a.padding,8);this.options=a;this.itemStyle=a.itemStyle;this.itemHiddenStyle=r(this.itemStyle,a.itemHiddenStyle);this.itemMarginTop=a.itemMarginTop||0;this.initialItemX=this.padding=c;this.initialItemY=c-5;this.itemHeight=this.maxItemWidth=0;this.symbolWidth=q(a.symbolWidth,16);this.pages=[]},update:function(a,e){var c=this.chart;this.setOptions(r(!0,this.options,a));this.destroy();c.isDirtyLegend=c.isDirtyBox=!0;q(e,!0)&&c.redraw()},colorizeItem:function(a,e){a.legendGroup[e?
"removeClass":"addClass"]("highcharts-legend-item-hidden");var c=this.options,f=a.legendItem,d=a.legendLine,b=a.legendSymbol,g=this.itemHiddenStyle.color,c=e?c.itemStyle.color:g,h=e?a.color||g:g,l=a.options&&a.options.marker,k={fill:h},q;f&&f.css({fill:c,color:c});d&&d.attr({stroke:h});if(b){if(l&&b.isMarker&&(k=a.pointAttribs(),!e))for(q in k)k[q]=g;b.attr(k)}},positionItem:function(a){var c=this.options,f=c.symbolPadding,c=!c.rtl,d=a._legendItemPos,g=d[0],d=d[1],b=a.checkbox;(a=a.legendGroup)&&
a.element&&a.translate(c?g:this.legendWidth-g-2*f-4,d);b&&(b.x=g,b.y=d)},destroyItem:function(a){var c=a.checkbox;d(["legendItem","legendLine","legendSymbol","legendGroup"],function(c){a[c]&&(a[c]=a[c].destroy())});c&&H(a.checkbox)},destroy:function(){var a=this.group,e=this.box;e&&(this.box=e.destroy());d(this.getAllItems(),function(a){d(["legendItem","legendGroup"],function(c){a[c]&&(a[c]=a[c].destroy())})});a&&(this.group=a.destroy());this.display=null},positionCheckboxes:function(a){var c=this.group&&
this.group.alignAttr,f,g=this.clipHeight||this.legendHeight,h=this.titleHeight;c&&(f=c.translateY,d(this.allItems,function(b){var e=b.checkbox,d;e&&(d=f+h+e.y+(a||0)+3,E(e,{left:c.translateX+b.checkboxOffset+e.x-20+"px",top:d+"px",display:d>f-6&&d<f+g-6?"":"none"}))}))},renderTitle:function(){var a=this.padding,e=this.options.title,f=0;e.text&&(this.title||(this.title=this.chart.renderer.label(e.text,a-3,a-4,null,null,null,null,null,"legend-title").attr({zIndex:1}).css(e.style).add(this.group)),a=
this.title.getBBox(),f=a.height,this.offsetWidth=a.width,this.contentGroup.attr({translateY:f}));this.titleHeight=f},setText:function(c){var e=this.options;c.legendItem.attr({text:e.labelFormat?a.format(e.labelFormat,c):e.labelFormatter.call(c)})},renderItem:function(a){var c=this.chart,f=c.renderer,d=this.options,g="horizontal"===d.layout,b=this.symbolWidth,h=d.symbolPadding,l=this.itemStyle,k=this.itemHiddenStyle,u=this.padding,v=g?q(d.itemDistance,20):0,x=!d.rtl,I=d.width,J=d.itemMarginBottom||
0,N=this.itemMarginTop,n=this.initialItemX,z=a.legendItem,F=!a.series,O=!F&&a.series.drawLegendSymbol?a.series:a,B=O.options,B=this.createCheckboxForItem&&B&&B.showCheckbox,y=d.useHTML;z||(a.legendGroup=f.g("legend-item").addClass("highcharts-"+O.type+"-series highcharts-color-"+a.colorIndex+(a.options.className?" "+a.options.className:"")+(F?" highcharts-series-"+a.index:"")).attr({zIndex:1}).add(this.scrollGroup),a.legendItem=z=f.text("",x?b+h:-h,this.baseline||0,y).css(r(a.visible?l:k)).attr({align:x?
"left":"right",zIndex:2}).add(a.legendGroup),this.baseline||(l=l.fontSize,this.fontMetrics=f.fontMetrics(l,z),this.baseline=this.fontMetrics.f+3+N,z.attr("y",this.baseline)),O.drawLegendSymbol(this,a),this.setItemEvents&&this.setItemEvents(a,z,y),B&&this.createCheckboxForItem(a));this.colorizeItem(a,a.visible);this.setText(a);f=z.getBBox();b=a.checkboxOffset=d.itemWidth||a.legendItemWidth||b+h+f.width+v+(B?20:0);this.itemHeight=h=Math.round(a.legendItemHeight||f.height);g&&this.itemX-n+b>(I||c.chartWidth-
2*u-n-d.x)&&(this.itemX=n,this.itemY+=N+this.lastLineHeight+J,this.lastLineHeight=0);this.maxItemWidth=Math.max(this.maxItemWidth,b);this.lastItemY=N+this.itemY+J;this.lastLineHeight=Math.max(h,this.lastLineHeight);a._legendItemPos=[this.itemX,this.itemY];g?this.itemX+=b:(this.itemY+=N+h+J,this.lastLineHeight=h);this.offsetWidth=I||Math.max((g?this.itemX-n-v:b)+u,this.offsetWidth)},getAllItems:function(){var a=[];d(this.chart.series,function(c){var e=c&&c.options;c&&q(e.showInLegend,k(e.linkedTo)?
!1:void 0,!0)&&(a=a.concat(c.legendItems||("point"===e.legendType?c.data:c)))});return a},adjustMargins:function(a,e){var c=this.chart,f=this.options,g=f.align.charAt(0)+f.verticalAlign.charAt(0)+f.layout.charAt(0);f.floating||d([/(lth|ct|rth)/,/(rtv|rm|rbv)/,/(rbh|cb|lbh)/,/(lbv|lm|ltv)/],function(b,d){b.test(g)&&!k(a[d])&&(c[l[d]]=Math.max(c[l[d]],c.legend[(d+1)%2?"legendHeight":"legendWidth"]+[1,-1,-1,1][d]*f[d%2?"x":"y"]+q(f.margin,12)+e[d]))})},render:function(){var a=this,e=a.chart,f=e.renderer,
l=a.group,k,b,p,q,r=a.box,u=a.options,v=a.padding;a.itemX=a.initialItemX;a.itemY=a.initialItemY;a.offsetWidth=0;a.lastItemY=0;l||(a.group=l=f.g("legend").attr({zIndex:7}).add(),a.contentGroup=f.g().attr({zIndex:1}).add(l),a.scrollGroup=f.g().add(a.contentGroup));a.renderTitle();k=a.getAllItems();h(k,function(a,b){return(a.options&&a.options.legendIndex||0)-(b.options&&b.options.legendIndex||0)});u.reversed&&k.reverse();a.allItems=k;a.display=b=!!k.length;a.lastLineHeight=0;d(k,function(b){a.renderItem(b)});
p=(u.width||a.offsetWidth)+v;q=a.lastItemY+a.lastLineHeight+a.titleHeight;q=a.handleOverflow(q);q+=v;r||(a.box=r=f.rect().addClass("highcharts-legend-box").attr({r:u.borderRadius}).add(l),r.isNew=!0);r.attr({stroke:u.borderColor,"stroke-width":u.borderWidth||0,fill:u.backgroundColor||"none"}).shadow(u.shadow);0<p&&0<q&&(r[r.isNew?"attr":"animate"](r.crisp({x:0,y:0,width:p,height:q},r.strokeWidth())),r.isNew=!1);r[b?"show":"hide"]();a.legendWidth=p;a.legendHeight=q;d(k,function(b){a.positionItem(b)});
b&&l.align(g({width:p,height:q},u),!0,"spacingBox");e.isResizing||this.positionCheckboxes()},handleOverflow:function(a){var c=this,f=this.chart,g=f.renderer,h=this.options,b=h.y,f=f.spacingBox.height+("top"===h.verticalAlign?-b:b)-this.padding,b=h.maxHeight,p,l=this.clipRect,k=h.navigation,r=q(k.animation,!0),u=k.arrowSize||12,x=this.nav,I=this.pages,J=this.padding,v,n=this.allItems,z=function(a){a?l.attr({height:a}):(c.clipRect=l.destroy(),c.contentGroup.clip());c.contentGroup.div&&(c.contentGroup.div.style.clip=
a?"rect("+J+"px,9999px,"+(J+a)+"px,0)":"auto")};"horizontal"!==h.layout||"middle"===h.verticalAlign||h.floating||(f/=2);b&&(f=Math.min(f,b));I.length=0;a>f&&!1!==k.enabled?(this.clipHeight=p=Math.max(f-20-this.titleHeight-J,0),this.currentPage=q(this.currentPage,1),this.fullHeight=a,d(n,function(a,b){var c=a._legendItemPos[1];a=Math.round(a.legendItem.getBBox().height);var e=I.length;if(!e||c-I[e-1]>p&&(v||c)!==I[e-1])I.push(v||c),e++;b===n.length-1&&c+a-I[e-1]>p&&I.push(c);c!==v&&(v=c)}),l||(l=c.clipRect=
g.clipRect(0,J,9999,0),c.contentGroup.clip(l)),z(p),x||(this.nav=x=g.g().attr({zIndex:1}).add(this.group),this.up=g.symbol("triangle",0,0,u,u).on("click",function(){c.scroll(-1,r)}).add(x),this.pager=g.text("",15,10).addClass("highcharts-legend-navigation").css(k.style).add(x),this.down=g.symbol("triangle-down",0,0,u,u).on("click",function(){c.scroll(1,r)}).add(x)),c.scroll(0),a=f):x&&(z(),x.hide(),this.scrollGroup.attr({translateY:1}),this.clipHeight=0);return a},scroll:function(a,e){var c=this.pages,
d=c.length;a=this.currentPage+a;var g=this.clipHeight,b=this.options.navigation,h=this.pager,l=this.padding;a>d&&(a=d);0<a&&(void 0!==e&&f(e,this.chart),this.nav.attr({translateX:l,translateY:g+this.padding+7+this.titleHeight,visibility:"visible"}),this.up.attr({"class":1===a?"highcharts-legend-nav-inactive":"highcharts-legend-nav-active"}),h.attr({text:a+"/"+d}),this.down.attr({x:18+this.pager.getBBox().width,"class":a===d?"highcharts-legend-nav-inactive":"highcharts-legend-nav-active"}),this.up.attr({fill:1===
a?b.inactiveColor:b.activeColor}).css({cursor:1===a?"default":"pointer"}),this.down.attr({fill:a===d?b.inactiveColor:b.activeColor}).css({cursor:a===d?"default":"pointer"}),e=-c[a-1]+this.initialItemY,this.scrollGroup.animate({translateY:e}),this.currentPage=a,this.positionCheckboxes(e))}};a.LegendSymbolMixin={drawRectangle:function(a,e){var c=a.options,f=c.symbolHeight||a.fontMetrics.f,c=c.squareSymbol;e.legendSymbol=this.chart.renderer.rect(c?(a.symbolWidth-f)/2:0,a.baseline-f+1,c?f:a.symbolWidth,
f,q(a.options.symbolRadius,f/2)).addClass("highcharts-point").attr({zIndex:3}).add(e.legendGroup)},drawLineMarker:function(a){var c=this.options,f=c.marker,d=a.symbolWidth,g=this.chart.renderer,b=this.legendGroup;a=a.baseline-Math.round(.3*a.fontMetrics.b);var h;h={"stroke-width":c.lineWidth||0};c.dashStyle&&(h.dashstyle=c.dashStyle);this.legendLine=g.path(["M",0,a,"L",d,a]).addClass("highcharts-graph").attr(h).add(b);f&&!1!==f.enabled&&(c=0===this.symbol.indexOf("url")?0:f.radius,this.legendSymbol=
f=g.symbol(this.symbol,d/2-c,a-c,2*c,2*c,f).addClass("highcharts-point").add(b),f.isMarker=!0)}};(/Trident\/7\.0/.test(u.navigator.userAgent)||v)&&F(C.prototype,"positionItem",function(a,e){var c=this,f=function(){e._legendItemPos&&a.call(c,e)};f();setTimeout(f)})})(M);(function(a){var C=a.addEvent,A=a.animate,E=a.animObject,H=a.attr,k=a.doc,d=a.Axis,g=a.createElement,v=a.defaultOptions,l=a.discardElement,r=a.charts,q=a.css,f=a.defined,h=a.each,u=a.error,F=a.extend,c=a.fireEvent,e=a.getStyle,m=a.grep,
w=a.isNumber,G=a.isObject,b=a.isString,p=a.Legend,t=a.marginNames,L=a.merge,D=a.Pointer,K=a.pick,x=a.pInt,I=a.removeEvent,J=a.seriesTypes,N=a.splat,n=a.svg,z=a.syncTimeout,P=a.win,O=a.Renderer,B=a.Chart=function(){this.getArgs.apply(this,arguments)};a.chart=function(a,b,c){return new B(a,b,c)};B.prototype={callbacks:[],getArgs:function(){var a=[].slice.call(arguments);if(b(a[0])||a[0].nodeName)this.renderTo=a.shift();this.init(a[0],a[1])},init:function(b,c){var e,f=b.series;b.series=null;e=L(v,b);
e.series=b.series=f;this.userOptions=b;this.respRules=[];b=e.chart;f=b.events;this.margin=[];this.spacing=[];this.bounds={h:{},v:{}};this.callback=c;this.isResizing=0;this.options=e;this.axes=[];this.series=[];this.hasCartesianSeries=b.showAxes;var d;this.index=r.length;r.push(this);a.chartCount++;if(f)for(d in f)C(this,d,f[d]);this.xAxis=[];this.yAxis=[];this.pointCount=this.colorCounter=this.symbolCounter=0;this.firstRender()},initSeries:function(a){var b=this.options.chart;(b=J[a.type||b.type||
b.defaultSeriesType])||u(17,!0);b=new b;b.init(this,a);return b},isInsidePlot:function(a,b,c){var e=c?b:a;a=c?a:b;return 0<=e&&e<=this.plotWidth&&0<=a&&a<=this.plotHeight},redraw:function(b){var e=this.axes,f=this.series,d=this.pointer,g=this.legend,n=this.isDirtyLegend,m,x,l=this.hasCartesianSeries,p=this.isDirtyBox,k=f.length,q=k,y=this.renderer,J=y.isHidden(),t=[];a.setAnimation(b,this);J&&this.cloneRenderTo();for(this.layOutTitles();q--;)if(b=f[q],b.options.stacking&&(m=!0,b.isDirty)){x=!0;break}if(x)for(q=
k;q--;)b=f[q],b.options.stacking&&(b.isDirty=!0);h(f,function(a){a.isDirty&&"point"===a.options.legendType&&(a.updateTotals&&a.updateTotals(),n=!0);a.isDirtyData&&c(a,"updatedData")});n&&g.options.enabled&&(g.render(),this.isDirtyLegend=!1);m&&this.getStacks();l&&h(e,function(a){a.updateNames();a.setScale()});this.getMargins();l&&(h(e,function(a){a.isDirty&&(p=!0)}),h(e,function(a){var b=a.min+","+a.max;a.extKey!==b&&(a.extKey=b,t.push(function(){c(a,"afterSetExtremes",F(a.eventArgs,a.getExtremes()));
delete a.eventArgs}));(p||m)&&a.redraw()}));p&&this.drawChartBox();h(f,function(a){(p||a.isDirty)&&a.visible&&a.redraw()});d&&d.reset(!0);y.draw();c(this,"redraw");J&&this.cloneRenderTo(!0);h(t,function(a){a.call()})},get:function(a){var b=this.axes,c=this.series,e,f;for(e=0;e<b.length;e++)if(b[e].options.id===a)return b[e];for(e=0;e<c.length;e++)if(c[e].options.id===a)return c[e];for(e=0;e<c.length;e++)for(f=c[e].points||[],b=0;b<f.length;b++)if(f[b].id===a)return f[b];return null},getAxes:function(){var a=
this,b=this.options,c=b.xAxis=N(b.xAxis||{}),b=b.yAxis=N(b.yAxis||{});h(c,function(a,b){a.index=b;a.isX=!0});h(b,function(a,b){a.index=b});c=c.concat(b);h(c,function(b){new d(a,b)})},getSelectedPoints:function(){var a=[];h(this.series,function(b){a=a.concat(m(b.points||[],function(a){return a.selected}))});return a},getSelectedSeries:function(){return m(this.series,function(a){return a.selected})},setTitle:function(a,b,c){var e=this,f=e.options,d;d=f.title=L(f.title,a);f=f.subtitle=L(f.subtitle,b);
h([["title",a,d],["subtitle",b,f]],function(a,b){var c=a[0],f=e[c],d=a[1];a=a[2];f&&d&&(e[c]=f=f.destroy());a&&a.text&&!f&&(e[c]=e.renderer.text(a.text,0,0,a.useHTML).attr({align:a.align,"class":"highcharts-"+c,zIndex:a.zIndex||4}).add(),e[c].update=function(a){e.setTitle(!b&&a,b&&a)},e[c].css(a.style))});e.layOutTitles(c)},layOutTitles:function(a){var b=0,c,e=this.renderer,f=this.spacingBox;h(["title","subtitle"],function(a){var c=this[a],d=this.options[a],g;c&&(g=d.style.fontSize,g=e.fontMetrics(g,
c).b,c.css({width:(d.width||f.width+d.widthAdjust)+"px"}).align(F({y:b+g+("title"===a?-3:2)},d),!1,"spacingBox"),d.floating||d.verticalAlign||(b=Math.ceil(b+c.getBBox().height)))},this);c=this.titleOffset!==b;this.titleOffset=b;!this.isDirtyBox&&c&&(this.isDirtyBox=c,this.hasRendered&&K(a,!0)&&this.isDirtyBox&&this.redraw())},getChartSize:function(){var a=this.options.chart,b=a.width,a=a.height,c=this.renderToClone||this.renderTo;f(b)||(this.containerWidth=e(c,"width"));f(a)||(this.containerHeight=
e(c,"height"));this.chartWidth=Math.max(0,b||this.containerWidth||600);this.chartHeight=Math.max(0,K(a,19<this.containerHeight?this.containerHeight:400))},cloneRenderTo:function(a){var b=this.renderToClone,c=this.container;if(a){if(b){for(;b.childNodes.length;)this.renderTo.appendChild(b.firstChild);l(b);delete this.renderToClone}}else c&&c.parentNode===this.renderTo&&this.renderTo.removeChild(c),this.renderToClone=b=this.renderTo.cloneNode(0),q(b,{position:"absolute",top:"-9999px",display:"block"}),
b.style.setProperty&&b.style.setProperty("display","block","important"),k.body.appendChild(b),c&&b.appendChild(c)},setClassName:function(a){this.container.className="highcharts-container "+(a||"")},getContainer:function(){var c,e=this.options,f=e.chart,d,h;c=this.renderTo;var n=a.uniqueKey(),m;c||(this.renderTo=c=f.renderTo);b(c)&&(this.renderTo=c=k.getElementById(c));c||u(13,!0);d=x(H(c,"data-highcharts-chart"));w(d)&&r[d]&&r[d].hasRendered&&r[d].destroy();H(c,"data-highcharts-chart",this.index);
c.innerHTML="";f.skipClone||c.offsetWidth||this.cloneRenderTo();this.getChartSize();d=this.chartWidth;h=this.chartHeight;m=F({position:"relative",overflow:"hidden",width:d+"px",height:h+"px",textAlign:"left",lineHeight:"normal",zIndex:0,"-webkit-tap-highlight-color":"rgba(0,0,0,0)"},f.style);this.container=c=g("div",{id:n},m,this.renderToClone||c);this._cursor=c.style.cursor;this.renderer=new (a[f.renderer]||O)(c,d,h,null,f.forExport,e.exporting&&e.exporting.allowHTML);this.setClassName(f.className);
this.renderer.setStyle(f.style);this.renderer.chartIndex=this.index},getMargins:function(a){var b=this.spacing,c=this.margin,e=this.titleOffset;this.resetMargins();e&&!f(c[0])&&(this.plotTop=Math.max(this.plotTop,e+this.options.title.margin+b[0]));this.legend.display&&this.legend.adjustMargins(c,b);this.extraBottomMargin&&(this.marginBottom+=this.extraBottomMargin);this.extraTopMargin&&(this.plotTop+=this.extraTopMargin);a||this.getAxisMargins()},getAxisMargins:function(){var a=this,b=a.axisOffset=
[0,0,0,0],c=a.margin;a.hasCartesianSeries&&h(a.axes,function(a){a.visible&&a.getOffset()});h(t,function(e,d){f(c[d])||(a[e]+=b[d])});a.setChartSize()},reflow:function(a){var b=this,c=b.options.chart,d=b.renderTo,g=f(c.width),h=c.width||e(d,"width"),c=c.height||e(d,"height"),d=a?a.target:P;if(!g&&!b.isPrinting&&h&&c&&(d===P||d===k)){if(h!==b.containerWidth||c!==b.containerHeight)clearTimeout(b.reflowTimeout),b.reflowTimeout=z(function(){b.container&&b.setSize(void 0,void 0,!1)},a?100:0);b.containerWidth=
h;b.containerHeight=c}},initReflow:function(){var a=this,b;b=C(P,"resize",function(b){a.reflow(b)});C(a,"destroy",b)},setSize:function(b,e,f){var d=this,g=d.renderer;d.isResizing+=1;a.setAnimation(f,d);d.oldChartHeight=d.chartHeight;d.oldChartWidth=d.chartWidth;void 0!==b&&(d.options.chart.width=b);void 0!==e&&(d.options.chart.height=e);d.getChartSize();b=g.globalAnimation;(b?A:q)(d.container,{width:d.chartWidth+"px",height:d.chartHeight+"px"},b);d.setChartSize(!0);g.setSize(d.chartWidth,d.chartHeight,
f);h(d.axes,function(a){a.isDirty=!0;a.setScale()});d.isDirtyLegend=!0;d.isDirtyBox=!0;d.layOutTitles();d.getMargins();d.setResponsive&&d.setResponsive(!1);d.redraw(f);d.oldChartHeight=null;c(d,"resize");z(function(){d&&c(d,"endResize",null,function(){--d.isResizing})},E(b).duration)},setChartSize:function(a){var b=this.inverted,c=this.renderer,e=this.chartWidth,f=this.chartHeight,d=this.options.chart,g=this.spacing,n=this.clipOffset,m,x,p,l;this.plotLeft=m=Math.round(this.plotLeft);this.plotTop=
x=Math.round(this.plotTop);this.plotWidth=p=Math.max(0,Math.round(e-m-this.marginRight));this.plotHeight=l=Math.max(0,Math.round(f-x-this.marginBottom));this.plotSizeX=b?l:p;this.plotSizeY=b?p:l;this.plotBorderWidth=d.plotBorderWidth||0;this.spacingBox=c.spacingBox={x:g[3],y:g[0],width:e-g[3]-g[1],height:f-g[0]-g[2]};this.plotBox=c.plotBox={x:m,y:x,width:p,height:l};e=2*Math.floor(this.plotBorderWidth/2);b=Math.ceil(Math.max(e,n[3])/2);c=Math.ceil(Math.max(e,n[0])/2);this.clipBox={x:b,y:c,width:Math.floor(this.plotSizeX-
Math.max(e,n[1])/2-b),height:Math.max(0,Math.floor(this.plotSizeY-Math.max(e,n[2])/2-c))};a||h(this.axes,function(a){a.setAxisSize();a.setAxisTranslation()})},resetMargins:function(){var a=this,b=a.options.chart;h(["margin","spacing"],function(c){var e=b[c],f=G(e)?e:[e,e,e,e];h(["Top","Right","Bottom","Left"],function(e,d){a[c][d]=K(b[c+e],f[d])})});h(t,function(b,c){a[b]=K(a.margin[c],a.spacing[c])});a.axisOffset=[0,0,0,0];a.clipOffset=[0,0,0,0]},drawChartBox:function(){var a=this.options.chart,
b=this.renderer,c=this.chartWidth,e=this.chartHeight,f=this.chartBackground,d=this.plotBackground,g=this.plotBorder,h,n=this.plotBGImage,m=a.backgroundColor,x=a.plotBackgroundColor,p=a.plotBackgroundImage,l,k=this.plotLeft,q=this.plotTop,J=this.plotWidth,t=this.plotHeight,I=this.plotBox,r=this.clipRect,u=this.clipBox,w="animate";f||(this.chartBackground=f=b.rect().addClass("highcharts-background").add(),w="attr");h=a.borderWidth||0;l=h+(a.shadow?8:0);m={fill:m||"none"};if(h||f["stroke-width"])m.stroke=
a.borderColor,m["stroke-width"]=h;f.attr(m).shadow(a.shadow);f[w]({x:l/2,y:l/2,width:c-l-h%2,height:e-l-h%2,r:a.borderRadius});w="animate";d||(w="attr",this.plotBackground=d=b.rect().addClass("highcharts-plot-background").add());d[w](I);d.attr({fill:x||"none"}).shadow(a.plotShadow);p&&(n?n.animate(I):this.plotBGImage=b.image(p,k,q,J,t).add());r?r.animate({width:u.width,height:u.height}):this.clipRect=b.clipRect(u);w="animate";g||(w="attr",this.plotBorder=g=b.rect().addClass("highcharts-plot-border").attr({zIndex:1}).add());
g.attr({stroke:a.plotBorderColor,"stroke-width":a.plotBorderWidth||0,fill:"none"});g[w](g.crisp({x:k,y:q,width:J,height:t},-g.strokeWidth()));this.isDirtyBox=!1},propFromSeries:function(){var a=this,b=a.options.chart,c,e=a.options.series,f,d;h(["inverted","angular","polar"],function(g){c=J[b.type||b.defaultSeriesType];d=b[g]||c&&c.prototype[g];for(f=e&&e.length;!d&&f--;)(c=J[e[f].type])&&c.prototype[g]&&(d=!0);a[g]=d})},linkSeries:function(){var a=this,c=a.series;h(c,function(a){a.linkedSeries.length=
0});h(c,function(c){var e=c.options.linkedTo;b(e)&&(e=":previous"===e?a.series[c.index-1]:a.get(e))&&e.linkedParent!==c&&(e.linkedSeries.push(c),c.linkedParent=e,c.visible=K(c.options.visible,e.options.visible,c.visible))})},renderSeries:function(){h(this.series,function(a){a.translate();a.render()})},renderLabels:function(){var a=this,b=a.options.labels;b.items&&h(b.items,function(c){var e=F(b.style,c.style),f=x(e.left)+a.plotLeft,d=x(e.top)+a.plotTop+12;delete e.left;delete e.top;a.renderer.text(c.html,
f,d).attr({zIndex:2}).css(e).add()})},render:function(){var a=this.axes,b=this.renderer,c=this.options,e,f,d;this.setTitle();this.legend=new p(this,c.legend);this.getStacks&&this.getStacks();this.getMargins(!0);this.setChartSize();c=this.plotWidth;e=this.plotHeight-=21;h(a,function(a){a.setScale()});this.getAxisMargins();f=1.1<c/this.plotWidth;d=1.05<e/this.plotHeight;if(f||d)h(a,function(a){(a.horiz&&f||!a.horiz&&d)&&a.setTickInterval(!0)}),this.getMargins();this.drawChartBox();this.hasCartesianSeries&&
h(a,function(a){a.visible&&a.render()});this.seriesGroup||(this.seriesGroup=b.g("series-group").attr({zIndex:3}).add());this.renderSeries();this.renderLabels();this.addCredits();this.setResponsive&&this.setResponsive();this.hasRendered=!0},addCredits:function(a){var b=this;a=L(!0,this.options.credits,a);a.enabled&&!this.credits&&(this.credits=this.renderer.text(a.text+(this.mapCredits||""),0,0).addClass("highcharts-credits").on("click",function(){a.href&&(P.location.href=a.href)}).attr({align:a.position.align,
zIndex:8}).css(a.style).add().align(a.position),this.credits.update=function(a){b.credits=b.credits.destroy();b.addCredits(a)})},destroy:function(){var b=this,e=b.axes,f=b.series,d=b.container,g,n=d&&d.parentNode;c(b,"destroy");r[b.index]=void 0;a.chartCount--;b.renderTo.removeAttribute("data-highcharts-chart");I(b);for(g=e.length;g--;)e[g]=e[g].destroy();this.scroller&&this.scroller.destroy&&this.scroller.destroy();for(g=f.length;g--;)f[g]=f[g].destroy();h("title subtitle chartBackground plotBackground plotBGImage plotBorder seriesGroup clipRect credits pointer rangeSelector legend resetZoomButton tooltip renderer".split(" "),
function(a){var c=b[a];c&&c.destroy&&(b[a]=c.destroy())});d&&(d.innerHTML="",I(d),n&&l(d));for(g in b)delete b[g]},isReadyToRender:function(){var a=this;return n||P!=P.top||"complete"===k.readyState?!0:(k.attachEvent("onreadystatechange",function(){k.detachEvent("onreadystatechange",a.firstRender);"complete"===k.readyState&&a.firstRender()}),!1)},firstRender:function(){var a=this,b=a.options;if(a.isReadyToRender()){a.getContainer();c(a,"init");a.resetMargins();a.setChartSize();a.propFromSeries();
a.getAxes();h(b.series||[],function(b){a.initSeries(b)});a.linkSeries();c(a,"beforeRender");D&&(a.pointer=new D(a,b));a.render();a.renderer.draw();if(!a.renderer.imgCount&&a.onload)a.onload();a.cloneRenderTo(!0)}},onload:function(){h([this.callback].concat(this.callbacks),function(a){a&&void 0!==this.index&&a.apply(this,[this])},this);c(this,"load");!1!==this.options.chart.reflow&&this.initReflow();this.onload=null}}})(M);(function(a){var C,A=a.each,E=a.extend,H=a.erase,k=a.fireEvent,d=a.format,g=
a.isArray,v=a.isNumber,l=a.pick,r=a.removeEvent;C=a.Point=function(){};C.prototype={init:function(a,f,d){this.series=a;this.color=a.color;this.applyOptions(f,d);a.options.colorByPoint?(f=a.options.colors||a.chart.options.colors,this.color=this.color||f[a.colorCounter],f=f.length,d=a.colorCounter,a.colorCounter++,a.colorCounter===f&&(a.colorCounter=0)):d=a.colorIndex;this.colorIndex=l(this.colorIndex,d);a.chart.pointCount++;return this},applyOptions:function(a,f){var d=this.series,g=d.options.pointValKey||
d.pointValKey;a=C.prototype.optionsToObject.call(this,a);E(this,a);this.options=this.options?E(this.options,a):a;a.group&&delete this.group;g&&(this.y=this[g]);this.isNull=l(this.isValid&&!this.isValid(),null===this.x||!v(this.y,!0));this.selected&&(this.state="select");"name"in this&&void 0===f&&d.xAxis&&d.xAxis.hasNames&&(this.x=d.xAxis.nameToX(this));void 0===this.x&&d&&(this.x=void 0===f?d.autoIncrement(this):f);return this},optionsToObject:function(a){var f={},d=this.series,l=d.options.keys,
k=l||d.pointArrayMap||["y"],c=k.length,e=0,m=0;if(v(a)||null===a)f[k[0]]=a;else if(g(a))for(!l&&a.length>c&&(d=typeof a[0],"string"===d?f.name=a[0]:"number"===d&&(f.x=a[0]),e++);m<c;)l&&void 0===a[e]||(f[k[m]]=a[e]),e++,m++;else"object"===typeof a&&(f=a,a.dataLabels&&(d._hasPointLabels=!0),a.marker&&(d._hasPointMarkers=!0));return f},getClassName:function(){return"highcharts-point"+(this.selected?" highcharts-point-select":"")+(this.negative?" highcharts-negative":"")+(this.isNull?" highcharts-null-point":
"")+(void 0!==this.colorIndex?" highcharts-color-"+this.colorIndex:"")+(this.options.className?" "+this.options.className:"")},getZone:function(){var a=this.series,f=a.zones,a=a.zoneAxis||"y",d=0,g;for(g=f[d];this[a]>=g.value;)g=f[++d];g&&g.color&&!this.options.color&&(this.color=g.color);return g},destroy:function(){var a=this.series.chart,f=a.hoverPoints,d;a.pointCount--;f&&(this.setState(),H(f,this),f.length||(a.hoverPoints=null));if(this===a.hoverPoint)this.onMouseOut();if(this.graphic||this.dataLabel)r(this),
this.destroyElements();this.legendItem&&a.legend.destroyItem(this);for(d in this)this[d]=null},destroyElements:function(){for(var a=["graphic","dataLabel","dataLabelUpper","connector","shadowGroup"],f,d=6;d--;)f=a[d],this[f]&&(this[f]=this[f].destroy())},getLabelConfig:function(){return{x:this.category,y:this.y,color:this.color,key:this.name||this.category,series:this.series,point:this,percentage:this.percentage,total:this.total||this.stackTotal}},tooltipFormatter:function(a){var f=this.series,g=
f.tooltipOptions,k=l(g.valueDecimals,""),q=g.valuePrefix||"",c=g.valueSuffix||"";A(f.pointArrayMap||["y"],function(e){e="{point."+e;if(q||c)a=a.replace(e+"}",q+e+"}"+c);a=a.replace(e+"}",e+":,."+k+"f}")});return d(a,{point:this,series:this.series})},firePointEvent:function(a,f,d){var g=this,h=this.series.options;(h.point.events[a]||g.options&&g.options.events&&g.options.events[a])&&this.importEvents();"click"===a&&h.allowPointSelect&&(d=function(a){g.select&&g.select(null,a.ctrlKey||a.metaKey||a.shiftKey)});
k(this,a,f,d)},visible:!0}})(M);(function(a){var C=a.addEvent,A=a.animObject,E=a.arrayMax,H=a.arrayMin,k=a.correctFloat,d=a.Date,g=a.defaultOptions,v=a.defaultPlotOptions,l=a.defined,r=a.each,q=a.erase,f=a.error,h=a.extend,u=a.fireEvent,F=a.grep,c=a.isArray,e=a.isNumber,m=a.isString,w=a.merge,G=a.pick,b=a.removeEvent,p=a.splat,t=a.stableSort,L=a.SVGElement,D=a.syncTimeout,K=a.win;a.Series=a.seriesType("line",null,{lineWidth:2,allowPointSelect:!1,showCheckbox:!1,animation:{duration:1E3},events:{},
marker:{lineWidth:0,lineColor:"#ffffff",radius:4,states:{hover:{animation:{duration:50},enabled:!0,radiusPlus:2,lineWidthPlus:1},select:{fillColor:"#cccccc",lineColor:"#000000",lineWidth:2}}},point:{events:{}},dataLabels:{align:"center",formatter:function(){return null===this.y?"":a.numberFormat(this.y,-1)},style:{fontSize:"11px",fontWeight:"bold",color:"contrast",textShadow:"1px 1px contrast, -1px -1px contrast, -1px 1px contrast, 1px -1px contrast"},verticalAlign:"bottom",x:0,y:0,padding:5},cropThreshold:300,
pointRange:0,softThreshold:!0,states:{hover:{lineWidthPlus:1,marker:{},halo:{size:10,opacity:.25}},select:{marker:{}}},stickyTracking:!0,turboThreshold:1E3},{isCartesian:!0,pointClass:a.Point,sorted:!0,requireSorting:!0,directTouch:!1,axisTypes:["xAxis","yAxis"],colorCounter:0,parallelArrays:["x","y"],coll:"series",init:function(a,b){var c=this,e,f,d=a.series,g=function(a,b){return G(a.options.index,a._i)-G(b.options.index,b._i)};c.chart=a;c.options=b=c.setOptions(b);c.linkedSeries=[];c.bindAxes();
h(c,{name:b.name,state:"",visible:!1!==b.visible,selected:!0===b.selected});f=b.events;for(e in f)C(c,e,f[e]);if(f&&f.click||b.point&&b.point.events&&b.point.events.click||b.allowPointSelect)a.runTrackerClick=!0;c.getColor();c.getSymbol();r(c.parallelArrays,function(a){c[a+"Data"]=[]});c.setData(b.data,!1);c.isCartesian&&(a.hasCartesianSeries=!0);d.push(c);c._i=d.length-1;t(d,g);this.yAxis&&t(this.yAxis.series,g);r(d,function(a,b){a.index=b;a.name=a.name||"Series "+(b+1)})},bindAxes:function(){var a=
this,b=a.options,c=a.chart,e;r(a.axisTypes||[],function(d){r(c[d],function(c){e=c.options;if(b[d]===e.index||void 0!==b[d]&&b[d]===e.id||void 0===b[d]&&0===e.index)c.series.push(a),a[d]=c,c.isDirty=!0});a[d]||a.optionalAxis===d||f(18,!0)})},updateParallelArrays:function(a,b){var c=a.series,f=arguments,d=e(b)?function(e){var f="y"===e&&c.toYData?c.toYData(a):a[e];c[e+"Data"][b]=f}:function(a){Array.prototype[b].apply(c[a+"Data"],Array.prototype.slice.call(f,2))};r(c.parallelArrays,d)},autoIncrement:function(){var a=
this.options,b=this.xIncrement,c,e=a.pointIntervalUnit,b=G(b,a.pointStart,0);this.pointInterval=c=G(this.pointInterval,a.pointInterval,1);e&&(a=new d(b),"day"===e?a=+a[d.hcSetDate](a[d.hcGetDate]()+c):"month"===e?a=+a[d.hcSetMonth](a[d.hcGetMonth]()+c):"year"===e&&(a=+a[d.hcSetFullYear](a[d.hcGetFullYear]()+c)),c=a-b);this.xIncrement=b+c;return b},setOptions:function(a){var b=this.chart,c=b.options.plotOptions,b=b.userOptions||{},e=b.plotOptions||{},f=c[this.type];this.userOptions=a;c=w(f,c.series,
a);this.tooltipOptions=w(g.tooltip,g.plotOptions[this.type].tooltip,b.tooltip,e.series&&e.series.tooltip,e[this.type]&&e[this.type].tooltip,a.tooltip);null===f.marker&&delete c.marker;this.zoneAxis=c.zoneAxis;a=this.zones=(c.zones||[]).slice();!c.negativeColor&&!c.negativeFillColor||c.zones||a.push({value:c[this.zoneAxis+"Threshold"]||c.threshold||0,className:"highcharts-negative",color:c.negativeColor,fillColor:c.negativeFillColor});a.length&&l(a[a.length-1].value)&&a.push({color:this.color,fillColor:this.fillColor});
return c},getCyclic:function(a,b,c){var e,f=this.userOptions,d=a+"Index",g=a+"Counter",h=c?c.length:G(this.chart.options.chart[a+"Count"],this.chart[a+"Count"]);b||(e=G(f[d],f["_"+d]),l(e)||(f["_"+d]=e=this.chart[g]%h,this.chart[g]+=1),c&&(b=c[e]));void 0!==e&&(this[d]=e);this[a]=b},getColor:function(){this.options.colorByPoint?this.options.color=null:this.getCyclic("color",this.options.color||v[this.type].color,this.chart.options.colors)},getSymbol:function(){this.getCyclic("symbol",this.options.marker.symbol,
this.chart.options.symbols)},drawLegendSymbol:a.LegendSymbolMixin.drawLineMarker,setData:function(a,b,d,g){var h=this,l=h.points,p=l&&l.length||0,k,x=h.options,q=h.chart,t=null,w=h.xAxis,u=x.turboThreshold,I=this.xData,D=this.yData,J=(k=h.pointArrayMap)&&k.length;a=a||[];k=a.length;b=G(b,!0);if(!1!==g&&k&&p===k&&!h.cropped&&!h.hasGroupedData&&h.visible)r(a,function(a,b){l[b].update&&a!==x.data[b]&&l[b].update(a,!1,null,!1)});else{h.xIncrement=null;h.colorCounter=0;r(this.parallelArrays,function(a){h[a+
"Data"].length=0});if(u&&k>u){for(d=0;null===t&&d<k;)t=a[d],d++;if(e(t))for(d=0;d<k;d++)I[d]=this.autoIncrement(),D[d]=a[d];else if(c(t))if(J)for(d=0;d<k;d++)t=a[d],I[d]=t[0],D[d]=t.slice(1,J+1);else for(d=0;d<k;d++)t=a[d],I[d]=t[0],D[d]=t[1];else f(12)}else for(d=0;d<k;d++)void 0!==a[d]&&(t={series:h},h.pointClass.prototype.applyOptions.apply(t,[a[d]]),h.updateParallelArrays(t,d));m(D[0])&&f(14,!0);h.data=[];h.options.data=h.userOptions.data=a;for(d=p;d--;)l[d]&&l[d].destroy&&l[d].destroy();w&&(w.minRange=
w.userMinRange);h.isDirty=q.isDirtyBox=!0;h.isDirtyData=!!l;d=!1}"point"===x.legendType&&(this.processData(),this.generatePoints());b&&q.redraw(d)},processData:function(a){var b=this.xData,c=this.yData,e=b.length,d;d=0;var g,h,m=this.xAxis,l,p=this.options;l=p.cropThreshold;var k=this.getExtremesFromAll||p.getExtremesFromAll,x=this.isCartesian,p=m&&m.val2lin,q=m&&m.isLog,t,r;if(x&&!this.isDirty&&!m.isDirty&&!this.yAxis.isDirty&&!a)return!1;m&&(a=m.getExtremes(),t=a.min,r=a.max);if(x&&this.sorted&&
!k&&(!l||e>l||this.forceCrop))if(b[e-1]<t||b[0]>r)b=[],c=[];else if(b[0]<t||b[e-1]>r)d=this.cropData(this.xData,this.yData,t,r),b=d.xData,c=d.yData,d=d.start,g=!0;for(l=b.length||1;--l;)e=q?p(b[l])-p(b[l-1]):b[l]-b[l-1],0<e&&(void 0===h||e<h)?h=e:0>e&&this.requireSorting&&f(15);this.cropped=g;this.cropStart=d;this.processedXData=b;this.processedYData=c;this.closestPointRange=h},cropData:function(a,b,c,e){var f=a.length,d=0,g=f,h=G(this.cropShoulder,1),m;for(m=0;m<f;m++)if(a[m]>=c){d=Math.max(0,m-
h);break}for(c=m;c<f;c++)if(a[c]>e){g=c+h;break}return{xData:a.slice(d,g),yData:b.slice(d,g),start:d,end:g}},generatePoints:function(){var a=this.options.data,b=this.data,c,e=this.processedXData,f=this.processedYData,d=this.pointClass,g=e.length,h=this.cropStart||0,m,l=this.hasGroupedData,k,q=[],t;b||l||(b=[],b.length=a.length,b=this.data=b);for(t=0;t<g;t++)m=h+t,l?(q[t]=(new d).init(this,[e[t]].concat(p(f[t]))),q[t].dataGroup=this.groupMap[t]):(b[m]?k=b[m]:void 0!==a[m]&&(b[m]=k=(new d).init(this,
a[m],e[t])),q[t]=k),q[t].index=m;if(b&&(g!==(c=b.length)||l))for(t=0;t<c;t++)t!==h||l||(t+=g),b[t]&&(b[t].destroyElements(),b[t].plotX=void 0);this.data=b;this.points=q},getExtremes:function(a){var b=this.yAxis,f=this.processedXData,d,g=[],h=0;d=this.xAxis.getExtremes();var m=d.min,l=d.max,p,k,x,t;a=a||this.stackedYData||this.processedYData||[];d=a.length;for(t=0;t<d;t++)if(k=f[t],x=a[t],p=(e(x,!0)||c(x))&&(!b.isLog||x.length||0<x),k=this.getExtremesFromAll||this.options.getExtremesFromAll||this.cropped||
(f[t+1]||k)>=m&&(f[t-1]||k)<=l,p&&k)if(p=x.length)for(;p--;)null!==x[p]&&(g[h++]=x[p]);else g[h++]=x;this.dataMin=H(g);this.dataMax=E(g)},translate:function(){this.processedXData||this.processData();this.generatePoints();var a=this.options,b=a.stacking,c=this.xAxis,f=c.categories,d=this.yAxis,g=this.points,h=g.length,m=!!this.modifyValue,p=a.pointPlacement,t="between"===p||e(p),q=a.threshold,r=a.startFromThreshold?q:0,w,u,D,v,K=Number.MAX_VALUE;"between"===p&&(p=.5);e(p)&&(p*=G(a.pointRange||c.pointRange));
for(a=0;a<h;a++){var L=g[a],F=L.x,A=L.y;u=L.low;var C=b&&d.stacks[(this.negStacks&&A<(r?0:q)?"-":"")+this.stackKey],E;d.isLog&&null!==A&&0>=A&&(L.isNull=!0);L.plotX=w=k(Math.min(Math.max(-1E5,c.translate(F,0,0,0,1,p,"flags"===this.type)),1E5));b&&this.visible&&!L.isNull&&C&&C[F]&&(v=this.getStackIndicator(v,F,this.index),E=C[F],A=E.points[v.key],u=A[0],A=A[1],u===r&&v.key===C[F].base&&(u=G(q,d.min)),d.isLog&&0>=u&&(u=null),L.total=L.stackTotal=E.total,L.percentage=E.total&&L.y/E.total*100,L.stackY=
A,E.setOffset(this.pointXOffset||0,this.barW||0));L.yBottom=l(u)?d.translate(u,0,1,0,1):null;m&&(A=this.modifyValue(A,L));L.plotY=u="number"===typeof A&&Infinity!==A?Math.min(Math.max(-1E5,d.translate(A,0,1,0,1)),1E5):void 0;L.isInside=void 0!==u&&0<=u&&u<=d.len&&0<=w&&w<=c.len;L.clientX=t?k(c.translate(F,0,0,0,1,p)):w;L.negative=L.y<(q||0);L.category=f&&void 0!==f[L.x]?f[L.x]:L.x;L.isNull||(void 0!==D&&(K=Math.min(K,Math.abs(w-D))),D=w)}this.closestPointRangePx=K},getValidPoints:function(a,b){var c=
this.chart;return F(a||this.points||[],function(a){return b&&!c.isInsidePlot(a.plotX,a.plotY,c.inverted)?!1:!a.isNull})},setClip:function(a){var b=this.chart,c=this.options,e=b.renderer,f=b.inverted,d=this.clipBox,g=d||b.clipBox,h=this.sharedClipKey||["_sharedClip",a&&a.duration,a&&a.easing,g.height,c.xAxis,c.yAxis].join(),m=b[h],l=b[h+"m"];m||(a&&(g.width=0,b[h+"m"]=l=e.clipRect(-99,f?-b.plotLeft:-b.plotTop,99,f?b.chartWidth:b.chartHeight)),b[h]=m=e.clipRect(g),m.count={length:0});a&&!m.count[this.index]&&
(m.count[this.index]=!0,m.count.length+=1);!1!==c.clip&&(this.group.clip(a||d?m:b.clipRect),this.markerGroup.clip(l),this.sharedClipKey=h);a||(m.count[this.index]&&(delete m.count[this.index],--m.count.length),0===m.count.length&&h&&b[h]&&(d||(b[h]=b[h].destroy()),b[h+"m"]&&(b[h+"m"]=b[h+"m"].destroy())))},animate:function(a){var b=this.chart,c=A(this.options.animation),e;a?this.setClip(c):(e=this.sharedClipKey,(a=b[e])&&a.animate({width:b.plotSizeX},c),b[e+"m"]&&b[e+"m"].animate({width:b.plotSizeX+
99},c),this.animate=null)},afterAnimate:function(){this.setClip();u(this,"afterAnimate")},drawPoints:function(){var a=this.points,b=this.chart,c,f,d,g,h=this.options.marker,m,l,p,k,t=this.markerGroup,q=G(h.enabled,this.xAxis.isRadial?!0:null,this.closestPointRangePx>2*h.radius);if(!1!==h.enabled||this._hasPointMarkers)for(f=a.length;f--;)d=a[f],c=d.plotY,g=d.graphic,m=d.marker||{},l=!!d.marker,p=q&&void 0===m.enabled||m.enabled,k=d.isInside,p&&e(c)&&null!==d.y?(c=G(m.symbol,this.symbol),d.hasImage=
0===c.indexOf("url"),p=this.markerAttribs(d,d.selected&&"select"),g?g[k?"show":"hide"](!0).animate(p):k&&(0<p.width||d.hasImage)&&(d.graphic=g=b.renderer.symbol(c,p.x,p.y,p.width,p.height,l?m:h).add(t)),g&&g.attr(this.pointAttribs(d,d.selected&&"select")),g&&g.addClass(d.getClassName(),!0)):g&&(d.graphic=g.destroy())},markerAttribs:function(a,b){var c=this.options.marker,e=a&&a.options,f=e&&e.marker||{},e=G(f.radius,c.radius);b&&(c=c.states[b],b=f.states&&f.states[b],e=G(b&&b.radius,c&&c.radius,e+
(c&&c.radiusPlus||0)));a.hasImage&&(e=0);a={x:Math.floor(a.plotX)-e,y:a.plotY-e};e&&(a.width=a.height=2*e);return a},pointAttribs:function(a,b){var c=this.options.marker,e=a&&a.options,f=e&&e.marker||{},d=this.color,g=e&&e.color,h=a&&a.color,e=G(f.lineWidth,c.lineWidth),m;a&&this.zones.length&&(a=a.getZone())&&a.color&&(m=a.color);d=g||m||h||d;m=f.fillColor||c.fillColor||d;d=f.lineColor||c.lineColor||d;b&&(c=c.states[b],b=f.states&&f.states[b]||{},e=G(b.lineWidth,c.lineWidth,e+G(b.lineWidthPlus,c.lineWidthPlus,
0)),m=b.fillColor||c.fillColor||m,d=b.lineColor||c.lineColor||d);return{stroke:d,"stroke-width":e,fill:m}},destroy:function(){var a=this,c=a.chart,e=/AppleWebKit\/533/.test(K.navigator.userAgent),f,d=a.data||[],g,h,m;u(a,"destroy");b(a);r(a.axisTypes||[],function(b){(m=a[b])&&m.series&&(q(m.series,a),m.isDirty=m.forceRedraw=!0)});a.legendItem&&a.chart.legend.destroyItem(a);for(f=d.length;f--;)(g=d[f])&&g.destroy&&g.destroy();a.points=null;clearTimeout(a.animationTimeout);for(h in a)a[h]instanceof
L&&!a[h].survive&&(f=e&&"group"===h?"hide":"destroy",a[h][f]());c.hoverSeries===a&&(c.hoverSeries=null);q(c.series,a);for(h in a)delete a[h]},getGraphPath:function(a,b,c){var e=this,f=e.options,d=f.step,g,h=[],m=[],p;a=a||e.points;(g=a.reversed)&&a.reverse();(d={right:1,center:2}[d]||d&&3)&&g&&(d=4-d);!f.connectNulls||b||c||(a=this.getValidPoints(a));r(a,function(g,k){var n=g.plotX,t=g.plotY,q=a[k-1];(g.leftCliff||q&&q.rightCliff)&&!c&&(p=!0);g.isNull&&!l(b)&&0<k?p=!f.connectNulls:g.isNull&&!b?p=
!0:(0===k||p?k=["M",g.plotX,g.plotY]:e.getPointSpline?k=e.getPointSpline(a,g,k):d?(k=1===d?["L",q.plotX,t]:2===d?["L",(q.plotX+n)/2,q.plotY,"L",(q.plotX+n)/2,t]:["L",n,q.plotY],k.push("L",n,t)):k=["L",n,t],m.push(g.x),d&&m.push(g.x),h.push.apply(h,k),p=!1)});h.xMap=m;return e.graphPath=h},drawGraph:function(){var a=this,b=this.options,c=(this.gappedPath||this.getGraphPath).call(this),e=[["graph","highcharts-graph",b.lineColor||this.color,b.dashStyle]];r(this.zones,function(c,f){e.push(["zone-graph-"+
f,"highcharts-graph highcharts-zone-graph-"+f+" "+(c.className||""),c.color||a.color,c.dashStyle||b.dashStyle])});r(e,function(e,f){var d=e[0],g=a[d];g?(g.endX=c.xMap,g.animate({d:c})):c.length&&(a[d]=a.chart.renderer.path(c).addClass(e[1]).attr({zIndex:1}).add(a.group),g={stroke:e[2],"stroke-width":b.lineWidth,fill:a.fillGraph&&a.color||"none"},e[3]?g.dashstyle=e[3]:"square"!==b.linecap&&(g["stroke-linecap"]=g["stroke-linejoin"]="round"),g=a[d].attr(g).shadow(2>f&&b.shadow));g&&(g.startX=c.xMap,
g.isArea=c.isArea)})},applyZones:function(){var a=this,b=this.chart,c=b.renderer,e=this.zones,f,d,g=this.clips||[],h,m=this.graph,p=this.area,l=Math.max(b.chartWidth,b.chartHeight),k=this[(this.zoneAxis||"y")+"Axis"],t,q,w=b.inverted,u,D,v,L,K=!1;e.length&&(m||p)&&k&&void 0!==k.min&&(q=k.reversed,u=k.horiz,m&&m.hide(),p&&p.hide(),t=k.getExtremes(),r(e,function(e,n){f=q?u?b.plotWidth:0:u?0:k.toPixels(t.min);f=Math.min(Math.max(G(d,f),0),l);d=Math.min(Math.max(Math.round(k.toPixels(G(e.value,t.max),
!0)),0),l);K&&(f=d=k.toPixels(t.max));D=Math.abs(f-d);v=Math.min(f,d);L=Math.max(f,d);k.isXAxis?(h={x:w?L:v,y:0,width:D,height:l},u||(h.x=b.plotHeight-h.x)):(h={x:0,y:w?L:v,width:l,height:D},u&&(h.y=b.plotWidth-h.y));w&&c.isVML&&(h=k.isXAxis?{x:0,y:q?v:L,height:h.width,width:b.chartWidth}:{x:h.y-b.plotLeft-b.spacingBox.x,y:0,width:h.height,height:b.chartHeight});g[n]?g[n].animate(h):(g[n]=c.clipRect(h),m&&a["zone-graph-"+n].clip(g[n]),p&&a["zone-area-"+n].clip(g[n]));K=e.value>t.max}),this.clips=
g)},invertGroups:function(a){function b(){var b={width:c.yAxis.len,height:c.xAxis.len};r(["group","markerGroup"],function(e){c[e]&&c[e].attr(b).invert(a)})}var c=this,e;c.xAxis&&(e=C(c.chart,"resize",b),C(c,"destroy",e),b(a),c.invertGroups=b)},plotGroup:function(a,b,c,e,f){var d=this[a],g=!d;g&&(this[a]=d=this.chart.renderer.g(b).attr({zIndex:e||.1}).add(f),d.addClass("highcharts-series-"+this.index+" highcharts-"+this.type+"-series highcharts-color-"+this.colorIndex+" "+(this.options.className||
"")));d.attr({visibility:c})[g?"attr":"animate"](this.getPlotBox());return d},getPlotBox:function(){var a=this.chart,b=this.xAxis,c=this.yAxis;a.inverted&&(b=c,c=this.xAxis);return{translateX:b?b.left:a.plotLeft,translateY:c?c.top:a.plotTop,scaleX:1,scaleY:1}},render:function(){var a=this,b=a.chart,c,e=a.options,f=!!a.animate&&b.renderer.isSVG&&A(e.animation).duration,d=a.visible?"inherit":"hidden",g=e.zIndex,h=a.hasRendered,m=b.seriesGroup,p=b.inverted;c=a.plotGroup("group","series",d,g,m);a.markerGroup=
a.plotGroup("markerGroup","markers",d,g,m);f&&a.animate(!0);c.inverted=a.isCartesian?p:!1;a.drawGraph&&(a.drawGraph(),a.applyZones());a.drawDataLabels&&a.drawDataLabels();a.visible&&a.drawPoints();a.drawTracker&&!1!==a.options.enableMouseTracking&&a.drawTracker();a.invertGroups(p);!1===e.clip||a.sharedClipKey||h||c.clip(b.clipRect);f&&a.animate();h||(a.animationTimeout=D(function(){a.afterAnimate()},f));a.isDirty=a.isDirtyData=!1;a.hasRendered=!0},redraw:function(){var a=this.chart,b=this.isDirty||
this.isDirtyData,c=this.group,e=this.xAxis,f=this.yAxis;c&&(a.inverted&&c.attr({width:a.plotWidth,height:a.plotHeight}),c.animate({translateX:G(e&&e.left,a.plotLeft),translateY:G(f&&f.top,a.plotTop)}));this.translate();this.render();b&&delete this.kdTree},kdDimensions:1,kdAxisArray:["clientX","plotY"],searchPoint:function(a,b){var c=this.xAxis,e=this.yAxis,f=this.chart.inverted;return this.searchKDTree({clientX:f?c.len-a.chartY+c.pos:a.chartX-c.pos,plotY:f?e.len-a.chartX+e.pos:a.chartY-e.pos},b)},
buildKDTree:function(){function a(c,e,f){var d,g;if(g=c&&c.length)return d=b.kdAxisArray[e%f],c.sort(function(a,b){return a[d]-b[d]}),g=Math.floor(g/2),{point:c[g],left:a(c.slice(0,g),e+1,f),right:a(c.slice(g+1),e+1,f)}}var b=this,c=b.kdDimensions;delete b.kdTree;D(function(){b.kdTree=a(b.getValidPoints(null,!b.directTouch),c,c)},b.options.kdNow?0:1)},searchKDTree:function(a,b){function c(a,b,h,m){var p=b.point,k=e.kdAxisArray[h%m],n,t,q=p;t=l(a[f])&&l(p[f])?Math.pow(a[f]-p[f],2):null;n=l(a[d])&&
l(p[d])?Math.pow(a[d]-p[d],2):null;n=(t||0)+(n||0);p.dist=l(n)?Math.sqrt(n):Number.MAX_VALUE;p.distX=l(t)?Math.sqrt(t):Number.MAX_VALUE;k=a[k]-p[k];n=0>k?"left":"right";t=0>k?"right":"left";b[n]&&(n=c(a,b[n],h+1,m),q=n[g]<q[g]?n:p);b[t]&&Math.sqrt(k*k)<q[g]&&(a=c(a,b[t],h+1,m),q=a[g]<q[g]?a:q);return q}var e=this,f=this.kdAxisArray[0],d=this.kdAxisArray[1],g=b?"distX":"dist";this.kdTree||this.buildKDTree();if(this.kdTree)return c(a,this.kdTree,this.kdDimensions,this.kdDimensions)}})})(M);(function(a){function C(a,
d,f,g,k){var h=a.chart.inverted;this.axis=a;this.isNegative=f;this.options=d;this.x=g;this.total=null;this.points={};this.stack=k;this.rightCliff=this.leftCliff=0;this.alignOptions={align:d.align||(h?f?"left":"right":"center"),verticalAlign:d.verticalAlign||(h?"middle":f?"bottom":"top"),y:l(d.y,h?4:f?14:-6),x:l(d.x,h?f?-6:6:0)};this.textAlign=d.textAlign||(h?f?"right":"left":"center")}var A=a.Axis,E=a.Chart,H=a.correctFloat,k=a.defined,d=a.destroyObjectProperties,g=a.each,v=a.format,l=a.pick;a=a.Series;
C.prototype={destroy:function(){d(this,this.axis)},render:function(a){var d=this.options,f=d.format,f=f?v(f,this):d.formatter.call(this);this.label?this.label.attr({text:f,visibility:"hidden"}):this.label=this.axis.chart.renderer.text(f,null,null,d.useHTML).css(d.style).attr({align:this.textAlign,rotation:d.rotation,visibility:"hidden"}).add(a)},setOffset:function(a,d){var f=this.axis,g=f.chart,k=g.inverted,l=f.reversed,l=this.isNegative&&!l||!this.isNegative&&l,c=f.translate(f.usePercentage?100:
this.total,0,0,0,1),f=f.translate(0),f=Math.abs(c-f);a=g.xAxis[0].translate(this.x)+a;var e=g.plotHeight,k={x:k?l?c:c-f:a,y:k?e-a-d:l?e-c-f:e-c,width:k?f:d,height:k?d:f};if(d=this.label)d.align(this.alignOptions,null,k),k=d.alignAttr,d[!1===this.options.crop||g.isInsidePlot(k.x,k.y)?"show":"hide"](!0)}};E.prototype.getStacks=function(){var a=this;g(a.yAxis,function(a){a.stacks&&a.hasVisibleSeries&&(a.oldStacks=a.stacks)});g(a.series,function(d){!d.options.stacking||!0!==d.visible&&!1!==a.options.chart.ignoreHiddenSeries||
(d.stackKey=d.type+l(d.options.stack,""))})};A.prototype.buildStacks=function(){var a=this.series,d,f=l(this.options.reversedStacks,!0),g=a.length,k;if(!this.isXAxis){this.usePercentage=!1;for(k=g;k--;)a[f?k:g-k-1].setStackedPoints();for(k=g;k--;)d=a[f?k:g-k-1],d.setStackCliffs&&d.setStackCliffs();if(this.usePercentage)for(k=0;k<g;k++)a[k].setPercentStacks()}};A.prototype.renderStackTotals=function(){var a=this.chart,d=a.renderer,f=this.stacks,g,k,l=this.stackTotalGroup;l||(this.stackTotalGroup=l=
d.g("stack-labels").attr({visibility:"visible",zIndex:6}).add());l.translate(a.plotLeft,a.plotTop);for(g in f)for(k in a=f[g],a)a[k].render(l)};A.prototype.resetStacks=function(){var a=this.stacks,d,f;if(!this.isXAxis)for(d in a)for(f in a[d])a[d][f].touched<this.stacksTouched?(a[d][f].destroy(),delete a[d][f]):(a[d][f].total=null,a[d][f].cum=0)};A.prototype.cleanStacks=function(){var a,d,f;if(!this.isXAxis)for(d in this.oldStacks&&(a=this.stacks=this.oldStacks),a)for(f in a[d])a[d][f].cum=a[d][f].total};
a.prototype.setStackedPoints=function(){if(this.options.stacking&&(!0===this.visible||!1===this.chart.options.chart.ignoreHiddenSeries)){var a=this.processedXData,d=this.processedYData,f=[],g=d.length,u=this.options,v=u.threshold,c=u.startFromThreshold?v:0,e=u.stack,u=u.stacking,m=this.stackKey,w="-"+m,G=this.negStacks,b=this.yAxis,p=b.stacks,t=b.oldStacks,L,D,K,x,I,J,A;b.stacksTouched+=1;for(I=0;I<g;I++)J=a[I],A=d[I],L=this.getStackIndicator(L,J,this.index),x=L.key,K=(D=G&&A<(c?0:v))?w:m,p[K]||(p[K]=
{}),p[K][J]||(t[K]&&t[K][J]?(p[K][J]=t[K][J],p[K][J].total=null):p[K][J]=new C(b,b.options.stackLabels,D,J,e)),K=p[K][J],null!==A&&(K.points[x]=K.points[this.index]=[l(K.cum,c)],k(K.cum)||(K.base=x),K.touched=b.stacksTouched,0<L.index&&!1===this.singleStacks&&(K.points[x][0]=K.points[this.index+","+J+",0"][0])),"percent"===u?(D=D?m:w,G&&p[D]&&p[D][J]?(D=p[D][J],K.total=D.total=Math.max(D.total,K.total)+Math.abs(A)||0):K.total=H(K.total+(Math.abs(A)||0))):K.total=H(K.total+(A||0)),K.cum=l(K.cum,c)+
(A||0),null!==A&&(K.points[x].push(K.cum),f[I]=K.cum);"percent"===u&&(b.usePercentage=!0);this.stackedYData=f;b.oldStacks={}}};a.prototype.setPercentStacks=function(){var a=this,d=a.stackKey,f=a.yAxis.stacks,h=a.processedXData,k;g([d,"-"+d],function(d){for(var c=h.length,e,g;c--;)if(e=h[c],k=a.getStackIndicator(k,e,a.index,d),e=(g=f[d]&&f[d][e])&&g.points[k.key])g=g.total?100/g.total:0,e[0]=H(e[0]*g),e[1]=H(e[1]*g),a.stackedYData[c]=e[1]})};a.prototype.getStackIndicator=function(a,d,f,g){!k(a)||a.x!==
d||g&&a.key!==g?a={x:d,index:0,key:g}:a.index++;a.key=[f,d,a.index].join();return a}})(M);(function(a){var C=a.addEvent,A=a.animate,E=a.Axis,H=a.createElement,k=a.css,d=a.defined,g=a.each,v=a.erase,l=a.extend,r=a.fireEvent,q=a.inArray,f=a.isNumber,h=a.isObject,u=a.merge,F=a.pick,c=a.Point,e=a.Series,m=a.seriesTypes,w=a.setAnimation,G=a.splat;l(a.Chart.prototype,{addSeries:function(a,c,e){var b,f=this;a&&(c=F(c,!0),r(f,"addSeries",{options:a},function(){b=f.initSeries(a);f.isDirtyLegend=!0;f.linkSeries();
c&&f.redraw(e)}));return b},addAxis:function(a,c,e,f){var b=c?"xAxis":"yAxis",d=this.options;a=u(a,{index:this[b].length,isX:c});new E(this,a);d[b]=G(d[b]||{});d[b].push(a);F(e,!0)&&this.redraw(f)},showLoading:function(a){var b=this,c=b.options,e=b.loadingDiv,f=c.loading,d=function(){e&&k(e,{left:b.plotLeft+"px",top:b.plotTop+"px",width:b.plotWidth+"px",height:b.plotHeight+"px"})};e||(b.loadingDiv=e=H("div",{className:"highcharts-loading highcharts-loading-hidden"},null,b.container),b.loadingSpan=
H("span",{className:"highcharts-loading-inner"},null,e),C(b,"redraw",d));e.className="highcharts-loading";b.loadingSpan.innerHTML=a||c.lang.loading;k(e,l(f.style,{zIndex:10}));k(b.loadingSpan,f.labelStyle);b.loadingShown||(k(e,{opacity:0,display:""}),A(e,{opacity:f.style.opacity||.5},{duration:f.showDuration||0}));b.loadingShown=!0;d()},hideLoading:function(){var a=this.options,c=this.loadingDiv;c&&(c.className="highcharts-loading highcharts-loading-hidden",A(c,{opacity:0},{duration:a.loading.hideDuration||
100,complete:function(){k(c,{display:"none"})}}));this.loadingShown=!1},propsRequireDirtyBox:"backgroundColor borderColor borderWidth margin marginTop marginRight marginBottom marginLeft spacing spacingTop spacingRight spacingBottom spacingLeft borderRadius plotBackgroundColor plotBackgroundImage plotBorderColor plotBorderWidth plotShadow shadow".split(" "),propsRequireUpdateSeries:"chart.inverted chart.polar chart.ignoreHiddenSeries chart.type colors plotOptions".split(" "),update:function(a,c){var b,
e={credits:"addCredits",title:"setTitle",subtitle:"setSubtitle"},h=a.chart,m,k;if(h){u(!0,this.options.chart,h);"className"in h&&this.setClassName(h.className);if("inverted"in h||"polar"in h)this.propFromSeries(),m=!0;for(b in h)h.hasOwnProperty(b)&&(-1!==q("chart."+b,this.propsRequireUpdateSeries)&&(k=!0),-1!==q(b,this.propsRequireDirtyBox)&&(this.isDirtyBox=!0));"style"in h&&this.renderer.setStyle(h.style)}for(b in a){if(this[b]&&"function"===typeof this[b].update)this[b].update(a[b],!1);else if("function"===
typeof this[e[b]])this[e[b]](a[b]);"chart"!==b&&-1!==q(b,this.propsRequireUpdateSeries)&&(k=!0)}a.colors&&(this.options.colors=a.colors);a.plotOptions&&u(!0,this.options.plotOptions,a.plotOptions);g(["xAxis","yAxis","series"],function(b){a[b]&&g(G(a[b]),function(a){var c=d(a.id)&&this.get(a.id)||this[b][0];c&&c.coll===b&&c.update(a,!1)},this)},this);m&&g(this.axes,function(a){a.update({},!1)});k&&g(this.series,function(a){a.update({},!1)});a.loading&&u(!0,this.options.loading,a.loading);b=h&&h.width;
h=h&&h.height;f(b)&&b!==this.chartWidth||f(h)&&h!==this.chartHeight?this.setSize(b,h):F(c,!0)&&this.redraw()},setSubtitle:function(a){this.setTitle(void 0,a)}});l(c.prototype,{update:function(a,c,e,f){function b(){d.applyOptions(a);null===d.y&&m&&(d.graphic=m.destroy());h(a,!0)&&(m&&m.element&&a&&a.marker&&a.marker.symbol&&(d.graphic=m.destroy()),a&&a.dataLabels&&d.dataLabel&&(d.dataLabel=d.dataLabel.destroy()));k=d.index;g.updateParallelArrays(d,k);p.data[k]=h(p.data[k],!0)?d.options:a;g.isDirty=
g.isDirtyData=!0;!g.fixedBox&&g.hasCartesianSeries&&(l.isDirtyBox=!0);"point"===p.legendType&&(l.isDirtyLegend=!0);c&&l.redraw(e)}var d=this,g=d.series,m=d.graphic,k,l=g.chart,p=g.options;c=F(c,!0);!1===f?b():d.firePointEvent("update",{options:a},b)},remove:function(a,c){this.series.removePoint(q(this,this.series.data),a,c)}});l(e.prototype,{addPoint:function(a,c,e,f){var b=this.options,d=this.data,g=this.chart,h=this.xAxis&&this.xAxis.names,m=b.data,k,l,p=this.xData,t,w;c=F(c,!0);k={series:this};
this.pointClass.prototype.applyOptions.apply(k,[a]);w=k.x;t=p.length;if(this.requireSorting&&w<p[t-1])for(l=!0;t&&p[t-1]>w;)t--;this.updateParallelArrays(k,"splice",t,0,0);this.updateParallelArrays(k,t);h&&k.name&&(h[w]=k.name);m.splice(t,0,a);l&&(this.data.splice(t,0,null),this.processData());"point"===b.legendType&&this.generatePoints();e&&(d[0]&&d[0].remove?d[0].remove(!1):(d.shift(),this.updateParallelArrays(k,"shift"),m.shift()));this.isDirtyData=this.isDirty=!0;c&&g.redraw(f)},removePoint:function(a,
c,e){var b=this,f=b.data,d=f[a],g=b.points,h=b.chart,m=function(){g&&g.length===f.length&&g.splice(a,1);f.splice(a,1);b.options.data.splice(a,1);b.updateParallelArrays(d||{series:b},"splice",a,1);d&&d.destroy();b.isDirty=!0;b.isDirtyData=!0;c&&h.redraw()};w(e,h);c=F(c,!0);d?d.firePointEvent("remove",null,m):m()},remove:function(a,c,e){function b(){f.destroy();d.isDirtyLegend=d.isDirtyBox=!0;d.linkSeries();F(a,!0)&&d.redraw(c)}var f=this,d=f.chart;!1!==e?r(f,"remove",null,b):b()},update:function(a,
c){var b=this,e=this.chart,f=this.userOptions,d=this.type,h=a.type||f.type||e.options.chart.type,k=m[d].prototype,p=["group","markerGroup","dataLabelsGroup"],w;if(h&&h!==d||void 0!==a.zIndex)p.length=0;g(p,function(a){p[a]=b[a];delete b[a]});a=u(f,{animation:!1,index:this.index,pointStart:this.xData[0]},{data:this.options.data},a);this.remove(!1,null,!1);for(w in k)this[w]=void 0;l(this,m[h||d].prototype);g(p,function(a){b[a]=p[a]});this.init(e,a);e.linkSeries();F(c,!0)&&e.redraw(!1)}});l(E.prototype,
{update:function(a,c){var b=this.chart;a=b.options[this.coll][this.options.index]=u(this.userOptions,a);this.destroy(!0);this.init(b,l(a,{events:void 0}));b.isDirtyBox=!0;F(c,!0)&&b.redraw()},remove:function(a){for(var b=this.chart,c=this.coll,e=this.series,f=e.length;f--;)e[f]&&e[f].remove(!1);v(b.axes,this);v(b[c],this);b.options[c].splice(this.options.index,1);g(b[c],function(a,b){a.options.index=b});this.destroy();b.isDirtyBox=!0;F(a,!0)&&b.redraw()},setTitle:function(a,c){this.update({title:a},
c)},setCategories:function(a,c){this.update({categories:a},c)}})})(M);(function(a){var C=a.color,A=a.each,E=a.map,H=a.pick,k=a.Series,d=a.seriesType;d("area","line",{softThreshold:!1,threshold:0},{singleStacks:!1,getStackPoints:function(){var a=[],d=[],k=this.xAxis,r=this.yAxis,q=r.stacks[this.stackKey],f={},h=this.points,u=this.index,F=r.series,c=F.length,e,m=H(r.options.reversedStacks,!0)?1:-1,w,G;if(this.options.stacking){for(w=0;w<h.length;w++)f[h[w].x]=h[w];for(G in q)null!==q[G].total&&d.push(G);
d.sort(function(a,c){return a-c});e=E(F,function(){return this.visible});A(d,function(b,g){var h=0,l,p;if(f[b]&&!f[b].isNull)a.push(f[b]),A([-1,1],function(a){var h=1===a?"rightNull":"leftNull",k=0,t=q[d[g+a]];if(t)for(w=u;0<=w&&w<c;)l=t.points[w],l||(w===u?f[b][h]=!0:e[w]&&(p=q[b].points[w])&&(k-=p[1]-p[0])),w+=m;f[b][1===a?"rightCliff":"leftCliff"]=k});else{for(w=u;0<=w&&w<c;){if(l=q[b].points[w]){h=l[1];break}w+=m}h=r.toPixels(h,!0);a.push({isNull:!0,plotX:k.toPixels(b,!0),plotY:h,yBottom:h})}})}return a},
getGraphPath:function(a){var d=k.prototype.getGraphPath,g=this.options,r=g.stacking,q=this.yAxis,f,h,u=[],F=[],c=this.index,e,m=q.stacks[this.stackKey],w=g.threshold,G=q.getThreshold(g.threshold),b,g=g.connectNulls||"percent"===r,p=function(b,f,d){var g=a[b];b=r&&m[g.x].points[c];var h=g[d+"Null"]||0;d=g[d+"Cliff"]||0;var k,l,g=!0;d||h?(k=(h?b[0]:b[1])+d,l=b[0]+d,g=!!h):!r&&a[f]&&a[f].isNull&&(k=l=w);void 0!==k&&(F.push({plotX:e,plotY:null===k?G:q.getThreshold(k),isNull:g}),u.push({plotX:e,plotY:null===
l?G:q.getThreshold(l),doCurve:!1}))};a=a||this.points;r&&(a=this.getStackPoints());for(f=0;f<a.length;f++)if(h=a[f].isNull,e=H(a[f].rectPlotX,a[f].plotX),b=H(a[f].yBottom,G),!h||g)g||p(f,f-1,"left"),h&&!r&&g||(F.push(a[f]),u.push({x:f,plotX:e,plotY:b})),g||p(f,f+1,"right");f=d.call(this,F,!0,!0);u.reversed=!0;h=d.call(this,u,!0,!0);h.length&&(h[0]="L");h=f.concat(h);d=d.call(this,F,!1,g);h.xMap=f.xMap;this.areaPath=h;return d},drawGraph:function(){this.areaPath=[];k.prototype.drawGraph.apply(this);
var a=this,d=this.areaPath,l=this.options,r=[["area","highcharts-area",this.color,l.fillColor]];A(this.zones,function(d,f){r.push(["zone-area-"+f,"highcharts-area highcharts-zone-area-"+f+" "+d.className,d.color||a.color,d.fillColor||l.fillColor])});A(r,function(g){var f=g[0],h=a[f];h?(h.endX=d.xMap,h.animate({d:d})):(h=a[f]=a.chart.renderer.path(d).addClass(g[1]).attr({fill:H(g[3],C(g[2]).setOpacity(H(l.fillOpacity,.75)).get()),"fill-opacity":H(l.fillOpacity,.75),zIndex:0}).add(a.group),h.isArea=
!0);h.startX=d.xMap;h.shiftUnit=l.step?2:1})},drawLegendSymbol:a.LegendSymbolMixin.drawRectangle})})(M);(function(a){var C=a.pick;a=a.seriesType;a("spline","line",{},{getPointSpline:function(a,E,H){var k=E.plotX,d=E.plotY,g=a[H-1];H=a[H+1];var v,l,r,q;if(g&&!g.isNull&&!1!==g.doCurve&&H&&!H.isNull&&!1!==H.doCurve){a=g.plotY;r=H.plotX;H=H.plotY;var f=0;v=(1.5*k+g.plotX)/2.5;l=(1.5*d+a)/2.5;r=(1.5*k+r)/2.5;q=(1.5*d+H)/2.5;r!==v&&(f=(q-l)*(r-k)/(r-v)+d-q);l+=f;q+=f;l>a&&l>d?(l=Math.max(a,d),q=2*d-l):
l<a&&l<d&&(l=Math.min(a,d),q=2*d-l);q>H&&q>d?(q=Math.max(H,d),l=2*d-q):q<H&&q<d&&(q=Math.min(H,d),l=2*d-q);E.rightContX=r;E.rightContY=q}E=["C",C(g.rightContX,g.plotX),C(g.rightContY,g.plotY),C(v,k),C(l,d),k,d];g.rightContX=g.rightContY=null;return E}})})(M);(function(a){var C=a.seriesTypes.area.prototype,A=a.seriesType;A("areaspline","spline",a.defaultPlotOptions.area,{getStackPoints:C.getStackPoints,getGraphPath:C.getGraphPath,setStackCliffs:C.setStackCliffs,drawGraph:C.drawGraph,drawLegendSymbol:a.LegendSymbolMixin.drawRectangle})})(M);
(function(a){var C=a.animObject,A=a.color,E=a.each,H=a.extend,k=a.isNumber,d=a.merge,g=a.pick,v=a.Series,l=a.seriesType,r=a.stop,q=a.svg;l("column","line",{borderRadius:0,groupPadding:.2,marker:null,pointPadding:.1,minPointLength:0,cropThreshold:50,pointRange:null,states:{hover:{halo:!1,brightness:.1,shadow:!1},select:{color:"#cccccc",borderColor:"#000000",shadow:!1}},dataLabels:{align:null,verticalAlign:null,y:null},softThreshold:!1,startFromThreshold:!0,stickyTracking:!1,tooltip:{distance:6},threshold:0,
borderColor:"#ffffff"},{cropShoulder:0,directTouch:!0,trackerGroups:["group","dataLabelsGroup"],negStacks:!0,init:function(){v.prototype.init.apply(this,arguments);var a=this,d=a.chart;d.hasRendered&&E(d.series,function(d){d.type===a.type&&(d.isDirty=!0)})},getColumnMetrics:function(){var a=this,d=a.options,k=a.xAxis,l=a.yAxis,c=k.reversed,e,m={},w=0;!1===d.grouping?w=1:E(a.chart.series,function(b){var c=b.options,d=b.yAxis,f;b.type===a.type&&b.visible&&l.len===d.len&&l.pos===d.pos&&(c.stacking?(e=
b.stackKey,void 0===m[e]&&(m[e]=w++),f=m[e]):!1!==c.grouping&&(f=w++),b.columnIndex=f)});var q=Math.min(Math.abs(k.transA)*(k.ordinalSlope||d.pointRange||k.closestPointRange||k.tickInterval||1),k.len),b=q*d.groupPadding,p=(q-2*b)/w,d=Math.min(d.maxPointWidth||k.len,g(d.pointWidth,p*(1-2*d.pointPadding)));a.columnMetrics={width:d,offset:(p-d)/2+(b+((a.columnIndex||0)+(c?1:0))*p-q/2)*(c?-1:1)};return a.columnMetrics},crispCol:function(a,d,g,k){var c=this.chart,e=this.borderWidth,f=-(e%2?.5:0),e=e%2?
.5:1;c.inverted&&c.renderer.isVML&&(e+=1);g=Math.round(a+g)+f;a=Math.round(a)+f;k=Math.round(d+k)+e;f=.5>=Math.abs(d)&&.5<k;d=Math.round(d)+e;k-=d;f&&k&&(--d,k+=1);return{x:a,y:d,width:g-a,height:k}},translate:function(){var a=this,d=a.chart,k=a.options,l=a.dense=2>a.closestPointRange*a.xAxis.transA,l=a.borderWidth=g(k.borderWidth,l?0:1),c=a.yAxis,e=a.translatedThreshold=c.getThreshold(k.threshold),m=g(k.minPointLength,5),w=a.getColumnMetrics(),q=w.width,b=a.barW=Math.max(q,1+2*l),p=a.pointXOffset=
w.offset;d.inverted&&(e-=.5);k.pointPadding&&(b=Math.ceil(b));v.prototype.translate.apply(a);E(a.points,function(f){var h=g(f.yBottom,e),k=999+Math.abs(h),k=Math.min(Math.max(-k,f.plotY),c.len+k),l=f.plotX+p,t=b,w=Math.min(k,h),r,u=Math.max(k,h)-w;Math.abs(u)<m&&m&&(u=m,r=!c.reversed&&!f.negative||c.reversed&&f.negative,w=Math.abs(w-e)>m?h-m:e-(r?m:0));f.barX=l;f.pointWidth=q;f.tooltipPos=d.inverted?[c.len+c.pos-d.plotLeft-k,a.xAxis.len-l-t/2,u]:[l+t/2,k+c.pos-d.plotTop,u];f.shapeType="rect";f.shapeArgs=
a.crispCol.apply(a,f.isNull?[f.plotX,c.len/2,0,0]:[l,w,t,u])})},getSymbol:a.noop,drawLegendSymbol:a.LegendSymbolMixin.drawRectangle,drawGraph:function(){this.group[this.dense?"addClass":"removeClass"]("highcharts-dense-data")},pointAttribs:function(a,d){var f=this.options,g=this.pointAttrToOptions||{},c=g.stroke||"borderColor",e=g["stroke-width"]||"borderWidth",h=a&&a.color||this.color,k=a[c]||f[c]||this.color||h,g=f.dashStyle,l;a&&this.zones.length&&(h=(h=a.getZone())&&h.color||a.options.color||
this.color);d&&(d=f.states[d],l=d.brightness,h=d.color||void 0!==l&&A(h).brighten(d.brightness).get()||h,k=d[c]||k,g=d.dashStyle||g);a={fill:h,stroke:k,"stroke-width":a[e]||f[e]||this[e]||0};f.borderRadius&&(a.r=f.borderRadius);g&&(a.dashstyle=g);return a},drawPoints:function(){var a=this,g=this.chart,l=a.options,q=g.renderer,c=l.animationLimit||250,e;E(a.points,function(f){var h=f.graphic;k(f.plotY)&&null!==f.y?(e=f.shapeArgs,h?(r(h),h[g.pointCount<c?"animate":"attr"](d(e))):f.graphic=h=q[f.shapeType](e).attr({"class":f.getClassName()}).add(f.group||
a.group),h.attr(a.pointAttribs(f,f.selected&&"select")).shadow(l.shadow,null,l.stacking&&!l.borderRadius)):h&&(f.graphic=h.destroy())})},animate:function(a){var d=this,f=this.yAxis,g=d.options,c=this.chart.inverted,e={};q&&(a?(e.scaleY=.001,a=Math.min(f.pos+f.len,Math.max(f.pos,f.toPixels(g.threshold))),c?e.translateX=a-f.len:e.translateY=a,d.group.attr(e)):(e[c?"translateX":"translateY"]=f.pos,d.group.animate(e,H(C(d.options.animation),{step:function(a,c){d.group.attr({scaleY:Math.max(.001,c.pos)})}})),
d.animate=null))},remove:function(){var a=this,d=a.chart;d.hasRendered&&E(d.series,function(d){d.type===a.type&&(d.isDirty=!0)});v.prototype.remove.apply(a,arguments)}})})(M);(function(a){a=a.seriesType;a("bar","column",null,{inverted:!0})})(M);(function(a){var C=a.Series;a=a.seriesType;a("scatter","line",{lineWidth:0,marker:{enabled:!0},tooltip:{headerFormat:'\x3cspan style\x3d"color:{point.color}"\x3e\u25cf\x3c/span\x3e \x3cspan style\x3d"font-size: 0.85em"\x3e {series.name}\x3c/span\x3e\x3cbr/\x3e',
pointFormat:"x: \x3cb\x3e{point.x}\x3c/b\x3e\x3cbr/\x3ey: \x3cb\x3e{point.y}\x3c/b\x3e\x3cbr/\x3e"}},{sorted:!1,requireSorting:!1,noSharedTooltip:!0,trackerGroups:["group","markerGroup","dataLabelsGroup"],takeOrdinalPosition:!1,kdDimensions:2,drawGraph:function(){this.options.lineWidth&&C.prototype.drawGraph.call(this)}})})(M);(function(a){var C=a.pick,A=a.relativeLength;a.CenteredSeriesMixin={getCenter:function(){var a=this.options,H=this.chart,k=2*(a.slicedOffset||0),d=H.plotWidth-2*k,H=H.plotHeight-
2*k,g=a.center,g=[C(g[0],"50%"),C(g[1],"50%"),a.size||"100%",a.innerSize||0],v=Math.min(d,H),l,r;for(l=0;4>l;++l)r=g[l],a=2>l||2===l&&/%$/.test(r),g[l]=A(r,[d,H,v,g[2]][l])+(a?k:0);g[3]>g[2]&&(g[3]=g[2]);return g}}})(M);(function(a){var C=a.addEvent,A=a.defined,E=a.each,H=a.extend,k=a.inArray,d=a.noop,g=a.pick,v=a.Point,l=a.Series,r=a.seriesType,q=a.setAnimation;r("pie","line",{center:[null,null],clip:!1,colorByPoint:!0,dataLabels:{distance:30,enabled:!0,formatter:function(){return null===this.y?
void 0:this.point.name},x:0},ignoreHiddenPoint:!0,legendType:"point",marker:null,size:null,showInLegend:!1,slicedOffset:10,stickyTracking:!1,tooltip:{followPointer:!0},borderColor:"#ffffff",borderWidth:1,states:{hover:{brightness:.1,shadow:!1}}},{isCartesian:!1,requireSorting:!1,directTouch:!0,noSharedTooltip:!0,trackerGroups:["group","dataLabelsGroup"],axisTypes:[],pointAttribs:a.seriesTypes.column.prototype.pointAttribs,animate:function(a){var d=this,f=d.points,g=d.startAngleRad;a||(E(f,function(a){var c=
a.graphic,f=a.shapeArgs;c&&(c.attr({r:a.startR||d.center[3]/2,start:g,end:g}),c.animate({r:f.r,start:f.start,end:f.end},d.options.animation))}),d.animate=null)},updateTotals:function(){var a,d=0,g=this.points,k=g.length,c,e=this.options.ignoreHiddenPoint;for(a=0;a<k;a++)c=g[a],0>c.y&&(c.y=null),d+=e&&!c.visible?0:c.y;this.total=d;for(a=0;a<k;a++)c=g[a],c.percentage=0<d&&(c.visible||!e)?c.y/d*100:0,c.total=d},generatePoints:function(){l.prototype.generatePoints.call(this);this.updateTotals()},translate:function(a){this.generatePoints();
var d=0,f=this.options,k=f.slicedOffset,c=k+(f.borderWidth||0),e,m,l,q=f.startAngle||0,b=this.startAngleRad=Math.PI/180*(q-90),q=(this.endAngleRad=Math.PI/180*(g(f.endAngle,q+360)-90))-b,p=this.points,t=f.dataLabels.distance,f=f.ignoreHiddenPoint,r,v=p.length,K;a||(this.center=a=this.getCenter());this.getX=function(b,c){l=Math.asin(Math.min((b-a[1])/(a[2]/2+t),1));return a[0]+(c?-1:1)*Math.cos(l)*(a[2]/2+t)};for(r=0;r<v;r++){K=p[r];e=b+d*q;if(!f||K.visible)d+=K.percentage/100;m=b+d*q;K.shapeType=
"arc";K.shapeArgs={x:a[0],y:a[1],r:a[2]/2,innerR:a[3]/2,start:Math.round(1E3*e)/1E3,end:Math.round(1E3*m)/1E3};l=(m+e)/2;l>1.5*Math.PI?l-=2*Math.PI:l<-Math.PI/2&&(l+=2*Math.PI);K.slicedTranslation={translateX:Math.round(Math.cos(l)*k),translateY:Math.round(Math.sin(l)*k)};e=Math.cos(l)*a[2]/2;m=Math.sin(l)*a[2]/2;K.tooltipPos=[a[0]+.7*e,a[1]+.7*m];K.half=l<-Math.PI/2||l>Math.PI/2?1:0;K.angle=l;c=Math.min(c,t/5);K.labelPos=[a[0]+e+Math.cos(l)*t,a[1]+m+Math.sin(l)*t,a[0]+e+Math.cos(l)*c,a[1]+m+Math.sin(l)*
c,a[0]+e,a[1]+m,0>t?"center":K.half?"right":"left",l]}},drawGraph:null,drawPoints:function(){var a=this,d=a.chart.renderer,g,k,c,e,m=a.options.shadow;m&&!a.shadowGroup&&(a.shadowGroup=d.g("shadow").add(a.group));E(a.points,function(f){if(null!==f.y){k=f.graphic;e=f.shapeArgs;g=f.sliced?f.slicedTranslation:{};var h=f.shadowGroup;m&&!h&&(h=f.shadowGroup=d.g("shadow").add(a.shadowGroup));h&&h.attr(g);c=a.pointAttribs(f,f.selected&&"select");k?k.setRadialReference(a.center).attr(c).animate(H(e,g)):(f.graphic=
k=d[f.shapeType](e).addClass(f.getClassName()).setRadialReference(a.center).attr(g).add(a.group),f.visible||k.attr({visibility:"hidden"}),k.attr(c).attr({"stroke-linejoin":"round"}).shadow(m,h))}})},searchPoint:d,sortByAngle:function(a,d){a.sort(function(a,f){return void 0!==a.angle&&(f.angle-a.angle)*d})},drawLegendSymbol:a.LegendSymbolMixin.drawRectangle,getCenter:a.CenteredSeriesMixin.getCenter,getSymbol:d},{init:function(){v.prototype.init.apply(this,arguments);var a=this,d;a.name=g(a.name,"Slice");
d=function(d){a.slice("select"===d.type)};C(a,"select",d);C(a,"unselect",d);return a},setVisible:function(a,d){var f=this,h=f.series,c=h.chart,e=h.options.ignoreHiddenPoint;d=g(d,e);a!==f.visible&&(f.visible=f.options.visible=a=void 0===a?!f.visible:a,h.options.data[k(f,h.data)]=f.options,E(["graphic","dataLabel","connector","shadowGroup"],function(c){if(f[c])f[c][a?"show":"hide"](!0)}),f.legendItem&&c.legend.colorizeItem(f,a),a||"hover"!==f.state||f.setState(""),e&&(h.isDirty=!0),d&&c.redraw())},
slice:function(a,d,l){var f=this.series;q(l,f.chart);g(d,!0);this.sliced=this.options.sliced=a=A(a)?a:!this.sliced;f.options.data[k(this,f.data)]=this.options;a=a?this.slicedTranslation:{translateX:0,translateY:0};this.graphic.animate(a);this.shadowGroup&&this.shadowGroup.animate(a)},haloPath:function(a){var d=this.shapeArgs;return this.sliced||!this.visible?[]:this.series.chart.renderer.symbols.arc(d.x,d.y,d.r+a,d.r+a,{innerR:this.shapeArgs.r,start:d.start,end:d.end})}})})(M);(function(a){var C=
a.addEvent,A=a.arrayMax,E=a.defined,H=a.each,k=a.extend,d=a.format,g=a.map,v=a.merge,l=a.noop,r=a.pick,q=a.relativeLength,f=a.Series,h=a.seriesTypes,u=a.stableSort,F=a.stop;a.distribute=function(a,d){function c(a,b){return a.target-b.target}var e,f=!0,b=a,k=[],h;h=0;for(e=a.length;e--;)h+=a[e].size;if(h>d){u(a,function(a,b){return(b.rank||0)-(a.rank||0)});for(h=e=0;h<=d;)h+=a[e].size,e++;k=a.splice(e-1,a.length)}u(a,c);for(a=g(a,function(a){return{size:a.size,targets:[a.target]}});f;){for(e=a.length;e--;)f=
a[e],h=(Math.min.apply(0,f.targets)+Math.max.apply(0,f.targets))/2,f.pos=Math.min(Math.max(0,h-f.size/2),d-f.size);e=a.length;for(f=!1;e--;)0<e&&a[e-1].pos+a[e-1].size>a[e].pos&&(a[e-1].size+=a[e].size,a[e-1].targets=a[e-1].targets.concat(a[e].targets),a[e-1].pos+a[e-1].size>d&&(a[e-1].pos=d-a[e-1].size),a.splice(e,1),f=!0)}e=0;H(a,function(a){var c=0;H(a.targets,function(){b[e].pos=a.pos+c;c+=b[e].size;e++})});b.push.apply(b,k);u(b,c)};f.prototype.drawDataLabels=function(){var a=this,e=a.options,
f=e.dataLabels,g=a.points,h,b,l=a.hasRendered||0,q,u,D=r(f.defer,!0),K=a.chart.renderer;if(f.enabled||a._hasPointLabels)a.dlProcessOptions&&a.dlProcessOptions(f),u=a.plotGroup("dataLabelsGroup","data-labels",D&&!l?"hidden":"visible",f.zIndex||6),D&&(u.attr({opacity:+l}),l||C(a,"afterAnimate",function(){a.visible&&u.show(!0);u[e.animation?"animate":"attr"]({opacity:1},{duration:200})})),b=f,H(g,function(c){var g,l=c.dataLabel,m,p,t=c.connector,w=!0,x,D={};h=c.dlOptions||c.options&&c.options.dataLabels;
g=r(h&&h.enabled,b.enabled)&&null!==c.y;if(l&&!g)c.dataLabel=l.destroy();else if(g){f=v(b,h);x=f.style;g=f.rotation;m=c.getLabelConfig();q=f.format?d(f.format,m):f.formatter.call(m,f);x.color=r(f.color,x.color,a.color,"#000000");if(l)E(q)?(l.attr({text:q}),w=!1):(c.dataLabel=l=l.destroy(),t&&(c.connector=t.destroy()));else if(E(q)){l={fill:f.backgroundColor,stroke:f.borderColor,"stroke-width":f.borderWidth,r:f.borderRadius||0,rotation:g,padding:f.padding,zIndex:1};"contrast"===x.color&&(D.color=f.inside||
0>f.distance||e.stacking?K.getContrast(c.color||a.color):"#000000");e.cursor&&(D.cursor=e.cursor);for(p in l)void 0===l[p]&&delete l[p];l=c.dataLabel=K[g?"text":"label"](q,0,-9999,f.shape,null,null,f.useHTML,null,"data-label").attr(l);l.addClass("highcharts-data-label-color-"+c.colorIndex+" "+(f.className||""));l.css(k(x,D));l.add(u);l.shadow(f.shadow)}l&&a.alignDataLabel(c,l,f,null,w)}})};f.prototype.alignDataLabel=function(a,e,d,f,g){var b=this.chart,c=b.inverted,h=r(a.plotX,-9999),l=r(a.plotY,
-9999),m=e.getBBox(),q,w=d.rotation,v=d.align,u=this.visible&&(a.series.forceDL||b.isInsidePlot(h,Math.round(l),c)||f&&b.isInsidePlot(h,c?f.x+1:f.y+f.height-1,c)),A="justify"===r(d.overflow,"justify");u&&(q=d.style.fontSize,q=b.renderer.fontMetrics(q,e).b,f=k({x:c?b.plotWidth-l:h,y:Math.round(c?b.plotHeight-h:l),width:0,height:0},f),k(d,{width:m.width,height:m.height}),w?(A=!1,c=b.renderer.rotCorr(q,w),c={x:f.x+d.x+f.width/2+c.x,y:f.y+d.y+{top:0,middle:.5,bottom:1}[d.verticalAlign]*f.height},e[g?
"attr":"animate"](c).attr({align:v}),h=(w+720)%360,h=180<h&&360>h,"left"===v?c.y-=h?m.height:0:"center"===v?(c.x-=m.width/2,c.y-=m.height/2):"right"===v&&(c.x-=m.width,c.y-=h?0:m.height)):(e.align(d,null,f),c=e.alignAttr),A?this.justifyDataLabel(e,d,c,m,f,g):r(d.crop,!0)&&(u=b.isInsidePlot(c.x,c.y)&&b.isInsidePlot(c.x+m.width,c.y+m.height)),d.shape&&!w&&e.attr({anchorX:a.plotX,anchorY:a.plotY}));u||(F(e),e.attr({y:-9999}),e.placed=!1)};f.prototype.justifyDataLabel=function(a,d,f,g,h,b){var c=this.chart,
e=d.align,k=d.verticalAlign,l,m,q=a.box?0:a.padding||0;l=f.x+q;0>l&&("right"===e?d.align="left":d.x=-l,m=!0);l=f.x+g.width-q;l>c.plotWidth&&("left"===e?d.align="right":d.x=c.plotWidth-l,m=!0);l=f.y+q;0>l&&("bottom"===k?d.verticalAlign="top":d.y=-l,m=!0);l=f.y+g.height-q;l>c.plotHeight&&("top"===k?d.verticalAlign="bottom":d.y=c.plotHeight-l,m=!0);m&&(a.placed=!b,a.align(d,null,h))};h.pie&&(h.pie.prototype.drawDataLabels=function(){var c=this,d=c.data,h,k=c.chart,l=c.options.dataLabels,b=r(l.connectorPadding,
10),p=r(l.connectorWidth,1),q=k.plotWidth,v=k.plotHeight,u,K=l.distance,x=c.center,C=x[2]/2,J=x[1],F=0<K,n,z,E,O,B=[[],[]],y,M,Q,S,T=[0,0,0,0];c.visible&&(l.enabled||c._hasPointLabels)&&(f.prototype.drawDataLabels.apply(c),H(d,function(a){a.dataLabel&&a.visible&&(B[a.half].push(a),a.dataLabel._pos=null)}),H(B,function(d,e){var f,m,p=d.length,t,r,w;if(p)for(c.sortByAngle(d,e-.5),0<K&&(f=Math.max(0,J-C-K),m=Math.min(J+C+K,k.plotHeight),t=g(d,function(a){if(a.dataLabel)return w=a.dataLabel.getBBox().height||
21,{target:a.labelPos[1]-f+w/2,size:w,rank:a.y}}),a.distribute(t,m+w-f)),S=0;S<p;S++)h=d[S],E=h.labelPos,n=h.dataLabel,Q=!1===h.visible?"hidden":"inherit",r=E[1],t?void 0===t[S].pos?Q="hidden":(O=t[S].size,M=f+t[S].pos):M=r,y=l.justify?x[0]+(e?-1:1)*(C+K):c.getX(M<f+2||M>m-2?r:M,e),n._attr={visibility:Q,align:E[6]},n._pos={x:y+l.x+({left:b,right:-b}[E[6]]||0),y:M+l.y-10},E.x=y,E.y=M,null===c.options.size&&(z=n.width,y-z<b?T[3]=Math.max(Math.round(z-y+b),T[3]):y+z>q-b&&(T[1]=Math.max(Math.round(y+
z-q+b),T[1])),0>M-O/2?T[0]=Math.max(Math.round(-M+O/2),T[0]):M+O/2>v&&(T[2]=Math.max(Math.round(M+O/2-v),T[2])))}),0===A(T)||this.verifyDataLabelOverflow(T))&&(this.placeDataLabels(),F&&p&&H(this.points,function(a){var b;u=a.connector;if((n=a.dataLabel)&&n._pos&&a.visible){Q=n._attr.visibility;if(b=!u)a.connector=u=k.renderer.path().addClass("highcharts-data-label-connector highcharts-color-"+a.colorIndex).add(c.dataLabelsGroup),u.attr({"stroke-width":p,stroke:l.connectorColor||a.color||"#666666"});
u[b?"attr":"animate"]({d:c.connectorPath(a.labelPos)});u.attr("visibility",Q)}else u&&(a.connector=u.destroy())}))},h.pie.prototype.connectorPath=function(a){var c=a.x,d=a.y;return r(this.options.dataLabels.softConnector,!0)?["M",c+("left"===a[6]?5:-5),d,"C",c,d,2*a[2]-a[4],2*a[3]-a[5],a[2],a[3],"L",a[4],a[5]]:["M",c+("left"===a[6]?5:-5),d,"L",a[2],a[3],"L",a[4],a[5]]},h.pie.prototype.placeDataLabels=function(){H(this.points,function(a){var c=a.dataLabel;c&&a.visible&&((a=c._pos)?(c.attr(c._attr),
c[c.moved?"animate":"attr"](a),c.moved=!0):c&&c.attr({y:-9999}))})},h.pie.prototype.alignDataLabel=l,h.pie.prototype.verifyDataLabelOverflow=function(a){var c=this.center,d=this.options,f=d.center,g=d.minSize||80,b,h;null!==f[0]?b=Math.max(c[2]-Math.max(a[1],a[3]),g):(b=Math.max(c[2]-a[1]-a[3],g),c[0]+=(a[3]-a[1])/2);null!==f[1]?b=Math.max(Math.min(b,c[2]-Math.max(a[0],a[2])),g):(b=Math.max(Math.min(b,c[2]-a[0]-a[2]),g),c[1]+=(a[0]-a[2])/2);b<c[2]?(c[2]=b,c[3]=Math.min(q(d.innerSize||0,b),b),this.translate(c),
this.drawDataLabels&&this.drawDataLabels()):h=!0;return h});h.column&&(h.column.prototype.alignDataLabel=function(a,d,g,h,k){var b=this.chart.inverted,c=a.series,e=a.dlBox||a.shapeArgs,l=r(a.below,a.plotY>r(this.translatedThreshold,c.yAxis.len)),m=r(g.inside,!!this.options.stacking);e&&(h=v(e),0>h.y&&(h.height+=h.y,h.y=0),e=h.y+h.height-c.yAxis.len,0<e&&(h.height-=e),b&&(h={x:c.yAxis.len-h.y-h.height,y:c.xAxis.len-h.x-h.width,width:h.height,height:h.width}),m||(b?(h.x+=l?0:h.width,h.width=0):(h.y+=
l?h.height:0,h.height=0)));g.align=r(g.align,!b||m?"center":l?"right":"left");g.verticalAlign=r(g.verticalAlign,b||m?"middle":l?"top":"bottom");f.prototype.alignDataLabel.call(this,a,d,g,h,k)})})(M);(function(a){var C=a.Chart,A=a.each,E=a.pick,H=a.addEvent;C.prototype.callbacks.push(function(a){function d(){var d=[];A(a.series,function(a){var g=a.options.dataLabels,k=a.dataLabelCollections||["dataLabel"];(g.enabled||a._hasPointLabels)&&!g.allowOverlap&&a.visible&&A(k,function(g){A(a.points,function(a){a[g]&&
(a[g].labelrank=E(a.labelrank,a.shapeArgs&&a.shapeArgs.height),d.push(a[g]))})})});a.hideOverlappingLabels(d)}d();H(a,"redraw",d)});C.prototype.hideOverlappingLabels=function(a){var d=a.length,g,k,l,r,q,f,h,u,C,c=function(a,c,d,f,b,g,h,k){return!(b>a+d||b+h<a||g>c+f||g+k<c)};for(k=0;k<d;k++)if(g=a[k])g.oldOpacity=g.opacity,g.newOpacity=1;a.sort(function(a,c){return(c.labelrank||0)-(a.labelrank||0)});for(k=0;k<d;k++)for(l=a[k],g=k+1;g<d;++g)if(r=a[g],l&&r&&l.placed&&r.placed&&0!==l.newOpacity&&0!==
r.newOpacity&&(q=l.alignAttr,f=r.alignAttr,h=l.parentGroup,u=r.parentGroup,C=2*(l.box?0:l.padding),q=c(q.x+h.translateX,q.y+h.translateY,l.width-C,l.height-C,f.x+u.translateX,f.y+u.translateY,r.width-C,r.height-C)))(l.labelrank<r.labelrank?l:r).newOpacity=0;A(a,function(a){var c,d;a&&(d=a.newOpacity,a.oldOpacity!==d&&a.placed&&(d?a.show(!0):c=function(){a.hide()},a.alignAttr.opacity=d,a[a.isOld?"animate":"attr"](a.alignAttr,null,c)),a.isOld=!0)})}})(M);(function(a){var C=a.addEvent,A=a.Chart,E=a.createElement,
H=a.css,k=a.defaultOptions,d=a.defaultPlotOptions,g=a.each,v=a.extend,l=a.fireEvent,r=a.hasTouch,q=a.inArray,f=a.isObject,h=a.Legend,u=a.merge,F=a.pick,c=a.Point,e=a.Series,m=a.seriesTypes,w=a.svg,G;G=a.TrackerMixin={drawTrackerPoint:function(){var a=this,c=a.chart,d=c.pointer,e=function(a){for(var b=a.target,d;b&&!d;)d=b.point,b=b.parentNode;if(void 0!==d&&d!==c.hoverPoint)d.onMouseOver(a)};g(a.points,function(a){a.graphic&&(a.graphic.element.point=a);a.dataLabel&&(a.dataLabel.element.point=a)});
a._hasTracking||(g(a.trackerGroups,function(b){if(a[b]){a[b].addClass("highcharts-tracker").on("mouseover",e).on("mouseout",function(a){d.onTrackerMouseOut(a)});if(r)a[b].on("touchstart",e);a.options.cursor&&a[b].css(H).css({cursor:a.options.cursor})}}),a._hasTracking=!0)},drawTrackerGraph:function(){var a=this,c=a.options,d=c.trackByArea,e=[].concat(d?a.areaPath:a.graphPath),f=e.length,h=a.chart,k=h.pointer,l=h.renderer,m=h.options.tooltip.snap,q=a.tracker,n,v=function(){if(h.hoverSeries!==a)a.onMouseOver()},
u="rgba(192,192,192,"+(w?.0001:.002)+")";if(f&&!d)for(n=f+1;n--;)"M"===e[n]&&e.splice(n+1,0,e[n+1]-m,e[n+2],"L"),(n&&"M"===e[n]||n===f)&&e.splice(n,0,"L",e[n-2]+m,e[n-1]);q?q.attr({d:e}):a.graph&&(a.tracker=l.path(e).attr({"stroke-linejoin":"round",visibility:a.visible?"visible":"hidden",stroke:u,fill:d?u:"none","stroke-width":a.graph.strokeWidth()+(d?0:2*m),zIndex:2}).add(a.group),g([a.tracker,a.markerGroup],function(a){a.addClass("highcharts-tracker").on("mouseover",v).on("mouseout",function(a){k.onTrackerMouseOut(a)});
c.cursor&&a.css({cursor:c.cursor});if(r)a.on("touchstart",v)}))}};m.column&&(m.column.prototype.drawTracker=G.drawTrackerPoint);m.pie&&(m.pie.prototype.drawTracker=G.drawTrackerPoint);m.scatter&&(m.scatter.prototype.drawTracker=G.drawTrackerPoint);v(h.prototype,{setItemEvents:function(a,c,d){var b=this,e=b.chart,f="highcharts-legend-"+(a.series?"point":"series")+"-active";(d?c:a.legendGroup).on("mouseover",function(){a.setState("hover");e.seriesGroup.addClass(f);c.css(b.options.itemHoverStyle)}).on("mouseout",
function(){c.css(a.visible?b.itemStyle:b.itemHiddenStyle);e.seriesGroup.removeClass(f);a.setState()}).on("click",function(b){var c=function(){a.setVisible&&a.setVisible()};b={browserEvent:b};a.firePointEvent?a.firePointEvent("legendItemClick",b,c):l(a,"legendItemClick",b,c)})},createCheckboxForItem:function(a){a.checkbox=E("input",{type:"checkbox",checked:a.selected,defaultChecked:a.selected},this.options.itemCheckboxStyle,this.chart.container);C(a.checkbox,"click",function(b){l(a.series||a,"checkboxClick",
{checked:b.target.checked,item:a},function(){a.select()})})}});k.legend.itemStyle.cursor="pointer";v(A.prototype,{showResetZoom:function(){var a=this,c=k.lang,d=a.options.chart.resetZoomButton,e=d.theme,f=e.states,g="chart"===d.relativeTo?null:"plotBox";this.resetZoomButton=a.renderer.button(c.resetZoom,null,null,function(){a.zoomOut()},e,f&&f.hover).attr({align:d.position.align,title:c.resetZoomTitle}).addClass("highcharts-reset-zoom").add().align(d.position,!1,g)},zoomOut:function(){var a=this;
l(a,"selection",{resetSelection:!0},function(){a.zoom()})},zoom:function(a){var b,c=this.pointer,d=!1,e;!a||a.resetSelection?g(this.axes,function(a){b=a.zoom()}):g(a.xAxis.concat(a.yAxis),function(a){var e=a.axis;c[e.isXAxis?"zoomX":"zoomY"]&&(b=e.zoom(a.min,a.max),e.displayBtn&&(d=!0))});e=this.resetZoomButton;d&&!e?this.showResetZoom():!d&&f(e)&&(this.resetZoomButton=e.destroy());b&&this.redraw(F(this.options.chart.animation,a&&a.animation,100>this.pointCount))},pan:function(a,c){var b=this,d=b.hoverPoints,
e;d&&g(d,function(a){a.setState()});g("xy"===c?[1,0]:[1],function(c){c=b[c?"xAxis":"yAxis"][0];var d=c.horiz,f=a[d?"chartX":"chartY"],d=d?"mouseDownX":"mouseDownY",g=b[d],h=(c.pointRange||0)/2,k=c.getExtremes(),l=c.toValue(g-f,!0)+h,h=c.toValue(g+c.len-f,!0)-h,g=g>f;c.series.length&&(g||l>Math.min(k.dataMin,k.min))&&(!g||h<Math.max(k.dataMax,k.max))&&(c.setExtremes(l,h,!1,!1,{trigger:"pan"}),e=!0);b[d]=f});e&&b.redraw(!1);H(b.container,{cursor:"move"})}});v(c.prototype,{select:function(a,c){var b=
this,d=b.series,e=d.chart;a=F(a,!b.selected);b.firePointEvent(a?"select":"unselect",{accumulate:c},function(){b.selected=b.options.selected=a;d.options.data[q(b,d.data)]=b.options;b.setState(a&&"select");c||g(e.getSelectedPoints(),function(a){a.selected&&a!==b&&(a.selected=a.options.selected=!1,d.options.data[q(a,d.data)]=a.options,a.setState(""),a.firePointEvent("unselect"))})})},onMouseOver:function(a,c){var b=this.series,d=b.chart,e=d.tooltip,f=d.hoverPoint;if(this.series){if(!c){if(f&&f!==this)f.onMouseOut();
if(d.hoverSeries!==b)b.onMouseOver();d.hoverPoint=this}!e||e.shared&&!b.noSharedTooltip?e||this.setState("hover"):(this.setState("hover"),e.refresh(this,a));this.firePointEvent("mouseOver")}},onMouseOut:function(){var a=this.series.chart,c=a.hoverPoints;this.firePointEvent("mouseOut");c&&-1!==q(this,c)||(this.setState(),a.hoverPoint=null)},importEvents:function(){if(!this.hasImportedEvents){var a=u(this.series.options.point,this.options).events,c;this.events=a;for(c in a)C(this,c,a[c]);this.hasImportedEvents=
!0}},setState:function(b,c){var e=Math.floor(this.plotX),f=this.plotY,g=this.series,h=g.options.states[b]||{},k=d[g.type].marker&&g.options.marker,l=k&&!1===k.enabled,m=k&&k.states&&k.states[b]||{},p=!1===m.enabled,n=g.stateMarkerGraphic,q=this.marker||{},r=g.chart,u=g.halo,w,y=k&&g.markerAttribs;b=b||"";if(!(b===this.state&&!c||this.selected&&"select"!==b||!1===h.enabled||b&&(p||l&&!1===m.enabled)||b&&q.states&&q.states[b]&&!1===q.states[b].enabled)){y&&(w=g.markerAttribs(this,b));if(this.graphic)this.state&&
this.graphic.removeClass("highcharts-point-"+this.state),b&&this.graphic.addClass("highcharts-point-"+b),this.graphic.attr(g.pointAttribs(this,b)),w&&this.graphic.animate(w,F(r.options.chart.animation,m.animation,k.animation)),n&&n.hide();else{if(b&&m){k=q.symbol||g.symbol;n&&n.currentSymbol!==k&&(n=n.destroy());if(n)n[c?"animate":"attr"]({x:w.x,y:w.y});else k&&(g.stateMarkerGraphic=n=r.renderer.symbol(k,w.x,w.y,w.width,w.height).add(g.markerGroup),n.currentSymbol=k);n&&n.attr(g.pointAttribs(this,
b))}n&&(n[b&&r.isInsidePlot(e,f,r.inverted)?"show":"hide"](),n.element.point=this)}(e=h.halo)&&e.size?(u||(g.halo=u=r.renderer.path().add(y?g.markerGroup:g.group)),a.stop(u),u[c?"animate":"attr"]({d:this.haloPath(e.size)}),u.attr({"class":"highcharts-halo highcharts-color-"+F(this.colorIndex,g.colorIndex)}),u.attr(v({fill:this.color||g.color,"fill-opacity":e.opacity,zIndex:-1},e.attributes))):u&&u.animate({d:this.haloPath(0)});this.state=b}},haloPath:function(a){return this.series.chart.renderer.symbols.circle(Math.floor(this.plotX)-
a,this.plotY-a,2*a,2*a)}});v(e.prototype,{onMouseOver:function(){var a=this.chart,c=a.hoverSeries;if(c&&c!==this)c.onMouseOut();this.options.events.mouseOver&&l(this,"mouseOver");this.setState("hover");a.hoverSeries=this},onMouseOut:function(){var a=this.options,c=this.chart,d=c.tooltip,e=c.hoverPoint;c.hoverSeries=null;if(e)e.onMouseOut();this&&a.events.mouseOut&&l(this,"mouseOut");!d||a.stickyTracking||d.shared&&!this.noSharedTooltip||d.hide();this.setState()},setState:function(a){var b=this,c=
b.options,d=b.graph,e=c.states,f=c.lineWidth,c=0;a=a||"";if(b.state!==a&&(g([b.group,b.markerGroup],function(c){c&&(b.state&&c.removeClass("highcharts-series-"+b.state),a&&c.addClass("highcharts-series-"+a))}),b.state=a,!e[a]||!1!==e[a].enabled)&&(a&&(f=e[a].lineWidth||f+(e[a].lineWidthPlus||0)),d&&!d.dashstyle))for(e={"stroke-width":f},d.attr(e);b["zone-graph-"+c];)b["zone-graph-"+c].attr(e),c+=1},setVisible:function(a,c){var b=this,d=b.chart,e=b.legendItem,f,h=d.options.chart.ignoreHiddenSeries,
k=b.visible;f=(b.visible=a=b.options.visible=b.userOptions.visible=void 0===a?!k:a)?"show":"hide";g(["group","dataLabelsGroup","markerGroup","tracker","tt"],function(a){if(b[a])b[a][f]()});if(d.hoverSeries===b||(d.hoverPoint&&d.hoverPoint.series)===b)b.onMouseOut();e&&d.legend.colorizeItem(b,a);b.isDirty=!0;b.options.stacking&&g(d.series,function(a){a.options.stacking&&a.visible&&(a.isDirty=!0)});g(b.linkedSeries,function(b){b.setVisible(a,!1)});h&&(d.isDirtyBox=!0);!1!==c&&d.redraw();l(b,f)},show:function(){this.setVisible(!0)},
hide:function(){this.setVisible(!1)},select:function(a){this.selected=a=void 0===a?!this.selected:a;this.checkbox&&(this.checkbox.checked=a);l(this,a?"select":"unselect")},drawTracker:G.drawTrackerGraph})})(M);(function(a){var C=a.Chart,A=a.each,E=a.inArray,H=a.isObject,k=a.pick,d=a.splat;C.prototype.setResponsive=function(a){var d=this.options.responsive;d&&d.rules&&A(d.rules,function(d){this.matchResponsiveRule(d,a)},this)};C.prototype.matchResponsiveRule=function(d,v){var g=this.respRules,r=d.condition,
q;q=d.callback||function(){return this.chartWidth<=k(r.maxWidth,Number.MAX_VALUE)&&this.chartHeight<=k(r.maxHeight,Number.MAX_VALUE)&&this.chartWidth>=k(r.minWidth,0)&&this.chartHeight>=k(r.minHeight,0)};void 0===d._id&&(d._id=a.uniqueKey());q=q.call(this);!g[d._id]&&q?d.chartOptions&&(g[d._id]=this.currentOptions(d.chartOptions),this.update(d.chartOptions,v)):g[d._id]&&!q&&(this.update(g[d._id],v),delete g[d._id])};C.prototype.currentOptions=function(a){function g(a,k,f){var h,l;for(h in a)if(-1<
E(h,["series","xAxis","yAxis"]))for(a[h]=d(a[h]),f[h]=[],l=0;l<a[h].length;l++)f[h][l]={},g(a[h][l],k[h][l],f[h][l]);else H(a[h])?(f[h]={},g(a[h],k[h]||{},f[h])):f[h]=k[h]||null}var k={};g(a,this.options,k);return k}})(M);return M});;
return module.exports;
}
}, this);
return require(0);
}).call(this, null, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : this);
