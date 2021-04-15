# 2. Rest API

Date: 2021-04-14

## Status

Accepted

## Context

We need to decide in which way the API will be exposed: REST or GraphQL.

## Decision

Considering that the data is pretty simple, with a plain structure and there are basically 2 query patterns, we decided to proceed with REST.

## Consequences

In case the complexity of the data will change in future this decision is not blocking the possibility to add GraphQL API at the same time on a dedicated endpoint.
