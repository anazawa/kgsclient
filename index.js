(function () {
    "use strict";

    var XMLHttpRequest;

    var kgsClient = function () {
        var that = kgsClient.eventEmitter(); 

        var noop = kgsClient.util.noop;

        var LOGGING_IN  = kgsClient.LOGGING_IN,
            LOGGED_IN   = kgsClient.LOGGED_IN,
            LOGGING_OUT = kgsClient.LOGGING_OUT,
            LOGGED_OUT  = kgsClient.LOGGED_OUT;

        that.initialize = (function (superInitialize) {
            return function (args) {
                superInitialize.apply(this, arguments);
                args = args || {};
                this._state = LOGGED_OUT;
                this._url = args.url || "https://metakgs.org/api/access";
                this._logger = args.logger || kgsClient.nullLogger();
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

        that.state = function () {
            return this._state;
        };

        that._setState = function (newValue) {
            var oldValue = this._state;
            this._state = newValue;
            if (newValue !== oldValue) {
                this.emit("stateChange", newValue, oldValue);
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
            onSuccess = onSuccess || noop;
            onError = onError || noop;

            if (message.type === "LOGIN" && this.state() !== LOGGED_OUT) {
                throw new Error("You have to log out first");
            }
            if (message.type !== "LOGIN" && this.state() !== LOGGED_IN) {
                throw new Error("You have to log in first");
            }

            if (message.type === "LOGIN") {
                this._setState(LOGGING_IN);
            }
            else if (message.type === "LOGOUT") {
                this._setState(LOGGING_OUT);
            }

            this.logger().debug("U: "+message.type+":", message);

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
                if (this.status === 200) {
                    if (that.state() === LOGGING_IN) {
                        that.logger().info("Start polling "+this.config.url);
                        that._poll(this.config.url);
                        that.emit("startPolling");
                    }
                    onSuccess.call(that, this);
                }
                else {
                    this.onerror();
                }
            };
            xhr.onerror = function () {
                that._setState(LOGGED_OUT);
                onError.call(that, this);
            };
            xhr.onabort = function () {
                this.onerror();
            };
            xhr.ontimeout = function () {
                this.onerror();
            };

            xhr.send(JSON.stringify(message));

            return;
        };

        that._poll = function (url) {
            var xhr = this._createXMLHttpRequest({
                method: "GET",
                url: url
            });

            var that = this;
            xhr.onload = function () {
                if (this.status === 200) {
                    var messages = JSON.parse(this.response).messages || [];

                    messages.forEach(function (message) {
                        that.logger().debug("D: "+message.type+":", message);

                        if (message.type === "LOGIN_SUCCESS") {
                            that._setState(LOGGED_IN);
                        }
                        else if (message.type === "LOGOUT") {
                            that._setState(LOGGED_OUT);
                        }

                        that.emit("message", message);
                        that.emit(message.type, message);
                    });

                    if (that.state() !== LOGGED_OUT) {
                        that.logger().debug("Keep polling");
                        that._poll(this.config.url);
                    }
                    else {
                        that.logger().info("Stop polling");
                        that.emit("stopPolling");
                    }
                }
                else {
                    this.onerror();
                }
            };
            xhr.onerror = function () {
                that.logger().info("Stop polling");
                that._setState(LOGGED_OUT);
                that.emit("error", kgsClient.pollingError(this));
                that.emit("stopPolling");
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

    kgsClient.LOGGING_IN  = 0;
    kgsClient.LOGGED_IN   = 1;
    kgsClient.LOGGING_OUT = 2;
    kgsClient.LOGGED_OUT  = 3;

    kgsClient.eventEmitter = function () {
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

    kgsClient.nullLogger = function () {
        var noop = kgsClient.util.noop;

        return {
            error: noop,
            warn: noop,
            info: noop,
            log: noop,
            debug: noop
        };
    };

    kgsClient.error = function (that) {
        that = that || {};

        that.toString = function () {
            return this.message ? this.type+": "+this.message : this.type;
        };

        return that;
    };

    kgsClient.pollingError = function (xhr) {
        return kgsClient.error({
            type: "kgsClientPollingError",
            message: xhr.status ? xhr.status+" "+xhr.statusText : "",
            xhr: xhr
        });
    };

    kgsClient.util = {
        noop: function () {}
    };

    if (typeof exports !== "undefined") {
        XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        module.exports = kgsClient;
    }
    else {
        XMLHttpRequest = window.XMLHttpRequest;
        window.kgsClient = kgsClient;
    }

}());

