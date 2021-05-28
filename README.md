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
(workflow) configured on [Azure DevOps - io-functions-cgn](https://dev.azure.com/pagopaspa/cgn-onboarding-portal-projects/_build?definitionId=34).

## Stress Test

* Edit jmx file
* Add some valid merchant id to csv file taken from `select agreement_k from agreement;`
* Launch jmeter Test

```shell
jmeter -n -t Jmeter_function_test.jmx -l run-$(date ‘+%Y%m%d%H%M’).log -e  -o report-output-$(date ‘+%Y%m%d%H%M’) -JCODE=key -JHOST=function-os.azurewebsites.net -JPORT=443 -JPROTOCOL=https
```
