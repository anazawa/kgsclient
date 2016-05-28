# kgsPoller

## Synopsis

In your HTML:

```html
<script src="kgspoller.js"></script>
```

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
        case "kgsPollerConnectionError":
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

poller.send({
    type: "LOGOUT"
});
```

## Description

### Attributes

#### url = poller.url()

Returns the API endpoint. Defaults to `http://metakgs.org/api/access`.

#### logger = poller.logger()

#### self = poller.logger(logger)

Can be used to get or set a logger object. Defaults to `kgsPoller.nullLogger`
that does nothing. A logger object must implement `log`, `info`, `warn`,
`error` and `debug` methods.

### Methods

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

Returns the invocant so calls can be chained.

#### self = poller.off(eventName, listener)

Removes the specified `listener` from the listner array
for the event named `eventName`.

Note that this method will remove, at most, one instance of a listener
form the listener array. If any single listner has been added multiple times
to the listener array for the specified `eventName`, then this method
must be called multiple times to remove each instance.

Note also that onece an event has been emitted, all listeners attached to it
at the time of emitting will be called in order. This implies that
any `#off` calles *after* emitting and *before* the last listener finished
execution will not remove them from `#emit` in progress.
Subsequent events will behave as expected.

Returns the invocant so calls can be chained.

#### self = poller.off(eventName)

#### self = poller.off(listener)

#### self = poller.off()

Removes all listeners.
Returns the invocant so calls can be chained.

#### listenerCount = poller.emit(eventName, [arg1[, arg2, ...]])

### Event Names

All the uppercase event names are reserved for the KGS JSON protocol.

#### message

#### error

### Errors

#### kgsPollerConnectionError

#### kgsPollerNotLoggedInError

#### kgsPollerAlreadyLoggedInError

## Requirements

- `Array#forEach`
- `Array#indexOf`
- `Object.keys`
- `XMLHttpRequest#response`
- `XMLHttpRequest#onload`
- `XMLHttpRequest#onerror`

## See Also

- [KGS Protocol](http://www.gokgs.com/help/protocol.html)
- [Node.js - Events](https://nodejs.org/api/events.html)

## Author

Ryo Anazawa (anazawa@metakgs.org)

## License

MIT

