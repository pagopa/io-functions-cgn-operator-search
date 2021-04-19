# 2. Read model in Postgres

Date: 2021-04-14

## Status

Accepted

## Context

We have to decide about the technical solution for the search api read model

## Decision

Considering the magnitude of the data to be queried and the frequency of the queries to be performed, a Postgres instance properly configured will fully satisfy the requirements, without the need to add new elements to the architecture (like ElasticSearch or others).
We would need to create a dedicated denormalized materialised view to improve the performance.

## Consequences

We can still add Postgres read replica, in case of incresed demand on the query side.
