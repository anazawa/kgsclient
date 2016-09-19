(function () {
    "use strict";

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

        that.send = function (message, onSuccess, onError) {
            onSuccess = onSuccess || noop;
            onError = onError || noop;

            if (!(message && typeof message === "object" &&
                  typeof message.type === "string")) {
                throw new Error("Not a valid KGS message");
            }

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

            var url = this.url();
            var xhr = new XMLHttpRequest();

            var that = this;
            var _onError = function () {
                that._setState(LOGGED_OUT);
                onError.call(that, this);
            };
            xhr.addEventListener("load", function () {
                if (this.status === 200) {
                    if (that.state() === LOGGING_IN) {
                        that.logger().info("Start polling "+url);
                        that._poll(url);
                    }
                    onSuccess.call(that, this);
                }
                else {
                    _onError.call(this);
                }
            });
            xhr.addEventListener("error", _onError);
            xhr.addEventListener("abort", _onError);
            xhr.addEventListener("timeout", _onError);

            xhr.open("POST", url);
            xhr.withCredentials = true;
            xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");

            this.emit("beforeSend", xhr);
            xhr.send(JSON.stringify(message));

            return;
        };

        that.composeMessage = function (message) {
            return JSON.stringify(message);
        };

        that._poll = function (url) {
            var xhr = new XMLHttpRequest();

            var that = this;
            var onError = function () {
                that.logger().info("Stop polling");
                that._setState(LOGGED_OUT);
                that.emit("pollError", this);
            };
            xhr.addEventListener("load", function () {
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
                    });

                    if (that.state() !== LOGGED_OUT) {
                        that.logger().debug("Keep polling");
                        that._poll(url);
                    }
                    else {
                        that.logger().info("Stop polling");
                    }
                }
                else {
                    onError.call(this);
                }
            });
            xhr.addEventListener("error", onError);
            xhr.addEventListener("abort", onError);
            xhr.addEventListener("timeout", onError);

            xhr.open("GET", url);
            xhr.withCredentials = true;
            xhr.send();

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
                    delete this._listeners[event];
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
            var listeners = this._listeners[event] || [];

            listeners.forEach(function (listener) {
                listener.apply(this, args);
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

    kgsClient.util = {
        noop: function () {}
    };

    if (typeof exports !== "undefined") {
        module.exports = kgsClient;
    }
    else {
        window.kgsClient = kgsClient;
    }

}());

