---
title: "Simplify Secrets Management with LaconiaJS"
date: 2020-06-30
slug: laconia-secrets
---

# Simplify Secrets Management with LaconiaJS

The boilerplate required to retrieve secrets from AWS makes serverless applications harder to build and test than they should be.

Not only are there two services to choose from (Secrets Manager and SSM Parameter Store), but neither provides a way to inject secrets into a Lambda at runtime. We have to pick one and write the retrieval code ourselves. Outrageous!

![A cat typing furiously](https://media.giphy.com/media/kfuef33tMMTjeC2pF7/giphy.gif)

---

## The Problem

Say I need a function that retrieves two secrets:
- A Stripe key stored in Secrets Manager
- An API key for our company's Serious Business Service™ in SSM Parameter Store

Here's the code using the AWS SDK:
```javascript
const SecretsManager = require('aws-sdk/clients/secretsmanager');
const SSM = require('aws-sdk/clients/ssm');

module.exports.handler = async () => {
  // retrieve stripe keys
  const secretsManager = new SecretsManager({ region: 'eu-west-1' });
  const { SecretString } = await secretsManager
    .getSecretValue({ SecretId: 'external/stripe' })
    .promise();
  const stripe = JSON.parse(SecretString);

  // retrieve api key
  const ssm = new SSM({ region: 'eu-west-1' });
  const { Value: apiKey } = await ssm
    .getParameter({ Name: 'sb-api-key' })
    .promise();

  // serious business logic follows 🐒
  // ...
};
```

Other than being verbose, there are real problems here:

- **Tight coupling** — If we want to move the API key to Secrets Manager, we have to change application code. That's probably why it's still in SSM.
- **Testing is painful** — You can't unit test the business logic without mocking SSM and Secrets Manager calls.

---

## The LaconiaJS Solution

Define two environment variables using your deployment framework of choice:
```bash
LACONIA_CONFIG_STRIPE=secretsManager:external/stripe
LACONIA_CONFIG_SB_API_KEY=ssm:sb-api-key
```

Then write your handler:
```javascript
const laconia = require('@laconia/core');
const config = require('@laconia/config');

function seriousBusiness(lambdaInput, { stripe, sbApiKey }) {
  // stripe and sbApiKey are passed in by Laconia
}

module.exports.handler = laconia(seriousBusiness)
  .register(config.envVarInstances());
```

Less code. More malleable. And testing becomes trivial — just pass in whatever values you want:
```javascript
test('serious business test', async () => {
  const input = {};
  const result = await seriousBusiness(input, {
    stripe: 'abc',
    sbApiKey: '123'
  });
  expect(result).toEqual({ message: 'Serious Business Complete' });
});
```

No mocking AWS. No connecting to production resources. Just call the function.

---

## Wrapping Up

I'm pretty new to LaconiaJS but it's already making serverless development more productive. Less boilerplate, more focus on actual business logic. If you want to learn more, check out [laconiajs.io](https://laconiajs.io/).
