#!/bin/bash

sleep 10

echo "Preparing dump file from Test environment DB...."
echo "configuring PGPASSWORD=$PG_TEST_PASSWORD"
echo "configuring PG_TEST_HOST=$PG_TEST_HOST"
echo "configuring PG_TEST_USER=$PG_TEST_USER"
echo "configuring PG_TEST_DBNAME=$PG_TEST_DBNAME"
echo "configuring PG_OPTIONS=$PG_OPTIONS"
PGPASSWORD=$PG_TEST_PASSWORD PGOPTIONS=$PG_OPTIONS pg_dump -h $PG_TEST_HOST -U $PG_TEST_USER -Ft $PG_TEST_DBNAME > test-backup.tar
echo "Done."
echo "Preparing restore for local DB..."
pg_restore --role=compose-postgres -Ft --dbname=postgres://compose-postgres:compose-postgres@postgres:5432/compose-postgres < test-backup.tar
echo "Done."