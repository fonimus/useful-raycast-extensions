# Kafka extension

> Extension to quickly consult topics and consumers of kafka broker

## Configuration

| Name            | Required | Default   | Description                                  |
|-----------------|----------|-----------|----------------------------------------------|
| configDirectory | Yes      | ~/.kafka/ | Configuration directory containing env files |

### Environment file

Environment file must be a json in the configuration directory with following
fields :

````typescript
export interface KafkaEnv {
  // env name to display on raycast dropdown
  name: string;
  // to filter topics by keyword(s)
  filterTopics?: string[];
  // to filter consumers by keyword(s)
  filterConsumers?: string[];
  // kafka js configuration for broker, authentication, etc
  kafkaJs: KafkaConfig;
}
````

Following [kafkaJS](https://kafka.js.org/) configuration is used by default :

````typescript
const defaultConfiguration = {
  connectionTimeout: 10000,
  requestTimeout: 30000,
  ssl: {
    rejectUnauthorized: false
  },
  logLevel: logLevel.ERROR
};
````

More info on configuring
[kafkaJS](https://kafka.js.org/) [here](https://kafka.js.org/docs/configuration)

_Example_

````json
{
  "name": "Dev",
  "filterTopics": [
    "my-prefix-for-dev"
  ],
  "filterConsumers": [
    "dev",
    "def"
  ],
  "kafkaJs": {
    "brokers": [
      "kafka-host:kafka-port"
    ],
    "sasl": {
      "mechanism": "plain",
      "username": "user",
      "password": "password"
    }
  }
}

````

## Kafka command

- List and consult topic configurations
- List consumers with state, members and overall lag

## Kafka menu bar command

Have kafka in menu bar with background actualization every 5 minutes
