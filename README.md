# kgsPoller

Polling library for the KGS protocol

[![Build Status](https://travis-ci.org/anazawa/kgspoller.svg)](https://travis-ci.org/anazawa/kgspoller)


- [Synopsis](#synopsis)
- [Description](#description)
    - [Attributes](#attributes)
    - [Instance Methods](#instance-methods)
    - [Events](#events)
    - [Errors](#errors)
- [Requirements](#requirements)
- [See Also](#see-also)
- [Author](#author)
- [License](#license)

## Synopsis

In your HTML:

```html
<script src="kgspoller.js"></script>
```

In your JavaScript:

```js
var poller = kgsPoller({
    logger: window.console
});

poller.on("message", function (message) {
    message;
    // => {
    //     type: "HELLO",
    //     versionMajor: 3,
    //     ...
    // }
});

poller.on("error", function (error) {
    switch (error.type) {
        case "kgsPollerPollingError":
            // do something with error
            break;
        case "kgsPollerNotLoggedInError":
            // do something with error
            break;
        case "kgsPollerAlreadyLoggedInError":
            // do something with error
            break;
        ...
        default:
            throw error;
    }
});

poller.send({
    type: "LOGIN",
    name: "myname",
    password: "pa55word",
    locale: "en_US"
});

poller.send({
    type: "LOGOUT"
});
```

## Description

NOTE: This is an early release, and implementation details of this module
are still very much in flux. Feedback is welcome.

### Attributes

#### url = poller.url()

Can be used to get the API endpoint.
Defaults to `"http://metakgs.org/api/access"`.

#### logger = poller.logger()

#### self = poller.logger(logger)

Can be used to get or set a logger object. Defaults to a `kgsPoller.nullLogger`
object that does nothing. A logger object must implement `#log`, `#info`, `#warn`,
`#error` and `#debug` methods.

### Instance Methods

#### eventNames = poller.eventNames()

Returns an array listing the events for which the emitter has registered
listeners.

#### listeners = poller.on(eventName)

Returns a copy of the array of listeners for the event named `eventName`.

#### self = poller.on(eventName, listener)

Adds the `listener` function to the end of the listeners array
for the event named `eventName`. No checks are made to see if the `listener`
has already been added. Multiple calls passing the same combination of
`eventName` and `listener` will result in the `listener` being added,
and called, multiple times.

Returns the invocant so calls can be chained.

#### self = poller.once(eventName, listener)

Adds a one time `listener` function for the event named `eventName`.
The next time `eventName` is triggered, this listener is removed
and then invoked.

```js
poller.
once("SERVER_STATS", function (message) {
    message;
    // => {
    //     type: "SERVER_STATS",
    //     versionMajor: 3,
    //     ...
    // }
}).
send({
    type: "REQUEST_SERVER_STATS"
});
```

Returns the invocant so calls can be chained.

#### self = poller.off(eventName, listener)

Removes the specified `listener` from the listener array
for the event named `eventName`.

Note that this method will remove, at most, one instance of a listener
form the listener array. If any single listener has been added multiple times
to the listener array for the specified `eventName`, then this method
must be called multiple times to remove each instance.

Note also that once an event has been emitted, all listeners attached to it
at the time of emitting will be called in order. This implies that
any `#off` calles *after* emitting and *before* the last listener finished
execution will not remove them from `#emit` in progress.
Subsequent events will behave as expected.

Returns the invocant so calls can be chained.

#### self = poller.off(eventName)

#### self = poller.off()

Removes all listeners, or those of the specified `eventName`.

Returns the invocant so calls can be chained.

#### listenerCount = poller.emit(eventName, [arg1[, arg2, ...]])

Synchronously calls each of the listeners registered for the event named
`eventName`, in the order they were registered, passing the supplied arguments
to each.

Note that the listener function attached to the `kgsPoller` object is called
as a method on the object (The `this` keyword is set to `poller`).

Returns `true` if the event had listeners, `false` otherwise.

#### poller.send(message[, onSuccess[, onError]])

#### boolean = poller.isLoggedIn()

Returns a Boolean value telling whether you are logged in or not.

```js
// log in safely
if (!poller.isLoggedIn()) {
    poller.send({
        type: "LOGIN",
        ...
    });
}
```

```js
// send a message safely
if (poller.isLoggedIn()) {
    poller.send({
        type: "TYPE_OTHER_THAN_LOGIN",
        ...
    });
}
```

### Events

#### KGS_MESSAGE_TYPE

Emitted when a KGS message is received from the server.
All the uppercase event names are reserved for the KGS protocol.

#### message

Emitted when a KGS message is received from the server.

#### error

Emitted when an error occurs within a `kgsPoller` instance.

If a `kgsPoller` does not have at leaset one listener registered for
the `error` event, and an `error` event is emitted, the error is thrown.

#### startPolling

Emitted when a `kgsPoller` instance starts polling.

#### stopPolling

Emitted when a `kgsPoller` instance stops polling.

#### login

Emitted when you log in.

#### logout

Emitted when you log out.

### Errors

#### kgsPollerPollingError

#### kgsPollerNotLoggedInError

You tried to send a message when you were not logged in.

#### kgsPollerAlreadyLoggedInError

You tried to log in when you were already logged in.

## Requirements

This module requires the following methods/properties introduced in ES5:

- `Array#forEach`
- `Array#indexOf`
- `Datey.now`
- `JSON.parse`
- `JSON.stringify`
- `Object.create`
- `Object.keys`

This module requires the following methods/properties introduced in
XMLHttpRequest Level 2:

- `XMLHttpRequest#onload`
- `XMLHttpRequest#onerror`
- `XMLHttpRequest#response`
- `XMLHttpRequest#withCredentials`

## See Also

- [KGS Protocol](http://www.gokgs.com/help/protocol.html)
- [Node.js - EventEmitter](https://nodejs.org/api/events.html)

## Author

Ryo Anazawa (anazawa@metakgs.org)

## License

MIT

