-- Convert the exchange_rate table into a TimescaleDB hypertable partitioned by the "time" column.
SELECT create_hypertable('exchange_rate', by_range('time'));