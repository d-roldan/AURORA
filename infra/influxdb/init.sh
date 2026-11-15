#!/bin/sh
set -eu
influx bucket create --name aegis_waveforms --retention 168h --org "$DOCKER_INFLUXDB_INIT_ORG" --token "$DOCKER_INFLUXDB_INIT_ADMIN_TOKEN"
influx bucket create --name aegis_features --retention 2160h --org "$DOCKER_INFLUXDB_INIT_ORG" --token "$DOCKER_INFLUXDB_INIT_ADMIN_TOKEN"
