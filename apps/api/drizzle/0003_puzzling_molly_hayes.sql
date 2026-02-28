-- Convert the price table into a TimescaleDB hypertable partitioned by the "time" column.
SELECT create_hypertable('price', by_range('time'));