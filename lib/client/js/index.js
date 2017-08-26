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
11: function (require, module, exports) {
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
0: function (require, module, exports) {
var UAParser;

this.Promise = this.PromiseB = require(1);

this.jQuery = this.$ = require(2);

this.SimplyBind = require(3);

this.Highcharts = require(4);

this.HighchartsDrilldown = require(5);

this.humanize = require(6);

UAParser = require(7);

Promise.config({
  'longStackTraces': false
});

(require(8))();

(function($) {
  var defaultOptions, genChartSettings, genIndex, markup;
  this.extendDefaultOptions = function(options) {
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

this.parseValue = function(value) {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/,/g, ''));
  } else {
    return value;
  }
};

this.convertValuesToPoints = function(chartData) {
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

this.sortTests = function(tests, chartsOrderMap) {
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

this.sortVersions = function(versions) {
  var output;
  output = {};
  Object.keys(versions).sort(sortByVersionString).forEach(function(versionNumber) {
    return output[versionNumber] = versions[versionNumber];
  });
  return output;
};

this.sortByVersionString = function(a, b) {
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

this.parseVersion = function(versionString, level) {
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

this.parseName = function(libraryObject) {
  return libraryObject.name.replace(libraryObject.name + ' ', '');
};

this.sortChartData = function(chartData, itemsMap) {
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

this.createDrilldown = function(test) {
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

this.combineAllBrowserData = function(testValues, currentBrowser) {
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

this.createChartDataForTest = function(testName, test, options, currentBrowser) {
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
  markup = require(10);
  defaultOptions = require(11);
  genIndex = require(12);
  genChartSettings = require(13);
  this.chartsContainer$ = $('.BenchmarksDashboard-charts');
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
2: function (require, module, exports) {
/*!
 * jQuery JavaScript Library v3.2.1
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2017-03-20T18:59Z
 */
( function( global, factory ) {

	"use strict";

	if ( typeof module === "object" && typeof module.exports === "object" ) {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
} )( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
// enough that all such attempts are guarded in a try block.
"use strict";

var arr = [];

var document = window.document;

var getProto = Object.getPrototypeOf;

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call( Object );

var support = {};



	function DOMEval( code, doc ) {
		doc = doc || document;

		var script = doc.createElement( "script" );

		script.text = code;
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}
/* global Symbol */
// Defining this global in .eslintrc.json would create a danger of using the global
// unguarded in another place, it seems safer to define global only for this module



var
	version = "3.2.1",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android <=4.0 only
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {

	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {

		// Return all the elements in a clean array
		if ( num == null ) {
			return slice.call( this );
		}

		// Return just the one element from the set
		return num < 0 ? this[ num + this.length ] : this[ num ];
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map( this, function( elem, i ) {
			return callback.call( elem, i, elem );
		} ) );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor();
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[ 0 ] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction( target ) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {

		// Only deal with non-null/undefined values
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
					( copyIsArray = Array.isArray( copy ) ) ) ) {

					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && Array.isArray( src ) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject( src ) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend( {

	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isFunction: function( obj ) {
		return jQuery.type( obj ) === "function";
	},

	isWindow: function( obj ) {
		return obj != null && obj === obj.window;
	},

	isNumeric: function( obj ) {

		// As of jQuery 3.0, isNumeric is limited to
		// strings and numbers (primitives or objects)
		// that can be coerced to finite numbers (gh-2662)
		var type = jQuery.type( obj );
		return ( type === "number" || type === "string" ) &&

			// parseFloat NaNs numeric-cast false positives ("")
			// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
			// subtraction forces infinities to NaN
			!isNaN( obj - parseFloat( obj ) );
	},

	isPlainObject: function( obj ) {
		var proto, Ctor;

		// Detect obvious negatives
		// Use toString instead of jQuery.type to catch host objects
		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
			return false;
		}

		proto = getProto( obj );

		// Objects with no prototype (e.g., `Object.create( null )`) are plain
		if ( !proto ) {
			return true;
		}

		// Objects with prototype are plain iff they were constructed by a global Object function
		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
	},

	isEmptyObject: function( obj ) {

		/* eslint-disable no-unused-vars */
		// See https://github.com/eslint/eslint/issues/6125
		var name;

		for ( name in obj ) {
			return false;
		}
		return true;
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}

		// Support: Android <=2.3 only (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call( obj ) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	globalEval: function( code ) {
		DOMEval( code );
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Support: IE <=9 - 11, Edge 12 - 13
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	each: function( obj, callback ) {
		var length, i = 0;

		if ( isArrayLike( obj ) ) {
			length = obj.length;
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// Support: Android <=4.0 only
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArrayLike( Object( arr ) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android <=4.0 only, PhantomJS 1 only
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var length, value,
			i = 0,
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArrayLike( elems ) ) {
			length = elems.length;
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: Date.now,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
} );

if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
function( i, name ) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
} );

function isArrayLike( obj ) {

	// Support: real iOS 8.2 only (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = !!obj && "length" in obj && obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.3.3
 * https://sizzlejs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2016-08-08
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" + ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	disabledAncestor = addCombinator(
		function( elem ) {
			return elem.disabled === true && ("form" in elem || "label" in elem);
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {

		if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
			setDocument( context );
		}
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {

				// ID selector
				if ( (m = match[1]) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( (elem = context.getElementById( m )) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && (elem = newContext.getElementById( m )) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[2] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( (m = match[3]) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!compilerCache[ selector + " " ] &&
				(!rbuggyQSA || !rbuggyQSA.test( selector )) ) {

				if ( nodeType !== 1 ) {
					newContext = context;
					newSelector = selector;

				// qSA looks outside Element context, which is not what we want
				// Thanks to Andrew Dupont for this workaround technique
				// Support: IE <=8
				// Exclude object elements
				} else if ( context.nodeName.toLowerCase() !== "object" ) {

					// Capture the context ID, setting it first if necessary
					if ( (nid = context.getAttribute( "id" )) ) {
						nid = nid.replace( rcssescape, fcssescape );
					} else {
						context.setAttribute( "id", (nid = expando) );
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[i] = "#" + nid + " " + toSelector( groups[i] );
					}
					newSelector = groups.join( "," );

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;
				}

				if ( newSelector ) {
					try {
						push.apply( results,
							newContext.querySelectorAll( newSelector )
						);
						return results;
					} catch ( qsaError ) {
					} finally {
						if ( nid === expando ) {
							context.removeAttribute( "id" );
						}
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement("fieldset");

	try {
		return !!fn( el );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}
		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {

	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Only certain elements can match :enabled or :disabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
		if ( "form" in elem ) {

			// Check for inherited disabledness on relevant non-disabled elements:
			// * listed form-associated elements in a disabled fieldset
			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
			// * option elements in a disabled optgroup
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
			// All such elements have a "form" property.
			if ( elem.parentNode && elem.disabled === false ) {

				// Option elements defer to a parent optgroup if present
				if ( "label" in elem ) {
					if ( "label" in elem.parentNode ) {
						return elem.parentNode.disabled === disabled;
					} else {
						return elem.disabled === disabled;
					}
				}

				// Support: IE 6 - 11
				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
				return elem.isDisabled === disabled ||

					// Where there is no isDisabled, check manually
					/* jshint -W018 */
					elem.isDisabled !== !disabled &&
						disabledAncestor( elem ) === disabled;
			}

			return elem.disabled === disabled;

		// Try to winnow out elements that can't be disabled before trusting the disabled property.
		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
		// even exist on them, let alone have a boolean value.
		} else if ( "label" in elem ) {
			return elem.disabled === disabled;
		}

		// Remaining elements are neither :enabled nor :disabled
		return false;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9-11, Edge
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	if ( preferredDoc !== document &&
		(subWindow = document.defaultView) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert(function( el ) {
		el.className = "i";
		return !el.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( el ) {
		el.appendChild( document.createComment("") );
		return !el.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	});

	// ID filter and find
	if ( support.getById ) {
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var elem = context.getElementById( id );
				return elem ? [ elem ] : [];
			}
		};
	} else {
		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};

		// Support: IE 6 - 7 only
		// getElementById is not reliable as a find shortcut
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var node, i, elems,
					elem = context.getElementById( id );

				if ( elem ) {

					// Verify the id attribute
					node = elem.getAttributeNode("id");
					if ( node && node.value === id ) {
						return [ elem ];
					}

					// Fall back on getElementsByName
					elems = context.getElementsByName( id );
					i = 0;
					while ( (elem = elems[i++]) ) {
						node = elem.getAttributeNode("id");
						if ( node && node.value === id ) {
							return [ elem ];
						}
					}
				}

				return [];
			}
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( document.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( el ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push("~=");
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push(".#.+[+~]");
			}
		});

		assert(function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement("input");
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll(":enabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll(":disabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( el ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === document ? -1 :
				b === document ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		!compilerCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch (e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return (sel + "").replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || (node[ expando ] = {});

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								(outerCache[ node.uniqueID ] = {});

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {
							// Use previously-cached element index if available
							if ( useCache ) {
								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || (node[ expando ] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									(outerCache[ node.uniqueID ] = {});

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {
								// Use the same loop as above to seek `elem` from the start
								while ( (node = ++nodeIndex && node && node[ dir ] ||
									(diff = nodeIndex = 0) || start.pop()) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] || (node[ expando ] = {});

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												(outerCache[ node.uniqueID ] = {});

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					// Don't keep the element (issue #299)
					input[0] = null;
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
			return false;
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] || (outerCache[ elem.uniqueID ] = {});

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( (oldCache = uniqueCache[ key ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
			return false;
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context === document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					if ( !context && elem.ownerDocument !== document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context || document, xml) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( el ) {
	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement("fieldset") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( el ) {
	return el.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;




var dir = function( elem, dir, until ) {
	var matched = [],
		truncate = until !== undefined;

	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
		if ( elem.nodeType === 1 ) {
			if ( truncate && jQuery( elem ).is( until ) ) {
				break;
			}
			matched.push( elem );
		}
	}
	return matched;
};


var siblings = function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};


var rneedsContext = jQuery.expr.match.needsContext;



function nodeName( elem, name ) {

  return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();

};
var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			return !!qualifier.call( elem, i, elem ) !== not;
		} );
	}

	// Single element
	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		} );
	}

	// Arraylike of elements (jQuery, arguments, Array)
	if ( typeof qualifier !== "string" ) {
		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	// Simple selector that can be filtered directly, removing non-Elements
	if ( risSimple.test( qualifier ) ) {
		return jQuery.filter( qualifier, elements, not );
	}

	// Complex selector, compare the two sets, removing non-Elements
	qualifier = jQuery.filter( qualifier, elements );
	return jQuery.grep( elements, function( elem ) {
		return ( indexOf.call( qualifier, elem ) > -1 ) !== not && elem.nodeType === 1;
	} );
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	if ( elems.length === 1 && elem.nodeType === 1 ) {
		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
	}

	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
		return elem.nodeType === 1;
	} ) );
};

jQuery.fn.extend( {
	find: function( selector ) {
		var i, ret,
			len = this.length,
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter( function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			} ) );
		}

		ret = this.pushStack( [] );

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow( this, selector || [], false ) );
	},
	not: function( selector ) {
		return this.pushStack( winnow( this, selector || [], true ) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
} );


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[ 0 ] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && ( match[ 1 ] || !context ) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[ 1 ] ) {
					context = context instanceof jQuery ? context[ 0 ] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[ 1 ],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {

							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[ 2 ] );

					if ( elem ) {

						// Inject the element directly into the jQuery object
						this[ 0 ] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[ 0 ] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :

				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,

	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend( {
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter( function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[ i ] ) ) {
					return true;
				}
			}
		} );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			targets = typeof selectors !== "string" && jQuery( selectors );

		// Positional selectors never match, since there's no _selection_ context
		if ( !rneedsContext.test( selectors ) ) {
			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( targets ?
						targets.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	}
} );

function sibling( cur, dir ) {
	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each( {
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return siblings( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return siblings( elem.firstChild );
	},
	contents: function( elem ) {
        if ( nodeName( elem, "iframe" ) ) {
            return elem.contentDocument;
        }

        // Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
        // Treat the template element as a regular one in browsers that
        // don't support it.
        if ( nodeName( elem, "template" ) ) {
            elem = elem.content || elem;
        }

        return jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {

			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
} );
var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	} );
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,

		// Last fire value for non-forgettable lists
		memory,

		// Flag to know if list was already fired
		fired,

		// Flag to prevent firing
		locked,

		// Actual callback list
		list = [],

		// Queue of execution data for repeatable lists
		queue = [],

		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,

		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = locked || options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					( function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( jQuery.isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && jQuery.type( arg ) !== "string" ) {

								// Inspect recursively
								add( arg );
							}
						} );
					} )( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				} );
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

function adoptValue( value, resolve, reject, noValue ) {
	var method;

	try {

		// Check for promise aspect first to privilege synchronous behavior
		if ( value && jQuery.isFunction( ( method = value.promise ) ) ) {
			method.call( value ).done( resolve ).fail( reject );

		// Other thenables
		} else if ( value && jQuery.isFunction( ( method = value.then ) ) ) {
			method.call( value, resolve, reject );

		// Other non-thenables
		} else {

			// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
			// * false: [ value ].slice( 0 ) => resolve( value )
			// * true: [ value ].slice( 1 ) => resolve()
			resolve.apply( undefined, [ value ].slice( noValue ) );
		}

	// For Promises/A+, convert exceptions into rejections
	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
	// Deferred#then to conditionally suppress rejection.
	} catch ( value ) {

		// Support: Android 4.0 only
		// Strict mode functions invoked without .call/.apply get global-object context
		reject.apply( undefined, [ value ] );
	}
}

jQuery.extend( {

	Deferred: function( func ) {
		var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks( "memory" ),
					jQuery.Callbacks( "memory" ), 2 ],
				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},

				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred( function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = jQuery.isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[ 1 ] ]( function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this,
										fn ? [ returned ] : arguments
									);
								}
							} );
						} );
						fns = null;
					} ).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( jQuery.isFunction( then ) ) {

										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notifyWith )
											);
										}

									// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )( that, args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											if ( jQuery.Deferred.exceptionHook ) {
												jQuery.Deferred.exceptionHook( e,
													process.stackTrace );
											}

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {

												// Only substitute handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that, args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if ( jQuery.Deferred.getStackHook ) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred( function( newDefer ) {

						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					} ).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[ 1 ] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[ 0 ] ] = function() {
				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
		} );

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( singleValue ) {
		var

			// count of uncompleted subordinates
			remaining = arguments.length,

			// count of unprocessed arguments
			i = remaining,

			// subordinate fulfillment data
			resolveContexts = Array( i ),
			resolveValues = slice.call( arguments ),

			// the master Deferred
			master = jQuery.Deferred(),

			// subordinate callback factory
			updateFunc = function( i ) {
				return function( value ) {
					resolveContexts[ i ] = this;
					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( !( --remaining ) ) {
						master.resolveWith( resolveContexts, resolveValues );
					}
				};
			};

		// Single- and empty arguments are adopted like Promise.resolve
		if ( remaining <= 1 ) {
			adoptValue( singleValue, master.done( updateFunc( i ) ).resolve, master.reject,
				!remaining );

			// Use .then() to unwrap secondary thenables (cf. gh-3000)
			if ( master.state() === "pending" ||
				jQuery.isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

				return master.then();
			}
		}

		// Multiple arguments are aggregated like Promise.all array elements
		while ( i-- ) {
			adoptValue( resolveValues[ i ], updateFunc( i ), master.reject );
		}

		return master.promise();
	}
} );


// These usually indicate a programmer mistake during development,
// warn about them ASAP rather than swallowing them by default.
var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

jQuery.Deferred.exceptionHook = function( error, stack ) {

	// Support: IE 8 - 9 only
	// Console exists when dev tools are open, which can happen at any time
	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
	}
};




jQuery.readyException = function( error ) {
	window.setTimeout( function() {
		throw error;
	} );
};




// The deferred used on DOM ready
var readyList = jQuery.Deferred();

jQuery.fn.ready = function( fn ) {

	readyList
		.then( fn )

		// Wrap jQuery.readyException in a function so that the lookup
		// happens at the time of error handling instead of callback
		// registration.
		.catch( function( error ) {
			jQuery.readyException( error );
		} );

	return this;
};

jQuery.extend( {

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
} );

jQuery.ready.then = readyList.then;

// The ready event handler and self cleanup method
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

// Catch cases where $(document).ready() is called
// after the browser event has already occurred.
// Support: IE <=9 - 10 only
// Older IE sometimes signals "interactive" too soon
if ( document.readyState === "complete" ||
	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

	// Handle it asynchronously to allow scripts the opportunity to delay ready
	window.setTimeout( jQuery.ready );

} else {

	// Use the handy event callback
	document.addEventListener( "DOMContentLoaded", completed );

	// A fallback to window.onload, that will always work
	window.addEventListener( "load", completed );
}




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[ i ], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {

			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn(
					elems[ i ], key, raw ?
					value :
					value.call( elems[ i ], i, fn( elems[ i ], key ) )
				);
			}
		}
	}

	if ( chainable ) {
		return elems;
	}

	// Gets
	if ( bulk ) {
		return fn.call( elems );
	}

	return len ? fn( elems[ 0 ], key ) : emptyGet;
};
var acceptData = function( owner ) {

	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};




function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {

	cache: function( owner ) {

		// Check if the owner object already has a cache
		var value = owner[ this.expando ];

		// If not, create one
		if ( !value ) {
			value = {};

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( acceptData( owner ) ) {

				// If it is a node unlikely to be stringify-ed or looped over
				// use plain assignment
				if ( owner.nodeType ) {
					owner[ this.expando ] = value;

				// Otherwise secure it in a non-enumerable property
				// configurable must be true to allow the property to be
				// deleted when data is removed
				} else {
					Object.defineProperty( owner, this.expando, {
						value: value,
						configurable: true
					} );
				}
			}
		}

		return value;
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ jQuery.camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ jQuery.camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		return key === undefined ?
			this.cache( owner ) :

			// Always use camelCase key (gh-2257)
			owner[ this.expando ] && owner[ this.expando ][ jQuery.camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( Array.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( jQuery.camelCase );
			} else {
				key = jQuery.camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnothtmlwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

			// Support: Chrome <=35 - 45
			// Webkit & Blink performance suffers when deleting properties
			// from DOM nodes, so set to undefined instead
			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
			if ( owner.nodeType ) {
				owner[ this.expando ] = undefined;
			} else {
				delete owner[ this.expando ];
			}
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function getData( data ) {
	if ( data === "true" ) {
		return true;
	}

	if ( data === "false" ) {
		return false;
	}

	if ( data === "null" ) {
		return null;
	}

	// Only convert to a number if it doesn't change the string
	if ( data === +data + "" ) {
		return +data;
	}

	if ( rbrace.test( data ) ) {
		return JSON.parse( data );
	}

	return data;
}

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = getData( data );
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend( {
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
} );

jQuery.fn.extend( {
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE 11 only
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = jQuery.camelCase( name.slice( 5 ) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each( function() {
				dataUser.set( this, key );
			} );
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each( function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			} );
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each( function() {
			dataUser.remove( this, key );
		} );
	}
} );


jQuery.extend( {
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || Array.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks( "once memory" ).add( function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			} )
		} );
	}
} );

jQuery.fn.extend( {
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[ 0 ], type );
		}

		return data === undefined ?
			this :
			this.each( function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			} );
	},
	dequeue: function( type ) {
		return this.each( function() {
			jQuery.dequeue( this, type );
		} );
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},

	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
} );
var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var isHiddenWithinTree = function( elem, el ) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;

		// Inline style trumps all
		return elem.style.display === "none" ||
			elem.style.display === "" &&

			// Otherwise, check computed style
			// Support: Firefox <=43 - 45
			// Disconnected elements can have computed display: none, so first confirm that elem is
			// in the document.
			jQuery.contains( elem.ownerDocument, elem ) &&

			jQuery.css( elem, "display" ) === "none";
	};

var swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};




function adjustCSS( elem, prop, valueParts, tween ) {
	var adjusted,
		scale = 1,
		maxIterations = 20,
		currentValue = tween ?
			function() {
				return tween.cur();
			} :
			function() {
				return jQuery.css( elem, prop, "" );
			},
		initial = currentValue(),
		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

		// Starting value computation is required for potential unit mismatches
		initialInUnit = ( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
			rcssNum.exec( jQuery.css( elem, prop ) );

	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

		// Trust units reported by jQuery.css
		unit = unit || initialInUnit[ 3 ];

		// Make sure we update the tween properties later on
		valueParts = valueParts || [];

		// Iteratively approximate from a nonzero starting point
		initialInUnit = +initial || 1;

		do {

			// If previous iteration zeroed out, double until we get *something*.
			// Use string for doubling so we don't accidentally see scale as unchanged below
			scale = scale || ".5";

			// Adjust and apply
			initialInUnit = initialInUnit / scale;
			jQuery.style( elem, prop, initialInUnit + unit );

		// Update scale, tolerating zero or NaN from tween.cur()
		// Break the loop if scale is unchanged or perfect, or if we've just had enough.
		} while (
			scale !== ( scale = currentValue() / initial ) && scale !== 1 && --maxIterations
		);
	}

	if ( valueParts ) {
		initialInUnit = +initialInUnit || +initial || 0;

		// Apply relative offset (+=/-=) if specified
		adjusted = valueParts[ 1 ] ?
			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
			+valueParts[ 2 ];
		if ( tween ) {
			tween.unit = unit;
			tween.start = initialInUnit;
			tween.end = adjusted;
		}
	}
	return adjusted;
}


var defaultDisplayMap = {};

function getDefaultDisplay( elem ) {
	var temp,
		doc = elem.ownerDocument,
		nodeName = elem.nodeName,
		display = defaultDisplayMap[ nodeName ];

	if ( display ) {
		return display;
	}

	temp = doc.body.appendChild( doc.createElement( nodeName ) );
	display = jQuery.css( temp, "display" );

	temp.parentNode.removeChild( temp );

	if ( display === "none" ) {
		display = "block";
	}
	defaultDisplayMap[ nodeName ] = display;

	return display;
}

function showHide( elements, show ) {
	var display, elem,
		values = [],
		index = 0,
		length = elements.length;

	// Determine new display value for elements that need to change
	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		display = elem.style.display;
		if ( show ) {

			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
			// check is required in this first loop unless we have a nonempty display value (either
			// inline or about-to-be-restored)
			if ( display === "none" ) {
				values[ index ] = dataPriv.get( elem, "display" ) || null;
				if ( !values[ index ] ) {
					elem.style.display = "";
				}
			}
			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
				values[ index ] = getDefaultDisplay( elem );
			}
		} else {
			if ( display !== "none" ) {
				values[ index ] = "none";

				// Remember what we're overwriting
				dataPriv.set( elem, "display", display );
			}
		}
	}

	// Set the display of the elements in a second loop to avoid constant reflow
	for ( index = 0; index < length; index++ ) {
		if ( values[ index ] != null ) {
			elements[ index ].style.display = values[ index ];
		}
	}

	return elements;
}

jQuery.fn.extend( {
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each( function() {
			if ( isHiddenWithinTree( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		} );
	}
} );
var rcheckableType = ( /^(?:checkbox|radio)$/i );

var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]+)/i );

var rscriptType = ( /^$|\/(?:java|ecma)script/i );



// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// Support: IE <=9 only
	option: [ 1, "<select multiple='multiple'>", "</select>" ],

	// XHTML parsers do not magically insert elements in the
	// same way that tag soup parsers do. So we cannot shorten
	// this by omitting <tbody> or other required elements.
	thead: [ 1, "<table>", "</table>" ],
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

	_default: [ 0, "", "" ]
};

// Support: IE <=9 only
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;


function getAll( context, tag ) {

	// Support: IE <=9 - 11 only
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret;

	if ( typeof context.getElementsByTagName !== "undefined" ) {
		ret = context.getElementsByTagName( tag || "*" );

	} else if ( typeof context.querySelectorAll !== "undefined" ) {
		ret = context.querySelectorAll( tag || "*" );

	} else {
		ret = [];
	}

	if ( tag === undefined || tag && nodeName( context, tag ) ) {
		return jQuery.merge( [ context ], ret );
	}

	return ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, contains, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( jQuery.type( elem ) === "object" ) {

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		contains = jQuery.contains( elem.ownerDocument, elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( contains ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


( function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0 - 4.3 only
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android <=4.1 only
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE <=11 only
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
} )();
var documentElement = document.documentElement;



var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE <=9 only
// See #13393 for more info
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {

		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {

			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {

		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {

			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {

			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	} else if ( !fn ) {
		return elem;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {

			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};

		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	} );
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Ensure that invalid selectors throw exceptions at attach time
		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
		if ( selector ) {
			jQuery.find.matchesSelector( documentElement, selector );
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !( events = elemData.events ) ) {
			events = elemData.events = {};
		}
		if ( !( eventHandle = elemData.handle ) ) {
			eventHandle = elemData.handle = function( e ) {

				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend( {
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join( "." )
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !( handlers = events[ type ] ) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !( events = elemData.events ) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[ 2 ] &&
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	dispatch: function( nativeEvent ) {

		// Make a writable jQuery.Event from the native event object
		var event = jQuery.event.fix( nativeEvent );

		var i, j, ret, matched, handleObj, handlerQueue,
			args = new Array( arguments.length ),
			handlers = ( dataPriv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[ 0 ] = event;

		for ( i = 1; i < arguments.length; i++ ) {
			args[ i ] = arguments[ i ];
		}

		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( ( handleObj = matched.handlers[ j++ ] ) &&
				!event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or 2) have namespace(s)
				// a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.rnamespace || event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( ( event.result = ret ) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, handleObj, sel, matchedHandlers, matchedSelectors,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		if ( delegateCount &&

			// Support: IE <=9
			// Black-hole SVG <use> instance trees (trac-13180)
			cur.nodeType &&

			// Support: Firefox <=42
			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
			// Support: IE 11 only
			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
			!( event.type === "click" && event.button >= 1 ) ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
					matchedHandlers = [];
					matchedSelectors = {};
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matchedSelectors[ sel ] === undefined ) {
							matchedSelectors[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matchedSelectors[ sel ] ) {
							matchedHandlers.push( handleObj );
						}
					}
					if ( matchedHandlers.length ) {
						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		cur = this;
		if ( delegateCount < handlers.length ) {
			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
		}

		return handlerQueue;
	},

	addProp: function( name, hook ) {
		Object.defineProperty( jQuery.Event.prototype, name, {
			enumerable: true,
			configurable: true,

			get: jQuery.isFunction( hook ) ?
				function() {
					if ( this.originalEvent ) {
							return hook( this.originalEvent );
					}
				} :
				function() {
					if ( this.originalEvent ) {
							return this.originalEvent[ name ];
					}
				},

			set: function( value ) {
				Object.defineProperty( this, name, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: value
				} );
			}
		} );
	},

	fix: function( originalEvent ) {
		return originalEvent[ jQuery.expando ] ?
			originalEvent :
			new jQuery.Event( originalEvent );
	},

	special: {
		load: {

			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {

			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					this.focus();
					return false;
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {

			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( this.type === "checkbox" && this.click && nodeName( this, "input" ) ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	}
};

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {

	// Allow instantiation without the 'new' keyword
	if ( !( this instanceof jQuery.Event ) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&

				// Support: Android <=2.3 only
				src.returnValue === false ?
			returnTrue :
			returnFalse;

		// Create target properties
		// Support: Safari <=6 - 7 only
		// Target should not be a text node (#504, #13143)
		this.target = ( src.target && src.target.nodeType === 3 ) ?
			src.target.parentNode :
			src.target;

		this.currentTarget = src.currentTarget;
		this.relatedTarget = src.relatedTarget;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,
	isSimulated: false,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && !this.isSimulated ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Includes all common event props including KeyEvent and MouseEvent specific props
jQuery.each( {
	altKey: true,
	bubbles: true,
	cancelable: true,
	changedTouches: true,
	ctrlKey: true,
	detail: true,
	eventPhase: true,
	metaKey: true,
	pageX: true,
	pageY: true,
	shiftKey: true,
	view: true,
	"char": true,
	charCode: true,
	key: true,
	keyCode: true,
	button: true,
	buttons: true,
	clientX: true,
	clientY: true,
	offsetX: true,
	offsetY: true,
	pointerId: true,
	pointerType: true,
	screenX: true,
	screenY: true,
	targetTouches: true,
	toElement: true,
	touches: true,

	which: function( event ) {
		var button = event.button;

		// Add which for key events
		if ( event.which == null && rkeyEvent.test( event.type ) ) {
			return event.charCode != null ? event.charCode : event.keyCode;
		}

		// Add which for click: 1 === left; 2 === middle; 3 === right
		if ( !event.which && button !== undefined && rmouseEvent.test( event.type ) ) {
			if ( button & 1 ) {
				return 1;
			}

			if ( button & 2 ) {
				return 3;
			}

			if ( button & 4 ) {
				return 2;
			}

			return 0;
		}

		return event.which;
	}
}, jQuery.event.addProp );

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari 7 only
// Safari sends mouseenter too often; see:
// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
// for the description of the bug (it existed in older Chrome versions as well).
jQuery.each( {
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mouseenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
} );

jQuery.fn.extend( {

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {

			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {

			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {

			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each( function() {
			jQuery.event.remove( this, types, fn, selector );
		} );
	}
} );


var

	/* eslint-disable max-len */

	// See https://github.com/eslint/eslint/issues/3229
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,

	/* eslint-enable */

	// Support: IE <=10 - 11, Edge 12 - 13
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,

	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

// Prefer a tbody over its parent table for containing new rows
function manipulationTarget( elem, content ) {
	if ( nodeName( elem, "table" ) &&
		nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

		return jQuery( ">tbody", elem )[ 0 ] || elem;
	}

	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );

	if ( match ) {
		elem.type = match[ 1 ];
	} else {
		elem.removeAttribute( "type" );
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.access( src );
		pdataCur = dataPriv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = concat.apply( [], args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		isFunction = jQuery.isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( isFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each( function( index ) {
			var self = collection.eq( index );
			if ( isFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		} );
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl ) {
								jQuery._evalUrl( node.src );
							}
						} else {
							DOMEval( node.textContent.replace( rcleanScript, "" ), doc );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && jQuery.contains( node.ownerDocument, node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend( {
	htmlPrefilter: function( html ) {
		return html.replace( rxhtmlTag, "<$1></$2>" );
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = jQuery.contains( elem.ownerDocument, elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
			if ( acceptData( elem ) ) {
				if ( ( data = elem[ dataPriv.expando ] ) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataPriv.expando ] = undefined;
				}
				if ( elem[ dataUser.expando ] ) {

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataUser.expando ] = undefined;
				}
			}
		}
	}
} );

jQuery.fn.extend( {
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each( function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				} );
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		} );
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		} );
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		} );
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		} );
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; ( elem = this[ i ] ) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		} );
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
} );

jQuery.each( {
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android <=4.0 only, PhantomJS 1 only
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
} );
var rmargin = ( /^margin/ );

var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {

		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if ( !view || !view.opener ) {
			view = window;
		}

		return view.getComputedStyle( elem );
	};



( function() {

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computeStyleTests() {

		// This is a singleton, we need to execute it only once
		if ( !div ) {
			return;
		}

		div.style.cssText =
			"box-sizing:border-box;" +
			"position:relative;display:block;" +
			"margin:auto;border:1px;padding:1px;" +
			"top:1%;width:50%";
		div.innerHTML = "";
		documentElement.appendChild( container );

		var divStyle = window.getComputedStyle( div );
		pixelPositionVal = divStyle.top !== "1%";

		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
		reliableMarginLeftVal = divStyle.marginLeft === "2px";
		boxSizingReliableVal = divStyle.width === "4px";

		// Support: Android 4.0 - 4.3 only
		// Some styles come back with percentage values, even though they shouldn't
		div.style.marginRight = "50%";
		pixelMarginRightVal = divStyle.marginRight === "4px";

		documentElement.removeChild( container );

		// Nullify the div so it wouldn't be stored in the memory and
		// it will also be a sign that checks already performed
		div = null;
	}

	var pixelPositionVal, boxSizingReliableVal, pixelMarginRightVal, reliableMarginLeftVal,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	// Finish early in limited (non-browser) environments
	if ( !div.style ) {
		return;
	}

	// Support: IE <=9 - 11 only
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	container.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;" +
		"padding:0;margin-top:1px;position:absolute";
	container.appendChild( div );

	jQuery.extend( support, {
		pixelPosition: function() {
			computeStyleTests();
			return pixelPositionVal;
		},
		boxSizingReliable: function() {
			computeStyleTests();
			return boxSizingReliableVal;
		},
		pixelMarginRight: function() {
			computeStyleTests();
			return pixelMarginRightVal;
		},
		reliableMarginLeft: function() {
			computeStyleTests();
			return reliableMarginLeftVal;
		}
	} );
} )();


function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,

		// Support: Firefox 51+
		// Retrieving style before computed somehow
		// fixes an issue with getting wrong values
		// on detached elements
		style = elem.style;

	computed = computed || getStyles( elem );

	// getPropertyValue is needed for:
	//   .css('filter') (IE 9 only, #12537)
	//   .css('--customProperty) (#3144)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];

		if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// Android Browser returns percentage for some values,
		// but width seems to be reliably pixels.
		// This is against the CSSOM draft spec:
		// https://drafts.csswg.org/cssom/#resolved-values
		if ( !support.pixelMarginRight() && rnumnonpx.test( ret ) && rmargin.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?

		// Support: IE <=9 - 11 only
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {

	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {

				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return ( this.get = hookFn ).apply( this, arguments );
		}
	};
}


var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rcustomProp = /^--/,
	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	},

	cssPrefixes = [ "Webkit", "Moz", "ms" ],
	emptyStyle = document.createElement( "div" ).style;

// Return a css property mapped to a potentially vendor prefixed property
function vendorPropName( name ) {

	// Shortcut for names that are not vendor prefixed
	if ( name in emptyStyle ) {
		return name;
	}

	// Check for vendor prefixed names
	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in emptyStyle ) {
			return name;
		}
	}
}

// Return a property mapped along what jQuery.cssProps suggests or to
// a vendor prefixed property.
function finalPropName( name ) {
	var ret = jQuery.cssProps[ name ];
	if ( !ret ) {
		ret = jQuery.cssProps[ name ] = vendorPropName( name ) || name;
	}
	return ret;
}

function setPositiveNumber( elem, value, subtract ) {

	// Any relative (+/-) values have already been
	// normalized at this point
	var matches = rcssNum.exec( value );
	return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i,
		val = 0;

	// If we already have the right measurement, avoid augmentation
	if ( extra === ( isBorderBox ? "border" : "content" ) ) {
		i = 4;

	// Otherwise initialize for horizontal or vertical properties
	} else {
		i = name === "width" ? 1 : 0;
	}

	for ( ; i < 4; i += 2 ) {

		// Both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {

			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// At this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {

			// At this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// At this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with computed style
	var valueIsBorderBox,
		styles = getStyles( elem ),
		val = curCSS( elem, name, styles ),
		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// Computed unit is not pixels. Stop here and return.
	if ( rnumnonpx.test( val ) ) {
		return val;
	}

	// Check for style in case a browser which returns unreliable values
	// for getComputedStyle silently falls back to the reliable elem.style
	valueIsBorderBox = isBorderBox &&
		( support.boxSizingReliable() || val === elem.style[ name ] );

	// Fall back to offsetWidth/Height when value is "auto"
	// This happens for inline elements with no explicit setting (gh-3571)
	if ( val === "auto" ) {
		val = elem[ "offset" + name[ 0 ].toUpperCase() + name.slice( 1 ) ];
	}

	// Normalize "", auto, and prepare for extra
	val = parseFloat( val ) || 0;

	// Use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

jQuery.extend( {

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"animationIterationCount": true,
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		"float": "cssFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			isCustomProp = rcustomProp.test( name ),
			style = elem.style;

		// Make sure that we're working with the right name. We don't
		// want to query the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
				value = adjustCSS( elem, name, ret );

				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add the unit (except for certain CSS properties)
			if ( type === "number" ) {
				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
			}

			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !( "set" in hooks ) ||
				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

				if ( isCustomProp ) {
					style.setProperty( name, value );
				} else {
					style[ name ] = value;
				}
			}

		} else {

			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks &&
				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name ),
			isCustomProp = rcustomProp.test( name );

		// Make sure that we're working with the right name. We don't
		// want to modify the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || isFinite( num ) ? num || 0 : val;
		}

		return val;
	}
} );

jQuery.each( [ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <=11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
						swap( elem, cssShow, function() {
							return getWidthOrHeight( elem, name, extra );
						} ) :
						getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var matches,
				styles = extra && getStyles( elem ),
				subtract = extra && augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				);

			// Convert to pixels if value adjustment is needed
			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
				( matches[ 3 ] || "px" ) !== "px" ) {

				elem.style[ name ] = value;
				value = jQuery.css( elem, name );
			}

			return setPositiveNumber( elem, value, subtract );
		}
	};
} );

jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
	function( elem, computed ) {
		if ( computed ) {
			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
				elem.getBoundingClientRect().left -
					swap( elem, { marginLeft: 0 }, function() {
						return elem.getBoundingClientRect().left;
					} )
				) + "px";
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each( {
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split( " " ) : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
} );

jQuery.fn.extend( {
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( Array.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	}
} );


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || jQuery.easing._default;
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			// Use a property on the element directly when it is not a DOM element,
			// or when there is no matching style property that exists.
			if ( tween.elem.nodeType !== 1 ||
				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );

			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {

			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.nodeType === 1 &&
				( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null ||
					jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9 only
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	},
	_default: "swing"
};

jQuery.fx = Tween.prototype.init;

// Back compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, inProgress,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rrun = /queueHooks$/;

function schedule() {
	if ( inProgress ) {
		if ( document.hidden === false && window.requestAnimationFrame ) {
			window.requestAnimationFrame( schedule );
		} else {
			window.setTimeout( schedule, jQuery.fx.interval );
		}

		jQuery.fx.tick();
	}
}

// Animations created synchronously will run synchronously
function createFxNow() {
	window.setTimeout( function() {
		fxNow = undefined;
	} );
	return ( fxNow = jQuery.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
		isBox = "width" in props || "height" in props,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHiddenWithinTree( elem ),
		dataShow = dataPriv.get( elem, "fxshow" );

	// Queue-skipping animations hijack the fx hooks
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always( function() {

			// Ensure the complete handler is called before this completes
			anim.always( function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			} );
		} );
	}

	// Detect show/hide animations
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.test( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// Pretend to be hidden if this is a "show" and
				// there is still data from a stopped show/hide
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;

				// Ignore all other no-op show/hide data
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	// Bail out if this is a no-op like .hide().hide()
	propTween = !jQuery.isEmptyObject( props );
	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
		return;
	}

	// Restrict "overflow" and "display" styles during box animations
	if ( isBox && elem.nodeType === 1 ) {

		// Support: IE <=9 - 11, Edge 12 - 13
		// Record all 3 overflow attributes because IE does not infer the shorthand
		// from identically-valued overflowX and overflowY
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Identify a display type, preferring old show/hide data over the CSS cascade
		restoreDisplay = dataShow && dataShow.display;
		if ( restoreDisplay == null ) {
			restoreDisplay = dataPriv.get( elem, "display" );
		}
		display = jQuery.css( elem, "display" );
		if ( display === "none" ) {
			if ( restoreDisplay ) {
				display = restoreDisplay;
			} else {

				// Get nonempty value(s) by temporarily forcing visibility
				showHide( [ elem ], true );
				restoreDisplay = elem.style.display || restoreDisplay;
				display = jQuery.css( elem, "display" );
				showHide( [ elem ] );
			}
		}

		// Animate inline elements as inline-block
		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
			if ( jQuery.css( elem, "float" ) === "none" ) {

				// Restore the original display value at the end of pure show/hide animations
				if ( !propTween ) {
					anim.done( function() {
						style.display = restoreDisplay;
					} );
					if ( restoreDisplay == null ) {
						display = style.display;
						restoreDisplay = display === "none" ? "" : display;
					}
				}
				style.display = "inline-block";
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always( function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		} );
	}

	// Implement show/hide animations
	propTween = false;
	for ( prop in orig ) {

		// General show/hide setup for this element animation
		if ( !propTween ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
			}

			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}

			// Show elements before animating them
			if ( hidden ) {
				showHide( [ elem ], true );
			}

			/* eslint-disable no-loop-func */

			anim.done( function() {

			/* eslint-enable no-loop-func */

				// The final step of a "hide" animation is actually hiding the element
				if ( !hidden ) {
					showHide( [ elem ] );
				}
				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
		}

		// Per-property setup
		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
		if ( !( prop in dataShow ) ) {
			dataShow[ prop ] = propTween.start;
			if ( hidden ) {
				propTween.end = propTween.start;
				propTween.start = 0;
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( Array.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = Animation.prefilters.length,
		deferred = jQuery.Deferred().always( function() {

			// Don't match elem in the :animated selector
			delete tick.elem;
		} ),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

				// Support: Android 2.3 only
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ] );

			// If there's more to do, yield
			if ( percent < 1 && length ) {
				return remaining;
			}

			// If this was an empty animation, synthesize a final progress notification
			if ( !length ) {
				deferred.notifyWith( elem, [ animation, 1, 0 ] );
			}

			// Resolve the animation and report its conclusion
			deferred.resolveWith( elem, [ animation ] );
			return false;
		},
		animation = deferred.promise( {
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,

					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.notifyWith( elem, [ animation, 1, 0 ] );
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		} ),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length; index++ ) {
		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			if ( jQuery.isFunction( result.stop ) ) {
				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
					jQuery.proxy( result.stop, result );
			}
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	// Attach callbacks from options
	animation
		.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		} )
	);

	return animation;
}

jQuery.Animation = jQuery.extend( Animation, {

	tweeners: {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value );
			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
			return tween;
		} ]
	},

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.match( rnothtmlwhite );
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length; index++ ) {
			prop = props[ index ];
			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
			Animation.tweeners[ prop ].unshift( callback );
		}
	},

	prefilters: [ defaultPrefilter ],

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			Animation.prefilters.unshift( callback );
		} else {
			Animation.prefilters.push( callback );
		}
	}
} );

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	// Go to the end state if fx are off
	if ( jQuery.fx.off ) {
		opt.duration = 0;

	} else {
		if ( typeof opt.duration !== "number" ) {
			if ( opt.duration in jQuery.fx.speeds ) {
				opt.duration = jQuery.fx.speeds[ opt.duration ];

			} else {
				opt.duration = jQuery.fx.speeds._default;
			}
		}
	}

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend( {
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate( { opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || dataPriv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each( function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = dataPriv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this &&
					( type == null || timers[ index ].queue === type ) ) {

					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		} );
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each( function() {
			var index,
				data = dataPriv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		} );
	}
} );

jQuery.each( [ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
} );

// Generate shortcuts for custom animations
jQuery.each( {
	slideDown: genFx( "show" ),
	slideUp: genFx( "hide" ),
	slideToggle: genFx( "toggle" ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
} );

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];

		// Run the timer and safely remove it when done (allowing for external removal)
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	jQuery.fx.start();
};

jQuery.fx.interval = 13;
jQuery.fx.start = function() {
	if ( inProgress ) {
		return;
	}

	inProgress = true;
	schedule();
};

jQuery.fx.stop = function() {
	inProgress = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,

	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	} );
};


( function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android <=4.3 only
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE <=11 only
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: IE <=11 only
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
} )();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend( {
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each( function() {
			jQuery.removeAttr( this, name );
		} );
	}
} );

jQuery.extend( {
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// Attribute hooks are determined by the lowercase version
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	removeAttr: function( elem, value ) {
		var name,
			i = 0,

			// Attribute names can contain non-HTML whitespace characters
			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
			attrNames = value && value.match( rnothtmlwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[ i++ ] ) ) {
				elem.removeAttribute( name );
			}
		}
	}
} );

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {

			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};

jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle,
			lowercaseName = name.toLowerCase();

		if ( !isXML ) {

			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ lowercaseName ];
			attrHandle[ lowercaseName ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				lowercaseName :
				null;
			attrHandle[ lowercaseName ] = handle;
		}
		return ret;
	};
} );




var rfocusable = /^(?:input|select|textarea|button)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend( {
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each( function() {
			delete this[ jQuery.propFix[ name ] || name ];
		} );
	}
} );

jQuery.extend( {
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {

				// Support: IE <=9 - 11 only
				// elem.tabIndex doesn't always return the
				// correct value when it hasn't been explicitly set
				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				if ( tabindex ) {
					return parseInt( tabindex, 10 );
				}

				if (
					rfocusable.test( elem.nodeName ) ||
					rclickable.test( elem.nodeName ) &&
					elem.href
				) {
					return 0;
				}

				return -1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
} );

// Support: IE <=11 only
// Accessing the selectedIndex property
// forces the browser to respect setting selected
// on the option
// The getter ensures a default option is selected
// when in an optgroup
// eslint rule "no-unused-expressions" is disabled for this code
// since it considers such accessions noop
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		},
		set: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent ) {
				parent.selectedIndex;

				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
		}
	};
}

jQuery.each( [
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
} );




	// Strip and collapse whitespace according to HTML spec
	// https://html.spec.whatwg.org/multipage/infrastructure.html#strip-and-collapse-whitespace
	function stripAndCollapse( value ) {
		var tokens = value.match( rnothtmlwhite ) || [];
		return tokens.join( " " );
	}


function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

jQuery.fn.extend( {
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( typeof value === "string" && value ) {
			classes = value.match( rnothtmlwhite ) || [];

			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( !arguments.length ) {
			return this.attr( "class", "" );
		}

		if ( typeof value === "string" && value ) {
			classes = value.match( rnothtmlwhite ) || [];

			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {

						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			} );
		}

		return this.each( function() {
			var className, i, self, classNames;

			if ( type === "string" ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = value.match( rnothtmlwhite ) || [];

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// Store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
						"" :
						dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		} );
	},

	hasClass: function( selector ) {
		var className, elem,
			i = 0;

		className = " " + selector + " ";
		while ( ( elem = this[ i++ ] ) ) {
			if ( elem.nodeType === 1 &&
				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
					return true;
			}
		}

		return false;
	}
} );




var rreturn = /\r/g;

jQuery.fn.extend( {
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[ 0 ];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks &&
					"get" in hooks &&
					( ret = hooks.get( elem, "value" ) ) !== undefined
				) {
					return ret;
				}

				ret = elem.value;

				// Handle most common string cases
				if ( typeof ret === "string" ) {
					return ret.replace( rreturn, "" );
				}

				// Handle cases where value is null/undef or number
				return ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each( function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( Array.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				} );
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		} );
	}
} );

jQuery.extend( {
	valHooks: {
		option: {
			get: function( elem ) {

				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :

					// Support: IE <=10 - 11 only
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					stripAndCollapse( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option, i,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one",
					values = one ? null : [],
					max = one ? index + 1 : options.length;

				if ( index < 0 ) {
					i = max;

				} else {
					i = one ? index : 0;
				}

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Support: IE <=9 only
					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled &&
							( !option.parentNode.disabled ||
								!nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					/* eslint-disable no-cond-assign */

					if ( option.selected =
						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
					) {
						optionSet = true;
					}

					/* eslint-enable no-cond-assign */
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
} );

// Radios and checkboxes getter/setter
jQuery.each( [ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( Array.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
		};
	}
} );




// Return jQuery for attributes-only inclusion


var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/;

jQuery.extend( jQuery.event, {

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "." ) > -1 ) {

			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split( "." );
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf( ":" ) < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join( "." );
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === ( elem.ownerDocument || document ) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || {} )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( ( !special._default ||
				special._default.apply( eventPath.pop(), data ) === false ) &&
				acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	// Piggyback on a donor event to simulate a different one
	// Used only for `focus(in | out)` events
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true
			}
		);

		jQuery.event.trigger( e, null, elem );
	}

} );

jQuery.fn.extend( {

	trigger: function( type, data ) {
		return this.each( function() {
			jQuery.event.trigger( type, data, this );
		} );
	},
	triggerHandler: function( type, data ) {
		var elem = this[ 0 ];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
} );


jQuery.each( ( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
} );

jQuery.fn.extend( {
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
} );




support.focusin = "onfocusin" in window;


// Support: Firefox <=44
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
if ( !support.focusin ) {
	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
		};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					dataPriv.remove( doc, fix );

				} else {
					dataPriv.access( doc, fix, attaches );
				}
			}
		};
	} );
}
var location = window.location;

var nonce = jQuery.now();

var rquery = ( /\?/ );



// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE 9 - 11 only
	// IE throws on parseFromString with invalid input.
	try {
		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( Array.isArray( obj ) ) {

		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		} );

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, valueOrFunction ) {

			// If value is a function, invoke it and use its return value
			var value = jQuery.isFunction( valueOrFunction ) ?
				valueOrFunction() :
				valueOrFunction;

			s[ s.length ] = encodeURIComponent( key ) + "=" +
				encodeURIComponent( value == null ? "" : value );
		};

	// If an array was passed in, assume that it is an array of form elements.
	if ( Array.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		} );

	} else {

		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" );
};

jQuery.fn.extend( {
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map( function() {

			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		} )
		.filter( function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} )
		.map( function( i, elem ) {
			var val = jQuery( this ).val();

			if ( val == null ) {
				return null;
			}

			if ( Array.isArray( val ) ) {
				return jQuery.map( val, function( val ) {
					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
				} );
			}

			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} ).get();
	}
} );


var
	r20 = /%20/g,
	rhash = /#.*$/,
	rantiCache = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Anchor tag for parsing the document origin
	originAnchor = document.createElement( "a" );
	originAnchor.href = location.href;

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

		if ( jQuery.isFunction( func ) ) {

			// For each dataType in the dataTypeExpression
			while ( ( dataType = dataTypes[ i++ ] ) ) {

				// Prepend if requested
				if ( dataType[ 0 ] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

				// Otherwise append
				} else {
					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" &&
				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		} );
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {

		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}

		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},

		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {

								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s.throws ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return {
								state: "parsererror",
								error: conv ? e : "No conversion from " + prev + " to " + current
							};
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend( {

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: location.href,
		type: "GET",
		isLocal: rlocalProtocol.test( location.protocol ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /\bxml\b/,
			html: /\bhtml/,
			json: /\bjson\b/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": JSON.parse,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,

			// URL without anti-cache param
			cacheURL,

			// Response headers
			responseHeadersString,
			responseHeaders,

			// timeout handle
			timeoutTimer,

			// Url cleanup var
			urlAnchor,

			// Request state (becomes false upon send and true upon completion)
			completed,

			// To know if global events are to be dispatched
			fireGlobals,

			// Loop variable
			i,

			// uncached part of the url
			uncached,

			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),

			// Callbacks context
			callbackContext = s.context || s,

			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context &&
				( callbackContext.nodeType || callbackContext.jquery ) ?
					jQuery( callbackContext ) :
					jQuery.event,

			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),

			// Status-dependent callbacks
			statusCode = s.statusCode || {},

			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},

			// Default abort message
			strAbort = "canceled",

			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( completed ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[ 1 ].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( completed == null ) {
						name = requestHeadersNames[ name.toLowerCase() ] =
							requestHeadersNames[ name.toLowerCase() ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( completed == null ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( completed ) {

							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for ( code in map ) {
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR );

		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || location.href ) + "" )
			.replace( rprotocol, location.protocol + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

		// A cross-domain request is in order when the origin doesn't match the current origin.
		if ( s.crossDomain == null ) {
			urlAnchor = document.createElement( "a" );

			// Support: IE <=8 - 11, Edge 12 - 13
			// IE throws exception on accessing the href property if url is malformed,
			// e.g. http://example.com:80x/
			try {
				urlAnchor.href = s.url;

				// Support: IE <=8 - 11 only
				// Anchor's host property isn't correctly set when s.url is relative
				urlAnchor.href = urlAnchor.href;
				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
					urlAnchor.protocol + "//" + urlAnchor.host;
			} catch ( e ) {

				// If there is an error parsing the URL, assume it is crossDomain,
				// it can be rejected by the transport if it is invalid
				s.crossDomain = true;
			}
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( completed ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		// Remove hash to simplify url manipulation
		cacheURL = s.url.replace( rhash, "" );

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// Remember the hash so we can put it back
			uncached = s.url.slice( cacheURL.length );

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add or update anti-cache param if needed
			if ( s.cache === false ) {
				cacheURL = cacheURL.replace( rantiCache, "$1" );
				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce++ ) + uncached;
			}

			// Put hash and anti-cache on the URL that will be requested (gh-1732)
			s.url = cacheURL + uncached;

		// Change '%20' to '+' if this is encoded form body content (gh-2658)
		} else if ( s.data && s.processData &&
			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
			s.data = s.data.replace( r20, "+" );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
				s.accepts[ s.dataTypes[ 0 ] ] +
					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend &&
			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		completeDeferred.add( s.complete );
		jqXHR.done( s.success );
		jqXHR.fail( s.error );

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}

			// If request was aborted inside ajaxSend, stop there
			if ( completed ) {
				return jqXHR;
			}

			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = window.setTimeout( function() {
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				completed = false;
				transport.send( requestHeaders, done );
			} catch ( e ) {

				// Rethrow post-completion exceptions
				if ( completed ) {
					throw e;
				}

				// Propagate others as results
				done( -1, e );
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Ignore repeat invocations
			if ( completed ) {
				return;
			}

			completed = true;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				window.clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader( "Last-Modified" );
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader( "etag" );
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {

				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
} );

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

		// Shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );


jQuery._evalUrl = function( url ) {
	return jQuery.ajax( {
		url: url,

		// Make this explicit, since user can override this through ajaxSetup (#11264)
		type: "GET",
		dataType: "script",
		cache: true,
		async: false,
		global: false,
		"throws": true
	} );
};


jQuery.fn.extend( {
	wrapAll: function( html ) {
		var wrap;

		if ( this[ 0 ] ) {
			if ( jQuery.isFunction( html ) ) {
				html = html.call( this[ 0 ] );
			}

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map( function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			} ).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each( function( i ) {
				jQuery( this ).wrapInner( html.call( this, i ) );
			} );
		}

		return this.each( function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		} );
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each( function( i ) {
			jQuery( this ).wrapAll( isFunction ? html.call( this, i ) : html );
		} );
	},

	unwrap: function( selector ) {
		this.parent( selector ).not( "body" ).each( function() {
			jQuery( this ).replaceWith( this.childNodes );
		} );
		return this;
	}
} );


jQuery.expr.pseudos.hidden = function( elem ) {
	return !jQuery.expr.pseudos.visible( elem );
};
jQuery.expr.pseudos.visible = function( elem ) {
	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
};




jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE <=9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport( function( options ) {
	var callback, errorCallback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr();

				xhr.open(
					options.type,
					options.url,
					options.async,
					options.username,
					options.password
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
					headers[ "X-Requested-With" ] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							callback = errorCallback = xhr.onload =
								xhr.onerror = xhr.onabort = xhr.onreadystatechange = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {

								// Support: IE <=9 only
								// On a manual native abort, IE9 throws
								// errors on any property access that is not readyState
								if ( typeof xhr.status !== "number" ) {
									complete( 0, "error" );
								} else {
									complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status,
										xhr.statusText
									);
								}
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,

									// Support: IE <=9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									( xhr.responseType || "text" ) !== "text"  ||
									typeof xhr.responseText !== "string" ?
										{ binary: xhr.response } :
										{ text: xhr.responseText },
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				errorCallback = xhr.onerror = callback( "error" );

				// Support: IE 9 only
				// Use onreadystatechange to replace onabort
				// to handle uncaught aborts
				if ( xhr.onabort !== undefined ) {
					xhr.onabort = errorCallback;
				} else {
					xhr.onreadystatechange = function() {

						// Check readyState before timeout as it changes
						if ( xhr.readyState === 4 ) {

							// Allow onerror to be called first,
							// but that will not handle a native abort
							// Also, save errorCallback to a variable
							// as xhr.onerror cannot be accessed
							window.setTimeout( function() {
								if ( callback ) {
									errorCallback();
								}
							} );
						}
					};
				}

				// Create the abort callback
				callback = callback( "abort" );

				try {

					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {

					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
jQuery.ajaxPrefilter( function( s ) {
	if ( s.crossDomain ) {
		s.contents.script = false;
	}
} );

// Install script dataType
jQuery.ajaxSetup( {
	accepts: {
		script: "text/javascript, application/javascript, " +
			"application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /\b(?:java|ecma)script\b/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
} );

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
} );

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery( "<script>" ).prop( {
					charset: s.scriptCharset,
					src: s.url
				} ).on(
					"load error",
					callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					}
				);

				// Use native DOM manipulation to avoid our domManip AJAX trickery
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup( {
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
} );

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" &&
				( s.contentType || "" )
					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
				rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters[ "script json" ] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// Force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always( function() {

			// If previous value didn't exist - remove it
			if ( overwritten === undefined ) {
				jQuery( window ).removeProp( callbackName );

			// Otherwise restore preexisting value
			} else {
				window[ callbackName ] = overwritten;
			}

			// Save back as free
			if ( s[ callbackName ] ) {

				// Make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// Save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		} );

		// Delegate to script
		return "script";
	}
} );




// Support: Safari 8 only
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in Safari 8.
// https://bugs.webkit.org/show_bug.cgi?id=137337
support.createHTMLDocument = ( function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
} )();


// Argument "data" should be string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}

	var base, parsed, scripts;

	if ( !context ) {

		// Stop scripts or inline event handlers from being executed immediately
		// by using document.implementation
		if ( support.createHTMLDocument ) {
			context = document.implementation.createHTMLDocument( "" );

			// Set the base href for the created document
			// so any parsed elements with URLs
			// are based on the document's URL (gh-2965)
			base = context.createElement( "base" );
			base.href = document.location.href;
			context.head.appendChild( base );
		} else {
			context = document;
		}
	}

	parsed = rsingleTag.exec( data );
	scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[ 1 ] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	var selector, type, response,
		self = this,
		off = url.indexOf( " " );

	if ( off > -1 ) {
		selector = stripAndCollapse( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax( {
			url: url,

			// If "type" variable is undefined, then "GET" method will be used.
			// Make value of this field explicit since
			// user can override it through ajaxSetup method
			type: type || "GET",
			dataType: "html",
			data: params
		} ).done( function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		// If the request succeeds, this function gets "data", "status", "jqXHR"
		// but they are ignored because response was set above.
		// If it fails, this function gets "jqXHR", "status", "error"
		} ).always( callback && function( jqXHR, status ) {
			self.each( function() {
				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
			} );
		} );
	}

	return this;
};




// Attach a bunch of functions for handling common AJAX events
jQuery.each( [
	"ajaxStart",
	"ajaxStop",
	"ajaxComplete",
	"ajaxError",
	"ajaxSuccess",
	"ajaxSend"
], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
} );




jQuery.expr.pseudos.animated = function( elem ) {
	return jQuery.grep( jQuery.timers, function( fn ) {
		return elem === fn.elem;
	} ).length;
};




jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {

			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend( {
	offset: function( options ) {

		// Preserve chaining for setter
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each( function( i ) {
					jQuery.offset.setOffset( this, options, i );
				} );
		}

		var doc, docElem, rect, win,
			elem = this[ 0 ];

		if ( !elem ) {
			return;
		}

		// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
		// Support: IE <=11 only
		// Running getBoundingClientRect on a
		// disconnected node in IE throws an error
		if ( !elem.getClientRects().length ) {
			return { top: 0, left: 0 };
		}

		rect = elem.getBoundingClientRect();

		doc = elem.ownerDocument;
		docElem = doc.documentElement;
		win = doc.defaultView;

		return {
			top: rect.top + win.pageYOffset - docElem.clientTop,
			left: rect.left + win.pageXOffset - docElem.clientLeft
		};
	},

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// Fixed elements are offset from window (parentOffset = {top:0, left: 0},
		// because it is its only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {

			// Assume getBoundingClientRect is there when computed position is fixed
			offset = elem.getBoundingClientRect();

		} else {

			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset = {
				top: parentOffset.top + jQuery.css( offsetParent[ 0 ], "borderTopWidth", true ),
				left: parentOffset.left + jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true )
			};
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	// This method will return documentElement in the following cases:
	// 1) For the element inside the iframe without offsetParent, this method will return
	//    documentElement of the parent window
	// 2) For the hidden or detached element
	// 3) For body or html element, i.e. in case of the html node - it will return itself
	//
	// but those exceptions were never presented as a real life use-cases
	// and might be considered as more preferable results.
	//
	// This logic, however, is not guaranteed and can change at any point in the future
	offsetParent: function() {
		return this.map( function() {
			var offsetParent = this.offsetParent;

			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || documentElement;
		} );
	}
} );

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {

			// Coalesce documents and windows
			var win;
			if ( jQuery.isWindow( elem ) ) {
				win = elem;
			} else if ( elem.nodeType === 9 ) {
				win = elem.defaultView;
			}

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : win.pageXOffset,
					top ? val : win.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length );
	};
} );

// Support: Safari <=7 - 9.1, Chrome <=37 - 49
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
} );


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name },
		function( defaultExtra, funcName ) {

		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {

					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
					return funcName.indexOf( "outer" ) === 0 ?
						elem[ "inner" + name ] :
						elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable );
		};
	} );
} );


jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {

		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	}
} );

jQuery.holdReady = function( hold ) {
	if ( hold ) {
		jQuery.readyWait++;
	} else {
		jQuery.ready( true );
	}
};
jQuery.isArray = Array.isArray;
jQuery.parseJSON = JSON.parse;
jQuery.nodeName = nodeName;




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	} );
}




var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( !noGlobal ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;
} );
;
return module.exports;
},
22: function (require, module, exports) {

(function(e){function f(a,c){function b(a){if(!this||this.constructor!==b)return new b(a);this._keys=[];this._values=[];this._itp=[];this.objectOnly=c;a&&v.call(this,a)}c||w(a,"size",{get:x});a.constructor=b;b.prototype=a;return b}function v(a){this.add?a.forEach(this.add,this):a.forEach(function(a){this.set(a[0],a[1])},this)}function d(a){this.has(a)&&(this._keys.splice(b,1),this._values.splice(b,1),this._itp.forEach(function(a){b<a[0]&&a[0]--}));return-1<b}function m(a){return this.has(a)?this._values[b]:void 0}function n(a,c){if(this.objectOnly&&c!==Object(c))throw new TypeError("Invalid value used as weak collection key");if(c!=c||0===c)for(b=a.length;b--&&!y(a[b],c););else b=a.indexOf(c);return-1<b}function p(a){return n.call(this,this._values,a)}function q(a){return n.call(this,this._keys,a)}function r(a,c){this.has(a)?this._values[b]=c:this._values[this._keys.push(a)-1]=c;return this}function t(a){this.has(a)||this._values.push(a);return this}function h(){(this._keys||0).length=this._values.length=0}function z(){return k(this._itp,this._keys)}function l(){return k(this._itp,this._values)}function A(){return k(this._itp,this._keys,this._values)}function B(){return k(this._itp,this._values,this._values)}function k(a,c,b){var g=[0],e=!1;a.push(g);return{next:function(){var f,d=g[0];!e&&d<c.length?(f=b?[c[d],b[d]]:c[d],g[0]++):(e=!0,a.splice(a.indexOf(g),1));return{done:e,value:f}}}}function x(){return this._values.length}function u(a,c){for(var b=this.entries();;){var d=b.next();if(d.done)break;a.call(c,d.value[1],d.value[0],this)}}var b,w=Object.defineProperty,y=function(a,b){return isNaN(a)?isNaN(b):a===b};"undefined"==typeof WeakMap&&(e.WeakMap=f({"delete":d,clear:h,get:m,has:q,set:r},!0));"undefined"!=typeof Map&&"function"===typeof(new Map).values&&(new Map).values().next||(e.Map=f({"delete":d,has:q,get:m,set:r,keys:z,values:l,entries:A,forEach:u,clear:h}));"undefined"!=typeof Set&&"function"===typeof(new Set).values&&(new Set).values().next||(e.Set=f({has:p,add:t,"delete":d,clear:h,keys:l,values:l,entries:B,forEach:u}));"undefined"==typeof WeakSet&&(e.WeakSet=f({"delete":d,add:t,clear:h,has:p},!0))})("undefined"!=typeof exports&&"undefined"!=typeof global?global:window);
;


;
return module.exports;
},
59: function (require, module, exports) {
module.exports = function(target, property, value) {
  if (!target.prototype[property]) {
    if (Object.defineProperty) {
      return Object.defineProperty(target.prototype, property, {
        writable: true,
        configurable: true,
        enumerable: false,
        value: value
      });
    } else {
      return target.prototype[property] = value;
    }
  }
};

;
return module.exports;
},
8: function (require, module, exports) {
var registerPolyfills;

registerPolyfills = function() {
  
  !function(e){function t(e){var t=e.nodeName.toUpperCase();return"TEXTAREA"===t||"INPUT"===t}function n(e){m={el:e,value:e.value},d=Object.getOwnPropertyDescriptor(e.constructor.prototype,"value"),Object.defineProperty(m.el,"value",p),m.el.attachEvent("onpropertychange",o)}function u(){m.el&&(delete m.el.value,m.el.detachEvent("onpropertychange",o),m={el:null,value:null},d=null)}function c(t){a?t.fireEvent("on"+e,i()):t.dispatchEvent(i())}function o(e){if("value"===e.propertyName){var t=e.srcElement.value;t!==m.value&&(m.value=t,c(m.el))}}function l(){m.el&&m.el.value!==m.value&&(m.value=m.el.value,c(m.el))}var a="undefined"==typeof document.dispatchEvent,r=document.createElement("input"),v="oninput"in r&&(!("documentMode"in document)||document.documentMode>9),i=function(){var t;return a?(t=document.createEventObject(),t.type="change",t.bubbles=!0,t.cancelable=!1):(t=document.createEvent("CustomEvent"),t.initCustomEvent(e,!0,!1,{})),t},d=null,p={get:function(){return d.get.call(this)},set:function(e){m.value=e,d.set.call(this,e)}},m={el:null,value:null};v?"input"!==e&&document.addEventListener("input",function(e){c(e.target)},!1):(document.attachEvent("onfocusin",function(e){t(e.srcElement)&&(u(),n(e.srcElement))}),document.attachEvent("onfocusout",function(){u()}),document.attachEvent("onselectionchange",l),document.attachEvent("onkeyup",l),document.attachEvent("onkeydown",l))}("input");
  ;
  
  
  ;
  
  !function(e,t,l){function n(e){function t(){return i=h(e)}function l(){var l=i,n=t();l!==n&&e.__placeholder&&(e.value=n),e.__placeholder&&e.value!==n&&(e.__placeholder=!1)}function n(){e.value?c():a()}function a(){e.__placeholder||e.value||r()}function r(){e.__placeholder=!0,e.value=t(),d(e,"-placeholder")}function c(){e.__placeholder&&(e.__placeholder=!1,e.value="",p(e,"-placeholder"))}if(null!=e.__placeholder)return void(e.__placeholder&&(e.value=t()));var i=h(e);e.value?(e.__placeholder=!1,e.value===t()&&r()):a(),o(e,"keyup",n),o(e,"keyDown",n),o(e,"blur",n),o(e,"focus",c),o(e,"click",c),e.addEventListener?o(e,"DOMAttrModified",l):e.attachEvent&&"onpropertychange"in e&&o(e,"propertychange",l)}function a(){var e=[];return c(arguments,function(t){"number"!=typeof t.length&&(t=[t]),e.push.apply(e,i(t,r))}),e}function r(e){var t=(e.nodeName||"").toLowerCase();return"textarea"===t||"input"===t&&("text"===e.type||"password"===e.type)}function o(e,t,l){e.addEventListener?e.addEventListener(t,l,!1):e.attachEvent&&e.attachEvent("on"+t,l)}function c(e,t){if(e.forEach)return e.forEach(t);for(var l=0,n=e.length;n>l;l++)t.call(null,e[l],l,e)}function i(e,t){if(e.filter)return e.filter(t);for(var l=[],n=0,a=e.length;a>n;n++)t.call(null,e[n],n,e)&&l.push(e[n]);return l}function u(e){return y[e]||(y[e]=new RegExp("(^|\\s)+"+e+"(\\s|$)+","g")),y[e]}function d(e,t){e.className+=" "+t}function p(e,t){e.className=e.className.replace(u(t)," ")}function h(e){return e.getAttribute("placeholder")||e.attributes.placeholder&&e.attributes.placeholder.nodeValue}function f(){var e=t.styleSheets&&t.styleSheets[0];if(!e){var l=(t.head||t.getElementsByTagName("head")[0],t.createElement("style"));l.appendChild(t.createTextNode("")),t.head.appendChild(l),e=l.sheet}return e}if("placeholder"in t.createElement("input"))return t.placeholderPolyfill=function(){},void(t.placeholderPolyfill.active=!1);var s=t.getElementsByTagName("input"),v=t.getElementsByTagName("textarea");t.placeholderPolyfill=function(e){e=e?a(e):a(s,v),c(e,n)},t.placeholderPolyfill.active=!0,t.placeholderPolyfill(),t.addEventListener?(t.addEventListener("DOMAttrModified",t.placeholderPolyfill),t.addEventListener("DOMNodeInserted",t.placeholderPolyfill)):t.attachEvent&&"onpropertychange"in t&&t.attachEvent("onpropertychange",t.placeholderPolyfill),f().addRule(".-placeholder","color: #888;",0);var y={}}(window,document);
  ;
  
  
  ;
  require(22);
  
(function () {
	if (typeof window.Element === "undefined" || "classList" in document.documentElement) return;

	var prototype = Array.prototype,
			push = prototype.push,
			splice = prototype.splice,
			join = prototype.join;

	function DOMTokenList(el) {
		this.el = el;
		// The className needs to be trimmed and split on whitespace
		// to retrieve a list of classes.
		var classes = el.className.replace(/^\s+|\s+$/g,'').split(/\s+/);
		for (var i = 0; i < classes.length; i++) {
			push.call(this, classes[i]);
		}
	};

	DOMTokenList.prototype = {
		add: function(token) {
			if(this.contains(token)) return;
			push.call(this, token);
			this.el.className = this.toString();
		},
		contains: function(token) {
			return this.el.className.indexOf(token) != -1;
		},
		item: function(index) {
			return this[index] || null;
		},
		remove: function(token) {
			if (!this.contains(token)) return;
			for (var i = 0; i < this.length; i++) {
				if (this[i] == token) break;
			}
			splice.call(this, i, 1);
			this.el.className = this.toString();
		},
		toString: function() {
			return join.call(this, ' ');
		},
		toggle: function(token) {
			if (!this.contains(token)) {
				this.add(token);
			} else {
				this.remove(token);
			}

			return this.contains(token);
		}
	};

	window.DOMTokenList = DOMTokenList;

	function defineElementGetter (obj, prop, getter) {
			if (Object.defineProperty) {
					Object.defineProperty(obj, prop,{
							get : getter
					});
			} else {
					obj.__defineGetter__(prop, getter);
			}
	}

	defineElementGetter(Element.prototype, 'classList', function () {
		return new DOMTokenList(this);
	});
})();
;


;
  
(function(){'use strict';var f,g=[];function l(a){g.push(a);1==g.length&&f()}function m(){for(;g.length;)g[0](),g.shift()}f=function(){setTimeout(m)};function n(a){this.a=p;this.b=void 0;this.f=[];var b=this;try{a(function(a){q(b,a)},function(a){r(b,a)})}catch(c){r(b,c)}}var p=2;function t(a){return new n(function(b,c){c(a)})}function u(a){return new n(function(b){b(a)})}function q(a,b){if(a.a==p){if(b==a)throw new TypeError;var c=!1;try{var d=b&&b.then;if(null!=b&&"object"==typeof b&&"function"==typeof d){d.call(b,function(b){c||q(a,b);c=!0},function(b){c||r(a,b);c=!0});return}}catch(e){c||r(a,e);return}a.a=0;a.b=b;v(a)}}
function r(a,b){if(a.a==p){if(b==a)throw new TypeError;a.a=1;a.b=b;v(a)}}function v(a){l(function(){if(a.a!=p)for(;a.f.length;){var b=a.f.shift(),c=b[0],d=b[1],e=b[2],b=b[3];try{0==a.a?"function"==typeof c?e(c.call(void 0,a.b)):e(a.b):1==a.a&&("function"==typeof d?e(d.call(void 0,a.b)):b(a.b))}catch(h){b(h)}}})}n.prototype.g=function(a){return this.c(void 0,a)};n.prototype.c=function(a,b){var c=this;return new n(function(d,e){c.f.push([a,b,d,e]);v(c)})};
function w(a){return new n(function(b,c){function d(c){return function(d){h[c]=d;e+=1;e==a.length&&b(h)}}var e=0,h=[];0==a.length&&b(h);for(var k=0;k<a.length;k+=1)u(a[k]).c(d(k),c)})}function x(a){return new n(function(b,c){for(var d=0;d<a.length;d+=1)u(a[d]).c(b,c)})};window.Promise||(window.Promise=n,window.Promise.resolve=u,window.Promise.reject=t,window.Promise.race=x,window.Promise.all=w,window.Promise.prototype.then=n.prototype.c,window.Promise.prototype["catch"]=n.prototype.g);}());
;


;
  
	if (!Object.values) {
	  Object.defineProperty(Object, 'values', {
	  	value: function(target){
	  		return Object.keys(target).map(function(key){return target[key];});
	  	}
	  })
	}
;


;

;
  var definePolyfill;

definePolyfill = require(59);


	definePolyfill(Array, 'find', function (callback, thisArg) {
		var val, i=0, elmVal;

		for (i; i<this.length; i++) {
			elmVal = this[i];

			if (callback.call(thisArg, elmVal, i, this)) {
				return elmVal;
			}
		}

		return val;
	});
;

;

var definePolyfill;

definePolyfill = require(59);


	definePolyfill(Array, 'findIndex', function (callback, thisArg) {
		var val=-1, i=0, elmVal;

		for (i; i<this.length; i++) {
			elmVal = this[i];

			if (callback.call(thisArg, elmVal, i, this)) {
				return i;
			}
		}

		return -1;
	});
;

;

var definePolyfill;

definePolyfill = require(59);


	definePolyfill(Array, 'forEach', function (fn, arg) {
		var arr = this,
			len = arr.length,
			thisArg = arg ? arg : undefined,
			i;
	
		for (i = 0; i < len; i += 1) {
			if (arr.hasOwnProperty(i)) {
				fn.call(thisArg, arr[i], i, arr);
			}
		}
	});
;

;

var definePolyfill;

definePolyfill = require(59);


    definePolyfill(Array, 'from', function (object){
    	return Array.prototype.slice.call(object);
    });
;

;

var definePolyfill;

definePolyfill = require(59);


	definePolyfill(Array, 'includes', function(searchElement) {
		return this.indexOf(searchElement) !== -1;
	});
;

;

var definePolyfill;

definePolyfill = require(59);


	definePolyfill(Array, 'isArray', function(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	});
;

;

;
  var definePolyfill;

definePolyfill = require(59);


	definePolyfill(String, 'includes', function(str, start) {
		return this.indexOf(str, start||0) !== -1;
	});
;

;

var definePolyfill;

definePolyfill = require(59);


	definePolyfill(String, 'startsWith', function(str, pos) {
		return this.indexOf(str, pos||0) === 0;
	});
;

;

var definePolyfill;

definePolyfill = require(59);


	definePolyfill(String, 'endsWith', function(str) {
		return this.indexOf(str, this.length - str.length) !== -1;
	});
;

;

var definePolyfill;

definePolyfill = require(59);


	definePolyfill(String, 'repeat', function(n) {
		var rpt = '', i;
		for (i = 0; i < n; i++) {
			rpt += str;
		}
		return rpt;
	});
;

;

;
};

registerPolyfills.version = "2.0.3";

module.exports = registerPolyfills;

;
return module.exports;
},
5: function (require, module, exports) {
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
3: function (require, module, exports) {
var arrayMutatorMethods, boundInstances, currentID, defaultOptions, dummyPropertyDescriptor, placeholder, settings;

currentID = 0;

arrayMutatorMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'reverse', 'sort'];

dummyPropertyDescriptor = {};

boundInstances = {};

placeholder = ['{{', '}}'];

settings = Object.create({
  silent: false
}, {
  placeholder: {
    get: function() {
      return placeholder;
    },
    set: function(newPlaceholder) {
      if (checkIf.isArray(newPlaceholder) && newPlaceholder.length === 2) {
        placeholder = newPlaceholder;
        setPholderRegEx();
      }
    }
  }
});

defaultOptions = {
  delay: false,
  throttle: false,
  simpleSelector: false,
  promiseTransforms: false,
  dispatchEvents: false,
  sendArrayCopies: false,
  updateEvenIfSame: false,
  updateOnBind: true
};

var defineProperty, genID, genObj, genProxiedInterface, genSelfUpdater, getDescriptor, setValueNoop;

defineProperty = Object.defineProperty;

getDescriptor = Object.getOwnPropertyDescriptor;

var cachedEvent, changeEvent;

cachedEvent = null;

changeEvent = function() {
  var event;
  if (!cachedEvent) {
    event = cachedEvent = document.createEvent('Event');
    event.initEvent('change', true, false);
    event._sb = true;
  }
  return cachedEvent;
};

;

var requiresDomDescriptorFix;

requiresDomDescriptorFix = (!('className' in Element.prototype)) || !getDescriptor(Element.prototype, 'className').get;

;

var windowPropsToIgnore;

windowPropsToIgnore = ['innerWidth', 'innerHeight', 'outerWidth', 'outerHeight', 'scrollX', 'scrollY', 'pageXOffset', 'pageYOffset', 'screenX', 'screenY', 'screenLeft', 'screenTop'];

;

setValueNoop = function(v, publisher) {
  return this.updateAllSubs(publisher || this);
};

genID = function() {
  return '' + (++currentID);
};

genObj = function() {
  return Object.create(null);
};

genProxiedInterface = function(isSub, completeCallback) {
  return function(subject, customOptions, saveOptions) {
    return SimplyBind(subject, customOptions, saveOptions, isSub, completeCallback);
  };
};

genSelfUpdater = function(binding, fetchValue) {
  return binding.selfUpdater || (binding.selfUpdater = new Binding(function() {
    if (fetchValue) {
      return binding.setValue(binding.fetchDirectValue(), binding, true);
    } else {
      return binding.updateAllSubs(binding);
    }
  }, 'Func', {}));
};

var checkIf, targetIncludes;

targetIncludes = function(target, item) {
  return target && target.indexOf(item) !== -1;
};

checkIf = {
  isDefined: function(subject) {
    return subject !== void 0;
  },
  isArray: function(subject) {
    return subject instanceof Array;
  },
  isObject: function(subject) {
    return typeof subject === 'object' && subject;
  },
  isString: function(subject) {
    return typeof subject === 'string';
  },
  isNumber: function(subject) {
    return typeof subject === 'number';
  },
  isFunction: function(subject) {
    return typeof subject === 'function';
  },
  isBindingInterface: function(subject) {
    return subject instanceof BindingInterface;
  },
  isBinding: function(subject) {
    return subject instanceof Binding;
  },
  isIterable: function(subject) {
    return checkIf.isObject(subject) && checkIf.isNumber(subject.length);
  },
  isDom: function(subject) {
    return subject.nodeName && subject.nodeType === 1;
  },
  isDomInput: function(subject) {
    var nodeName;
    nodeName = subject.nodeName;
    return nodeName === 'INPUT' || nodeName === 'TEXTAREA' || nodeName === 'SELECT';
  },
  isDomRadio: function(subject) {
    return subject.type === 'radio';
  },
  isDomCheckbox: function(subject) {
    return subject.type === 'checkbox';
  },
  isElCollection: function(subject) {
    return (subject instanceof NodeList) || (subject instanceof HTMLCollection) || (window.jQuery && subject instanceof jQuery);
  },
  domElsAreSame: function(iterable) {
    var itemsWithSameType, type;
    type = iterable[0].type;
    itemsWithSameType = [].filter.call(iterable, function(item) {
      return item.type === type;
    });
    return itemsWithSameType.length === iterable.length;
  },
  isDomNode: function(subject) {
    return checkIf.isDom(subject) || subject === window || subject === document;
  }
};

;

var convertToLive, convertToReg, fetchDescriptor;

fetchDescriptor = function(object, property, isProto) {
  var descriptor, objectProto;
  descriptor = getDescriptor(object, property);
  if (descriptor) {
    if (isProto) {
      descriptor.configurable = true;
    }
    return descriptor;
  } else if (objectProto = Object.getPrototypeOf(object)) {
    return fetchDescriptor(objectProto, property, true);
  }
};

convertToLive = function(bindingInstance, object, onlyArrayMethods) {
  var _, context, getterValue, origFn, propertyDescriptor, proxyFn, shouldIndicateUpdateIsFromSelf, shouldWriteLiveProp, slice, typeIsArray;
  _ = bindingInstance;
  if (!_.origDescriptor) {
    _.origDescriptor = fetchDescriptor(object, _.property);
  }
  if (onlyArrayMethods) {
    arrayMutatorMethods.forEach(function(method) {
      return defineProperty(object, method, {
        configurable: true,
        value: function() {
          var result;
          result = Array.prototype[method].apply(object, arguments);
          _.updateAllSubs(_);
          return result;
        }
      });
    });
  } else {
    if (_.type === 'Proxy') {
      origFn = _.origFn = _.value;
      context = object;
      _.value = {
        result: null,
        args: null
      };
      if (checkIf.isFunction(origFn)) {
        slice = [].slice;
        getterValue = proxyFn = function() {
          var args, result;
          args = slice.call(arguments);
          _.value.args = args = _.selfTransform ? _.selfTransform(args) : args;
          _.value.result = result = origFn.apply(context, args);
          _.updateAllSubs(_);
          return result;
        };
        defineProperty(object, _.property, {
          configurable: _.isLiveProp = true,
          get: function() {
            return getterValue;
          },
          set: function(newValue) {
            if (!checkIf.isFunction(newValue)) {
              getterValue = newValue;
            } else if (newValue !== origFn) {
              if (newValue !== proxyFn) {
                origFn = _.origFn = newValue;
              }
              if (getterValue !== proxyFn) {
                getterValue = proxyFn;
              }
            }
          }
        });
      }
    } else if (!targetIncludes(_.type, 'DOM') && !(_.object === window && targetIncludes(windowPropsToIgnore, _.property))) {
      propertyDescriptor = _.origDescriptor || dummyPropertyDescriptor;
      if (propertyDescriptor.get) {
        _.origGetter = propertyDescriptor.get.bind(object);
      }
      if (propertyDescriptor.set) {
        _.origSetter = propertyDescriptor.set.bind(object);
      }
      shouldWriteLiveProp = propertyDescriptor.configurable;
      shouldWriteLiveProp = shouldWriteLiveProp && object.constructor !== CSSStyleDeclaration;
      
      /**
       * There is a bug in webkit/blink engines in which native attributes/properties 
       * of DOM elements are not exposed on the element's prototype and instead is
       * exposed directly on the element instance; when looking up the property descriptor
       * of the element a data descriptor is returned instead of an accessor descriptor
       * (i.e. descriptor with getter/setter) which means we are not able to define our
       * own proxy getter/setters. This was fixed only in April 2015 in Chrome v43 and
       * Safari v10. Although we won't be able to get notified when the objects get
       * their values set, we would at least provide working functionality lacking update
       * listeners. Since v1.14.0 HTMLInputElement::value bindings invoke the original
       * getter and setter methods in Binding::setValue(), and since we want to avoid
       * increasing the amount of logic present in Binding::setValue() for performance
       * reasons, we patch those setters here. We clone the target element and check for
       * the existence of the target property - if it exists then it indicates the target
       * property is a native property (since only native properties are copied over in
       * Element::cloneNode). This patching is only for native properties.
       *
       * https://bugs.webkit.org/show_bug.cgi?id=49739
       * https://bugs.webkit.org/show_bug.cgi?id=75297
       * https://bugs.chromium.org/p/chromium/issues/detail?id=43394
       * https://bugs.chromium.org/p/chromium/issues/detail?id=431492
       * https://bugs.chromium.org/p/chromium/issues/detail?id=13175
       * https://developers.google.com/web/updates/2015/04/DOM-attributes-now-on-the-prototype-chain
       */
      var shouldWriteLiveProp;
      
      if (requiresDomDescriptorFix && _.isDom && _.property in object.cloneNode(false)) {
        _.origDescriptor = shouldWriteLiveProp = false;
        _.isLiveProp = true;
        _.origGetter = function() {
          return _.object[_.property];
        };
        _.origSetter = function(newValue) {
          return _.object[_.property] = newValue;
        };
      }
      
      ;
      if (shouldWriteLiveProp) {
        typeIsArray = _.type === 'Array';
        shouldIndicateUpdateIsFromSelf = !_.origSetter && !typeIsArray;
        defineProperty(object, _.property, {
          configurable: _.isLiveProp = true,
          enumerable: propertyDescriptor.enumerable,
          get: _.origGetter || function() {
            return _.value;
          },
          set: function(newValue) {
            _.setValue(newValue, _, shouldIndicateUpdateIsFromSelf);
          }
        });
        if (typeIsArray) {
          convertToLive(_, object[_.property], true);
        }
      }
    }
  }
};

convertToReg = function(bindingInstance, object, onlyArrayMethods) {
  var _, i, len, method, newDescriptor, results;
  if (onlyArrayMethods) {
    results = [];
    for (i = 0, len = arrayMutatorMethods.length; i < len; i++) {
      method = arrayMutatorMethods[i];
      results.push(delete object[method]);
    }
    return results;
  } else {
    _ = bindingInstance;
    newDescriptor = _.origDescriptor;
    if (!(newDescriptor.set || newDescriptor.get)) {
      newDescriptor.value = _.origFn || _.value;
    }
    return defineProperty(object, _.property, newDescriptor);
  }
};

;

var cloneObject, extendState;

cloneObject = function(object) {
  var clone, key;
  clone = genObj();
  for (key in object) {
    clone[key] = object[key];
  }
  return clone;
};

extendState = function(base, stateToInherit) {
  var i, key, len, stateMapping;
  stateMapping = Object.keys(stateToInherit);
  for (i = 0, len = stateMapping.length; i < len; i++) {
    key = stateMapping[i];
    base[key] = stateToInherit[key];
  }
};

;

var cache;

cache = {
  get: function(object, isFunction, selector, isMultiChoice) {
    var sampleItem;
    if (isFunction) {
      return boundInstances[object._sb_ID];
    } else {
      if (isMultiChoice && object[0]._sb_map) {
        sampleItem = boundInstances[object[0]._sb_map[selector]];
        if (sampleItem.groupBinding) {
          return sampleItem.groupBinding;
        }
      }
      if (object._sb_map && object._sb_map[selector]) {
        return boundInstances[object._sb_map[selector]];
      }
    }
  },
  set: function(B, isFunction) {
    var propsMap, selector;
    if (isFunction) {
      defineProperty(B.object, '_sb_ID', {
        'configurable': true,
        'value': B.ID
      });
    } else {
      selector = B.selector;
      if (B.object._sb_map) {
        B.object._sb_map[selector] = B.ID;
      } else {
        propsMap = {};
        propsMap[selector] = B.ID;
        defineProperty(B.object, '_sb_map', {
          'configurable': true,
          'value': propsMap
        });
      }
    }
  }
};

;

var addToNodeStore, applyPlaceholders, escapeRegEx, pholderRegEx, pholderRegExSplit, scanTextNodesPlaceholders, setPholderRegEx, textContent;

escapeRegEx = /[.*+?^${}()|[\]\\]/g;

pholderRegEx = pholderRegExSplit = null;

setPholderRegEx = function() {
  var end, middle, start;
  start = settings.placeholder[0].replace(escapeRegEx, '\\$&');
  end = settings.placeholder[1].replace(escapeRegEx, '\\$&');
  middle = "[^" + end + "]+";
  pholderRegEx = new RegExp(start + "(" + middle + ")" + end, 'g');
  pholderRegExSplit = new RegExp("" + start + middle + end, 'g');
};

setPholderRegEx();

applyPlaceholders = function(contexts, values, indexMap) {
  var contextPart, i, index, len, output;
  output = '';
  for (index = i = 0, len = contexts.length; i < len; index = ++i) {
    contextPart = contexts[index];
    output += contextPart;
    if (indexMap[index]) {
      output += values[indexMap[index]];
    }
  }
  return output;
};

textContent = 'textContent';

addToNodeStore = function(nodeStore, node, targetPlaceholder) {
  if (nodeStore[targetPlaceholder] == null) {
    nodeStore[targetPlaceholder] = [];
  }
  nodeStore[targetPlaceholder].push(node);
};

scanTextNodesPlaceholders = function(element, nodeStore) {
  var childNodes, i, index, j, len, len1, newFragment, newNode, node, textPiece, textPieces;
  childNodes = Array.prototype.slice.call(element.childNodes);
  for (i = 0, len = childNodes.length; i < len; i++) {
    node = childNodes[i];
    if (node.nodeType !== 3) {
      scanTextNodesPlaceholders(node, nodeStore);
    } else if (node[textContent].match(pholderRegExSplit)) {
      textPieces = node[textContent].split(pholderRegEx);
      if (textPieces.length === 3 && textPieces[0] + textPieces[2] === '') {
        addToNodeStore(nodeStore, node, textPieces[1]);
      } else {
        newFragment = document.createDocumentFragment();
        for (index = j = 0, len1 = textPieces.length; j < len1; index = ++j) {
          textPiece = textPieces[index];
          newNode = newFragment.appendChild(document.createTextNode(textPiece));
          if (index % 2) {
            addToNodeStore(nodeStore, newNode, textPiece);
          }
        }
        node.parentNode.replaceChild(newFragment, node);
      }
    }
  }
};

;

var getErrSource, throwError, throwErrorBadArg, throwWarning;

throwError = function(errorName) {
  throw new Error('SimplyBind: ' + (errors[errorName] || errorName));
};

throwWarning = function(warningName, depth) {
  var errSource, warn;
  if (!settings.silent) {
    errSource = getErrSource(depth);
    warn = errors[warningName];
    warn += "\n\n" + errSource;
    console.warn('SimplyBind: ' + warn);
  }
};

throwErrorBadArg = function(arg) {
  throwError("Invalid argument/s (" + arg + ")", true);
};

getErrSource = function(depth) {
  return ((new Error).stack || '').split('\n').slice(depth + 3).join('\n');
};

;

;

var errors;

errors = {
  invalidParamName: "SimplyBind() and .to() only accept a function, an array, a bound object, a string, or a number.",
  fnOnly: "Only functions are allowed for .transform/.condition/All()",
  badEventArg: "Invalid argument number in .ofEvent()",
  emptyList: "Empty collection provided",
  onlyOneDOMElement: "You can only pass a single DOM element to a binding",
  mixedElList: "'checked' of Mixed list of element cannot be bound"
};

;

;

var SimplyBind;

SimplyBind = function(subject, options, saveOptions, isSub, completeCallback) {
  var interfaceToReturn, newInterface;
  if ((!subject && subject !== 0) || (!checkIf.isString(subject) && !checkIf.isNumber(subject) && !checkIf.isFunction(subject) && !(subject instanceof Array))) {
    if (!checkIf.isBindingInterface(subject)) {
      throwError('invalidParamName');
    }
  }
  if (checkIf.isObject(subject) && !(subject instanceof Array)) {
    interfaceToReturn = completeCallback ? completeCallback(subject) : subject.selfClone();
  } else {
    newInterface = new BindingInterface(options);
    newInterface.saveOptions = saveOptions;
    newInterface.isSub = isSub;
    newInterface.completeCallback = completeCallback;
    if (checkIf.isFunction(subject)) {
      interfaceToReturn = newInterface.setObject(subject, true);
    } else {
      interfaceToReturn = newInterface.setProperty(subject);
    }
  }
  return interfaceToReturn;
};

SimplyBind.version = "1.15.8";

SimplyBind.settings = settings;

SimplyBind.defaultOptions = defaultOptions;

SimplyBind.unBindAll = function(object, bothWays) {
  var boundID, prop, propMap;
  if (object && (checkIf.isObject(object) || checkIf.isFunction(object))) {
    
    /**
     * Conditional Checks:
     *
     * 1) Make sure the subject object is iterable (and thus a possible candidate for being an element collection)
     * 2) Make sure the subject object isn't an array binding (since element collection objects don't get directly bound)
     * 3) Make sure the first element in the collection is a valid object (i.e. isn't undefined and isn't null)
     * 4) Make sure the first element is a DOM object
     */
    var object;
    
    if (checkIf.isIterable(object) && !object._sb_ID && object[0] && (checkIf.isDom(object[0]))) {
      object = object[0];
    }
    
    ;
    propMap = object._sb_map;
    if (object._sb_ID) {
      boundInstances[object._sb_ID].removeAllSubs(bothWays);
    }
    if (propMap) {
      for (prop in propMap) {
        boundID = propMap[prop];
        boundInstances[boundID].removeAllSubs(bothWays);
      }
    }
  }
};

;

;

var Binding;

Binding = function(object, type, state) {
  var parentBinding, parentProperty, subjectValue;
  extendState(this, state);
  this.optionsDefault = this.saveOptions ? this.options : defaultOptions;
  this.type = type;
  this.object = object;
  this.ID = genID();
  this.subs = [];
  this.subsMeta = genObj();
  this.pubsMap = genObj();
  this.attachedEvents = [];
  if (this.type === 'Proxy') {
    this.setValue = setValueNoop;
  }

  /* ========================================================================== */
  if (this.isMultiChoice) {
    this.choices = genObj();
    this.object.forEach((function(_this) {
      return function(choiceEl) {
        var choiceBinding;
        choiceBinding = _this.choices[choiceEl.value] = SimplyBind('checked').of(choiceEl)._;
        choiceBinding.addSub(_this);
        choiceBinding.subsMeta[_this.ID].transformFn = function() {
          return choiceBinding;
        };
        choiceBinding.groupBinding = _this;
      };
    })(this));
  }
  if (!(this.type === 'Event' || (this.type === 'Func' && this.isSub))) {
    if (this.type === 'Pholder') {
      parentProperty = this.descriptor && !targetIncludes(this.descriptor, 'multi') ? this.descriptor + ":" + this.property : this.property;
      parentBinding = this.parentBinding = SimplyBind(parentProperty).of(object)._;
      parentBinding.scanForPholders();
      this.value = parentBinding.pholderValues[this.pholder];
      if (parentBinding.textNodes) {
        this.textNodes = parentBinding.textNodes[this.pholder];
      }
    } else {
      this.value = subjectValue = this.fetchDirectValue();
      if (this.type === 'ObjectProp' && !checkIf.isDefined(subjectValue) && !getDescriptor(this.object, this.property)) {
        this.object[this.property] = subjectValue;
      }
      convertToLive(this, this.object);
    }
  }
  this.attachEvents();
  return boundInstances[this.ID] = this;
};

var eventUpdateHandler;

Binding.prototype = {
  addSub: function(sub, options, updateOnce, updateEvenIfSame) {
    var alreadyHadSub, j, len, metaData, ref, subItem;
    if (sub.isMulti) {
      ref = sub.bindings;
      for (j = 0, len = ref.length; j < len; j++) {
        subItem = ref[j];
        this.addSub(subItem, options, updateOnce, updateEvenIfSame);
      }
    } else {
      if (metaData = this.subsMeta[sub.ID]) {
        alreadyHadSub = true;
      } else {
        sub.pubsMap[this.ID] = this;
        this.subs.unshift(sub);
        metaData = this.subsMeta[sub.ID] = genObj();
        metaData.updateOnce = updateOnce;
        metaData.opts = cloneObject(options);
        if (updateEvenIfSame || this.type === 'Event' || this.type === 'Proxy' || this.type === 'Array') {
          metaData.opts.updateEvenIfSame = true;
        }
        metaData.valueRef = sub.type === 'Func' ? 'valuePassed' : 'value';
      }
    }
    return alreadyHadSub;
  },
  removeSub: function(sub, bothWays) {
    var j, len, ref, subItem;
    if (sub.isMulti) {
      ref = sub.bindings;
      for (j = 0, len = ref.length; j < len; j++) {
        subItem = ref[j];
        this.removeSub(subItem, bothWays);
      }
    } else {
      if (this.subsMeta[sub.ID]) {
        this.subs.splice(this.subs.indexOf(sub), 1);
        delete this.subsMeta[sub.ID];
        delete sub.pubsMap[this.ID];
      }
      if (bothWays) {
        sub.removeSub(this);
        delete this.pubsMap[sub.ID];
      }
    }
    if (this.subs.length === 0 && Object.keys(this.pubsMap).length === 0) {
      this.destroy();
    }
  },
  removeAllSubs: function(bothWays) {
    var j, len, ref, sub;
    ref = this.subs.slice();
    for (j = 0, len = ref.length; j < len; j++) {
      sub = ref[j];
      this.removeSub(sub, bothWays);
    }
  },
  destroy: function() {
    var event, j, len, ref;
    delete boundInstances[this.ID];
    this.removePollInterval();
    if (this.type === 'Event') {
      ref = this.attachedEvents;
      for (j = 0, len = ref.length; j < len; j++) {
        event = ref[j];
        this.unRegisterEvent(event);
      }
    } else if (this.type === 'Func') {
      delete this.object._sb_ID;
    }

    /* istanbul ignore next */
    if (this.isLiveProp && this.origDescriptor) {
      convertToReg(this, this.object);
    }
    if (this.type === 'Array') {
      convertToReg(this, this.value, true);
    }
    if (this.object._sb_map) {
      delete this.object._sb_map[this.selector];
      if (Object.keys(this.object._sb_map).length === 0) {
        delete this.object._sb_map;
      }
    }
  },
  fetchDirectValue: function() {
    var choiceEl, choiceName, ref, results, type;
    type = this.type;
    switch (false) {
      case type !== 'Func':
        return this.object();
      case type !== 'DOMAttr':
        return this.object.getAttribute(this.property) || '';
      case !this.isMultiChoice:
        results = [];
        ref = this.choices;
        for (choiceName in ref) {
          choiceEl = ref[choiceName];
          if (choiceEl.object.checked) {
            if (type === 'DOMRadio') {
              return choiceName;
            } else {
              results.push(choiceName);
            }
          }
        }
        return results;
      default:
        return this.object[this.property];
    }
  },
  setValue: function(newValue, publisher, fromSelf, fromChangeEvent) {
    var choiceBinding, choiceName, entireValue, index, j, k, len, len1, n, newChoiceValue, newChoices, newValueArray, overwritePrevious, parent, prevCursror, prevValue, ref, ref1, ref2, targetChoiceBinding, textNode, value;
    publisher || (publisher = this);
    if (this.selfTransform) {
      newValue = this.selfTransform(newValue);
    }
    if (!fromSelf) {
      switch (this.type) {
        case 'ObjectProp':
          if (!this.isLiveProp) {
            if (newValue !== this.value) {
              this.object[this.property] = newValue;
            }
          } else if (this.isDomInput) {
            if (!fromChangeEvent) {
              this.origSetter(newValue);
              if (settings.dispatchEvents) {
                this.object.dispatchEvent(changeEvent());
              }
            } else if (newValue !== this.origGetter()) {
              prevCursror = this.object.selectionStart;
              this.origSetter(newValue);
              if (prevCursror) {
                this.object.setSelectionRange(prevCursror, prevCursror);
              }
            }
          } else if (this.origSetter) {
            this.origSetter(newValue);
          }
          break;
        case 'Pholder':
          parent = this.parentBinding;
          parent.pholderValues[this.pholder] = newValue;
          entireValue = applyPlaceholders(parent.pholderContexts, parent.pholderValues, parent.pholderIndexMap);
          if (this.textNodes && newValue !== this.value) {
            ref = this.textNodes;
            for (j = 0, len = ref.length; j < len; j++) {
              textNode = ref[j];
              textNode[textContent] = newValue;
            }
          }
          if (this.property !== textContent) {
            parent.setValue(entireValue, publisher);
          }
          break;
        case 'Array':
          if (newValue !== this.value) {
            if (!checkIf.isArray(newValue)) {
              newValue = Array.prototype.concat(newValue);
            }
            convertToReg(this, this.value, true);
            convertToLive(this, newValue = newValue.slice(), true);
            if (this.origSetter) {
              this.origSetter(newValue);
            }
          }
          break;
        case 'Func':
          prevValue = this.valuePassed;
          this.valuePassed = newValue;
          newValue = this.object(newValue, prevValue);
          break;
        case 'Event':
          this.isEmitter = true;
          this.emitEvent(newValue);
          this.isEmitter = false;
          break;
        case 'DOMRadio':
          if (this.isMultiChoice) {
            targetChoiceBinding = checkIf.isBinding(newValue) ? newValue : this.choices[newValue];
            if (targetChoiceBinding) {
              newValue = targetChoiceBinding.object.value;
              ref1 = this.choices;
              for (n in ref1) {
                choiceBinding = ref1[n];
                choiceBinding.setValue(choiceBinding.ID === targetChoiceBinding.ID, publisher);
              }
            } else {
              newValue = this.value;
            }
          } else {
            newValue = !!newValue;
            if (newValue === this.value) {
              return;
            }
            if (this.object.checked !== newValue) {
              this.object.checked = newValue;
            }
            if (newValue && settings.dispatchEvents) {
              this.object.dispatchEvent(changeEvent());
            }
          }
          break;
        case 'DOMCheckbox':
          if (this.isMultiChoice) {
            overwritePrevious = !checkIf.isBinding(newValue);
            newChoices = [].concat(newValue);
            for (index = k = 0, len1 = newChoices.length; k < len1; index = ++k) {
              value = newChoices[index];
              newChoices[index] = checkIf.isBinding(value) ? value : this.choices[value];
            }
            newValueArray = [];
            ref2 = this.choices;
            for (choiceName in ref2) {
              choiceBinding = ref2[choiceName];
              if (overwritePrevious) {
                newChoiceValue = targetIncludes(newChoices, choiceBinding);
              } else {
                newChoiceValue = choiceBinding.value;
              }
              choiceBinding.setValue(newChoiceValue, publisher);
              if (newChoiceValue) {
                newValueArray.push(choiceName);
              }
            }
            newValue = newValueArray;
          } else {
            newValue = !!newValue;
            if (newValue === this.value) {
              return;
            }
            if (this.object.checked !== newValue) {
              this.object.checked = newValue;
              if (settings.dispatchEvents) {
                this.object.dispatchEvent(changeEvent());
              }
            }
          }
          break;
        case 'DOMAttr':
          this.object.setAttribute(this.property, newValue);
      }
    }
    this.value = newValue;
    this.updateAllSubs(publisher);
  },
  updateAllSubs: function(publisher) {
    var arr, i;
    if (i = (arr = this.subs).length) {
      while (i--) {
        this.updateSub(arr[i], publisher);
      }
    }
  },
  updateSub: function(sub, publisher, isDelayedUpdate) {
    var currentTime, meta, newValue, subValue, timePassed, transform;
    if ((publisher === sub) || (publisher !== this && publisher.subsMeta[sub.ID])) {
      return;
    }
    meta = this.subsMeta[sub.ID];
    if (meta.disallowList && meta.disallowList[publisher.ID]) {
      return;
    }
    if (meta.opts.throttle) {
      currentTime = +(new Date);
      timePassed = currentTime - meta.lastUpdate;
      if (timePassed < meta.opts.throttle) {
        clearTimeout(meta.updateTimer);
        return meta.updateTimer = setTimeout((function(_this) {
          return function() {
            if (_this.subsMeta[sub.ID]) {
              return _this.updateSub(sub, publisher);
            }
          };
        })(this), meta.opts.throttle - timePassed);
      } else {
        meta.lastUpdate = currentTime;
      }
    } else if (meta.opts.delay && !isDelayedUpdate) {
      return setTimeout((function(_this) {
        return function() {
          if (_this.subsMeta[sub.ID]) {
            return _this.updateSub(sub, publisher, true);
          }
        };
      })(this), meta.opts.delay);
    }
    newValue = this.type === 'Array' && meta.opts.sendArrayCopies ? this.value.slice() : this.value;
    subValue = sub[meta.valueRef];
    newValue = (transform = meta.transformFn) ? transform(newValue, subValue, sub.object) : newValue;
    if (newValue === subValue && !meta.opts.updateEvenIfSame || meta.conditionFn && !meta.conditionFn(newValue, subValue, sub.object)) {
      return;
    }
    if (meta.opts.promiseTransforms && newValue && checkIf.isFunction(newValue.then)) {
      newValue.then(function(newValue) {
        sub.setValue(newValue, publisher);
      });
    } else {
      sub.setValue(newValue, publisher);
    }
    if (meta.updateOnce) {
      this.removeSub(sub);
    }
  },
  addModifierFn: function(target, subInterfaces, subjectFn, updateOnBind) {
    var base, j, len, subInterface, subMetaData, subscriber;
    if (!checkIf.isFunction(subjectFn)) {
      return throwWarning('fnOnly', 2);
    } else {
      for (j = 0, len = subInterfaces.length; j < len; j++) {
        subInterface = subInterfaces[j];
        subscriber = subInterface._ || subInterface;
        if (subscriber.isMulti) {
          this.addModifierFn(target, subscriber.bindings, subjectFn, updateOnBind);
        } else {
          subMetaData = this.subsMeta[subscriber.ID];
          subMetaData[target] = subjectFn;
          updateOnBind = updateOnBind && !subMetaData.updateOnce;
          if (this.pubsMap[subscriber.ID]) {
            (base = subscriber.subsMeta[this.ID])[target] || (base[target] = subjectFn);
          }
          if ((updateOnBind || this.type === 'Func') && target === 'transformFn') {
            this.updateSub(subscriber, this);
          }
        }
      }
      return true;
    }
  },
  setSelfTransform: function(transformFn, updateOnBind) {
    this.selfTransform = transformFn;
    if (updateOnBind) {
      this.setValue(this.value);
    }
  },
  addDisallowRule: function(targetSub, targetDisallow) {
    var base, disallowList;
    disallowList = (base = this.subsMeta[targetSub.ID]).disallowList != null ? base.disallowList : base.disallowList = genObj();
    disallowList[targetDisallow.ID] = 1;
  },
  scanForPholders: function() {
    var index;
    if (!this.pholderValues) {
      this.pholderValues = genObj();
      this.pholderIndexMap = genObj();
      this.pholderContexts = [];
      if (checkIf.isString(this.value)) {
        this.pholderContexts = this.value.split(pholderRegExSplit);
        index = 0;
        this.value = this.value.replace(pholderRegEx, (function(_this) {
          return function(e, pholder) {
            _this.pholderIndexMap[index++] = pholder;
            return _this.pholderValues[pholder] = pholder;
          };
        })(this));
      }
      if (this.isDom && this.property === textContent) {
        scanTextNodesPlaceholders(this.object, this.textNodes = genObj());
      }
    }
  },
  addPollInterval: function(time) {
    if (this.type !== 'Event') {
      this.removePollInterval();
      return this.pollInterval = setInterval((function(_this) {
        return function() {
          var polledValue;
          polledValue = _this.fetchDirectValue();
          return _this.setValue(polledValue, _this, true);
        };
      })(this), time);
    }
  },
  removePollInterval: function() {
    clearInterval(this.pollInterval);
    return this.pollInterval = null;
  },
  addUpdateListener: function(eventName, targetProperty) {
    this.object.addEventListener(eventName, (function(_this) {
      return function(event) {
        var shouldRedefineValue;
        if (!event._sb) {
          shouldRedefineValue = _this.selfTransform && _this.isDomInput;
          _this.setValue(_this.object[targetProperty], null, !shouldRedefineValue, true);
        }
      };
    })(this), false);
  },
  attachEvents: function() {
    if (this.eventName) {
      this.registerEvent(this.eventName);
    } else if (this.isDomInput) {
      this.addUpdateListener('input', 'value');
      this.addUpdateListener('change', 'value');
    } else if (!this.isMultiChoice && (this.type === 'DOMRadio' || this.type === 'DOMCheckbox')) {
      this.addUpdateListener('change', 'checked');
    }
  },
  registerEvent: function(eventName) {
    this.attachedEvents.push(eventName);
    if (!this.eventHandler) {
      this.eventHandler = eventUpdateHandler.bind(this);
    }
    this.object[this.eventMethods.listen](eventName, this.eventHandler);
  },
  unRegisterEvent: function(eventName) {
    this.attachedEvents.splice(this.attachedEvents.indexOf(eventName), 1);
    this.object[this.eventMethods.remove](eventName, this.eventHandler);
  },
  emitEvent: function(extraData) {
    var eventObject;
    eventObject = this.eventName;
    if (this.eventMethods.emit === 'dispatchEvent') {
      if (!this.eventObject) {
        this.eventObject = document.createEvent('Event');
        this.eventObject.initEvent(this.eventName, true, true);
      }
      this.eventObject.bindingData = extraData;
      eventObject = this.eventObject;
    }
    this.object[this.eventMethods.emit](eventObject, extraData);
  }
};

eventUpdateHandler = function() {
  if (!this.isEmitter) {
    this.setValue(arguments[this.property], null, true);
  }
};

;

;


/**
 * Stage definitions:
 * 
 * 0: Selection:			Got selector, awaiting object.
 * 1: Indication:			Got object, awaiting proxied property / function / Binding-object.
 * 2: Binding Complete:		Complete, awaiting additional (optional) bindings/mutations.
 */
var BindingInterface;

BindingInterface = function(options, inheritedState) {
  var key;
  if (inheritedState) {
    extendState(this, inheritedState);
    this.stage = 1;
  } else {
    this.stage = 0;
    this.subs = [];
    this.optionsPassed = options || (options = {});
    this.options = {};
    for (key in defaultOptions) {
      this.options[key] = options[key] != null ? options[key] : defaultOptions[key];
    }
  }
  return this;
};

var BindingInterfacePrivate;

BindingInterfacePrivate = {
  selfClone: function() {
    return new BindingInterface(null, this);
  },
  defineMainProps: function(binding) {
    this._ = binding;
    return Object.defineProperties(this, {
      'value': {
        get: function() {
          return binding.value;
        }
      },
      'original': {
        get: function() {
          return binding.objects || binding.object;
        }
      },
      'subscribers': {
        get: function() {
          return binding.subs.slice().map(function(sub) {
            return sub.object;
          });
        }
      }
    });
  },
  createBinding: function(subject, newObjectType, bindingInterface, isFunction) {
    var cachedBinding, newBinding;
    this.object = subject;
    cachedBinding = cache.get(subject, isFunction, this.selector, this.isMultiChoice);
    if (cachedBinding) {
      return this.patchCachedBinding(cachedBinding);
    } else {
      newBinding = new Binding(subject, newObjectType, bindingInterface);
      cache.set(newBinding, isFunction);
      return newBinding;
    }
  },
  patchCachedBinding: function(cachedBinding) {
    var key, option, ref, ref1, value;
    if (cachedBinding.type === 'ObjectProp' && !(this.property in this.object)) {
      convertToLive(cachedBinding, this.object);
    }
    if (this.saveOptions) {
      ref = this.optionsPassed;
      for (option in ref) {
        value = ref[option];
        cachedBinding.optionsDefault[option] = value;
      }
    }
    ref1 = cachedBinding.optionsDefault;
    for (key in ref1) {
      value = ref1[key];
      this.options[key] = checkIf.isDefined(this.optionsPassed[key]) ? this.optionsPassed[key] : value;
    }
    return cachedBinding;
  },
  setProperty: function(subject) {
    var split;
    if (checkIf.isNumber(subject)) {
      subject = subject.toString();
    }
    this.selector = this.property = subject;
    if (!this.options.simpleSelector) {
      if (targetIncludes(subject, ':')) {
        split = subject.split(':');
        this.descriptor = split.slice(0, -1).join(':');
        this.property = split[split.length - 1];
      }
      if (targetIncludes(subject, '.')) {
        split = this.property.split('.');
        this.property = split[0];
        this.pholder = split.slice(1).join('.');
      }
      if (targetIncludes(this.descriptor, 'event')) {
        if (targetIncludes(subject, '#')) {
          split = this.property.split('#');
          this.eventName = split[0];
          this.property = split[1];
        } else {
          this.eventName = this.property;
          this.property = 0;
        }
        if (isNaN(parseInt(this.property))) {
          throwWarning('badEventArg', 1);
        }
      }
    }
    return this;
  },
  setObject: function(subject, isFunction) {
    var newObjectType;
    this.stage = 1;
    var isDomCheckbox, isDomRadio, isIterable, sampleItem, subject;
    
    isIterable = subject !== window && checkIf.isIterable(subject) && !subject.nodeType;
    
    sampleItem = isIterable ? subject[0] : subject;
    
    if (!sampleItem) {
      if (isIterable && checkIf.isElCollection(subject)) {
        throwError('emptyList');
      }
    } else if (this.isDom = checkIf.isDom(sampleItem)) {
      if (this.property === 'checked') {
        isDomRadio = sampleItem && checkIf.isDomRadio(sampleItem);
        isDomCheckbox = !isDomRadio && sampleItem && checkIf.isDomCheckbox(sampleItem);
      } else if (this.property === 'value') {
        this.isDomInput = checkIf.isDomInput(sampleItem);
      }
      if (isIterable && !targetIncludes(this.descriptor, 'multi')) {
        if (subject.length === 1) {
          subject = subject[0];
        } else {
          if ((isDomRadio || isDomCheckbox) && !checkIf.domElsAreSame(subject)) {
            return throwWarning('mixedElList', 3);
          } else {
            if (isDomRadio || isDomCheckbox) {
              this.isMultiChoice = true;
              subject = [].slice.call(subject);
            } else {
              subject = subject[0];
              throwWarning('onlyOneDOMElement', 3);
            }
          }
        }
      }
    }
    
    ;
    switch (false) {
      case !isFunction:
        newObjectType = 'Func';
        break;
      case !this.pholder:
        newObjectType = 'Pholder';
        break;
      case !(targetIncludes(this.descriptor, 'array') && checkIf.isArray(subject[this.property])):
        newObjectType = 'Array';
        break;
      case !targetIncludes(this.descriptor, 'event'):
        newObjectType = 'Event';
        this.eventMethods = {
          listen: this.optionsPassed.listenMethod,
          remove: this.optionsPassed.removeMethod,
          emit: this.optionsPassed.emitMethod
        };
        
        if (!subject[this.eventMethods.listen]) {
          this.eventMethods.listen = checkIf.isDomNode(subject) ? 'addEventListener' : 'on';
        }
        
        if (!subject[this.eventMethods.remove]) {
          this.eventMethods.remove = checkIf.isDomNode(subject) ? 'removeEventListener' : 'removeListener';
        }
        
        if (!subject[this.eventMethods.emit]) {
          this.eventMethods.emit = checkIf.isDomNode(subject) ? 'dispatchEvent' : 'emit';
        }
        
        ;
        break;
      case !targetIncludes(this.descriptor, 'func'):
        newObjectType = 'Proxy';
        break;
      case !isDomRadio:
        newObjectType = 'DOMRadio';
        break;
      case !isDomCheckbox:
        newObjectType = 'DOMCheckbox';
        break;
      case !targetIncludes(this.descriptor, 'attr'):
        newObjectType = 'DOMAttr';
        break;
      default:
        newObjectType = 'ObjectProp';
    }
    if (targetIncludes(this.descriptor, 'multi')) {
      if (!subject.length) {
        throwError('emptyList');
      }
      this.defineMainProps(new GroupBinding(this, subject, newObjectType));
    } else {
      this.defineMainProps(this.createBinding(subject, newObjectType, this, isFunction));
    }
    if (targetIncludes(this._.type, 'Event') || targetIncludes(this._.type, 'Proxy')) {
      this.options.updateOnBind = false;
    } else if (targetIncludes(this._.type, 'Func')) {
      this.options.updateOnBind = true;
    }
    if (this.completeCallback) {
      return this.completeCallback(this);
    } else {
      return this;
    }
  },
  addToPublisher: function(publisherInterface) {
    var alreadyHadSub, binding, i, len, ref;
    publisherInterface.stage = 2;
    publisherInterface.subs.push(this);
    alreadyHadSub = publisherInterface._.addSub(this._, publisherInterface.options, publisherInterface.updateOnce);
    if (publisherInterface.updateOnce) {
      delete publisherInterface.updateOnce;
    } else if (publisherInterface.options.updateOnBind && !alreadyHadSub) {
      if (this._.isMulti) {
        ref = this._.bindings;
        for (i = 0, len = ref.length; i < len; i++) {
          binding = ref[i];
          publisherInterface._.updateSub(binding, publisherInterface._);
        }
      } else {
        publisherInterface._.updateSub(this._, publisherInterface._);
      }
    }
  }
};

;

var METHOD_bothWays, METHOD_chainTo, METHOD_condition, METHOD_conditionAll, METHOD_of, METHOD_pollEvery, METHOD_set, METHOD_setOption, METHOD_stopPolling, METHOD_transform, METHOD_transformAll, METHOD_transformSelf, METHOD_unBind;

BindingInterface.prototype = Object.create(BindingInterfacePrivate, {
  of: {
    get: function() {
      if (!this.stage) {
        return METHOD_of;
      }
    }
  },
  set: {
    get: function() {
      if (this.stage) {
        return METHOD_set;
      }
    }
  },
  chainTo: {
    get: function() {
      if (this.stage === 2) {
        return METHOD_chainTo;
      }
    }
  },
  transformSelf: {
    get: function() {
      if (this.stage === 1) {
        return METHOD_transformSelf;
      }
    }
  },
  transform: {
    get: function() {
      if (this.stage === 2) {
        return METHOD_transform;
      }
    }
  },
  transformAll: {
    get: function() {
      if (this.stage === 2) {
        return METHOD_transformAll;
      }
    }
  },
  condition: {
    get: function() {
      if (this.stage === 2) {
        return METHOD_condition;
      }
    }
  },
  conditionAll: {
    get: function() {
      if (this.stage === 2) {
        return METHOD_conditionAll;
      }
    }
  },
  bothWays: {
    get: function() {
      if (this.stage === 2) {
        return METHOD_bothWays;
      }
    }
  },
  unBind: {
    get: function() {
      if (this.stage === 2) {
        return METHOD_unBind;
      }
    }
  },
  pollEvery: {
    get: function() {
      if (this.stage) {
        return METHOD_pollEvery;
      }
    }
  },
  stopPolling: {
    get: function() {
      if (this.stage) {
        return METHOD_stopPolling;
      }
    }
  },
  setOption: {
    get: function() {
      if (this.stage === 2) {
        return METHOD_setOption;
      }
    }
  },
  disallowFrom: {
    get: function() {
      var thisInterface;
      if (this.stage === 2 && (thisInterface = this)) {
        return genProxiedInterface(false, function(disallowInterface) {
          var subInterface;
          subInterface = thisInterface.subs[thisInterface.subs.length - 1];
          thisInterface._.addDisallowRule(subInterface._, disallowInterface._);
          return thisInterface;
        });
      }
    }
  },
  updateOn: {
    get: function() {
      var thisInterface;
      if (this.stage && (thisInterface = this)) {
        return genProxiedInterface(false, function(subInterface) {
          if (subInterface._ !== thisInterface._) {
            thisInterface._.pubsMap[subInterface._.ID] = subInterface._;
            subInterface._.addSub(genSelfUpdater(thisInterface._, true), subInterface.options, false, true);
          }
          return thisInterface;
        });
      }
    }
  },
  removeUpdater: {
    get: function() {
      var selfUpdater, thisInterface;
      if (this.stage && (thisInterface = this) && (selfUpdater = this._.selfUpdater)) {
        return genProxiedInterface(false, function(subInterface) {
          if (subInterface._.subsMeta[selfUpdater.ID]) {
            delete thisInterface._.pubsMap[subInterface._.ID];
            subInterface._.removeSub(selfUpdater);
          }
        });
      }
    }
  },
  to: {
    get: function() {
      var thisInterface;
      if (this.stage === 1 && (thisInterface = this)) {
        return genProxiedInterface(true, function(subInterface) {
          if (subInterface._ !== thisInterface._) {
            subInterface.addToPublisher(thisInterface);
          }
          return thisInterface;
        });
      }
    }
  },
  and: {
    get: function() {
      var cloneBinding, cloneInterface;
      cloneInterface = this.selfClone();
      if (this.stage === 2) {
        return cloneInterface;
      } else if (this.stage === 1) {
        if (!cloneInterface._.isMulti) {
          cloneBinding = cloneInterface._;
          cloneInterface._ = cloneInterface._ = new GroupBinding(cloneInterface);
          cloneInterface._.addBinding(cloneBinding);
        }
        return genProxiedInterface(false, function(siblingInterface) {
          cloneInterface._.addBinding(siblingInterface._);
          return cloneInterface;
        });
      }
    }
  },
  once: {
    get: function() {
      var interfaceToReturn;
      if (this.stage === 1) {
        interfaceToReturn = this.selfClone();
        interfaceToReturn.updateOnce = true;
        return interfaceToReturn;
      }
    }
  },
  update: {
    get: function() {
      return this.set;
    }
  },
  twoWay: {
    get: function() {
      return this.bothWays;
    }
  },
  pipe: {
    get: function() {
      return this.chainTo;
    }
  }
});

METHOD_of = function(object) {
  if (!(checkIf.isObject(object) || checkIf.isFunction(object))) {
    throwErrorBadArg(object);
  }
  if (checkIf.isBindingInterface(object)) {
    object = object.object;
  }
  this.stage = 1;
  return this.setObject(object);
};

METHOD_chainTo = function(subject, specificOptions, saveOptions) {
  return SimplyBind(this.subs[this.subs.length - 1]).to(subject, specificOptions, saveOptions);
};

METHOD_set = function(newValue) {
  this._.setValue(newValue);
  return this;
};

METHOD_transformSelf = function(transformFn) {
  if (!checkIf.isFunction(transformFn)) {
    throwWarning('fnOnly', 1);
  } else {
    this._.setSelfTransform(transformFn, this.options.updateOnBind);
  }
  return this;
};

METHOD_transform = function(transformFn) {
  this._.addModifierFn('transformFn', this.subs.slice(-1), transformFn, this.options.updateOnBind);
  return this;
};

METHOD_transformAll = function(transformFn) {
  this._.addModifierFn('transformFn', this.subs, transformFn, this.options.updateOnBind);
  return this;
};

METHOD_condition = function(conditionFn) {
  this._.addModifierFn('conditionFn', this.subs.slice(-1), conditionFn);
  return this;
};

METHOD_conditionAll = function(conditionFn) {
  this._.addModifierFn('conditionFn', this.subs, conditionFn);
  return this;
};

METHOD_bothWays = function(altTransform) {
  var binding, bindings, i, len, originCondition, originTransform, sub, subBinding, transformToUse;
  sub = this.subs[this.subs.length - 1];
  subBinding = sub._;
  bindings = this._.isMulti ? this._.bindings : [this._];
  subBinding.addSub(this._, sub.options);
  for (i = 0, len = bindings.length; i < len; i++) {
    binding = bindings[i];
    originTransform = binding.subsMeta[subBinding.ID].transformFn;
    originCondition = binding.subsMeta[subBinding.ID].conditionFn;
    if (originTransform || altTransform) {
      transformToUse = checkIf.isFunction(altTransform) ? altTransform : originTransform;
      if (transformToUse && altTransform !== false) {
        subBinding.subsMeta[this._.ID].transformFn = transformToUse;
      }
    }
    if (originCondition) {
      subBinding.subsMeta[this._.ID].conditionFn = originCondition;
    }
  }
  return this;
};

METHOD_unBind = function(bothWays) {
  var i, len, ref, sub;
  ref = this.subs;
  for (i = 0, len = ref.length; i < len; i++) {
    sub = ref[i];
    this._.removeSub(sub._, bothWays);
  }
  return this;
};

METHOD_pollEvery = function(time) {
  this._.addPollInterval(time);
  return this;
};

METHOD_stopPolling = function() {
  this._.removePollInterval();
  return this;
};

METHOD_setOption = function(optionName, newValue) {
  this._.subsMeta[this.subs[this.subs.length - 1]._.ID].opts[optionName] = newValue;
  return this;
};

;

;

var GroupBinding, proto;

GroupBinding = function(bindingInterface, objects, objectType) {
  var bindings, i, len, object;
  bindingInterface.selector = bindingInterface.selector.slice(6);
  extendState(this, this["interface"] = bindingInterface);
  this.isMulti = true;
  this.bindings = bindings = [];
  if (objects) {
    for (i = 0, len = objects.length; i < len; i++) {
      object = objects[i];
      this.addBinding(object, objectType);
    }
  }
  return Object.defineProperties(this, {
    'type': {
      get: function() {
        return bindings.map(function(binding) {
          return binding.type;
        });
      }
    },
    'value': {
      get: function() {
        return bindings.map(function(binding) {
          return binding.value;
        });
      }
    }
  });
};

proto = GroupBinding.prototype = Object.create(BindingInterfacePrivate);

Object.keys(Binding.prototype).forEach(function(methodName) {
  return proto[methodName] = function(a, b, c, d) {
    var binding, i, len, ref;
    ref = this.bindings;
    for (i = 0, len = ref.length; i < len; i++) {
      binding = ref[i];
      if (methodName === 'updateSub') {
        b = binding;
      }
      binding[methodName](a, b, c, d);
    }
  };
});

proto.addBinding = function(object, objectType) {
  this.bindings.push(!objectType ? object : this.createBinding(object, objectType, this["interface"]));
};

;

module.exports = SimplyBind;

;
return module.exports;
},
13: function (require, module, exports) {
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
        pointValue = humanize.formatNumber(point.y, 0) || 0;
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
6: function (require, module, exports) {
/* humanize.js - v1.8.2 */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/**
 * Copyright 2013-2016 HubSpotDev
 * MIT Licensed
 *
 * @module humanize.js
 */

(function (root, factory) {
  if ((typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], function () {
      return root.Humanize = factory();
    });
  } else {
    root.Humanize = factory();
  }
})(this, function () {
  //------------------------------------------------------------------------------
  // Constants
  //------------------------------------------------------------------------------

  var TIME_FORMATS = [{
    name: 'second',
    value: 1e3
  }, {
    name: 'minute',
    value: 6e4
  }, {
    name: 'hour',
    value: 36e5
  }, {
    name: 'day',
    value: 864e5
  }, {
    name: 'week',
    value: 6048e5
  }];

  var LABELS_FOR_POWERS_OF_KILO = {
    P: Math.pow(2, 50),
    T: Math.pow(2, 40),
    G: Math.pow(2, 30),
    M: Math.pow(2, 20)
  };

  //------------------------------------------------------------------------------
  // Helpers
  //------------------------------------------------------------------------------

  var exists = function exists(maybe) {
    return typeof maybe !== 'undefined' && maybe !== null;
  };

  var isNaN = function isNaN(value) {
    return value !== value;
  }; // eslint-disable-line

  var isFiniteNumber = function isFiniteNumber(value) {
    return isFinite(value) && !isNaN(parseFloat(value));
  };

  var isArray = function isArray(value) {
    var type = Object.prototype.toString.call(value);
    return type === '[object Array]';
  };

  //------------------------------------------------------------------------------
  // Humanize
  //------------------------------------------------------------------------------

  var Humanize = {

    // Converts a large integer to a friendly text representation.

    intword: function intword(number, charWidth) {
      var decimals = arguments.length <= 2 || arguments[2] === undefined ? 2 : arguments[2];

      /*
      * This method is deprecated. Please use compactInteger instead.
      * intword will be going away in the next major version.
      */
      return Humanize.compactInteger(number, decimals);
    },


    // Converts an integer into its most compact representation
    compactInteger: function compactInteger(input) {
      var decimals = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      decimals = Math.max(decimals, 0);
      var number = parseInt(input, 10);
      var signString = number < 0 ? '-' : '';
      var unsignedNumber = Math.abs(number);
      var unsignedNumberString = String(unsignedNumber);
      var numberLength = unsignedNumberString.length;
      var numberLengths = [13, 10, 7, 4];
      var bigNumPrefixes = ['T', 'B', 'M', 'k'];

      // small numbers
      if (unsignedNumber < 1000) {
        return '' + signString + unsignedNumberString;
      }

      // really big numbers
      if (numberLength > numberLengths[0] + 3) {
        return number.toExponential(decimals).replace('e+', 'x10^');
      }

      // 999 < unsignedNumber < 999,999,999,999,999
      var length = void 0;
      for (var i = 0; i < numberLengths.length; i++) {
        var _length = numberLengths[i];
        if (numberLength >= _length) {
          length = _length;
          break;
        }
      }

      var decimalIndex = numberLength - length + 1;
      var unsignedNumberCharacterArray = unsignedNumberString.split('');

      var wholePartArray = unsignedNumberCharacterArray.slice(0, decimalIndex);
      var decimalPartArray = unsignedNumberCharacterArray.slice(decimalIndex, decimalIndex + decimals + 1);

      var wholePart = wholePartArray.join('');

      // pad decimalPart if necessary
      var decimalPart = decimalPartArray.join('');
      if (decimalPart.length < decimals) {
        decimalPart += '' + Array(decimals - decimalPart.length + 1).join('0');
      }

      var output = void 0;
      if (decimals === 0) {
        output = '' + signString + wholePart + bigNumPrefixes[numberLengths.indexOf(length)];
      } else {
        var outputNumber = Number(wholePart + '.' + decimalPart).toFixed(decimals);
        output = '' + signString + outputNumber + bigNumPrefixes[numberLengths.indexOf(length)];
      }

      return output;
    },


    // Converts an integer to a string containing commas every three digits.
    intComma: function intComma(number) {
      var decimals = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      return Humanize.formatNumber(number, decimals);
    },
    intcomma: function intcomma() {
      return Humanize.intComma.apply(Humanize, arguments);
    },


    // Formats the value like a 'human-readable' file size (i.e. '13 KB', '4.1 MB', '102 bytes', etc).
    fileSize: function fileSize(filesize) {
      var precision = arguments.length <= 1 || arguments[1] === undefined ? 2 : arguments[1];

      for (var label in LABELS_FOR_POWERS_OF_KILO) {
        if (LABELS_FOR_POWERS_OF_KILO.hasOwnProperty(label)) {
          var minnum = LABELS_FOR_POWERS_OF_KILO[label];
          if (filesize >= minnum) {
            return Humanize.formatNumber(filesize / minnum, precision, '') + ' ' + label + 'B';
          }
        }
      }
      if (filesize >= 1024) {
        return Humanize.formatNumber(filesize / 1024, 0) + ' KB';
      }

      return Humanize.formatNumber(filesize, 0) + Humanize.pluralize(filesize, ' byte');
    },
    filesize: function filesize() {
      return Humanize.fileSize.apply(Humanize, arguments);
    },


    // Formats a number to a human-readable string.
    // Localize by overriding the precision, thousand and decimal arguments.
    formatNumber: function formatNumber(number) {
      var precision = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
      var thousand = arguments.length <= 2 || arguments[2] === undefined ? ',' : arguments[2];
      var decimal = arguments.length <= 3 || arguments[3] === undefined ? '.' : arguments[3];

      // Create some private utility functions to make the computational
      // code that follows much easier to read.
      var firstComma = function firstComma(_number, _thousand, _position) {
        return _position ? _number.substr(0, _position) + _thousand : '';
      };

      var commas = function commas(_number, _thousand, _position) {
        return _number.substr(_position).replace(/(\d{3})(?=\d)/g, '$1' + _thousand);
      };

      var decimals = function decimals(_number, _decimal, usePrecision) {
        return usePrecision ? _decimal + Humanize.toFixed(Math.abs(_number), usePrecision).split('.')[1] : '';
      };

      var usePrecision = Humanize.normalizePrecision(precision);

      // Do some calc
      var negative = number < 0 && '-' || '';
      var base = String(parseInt(Humanize.toFixed(Math.abs(number || 0), usePrecision), 10));
      var mod = base.length > 3 ? base.length % 3 : 0;

      // Format the number
      return negative + firstComma(base, thousand, mod) + commas(base, thousand, mod) + decimals(number, decimal, usePrecision);
    },


    // Fixes binary rounding issues (eg. (0.615).toFixed(2) === '0.61')
    toFixed: function toFixed(value, precision) {
      precision = exists(precision) ? precision : Humanize.normalizePrecision(precision, 0);
      var power = Math.pow(10, precision);

      // Multiply up by precision, round accurately, then divide and use native toFixed()
      return (Math.round(value * power) / power).toFixed(precision);
    },


    // Ensures precision value is a positive integer
    normalizePrecision: function normalizePrecision(value, base) {
      value = Math.round(Math.abs(value));
      return isNaN(value) ? base : value;
    },


    // Converts an integer to its ordinal as a string.
    ordinal: function ordinal(value) {
      var number = parseInt(value, 10);

      if (number === 0) {
        return value;
      }

      var specialCase = number % 100;
      if ([11, 12, 13].indexOf(specialCase) >= 0) {
        return number + 'th';
      }

      var leastSignificant = number % 10;

      var end = void 0;
      switch (leastSignificant) {
        case 1:
          end = 'st';
          break;
        case 2:
          end = 'nd';
          break;
        case 3:
          end = 'rd';
          break;
        default:
          end = 'th';
      }

      return '' + number + end;
    },


    // Interprets numbers as occurences. Also accepts an optional array/map of overrides.
    times: function times(value) {
      var overrides = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (isFiniteNumber(value) && value >= 0) {
        var number = parseFloat(value);
        var smallTimes = ['never', 'once', 'twice'];
        if (exists(overrides[number])) {
          return String(overrides[number]);
        }

        var numberString = exists(smallTimes[number]) && smallTimes[number].toString();
        return numberString || number.toString() + ' times';
      }
      return null;
    },


    // Returns the plural version of a given word if the value is not 1. The default suffix is 's'.
    pluralize: function pluralize(number, singular, plural) {
      if (!(exists(number) && exists(singular))) {
        return null;
      }

      plural = exists(plural) ? plural : singular + 's';

      return parseInt(number, 10) === 1 ? singular : plural;
    },


    // Truncates a string if it is longer than the specified number of characters (inclusive).
    // Truncated strings will end with a translatable ellipsis sequence ("…").
    truncate: function truncate(str) {
      var length = arguments.length <= 1 || arguments[1] === undefined ? 100 : arguments[1];
      var ending = arguments.length <= 2 || arguments[2] === undefined ? '...' : arguments[2];

      if (str.length > length) {
        return str.substring(0, length - ending.length) + ending;
      }
      return str;
    },


    // Truncates a string after a certain number of words.
    truncateWords: function truncateWords(string, length) {
      var array = string.split(' ');
      var result = '';
      var i = 0;

      while (i < length) {
        if (exists(array[i])) {
          result += array[i] + ' ';
        }
        i++;
      }

      if (array.length > length) {
        return result + '...';
      }

      return null;
    },
    truncatewords: function truncatewords() {
      return Humanize.truncateWords.apply(Humanize, arguments);
    },


    // Truncates a number to an upper bound.
    boundedNumber: function boundedNumber(num) {
      var bound = arguments.length <= 1 || arguments[1] === undefined ? 100 : arguments[1];
      var ending = arguments.length <= 2 || arguments[2] === undefined ? '+' : arguments[2];

      var result = void 0;

      if (isFiniteNumber(num) && isFiniteNumber(bound)) {
        if (num > bound) {
          result = bound + ending;
        }
      }

      return (result || num).toString();
    },
    truncatenumber: function truncatenumber() {
      return Humanize.boundedNumber.apply(Humanize, arguments);
    },


    // Converts a list of items to a human readable string with an optional limit.
    oxford: function oxford(items, limit, limitStr) {
      var numItems = items.length;

      var limitIndex = void 0;
      if (numItems < 2) {
        return String(items);
      } else if (numItems === 2) {
        return items.join(' and ');
      } else if (exists(limit) && numItems > limit) {
        var extra = numItems - limit;
        limitIndex = limit;
        limitStr = exists(limitStr) ? limitStr : ', and ' + extra + ' ' + Humanize.pluralize(extra, 'other');
      } else {
        limitIndex = -1;
        limitStr = ', and ' + items[numItems - 1];
      }

      return items.slice(0, limitIndex).join(', ') + limitStr;
    },


    // Converts an object to a definition-like string
    dictionary: function dictionary(object) {
      var joiner = arguments.length <= 1 || arguments[1] === undefined ? ' is ' : arguments[1];
      var separator = arguments.length <= 2 || arguments[2] === undefined ? ', ' : arguments[2];

      var result = '';

      if (exists(object) && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && !isArray(object)) {
        var defs = [];
        for (var key in object) {
          if (object.hasOwnProperty(key)) {
            var val = object[key];
            defs.push('' + key + joiner + val);
          }
        }

        return defs.join(separator);
      }

      return result;
    },


    // Describes how many times an item appears in a list
    frequency: function frequency(list, verb) {
      if (!isArray(list)) {
        return null;
      }

      var len = list.length;
      var times = Humanize.times(len);

      if (len === 0) {
        return times + ' ' + verb;
      }

      return verb + ' ' + times;
    },
    pace: function pace(value, intervalMs) {
      var unit = arguments.length <= 2 || arguments[2] === undefined ? 'time' : arguments[2];

      if (value === 0 || intervalMs === 0) {
        // Needs a better string than this...
        return 'No ' + Humanize.pluralize(0, unit);
      }

      // Expose these as overridables?
      var prefix = 'Approximately';
      var timeUnit = void 0;
      var relativePace = void 0;

      var rate = value / intervalMs;
      for (var i = 0; i < TIME_FORMATS.length; ++i) {
        // assumes sorted list
        var f = TIME_FORMATS[i];
        relativePace = rate * f.value;
        if (relativePace > 1) {
          timeUnit = f.name;
          break;
        }
      }

      // Use the last time unit if there is nothing smaller
      if (!timeUnit) {
        prefix = 'Less than';
        relativePace = 1;
        timeUnit = TIME_FORMATS[TIME_FORMATS.length - 1].name;
      }

      var roundedPace = Math.round(relativePace);
      unit = Humanize.pluralize(roundedPace, unit);

      return prefix + ' ' + roundedPace + ' ' + unit + ' per ' + timeUnit;
    },


    // Converts newlines to <br/> tags
    nl2br: function nl2br(string) {
      var replacement = arguments.length <= 1 || arguments[1] === undefined ? '<br/>' : arguments[1];

      return string.replace(/\n/g, replacement);
    },


    // Converts <br/> tags to newlines
    br2nl: function br2nl(string) {
      var replacement = arguments.length <= 1 || arguments[1] === undefined ? '\r\n' : arguments[1];

      return string.replace(/\<br\s*\/?\>/g, replacement);
    },


    // Capitalizes first letter in a string
    capitalize: function capitalize(string) {
      var downCaseTail = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      return '' + string.charAt(0).toUpperCase() + (downCaseTail ? string.slice(1).toLowerCase() : string.slice(1));
    },


    // Capitalizes the first letter of each word in a string
    capitalizeAll: function capitalizeAll(string) {
      return string.replace(/(?:^|\s)\S/g, function (a) {
        return a.toUpperCase();
      });
    },


    // Titlecase words in a string.
    titleCase: function titleCase(string) {
      var smallWords = /\b(a|an|and|at|but|by|de|en|for|if|in|of|on|or|the|to|via|vs?\.?)\b/i;
      var internalCaps = /\S+[A-Z]+\S*/;
      var splitOnWhiteSpaceRegex = /\s+/;
      var splitOnHyphensRegex = /-/;

      var _doTitleCase = void 0;
      _doTitleCase = function doTitleCase(_string) {
        var hyphenated = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
        var firstOrLast = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];

        var titleCasedArray = [];
        var stringArray = _string.split(hyphenated ? splitOnHyphensRegex : splitOnWhiteSpaceRegex);

        for (var index = 0; index < stringArray.length; ++index) {
          var word = stringArray[index];
          if (word.indexOf('-') !== -1) {
            titleCasedArray.push(_doTitleCase(word, true, index === 0 || index === stringArray.length - 1));
            continue;
          }

          if (firstOrLast && (index === 0 || index === stringArray.length - 1)) {
            titleCasedArray.push(internalCaps.test(word) ? word : Humanize.capitalize(word));
            continue;
          }

          if (internalCaps.test(word)) {
            titleCasedArray.push(word);
          } else if (smallWords.test(word)) {
            titleCasedArray.push(word.toLowerCase());
          } else {
            titleCasedArray.push(Humanize.capitalize(word));
          }
        }

        return titleCasedArray.join(hyphenated ? '-' : ' ');
      };

      return _doTitleCase(string);
    },
    titlecase: function titlecase() {
      return Humanize.titleCase.apply(Humanize, arguments);
    }
  };

  return Humanize;
});;
return module.exports;
},
12: function (require, module, exports) {
var genChartSettings, markup;

markup = require(10);

genChartSettings = require(13);

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
7: function (require, module, exports) {
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
10: function (require, module, exports) {
module.exports = {
  item: "<div class='BenchmarksDashboard-charts-item {{nonSharedTest}} {{fullWidth}}'> <div class='BenchmarksDashboard-charts-item-innerwrap'> <div class='BenchmarksDashboard-charts-item-title'>{{title}}</div> <div class='BenchmarksDashboard-charts-item-subtitle'>{{subtitle}}</div> <div class='BenchmarksDashboard-charts-item-chart __chart'></div> </div> </div>&nbsp;"
};

;
return module.exports;
},
4: function (require, module, exports) {
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
