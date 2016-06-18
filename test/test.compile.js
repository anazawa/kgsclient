(function () {
    "use strict";

    var test = require("tape");

    test("compile", function (t) {
        t.doesNotThrow(function () {
            require("../index.js");
        });
        t.end();
    });

}());

