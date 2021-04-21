# IO Functions CGN Operator Search

Azure Functions dedicated to CGN's Operator Search project (Carta Giovani Nazionale). These functions implements business logic for:

 * Operator Search
 * Discount Search


## Local development

```shell
cp env.example .env
```

Replace in .env file the envs with the proper values.

```shell
yarn install
yarn build
docker-compose up -d --build
docker-compose logs -f functions
open http://localhost/some/path/test
```

## Deploy

Deploy appens with this [pipeline](./.devops/deploy-pipelines.yml)
(workflow) configured on [Azure DevOps - io-functions-cgn](https://dev.azure.com/pagopa-io/io-functions-cgn-operator-search).

## TODO rimanenti da IO Functions template

- modificare l' endpoint di healthcheck all' interno del file `deploy-pipelines.yml` in base al `basePath` configurato.

- fare una PR sul progetto [gitops](https://github.com/pagopa/gitops) per deployare le pipelines. (un esempio [qui](https://github.com/pagopa/gitops/pull/11) )

- fare una PR sul progetto [io-infrastructure-live-new](https://github.com/pagopa/io-infrastructure-live-new) per fare il stetup degli ambienti di prod e staging della nuova function. (un esempio [qui](https://github.com/pagopa/io-infrastructure-live-new/pull/465) )
