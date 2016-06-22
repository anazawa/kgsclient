(function () {
    "use strict";

    var XMLHttpRequest;

    var kgsPoller = function () {
        var that = kgsPoller.eventEmitter(); 

        that.initialize = (function (superInitialize) {
            return function (args) {
                superInitialize.apply(this, arguments);
                args = args || {};
                this._isLoggedIn = false;
                this._url = args.url || "http://metakgs.org/api/access";
                this._logger = args.logger || kgsPoller.nullLogger();
            };
        }(that.initialize));

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

        that._setIsLoggedIn = function (newValue) {
            var oldValue = this._isLoggedIn;
            this._isLoggedIn = newValue;
            if (newValue !== oldValue) {
                this.emit(newValue ? "login" : "logout");
            }
        };

        that._createXMLHttpRequest = function (config) {
            var xhr = new XMLHttpRequest();
                xhr.open(config.method, config.url, true);
                xhr.withCredentials = true;
                xhr.config = config;

            Object.keys(config.headers || {}).forEach(function (key) {
                xhr.setRequestHeader(key, config.headers[key]);
            });

            return xhr;
        };

        that.send = function (message, onSuccess, onError) {
            onSuccess = onSuccess || kgsPoller.util.noop;
            onError = onError || kgsPoller.util.noop;

            if (message.type === "LOGIN" && this.isLoggedIn()) {
                throw kgsPoller.alreadyLoggedInError();
            }
            if (message.type !== "LOGIN" && !this.isLoggedIn()) {
                throw kgsPoller.notLoggedInError();
            }

            var xhr = this._createXMLHttpRequest({
                method: "POST",
                url: this.url(),
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                },
                data: message
            });

            var self = this;
            xhr.onload = function () {
                if (this.status === 200) {
                    if (this.config.data.type === "LOGIN") {
                        self.logger().info("Start polling "+this.config.url);
                        self._poll(this.config.url);
                        self.emit("startPolling");
                    }
                    onSuccess.call(self, this);
                }
                else {
                    this.onerror();
                }
            };
            xhr.onerror = function () {
                onError.call(self, this);
            };
            xhr.onabort = function () {
                this.onerror();
            };
            xhr.ontimeout = function () {
                this.onerror();
            };

            xhr.send(JSON.stringify(message));

            this.logger().debug("U: "+message.type+":", message);

            return;
        };

        that._poll = function (url) {
            var xhr = this._createXMLHttpRequest({
                method: "GET",
                url: url
            });

            var self = this;
            xhr.onload = function () {
                if (this.status === 200) {
                    var messages = JSON.parse(this.response).messages || [];
                    var keepPolling = true;

                    messages.forEach(function (message) {
                        switch (message.type) {
                            case "HELLO":
                            case "LOGIN_FAILED_NO_SUCH_USER":
                            case "LOGIN_FAILED_BAD_PASSWORD":
                            case "LOGIN_FAILED_USER_ALREADY_EXISTS":
                                self._setIsLoggedIn(false);
                                keepPolling = true;
                                break;
                            case "LOGOUT":
                                self._setIsLoggedIn(false);
                                keepPolling = false;
                                break;
                            default:
                                self._setIsLoggedIn(true);
                                keepPolling = true;
                        }
                    });

                    messages.forEach(function (message) {
                        self.logger().debug("D: "+message.type+":", message);
                        self.emit("message", message);
                        self.emit(message.type, message);
                    });

                    if (keepPolling) {
                        self.logger().debug("Keep polling");
                        self._poll(this.config.url);
                    }
                    else {
                        self.logger().info("Stop polling");
                        self.emit("stopPolling");
                    }
                }
                else {
                    this.onerror();
                }
            };
            xhr.onerror = function () {
                self.logger().info("Stop polling");
                self._setIsLoggedIn(false);
                self.emit("error", kgsPoller.pollingError(this));
                self.emit("stopPolling");
            };
            xhr.onabort = function () {
                this.onerror();
            };
            xhr.ontimeout = function () {
                this.onerror();
            };

            xhr.send(null);

            return;
        };

        return that.create.apply(that, arguments);
    };

    kgsPoller.util = {
        noop: function () {}
    };

    kgsPoller.eventEmitter = function () {
        var that = {};

        that.create = function () {
            var other = Object.create(this);
            other.initialize.apply(other, arguments);
            return other;
        };

        that.initialize = function () {
            this._listeners = {};
        };

        that.eventNames = function () {
            return Object.keys(this._listeners);
        };

        that.on = function (event, listener) {
            if (listener) {
                this._listeners[event] = this._listeners[event] || [];
                this._listeners[event].push(listener);
                return this;
            }
            return (this._listeners[event] || []).slice(0);
        };

        that.off = function (event, listener) {
            if (event && listener) {
                var index = (this._listeners[event] || []).indexOf(listener);
                if (index >= 0 && this._listeners[event].length > 1) {
                    this._listeners[event].splice(index, 1);
                }
                else if (index >= 0) {
                    this.off(event);
                }
            }
            else if (event) {
                delete this._listeners[event];
            }
            else {
                this._listeners = {};
            }
            return this;
        };

        that.once = function (event, listener) {
            this.on(event, function self() {
                this.off(event, self);
                listener.apply(this, arguments);
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
                    if (event === "error") {
                        throw error;
                    }
                    this.emit("error", error);
                }
            }, this);

            return listeners.length;
        };

        return that.create.apply(that, arguments);
    };

    kgsPoller.nullLogger = function () {
        return {
            error: kgsPoller.util.noop,
            warn: kgsPoller.util.noop,
            info: kgsPoller.util.noop,
            log: kgsPoller.util.noop,
            debug: kgsPoller.util.noop
        };
    };

    kgsPoller.error = function (that) {
        that = that || {};

        that.toString = function () {
            return this.message ? this.type+": "+this.message : this.type;
        };

        return that;
    };

    kgsPoller.pollingError = function (xhr) {
        return kgsPoller.error({
            type: "kgsPollerPollingError",
            message: xhr.status ? xhr.status+" "+xhr.statusText : "",
            xhr: xhr
        });
    };

    kgsPoller.notLoggedInError = function () {
        return kgsPoller.error({
            type: "kgsPollerNotLoggedInError",
            message: "You have to log in first"
        });
    };

    kgsPoller.alreadyLoggedInError = function () {
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

