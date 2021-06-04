#!/bin/bash

sleep 10

pg_restore --dbname=postgres://compose-postgres:compose-postgres@postgres:5432/postgres /postgres-database.backup