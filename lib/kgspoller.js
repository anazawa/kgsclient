(function () {
    "use strict";

    var XMLHttpRequest;

    var kgsPoller = function () {
        var that = {};

        that.create = function () {
            var other = Object.create(this);
            other.initialize.apply(other, arguments);
            return other;
        };

        that.initialize = function (args) {
            args = args || {};
            this._listeners = {};
            this._keepPolling = false;
            this._isLoggedIn = false;
            this._url = args.url || "http://metakgs.org/api/access";
            this._logger = args.logger || kgsPoller.nullLogger();
        };

        that.url = function () {
            return this._url;
        };

        that.logger = function (value) {
            if (arguments.length) {
                this._logger = value;
                return this;
            }
            return this._logger;
        };

        that.isLoggedIn = function () {
            return this._isLoggedIn;
        };

        that.isPolling = function () {
            return this._keepPolling;
        };

        that.eventNames = function () {
            return Object.keys(this._listeners);
        };

        that.on = function (event) {
            this._listeners[event] = this._listeners[event] || [];
            if (arguments.length > 1) {
                for (var i = 1; i < arguments.length; i++) {
                    this._listeners[event].push(arguments[i]);
                }
                return this;
            }
            return this._listeners[event].slice(0);
        };

        that.off = function (arg1, arg2) {
            if (arg1 && arg2) {
                if (this._listeners[arg1]) {
                    var index = this._listeners[arg1].indexOf(arg2);
                    if (index !== -1) {
                        this._listeners[arg1].splice(index, 1);
                    }
                }
            }
            else if (typeof arg1 === "function") {
                this.eventNames().forEach(function (event) {
                    this.off(event, arg1);
                }, this);
            }
            else if (typeof arg1 === "string") {
                this._listeners[arg1] = [];
            }
            else {
                this._listeners = {};
            }
            return this;
        };

        that.once = function (event, listener) {
            this.on(event, function self() {
                listener.apply(this, arguments);
                this.off(self);
            });
            return this;
        };

        that.emit = function (event) {
            var args = Array.prototype.slice.call(arguments, 1);
            var listeners = this.on(event);

            if (event === "error" && !listeners.length) {
                throw args[0];
            }

            listeners.forEach(function (listener) {
                try {
                    listener.apply(this, args);
                }
                catch (error) {
                    if (event !== "error") {
                        this.emit("error", error);
                    }
                    throw error;
                }
            }, this);

            return listeners.length;
        };

        that._createXMLHttpRequest = function (args) {
            var xhr = new XMLHttpRequest();
                xhr.open(args.method, args.url, true);
                xhr.withCredentials = true;

            Object.keys(args.headers || {}).forEach(function (key) {
                xhr.setRequestHeader(key, args.headers[key]);
            });

            var that = this;
            xhr.onerror = function () {
                that.emit("error", kgsPoller.error.connectionError(xhr, args));
                that._keepPolling = false;
                that._isLoggedIn = false;
            };

            return xhr;
        };

        that.send = function (message) {
            if (message.type === "LOGIN" && this._keepPolling) {
                throw kgsPoller.error.alreadyLoggedInError();
            }
            if (message.type !== "LOGIN" && !this.isLoggedIn()) {
                throw kgsPoller.error.notLoggedInError();
            }

            this.logger().debug("-> "+message.type+":", message);

            var xhr = this._createXMLHttpRequest({
                method: "POST",
                url: this.url(),
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                },
                data: message
            });

            var that = this;
            xhr.onload = function () {
                if (xhr.status === 200) {
                    if (!that._keepPolling) {
                        that.logger().info("Start polling "+that.url());
                        that._keepPolling = true;
                        that._poll();
                    }
                }
                else {
                    xhr.onerror.call(null);
                }
            };

            xhr.send(JSON.stringify(message));
        };

        that._poll = function () {
            var xhr = this._createXMLHttpRequest({
                method: "GET",
                url: this.url()
            });

            var that = this;
            xhr.onload = function () {
                if (xhr.status === 200) {
                    var data = JSON.parse(xhr.response);
                    (data.messages || []).forEach(function (message) {
                        if (message.type === "LOGIN_SUCCESS") {
                            that._keepPolling = true;
                            that._isLoggedIn = true;
                        }
                        else if (/^LOGIN_FAILED/.test(message.type)) {
                            that._keepPolling = true;
                            that._isLoggedIn = false;
                        }
                        else if (message.type === "LOGOUT") {
                            that.logger().info("Stop polling");
                            that._keepPolling = false;
                            that._isLoggedIn = false;
                        }
                        that.logger().debug("<- "+message.type+":", message);
                        that.emit("message", message);
                        that.emit(message.type, message);
                    });
                    if (that._keepPolling) {
                        that.logger().debug("Keep polling");
                        that._poll();
                    }
                }
                else {
                    xhr.onerror.call(null);
                }
            };

            xhr.send(null);
        };

        return that.create.apply(that, arguments);
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

