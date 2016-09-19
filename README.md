# kgsClient

Polling library for the KGS protocol

[![Build Status](https://travis-ci.org/anazawa/kgsclient.svg)](https://travis-ci.org/anazawa/kgsclient)


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
<script src="index.js"></script>
```

In your JavaScript:

```js
var client = kgsClient({
    logger: window.console
});

client.on("message", function (message) {
    message;
    // => {
    //     type: "HELLO",
    //     versionMajor: 3,
    //     ...
    // }
});

client.send({
    type: "LOGIN",
    name: "myname",
    password: "pa55word",
    locale: "en_US"
});
```

## Description

NOTE: This is an early release, and implementation details of this module
are still very much in flux. Feedback is welcome.

### Attributes

#### url = client.url()

Can be used to get the API endpoint.
Defaults to `"https://metakgs.org/api/access"`.

#### logger = client.logger()

#### self = client.logger(logger)

Can be used to get or set a logger object. Defaults to a `kgsClient.nullLogger`
object that does nothing. A logger object must implement `#log`, `#info`, `#warn`,
`#error` and `#debug` methods.

#### state = client.state()

Can be used to get the current state of `client`.
Defaults to `kgsClient.LOGGED_OUT`.
Returns one of the following values:

##### kgsClient.LOGGING_IN

Indicates you are logging in. You can't send any messages.

##### kgsClient.LOGGED_IN

Indicates you are logged in. You can send any message except for
a `LOGIN` message.

##### kgsClient.LOGGING_OUT

Indicates you are logging out. You can't send any messages.

##### kgsClient.LOGGED_OUT

Indicates you are logged out. You can send only a `LOGIN` message.

See also the event named `stateChange`.

### Instance Methods

#### eventNames = client.eventNames()

Returns an array listing the events for which the emitter has registered
listeners.

#### listeners = client.on(eventName)

Returns a copy of the array of listeners for the event named `eventName`.

#### self = client.on(eventName, listener)

Adds the `listener` function to the end of the listeners array
for the event named `eventName`. No checks are made to see if the `listener`
has already been added. Multiple calls passing the same combination of
`eventName` and `listener` will result in the `listener` being added,
and called, multiple times.

Returns the invocant so calls can be chained.

#### self = client.once(eventName, listener)

Adds a one time `listener` function for the event named `eventName`.
The next time `eventName` is triggered, this listener is removed
and then invoked.

```js
client.
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

#### self = client.off(eventName, listener)

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

#### self = client.off(eventName)

#### self = client.off()

Removes all listeners, or those of the specified `eventName`.

Returns the invocant so calls can be chained.

#### listenerCount = client.emit(eventName, [arg1[, arg2, ...]])

Synchronously calls each of the listeners registered for the event named
`eventName`, in the order they were registered, passing the supplied arguments
to each.

Note that the listener function attached to the `kgsClient` object is called
as a method on the object (The `this` keyword is set to `client`).

Returns `true` if the event had listeners, `false` otherwise.

#### client.send(message[, onSuccess[, onError]])

### Events

#### message

Emitted when a KGS message is received from the server.

#### stateChange

Emitted when `#state` is updated. The listeners registered for this event
are called with two parameters; the new value and the old one.

```js
var isLoggedIn;
client.on("stateChange", function (state) {
    if (state === kgsClient.LOGGED_IN) {
        isLoggedIn = true;
    }
    else if (state === kgsClient.LOGGED_OUT) {
        isLoggedIn = false;
    }
});
```

#### error

Emitted when an error occurs within a `kgsClient` instance.

If a `kgsClient` does not have at leaset one listener registered for
the `error` event, and an `error` event is emitted, the error is thrown.

#### pollError

Emitterd when `client` stopped polling `#url` unexpectedly.
The listeners registered for this event are called with an `XMLHttpRequest`
object that was used to poll `#url`.

## Requirements

This module requires the following methods/properties introduced in ES5:

- `Array#forEach`
- `Array#indexOf`
- `JSON.parse`
- `JSON.stringify`
- `Object.create`
- `Object.keys`

This module requires the following methods/properties introduced in
XMLHttpRequest Level 2:

- `XMLHttpRequest#addEventListener`
- `XMLHttpRequest#dispatchEvent`
- `XMLHttpRequest#response`
- `XMLHttpRequest#withCredentials`

## See Also

- [KGS Protocol](http://www.gokgs.com/help/protocol.html)
- [Node.js - EventEmitter](https://nodejs.org/api/events.html)

## Author

Ryo Anazawa (anazawa@metakgs.org)

## License

MIT

