(function () {
    "use strict";

    var XMLHttpRequest;

    var kgsClient = function (args) {
        args = args || {};

        var that = {},
            handlers = {},
            keepPolling = false,
            url = args.url || "http://metakgs.org/api/access",
            RESPONSE_TYPES = kgsClient.RESPONSE_TYPES;

        var runHandlers = function (type, args) {
            (handlers[type] || []).forEach(function (handler) {
                handler.apply(null, args);
            });
        };

        var poll = function () {
            var that = this;

            var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.withCredentials = true;

            xhr.onload = function () {
                if (xhr.status === 200) {
                    var data = JSON.parse(xhr.response);
                    (data.messages || []).forEach(function (message) {
                        that.logger.debug("<- "+message.type+":", message);
                        runHandlers(message.type, [message]);
                        if (message.type === "LOGOUT") {
                            keepPolling = false;
                        }
                    });
                    if (keepPolling) {
                        that.logger.debug("Keep polling");
                        poll.call(that);
                    }
                    else {
                        that.logger.info("Stop polling");
                    }
                }
                else {
                    xhr.onerror.call(null);
                }
            };
            xhr.onerror = function () {
                that.logger.error("GET "+url+" failed: "+xhr.response);
                runHandlers("error", [xhr]);
                keepPolling = false;
            };

            xhr.send(null);
        };

        that.logger = args.logger || {
            error: function () {},
            warn: function () {},
            info: function () {},
            debug: function () {}
        };

        that.on = function (type) {
            handlers[type] = handlers[type] || [];
            for (var i = 1; i < arguments.length; i++) {
                handlers[type].push(arguments[i]);
            }
            return this;
        };

        that.off = function (arg1, arg2) {
            if (arg1 && arg2) {
                if (handlers[arg1]) {
                    handlers[arg1] = handlers[arg1].filter(function (handler) {
                        return handler !== arg2;
                    });
                }
            }
            else if (typeof arg1 === "function") {
                Object.keys(handlers).forEach(function (type) {
                    handlers[type] = handlers[type].filter(function (handler) {
                        return handler !== arg1;
                    });
                });
            }
            else if (typeof arg1 === "string") {
                if (handlers[arg1]) {
                    handlers[arg1] = [];
                }
            }
            else {
                handlers = {};
            }
            return this;
        };

        that.request = function (message, onSuccess, onError) {
            if (message.type === "LOGIN" && keepPolling) {
                throw new Error("You are already logged in");
            }
            if (message.type !== "LOGIN" && !keepPolling) {
                throw new Error("You have to log in first");
            }

            var that = this;

            var xhr = new XMLHttpRequest();
                xhr.open("POST", url, true);
                xhr.withCredentials = true;

            xhr.onload = function () {
                if (xhr.status === 200) {
                    if (onSuccess) {
                        var handler = function (message) {
                            onSuccess(message);
                            that.off(handler);
                        };
                        (RESPONSE_TYPES[message.type] || []).forEach(function (type) {
                            that.on(type, handler);
                        });
                    }
                    if (!keepPolling) {
                        that.logger.info("Start polling "+url);
                        keepPolling = true;
                        poll.call(that);
                    }
                }
                else {
                    xhr.onerror.call(null);
                }
            };
            xhr.onerror = function () {
                var statusLine = xhr.status ? xhr.status+" "+xhr.statusText : "";
                that.logger.error("POST "+url+" failed: "+statusLine);
                if (onError) { onError(xhr); }
                keepPolling = false;
            };

            this.logger.debug("-> "+message.type+":", message);
            xhr.send(JSON.stringify(message));
        };

        return that;
    };

    kgsClient.RESPONSE_TYPES = {
        "LOGIN": [
            "LOGIN_SUCCESS",
            "LOGIN_FAILED_NO_SUCH_USER",
            "LOGIN_FAILED_BAD_PASSWORD",
            "LOGIN_FAILED_USER_ALREADY_EXISTS"
        ],
        "UNJOIN_REQUEST": [
            "UNJOIN"
        ],
        "JOIN_ARCHIVE_REQUEST": [
            "ARCHIVE_JOIN",
            "ARCHIVE_NONEXISTANT"
        ],
        "JOIN_TAG_ARCHIVE_REQUEST": [
            "ARCHIVE_JOIN",
            "ARCHIVE_NONEXISTANT"
        ],
        "DETAILS_JOIN_REQUEST": [
            "ARCHIVE_JOIN",
            "ARCHIVE_NONEXISTANT"
        ],
        "ROOM_NAMES_REQUEST": [
            "ROOM_NAMES"
        ],
        "AVATAR_REQUEST": [
            "AVATAR"
        ],
        "DETAILS_RANK_GRAPH_REQUEST": [
            "DETAILS_RANK_GRAPH"
        ],
        "ROOM_DESC_REQUEST": [
            "ROOM_DESC"
        ],
        "JOIN_REQUEST": [
            "JOIN"
        ],
        "CHAT_ROOM_REQUEST": [
            "ROOM_CREATE_NAME_TAKEN",
            "ROOM_CREATE_TOO_MANY_ROOMS",
            "ROOM_CREATED"
        ],
        "ROOM_ADD_OWNER": [
            "CHANNEL_CHANGE_NO_SUCH_USER"
        ],
        "ROOM_REMOVE_OWNER": [
            "CHANNEL_CHANGE_NO_SUCH_USER"
        ],
        "CHANNEL_ADD_ACCESS": [
            "CHANNEL_CHANGE_NO_SUCH_USER"
        ],
        "CHANNEL_REMOVE_ACCESS": [
            "CHANNEL_CHANGE_NO_SUCH_USER"
        ],
        "ACCESS_LIST_REQUEST": [
            "ACCESS_LIST"
        ],
        "CONVO_REQUEST": [
            "CONVO_JOIN",
            "CONVO_NO_SUCH_USER"
        ],
        "MESSAGE_CREATE": [
            "MESSAGE_CREATE_NO_USER",
            "MESSAGE_CREATE_CONNECTED",
            "MESSAGE_CREATE_FULL",
            "MESSAGE_CREATE_SUCCESS"
        ],
        "FRIEND_ADD": [
            "FRIEND_CHANGE_NO_USER",
            "FRIEND_ADD_SUCCESS"
        ],
        "FRIEND_REMOVE": [
            "FRIEND_CHANGE_NO_USER",
            "FRIEND_REMOVE_SUCCESS"
        ],
        "SYNC_REQUEST": [
            "SYNC"
        ],
        "CHALLENGE_PROPOSAL": [
            "CHALLENGE_PROPOSAL"
        ],
        "GAME_UNDO_REQUEST": [
            // XXX
        ],
        "REQUEST_SERVER_STATS": [
            "SERVER_STATS"
        ],
        "DELETE_ACCOUNT": [
            "DELETE_ACCOUNT_ALREADY_GONE",
            "DELETE_ACCOUNT_SUCCESS"
        ],
        "KEEP_OUT_REQUEST": [
            "KEEP_OUT_LOGIN_NOT_FOUND",
            "KEEP_OUT_SUCCESS"
        ],
        "CLEAR_KEEP_OUT": [
            "CLEAR_KEEP_OUT_SUCCESS",
            "CLEAR_KEEP_OUT_FAILURE"
        ],
        "REGISTER": [
            "REGISTER_SUCCESS",
            "REGISTER_BAD_EMAIL"
        ],
        "FETCH_TAGS": [
            "FETCH_TAGS_RESULT"
        ],
        "LOGOUT": [
            "LOGOUT"
        ]
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

