(function () {
    "use strict";

    var test = require("tape");
    var eventEmitter = require("../index.js").eventEmitter;

    test("kgsPoller.eventEmitter#on", function (t) {
        var emitter = eventEmitter();
        var listener1 = function () {};
        var listener2 = function () {};

        t.deepEqual(emitter.on("foo"), []);

        emitter.on("foo", listener1);
        t.deepEqual(emitter.on("foo"), [listener1]);

        emitter.on("foo", listener2);
        t.deepEqual(emitter.on("foo"), [listener1, listener2]);

        t.end();
    });

    test("kgsPoller.eventEmitter#off(event, listener)", function (t) {
        var emitter = eventEmitter();
        var listener1 = function () {};
        var listener2 = function () {};

        emitter.on("foo", listener1);
        emitter.on("foo", listener2);

        emitter.off("foo", listener1);
        t.deepEqual(emitter.on("foo"), [listener2]);

        emitter.off("foo", listener2);
        t.deepEqual(emitter.on("foo"), []);

        t.end();
    });

    test("kgsPoller.eventEmitter#off(event)", function (t) {
        var emitter = eventEmitter();
        var listener1 = function () {};
        var listener2 = function () {};

        emitter.on("foo", listener1);
        emitter.on("foo", listener2);

        emitter.off("foo");
        t.deepEqual(emitter.on("foo"), []);

        t.end();
    });

    test("kgsPoller.eventEmitter#off()", function (t) {
        var emitter = eventEmitter();
        var listener1 = function () {};
        var listener2 = function () {};

        emitter.on("foo", listener1);
        emitter.on("bar", listener2);

        emitter.off();
        t.deepEqual(emitter.on("foo"), []);
        t.deepEqual(emitter.on("bar"), []);

        t.end();
    });

    test("kgsPoller.eventEmitter#eventNames", function (t) {
        var emitter = eventEmitter();
        var listener1 = function () {};
        var listener2 = function () {};

        t.deepEqual(emitter.eventNames(), []);

        emitter.on("foo", listener1);
        t.deepEqual(emitter.eventNames(), ["foo"]);

        emitter.on("bar", listener2);
        t.deepEqual(emitter.eventNames().sort(), ["bar", "foo"]);

        emitter.off("foo");
        t.deepEqual(emitter.eventNames(), ["bar"]);

        emitter.off("bar");
        t.deepEqual(emitter.eventNames(), []);

        t.end();
    });

    test("kgsPoller.eventEmitter#emit", function (t) {
        var emitter = eventEmitter();

        t.plan(4);

        emitter.on("foo", function (arg1, arg2) {
            t.equal(this, emitter);
            t.equal(arg1, "arg1");
            t.equal(arg2, "arg2");
        });

        var count = emitter.emit("foo", "arg1", "arg2");

        t.equal(count, 1);
    });

    test("kgsPoller.eventEmitter#emit: error", function (t) {
        var emitter = eventEmitter();
        var error = new Error(); 

        t.plan(3);

        emitter.on("foo", function () {
            throw error;
        });

        t.throws(function () {
            emitter.emit("foo");
        });

        emitter.on("error", function (e) {
            t.equal(e, error);
        });

        t.doesNotThrow(function () {
            emitter.emit("foo");
        });
    });

    test("kgsPoller.eventEmitter#once", function (t) {
        var emitter = eventEmitter();
        var count = 0;

        emitter.once("foo", function () {
            count++;
        });

        emitter.emit("foo");
        emitter.emit("foo");
        
        t.equal(count, 1);

        t.end();
    });

}());

