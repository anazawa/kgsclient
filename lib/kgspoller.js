(function () {
    "use strict";

    var XMLHttpRequest;

    var kgsPoller = function (args) {
        args = args || {};

        var that = {},
            listeners = {},
            keepPolling = false,
            url = args.url || "http://metakgs.org/api/access",
            logger = args.logger || kgsPoller.nullLogger();

        var createXMLHttpRequest = function (args) {
            var xhr = new XMLHttpRequest();
                xhr.open(args.method, args.url, true);
                xhr.withCredentials = true;

            Object.keys(args.headers || {}).forEach(function (key) {
                xhr.setRequestHeader(key, args.headers[key]);
            });

            var that = this;
            xhr.onerror = function () {
                that.emit("error", kgsPoller.error.connectionError(xhr, args));
                keepPolling = false;
            };

            return xhr;
        };

        var poll = function () {
            var xhr = createXMLHttpRequest.call(this, {
                method: "GET",
                url: url
            });

            var that = this;
            xhr.onload = function () {
                if (xhr.status === 200) {
                    var data = JSON.parse(xhr.response);
                    (data.messages || []).forEach(function (message) {
                        logger.debug("<- "+message.type+":", message);
                        if (message.type === "LOGOUT") {
                            logger.info("Stop polling");
                            keepPolling = false;
                        }
                        that.emit("message", message);
                        that.emit(message.type, message);
                    });
                    if (keepPolling) {
                        logger.debug("Keep polling");
                        poll.call(that);
                    }
                }
                else {
                    xhr.onerror.call(null);
                }
            };

            xhr.send(null);
        };

        that.url = function () {
            return url;
        }

        that.logger = function (value) {
            if (arguments.length) {
                logger = value;
                return this;
            }
            return logger;
        };

        that.eventNames = function () {
            return Object.keys(listeners);
        };

        that.on = function (event) {
            listeners[event] = listeners[event] || [];
            if (arguments.length > 1) {
                for (var i = 1; i < arguments.length; i++) {
                    listeners[event].push(arguments[i]);
                }
                return this;
            }
            return listeners[event].slice(0);
        };

        that.off = function (arg1, arg2) {
            if (arg1 && arg2) {
                if (listeners[arg1]) {
                    var index = listeners[arg1].indexOf(arg2);
                    if (index !== -1) {
                        listeners[arg1].splice(index, 1);
                    }
                }
            }
            else if (typeof arg1 === "function") {
                var that = this;
                this.eventNames().forEach(function (event) {
                    that.off(event, arg1);
                });
            }
            else if (typeof arg1 === "string") {
                listeners[arg1] = [];
            }
            else {
                listeners = {};
            }
            return this;
        };

        that.once = function (event, listener) {
            var that = this;
            this.on(event, function self() {
                listener.apply(that, arguments);
                that.off(self);
            });
            return this;
        };

        that.emit = function (event) {
            var args = Array.prototype.slice.call(arguments, 1);
            var listeners = this.on(event);

            if (event === "error" && !listeners.length) {
                throw args[0];
            }

            var that = this;
            listeners.forEach(function (listener) {
                try {
                    listener.apply(that, args);
                }
                catch (error) {
                    logger.error(error);
                    if (event !== "error") {
                        that.emit("error", error);
                    }
                    throw error;
                }
            });

            return listeners.length;
        };

        that.send = function (message) {
            if (message.type === "LOGIN" && keepPolling) {
                this.emit("error", kgsPoller.error.alreadyLoggedInError());
            }
            if (message.type !== "LOGIN" && !keepPolling) {
                this.emit("error", kgsPoller.error.notLoggedInError());
            }

            logger.debug("-> "+message.type+":", message);

            var xhr = createXMLHttpRequest.call(this, {
                method: "POST",
                url: url,
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                },
                data: message
            });

            var that = this;
            xhr.onload = function () {
                if (xhr.status === 200) {
                    if (!keepPolling) {
                        logger.info("Start polling "+url);
                        keepPolling = true;
                        poll.call(that);
                    }
                }
                else {
                    xhr.onerror.call(null);
                }
            };

            xhr.send(JSON.stringify(message));
        };

        return that;
    };

    kgsPoller.nullLogger = function () {
        return {
            error: function () {},
            warn: function () {},
            info: function () {},
            log: function () {},
            debug: function () {}
        };
    };

    kgsPoller.error = function (that) {
        that = that || {};

        that.toString = function () {
            return this.message ? this.type+": "+this.message : this.type;
        };

        return that;
    };

    kgsPoller.error.connectionError = function (xhr, config) {
        return kgsPoller.error({
            type: "kgsPollerConnectionError",
            message: xhr.status ? xhr.status+" "+xhr.statusText : "",
            config: conifg,
            xhr: xhr
        });
    };

    kgsPoller.error.notLoggedInError = function () {
        return kgsPoller.error({
            type: "kgsPollerNotLoggedInError",
            message: "You have to log in first"
        });
    };

    kgsPoller.error.alreadyLoggedInError = function () {
        return kgsPoller.error({
            type: "kgsPollerAlreadyLoggedInError",
            message: "You are already logged in"
        });
    };

    if (typeof exports !== "undefined") {
        XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        module.exports = kgsPoller;
    }
    else {
        XMLHttpRequest = window.XMLHttpRequest;
        window.kgsPoller = kgsPoller;
    }

}());

