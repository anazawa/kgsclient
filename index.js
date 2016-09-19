(function () {
    "use strict";

    var kgsClient = function (args) {
        args = args || {};

        var noop = function () {},
            LOGGING_IN = kgsClient.LOGGING_IN,
            LOGGED_IN = kgsClient.LOGGED_IN,
            LOGGING_OUT = kgsClient.LOGGING_OUT,
            LOGGED_OUT = kgsClient.LOGGED_OUT;

        var self = kgsClient.eventEmitter(),
            state = LOGGED_OUT,
            url = args.url || "https://metakgs.org/api/access",
            logger = args.logger || {
                error: noop,
                warn: noop,
                info: noop,
                log: noop,
                debug: noop
            };

        self.url = function () {
            return url;
        };

        self.logger = function (value) {
            if (arguments.length) {
                logger = value;
                return self;
            }
            return logger;
        };

        self.state = function () {
            return state;
        };

        var setState = function (newValue) {
            var oldValue = state;
            state = newValue;
            if (newValue !== oldValue) {
                self.emit("stateChange", newValue, oldValue);
            }
        };

        var poll = function () {
            var xhr = new XMLHttpRequest();

            var onError = function () {
                logger.info("Stop polling");
                setState(LOGGED_OUT);
                self.emit("pollError", xhr);
            };
            xhr.addEventListener("load", function () {
                if (xhr.status === 200) {
                    var messages = JSON.parse(xhr.response).messages || [];

                    messages.forEach(function (message) {
                        logger.debug("D: "+message.type+":", message);

                        if (message.type === "LOGIN_SUCCESS") {
                            setState(LOGGED_IN);
                        }
                        else if (message.type === "LOGOUT") {
                            setState(LOGGED_OUT);
                        }

                        self.emit("message", message);
                    });

                    if (state !== LOGGED_OUT) {
                        logger.debug("Keep polling");
                        poll();
                    }
                    else {
                        logger.info("Stop polling");
                    }
                }
                else {
                    onError();
                }
            });
            xhr.addEventListener("error", onError);
            xhr.addEventListener("abort", onError);
            xhr.addEventListener("timeout", onError);

            xhr.open("GET", url);
            xhr.withCredentials = true;

            self.emit("beforePoll", xhr);
            xhr.send();

            return;
        };

        self.send = function (message, onSuccess, onError) {
            onSuccess = onSuccess || noop;
            onError = onError || noop;

            if (!(message && typeof message === "object" &&
                  typeof message.type === "string")) {
                throw new TypeError("Not a valid KGS message");
            }

            if (message.type === "LOGIN" && state !== LOGGED_OUT) {
                throw new Error("You have to log out first");
            }
            if (message.type !== "LOGIN" && state !== LOGGED_IN) {
                throw new Error("You have to log in first");
            }

            if (message.type === "LOGIN") {
                setState(LOGGING_IN);
            }
            else if (message.type === "LOGOUT") {
                setState(LOGGING_OUT);
            }

            logger.debug("U: "+message.type+":", message);

            var xhr = new XMLHttpRequest();

            var _onError = function () {
                setState(LOGGED_OUT);
                onError(xhr);
            };
            xhr.addEventListener("load", function () {
                if (xhr.status === 200) {
                    if (state === LOGGING_IN) {
                        logger.info("Start polling "+url);
                        poll();
                    }
                    onSuccess(xhr);
                }
                else {
                    _onError();
                }
            });
            xhr.addEventListener("error", _onError);
            xhr.addEventListener("abort", _onError);
            xhr.addEventListener("timeout", _onError);

            xhr.open("POST", url);
            xhr.withCredentials = true;
            xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");

            self.emit("beforeSend", xhr);
            xhr.send(JSON.stringify(message));

            return;
        };

        return self;
    };

    kgsClient.LOGGING_IN  = 0;
    kgsClient.LOGGED_IN   = 1;
    kgsClient.LOGGING_OUT = 2;
    kgsClient.LOGGED_OUT  = 3;

    kgsClient.eventEmitter = function (self) {
        self = self || {};

        var listeners = {};

        self.eventNames = function () {
            return Object.keys(listeners);
        };

        self.on = function (event, listener) {
            if (listener) {
                listeners[event] = listeners[event] || [];
                listeners[event].push(listener);
                return self;
            }
            return (listeners[event] || []).slice(0);
        };

        self.off = function (event, listener) {
            if (event && listener) {
                var index = (listeners[event] || []).indexOf(listener);
                if (index >= 0 && listeners[event].length > 1) {
                    listeners[event].splice(index, 1);
                }
                else if (index >= 0) {
                    delete listeners[event];
                }
            }
            else if (event) {
                delete listeners[event];
            }
            else {
                listeners = {};
            }
            return self;
        };

        self.once = function (event, listener) {
            self.on(event, function _listener() {
                self.off(event, _listener);
                listener.apply(null, arguments);
            });
            return self;
        };

        self.emit = function (event) {
            var args = Array.prototype.slice.call(arguments, 1);
            var _listeners = listeners[event] || [];

            _listeners.forEach(function (listener) {
                listener.apply(null, args);
            });

            return _listeners.length;
        };

        return self;
    };

    if (typeof exports !== "undefined") {
        module.exports = kgsClient;
    }
    else {
        window.kgsClient = kgsClient;
    }

}());

