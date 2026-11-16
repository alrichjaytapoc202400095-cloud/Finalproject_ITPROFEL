// OBSERVER (B.5.3): the order service emits events; subscribers react.
// Adding a listener never requires editing the order service.
const EventEmitter = require('events');

class OrderEventBus extends EventEmitter {}

const bus = new OrderEventBus();
bus.setMaxListeners(20);

// Events emitted by the system:
//   'order.statusChanged' { order, from, to, actor, note }
//   'order.paid'          { order }
//   'reservation.released'{ order }

module.exports = bus;
