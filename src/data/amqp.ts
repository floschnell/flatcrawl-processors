import * as amqp from 'amqplib';
import {
  AMQP_HOST,
  AMQP_PASSWORD,
  AMQP_EXCHANGE,
  AMQP_USERNAME,
  TEST,
} from '../config';
import { Flat } from '../models/flat';

import { Observable } from 'rxjs';

function connectToAMQP() {
  console.log("Trying to connect to", AMQP_HOST);
  return amqp.connect({
    hostname: AMQP_HOST,
    password: AMQP_PASSWORD,
    port: 5672,
    protocol: 'amqp',
    username: AMQP_USERNAME,
  }).then((connection) => {
    console.log("Connected to", AMQP_HOST);
    return connection.createChannel();
  }).catch(async () => {
    console.warn("Connection to", AMQP_HOST, "failed, trying to connect again ...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectToAMQP();
  });
}

export const onNewFlat: Observable<Flat> = Observable.create(observer => {
  let exchange_name = `${TEST ? "test_" : ""}${AMQP_EXCHANGE}`;
  connectToAMQP().then(channel => {
    channel.assertExchange(exchange_name, "fanout", {
      durable: false,
    }).then(() => {
      channel.assertQueue(null, {
        autoDelete: true,
        durable: false,
        exclusive: true,
      }).then((result) => {
        channel.bindQueue(result.queue, exchange_name, "").then(() => {
          channel.consume(result.queue, (message) => {
            const content = JSON.parse(message.content.toString('utf-8'));
            const flat = new Flat(content);
            observer.next(flat);
            channel.ack(message);
          });
        });
      });
    });
  });
});
