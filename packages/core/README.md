# @sourceloop/core

[![LoopBack](<https://github.com/strongloop/loopback-next/raw/master/docs/site/imgs/branding/Powered-by-LoopBack-Badge-(blue)-@2x.png>)](http://loopback.io/)

![npm](https://img.shields.io/npm/dm/@sourceloop/core)

![node-current (scoped)](https://img.shields.io/node/v/@sourceloop/core)

![npm (prod) dependency version (scoped)](https://img.shields.io/npm/dependency-version/@sourceloop/core/@loopback/core)

## Overview

`@sourceloop/core` is the [application core](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/) for the `sourceloop`. It contains

- adapters
- commands
- components
- constants
- decorators
- enums
- mixins
- models
- providers
- repositories
- sequence handlers
- utilities

that are used throughout the service catalog.

### Adapters

Adapters help objects with different interfaces collaborate. Here’s how it works:

- The adapter gets an interface, compatible with one of the existing objects.
- Using this interface, the existing object can safely call the adapter’s methods.
- Upon receiving a call, the adapter passes the request to the second object, but in a format
  and order of that the second object.It can act two-way adapter that can convert the calls in both directions.

```ts
export class AnyAdapter implements Adapter<any, any> {
  adaptToModel(resp: any): any {
    return resp;
  }
  adaptFromModel(data: any): any {
    return data;
  }
}

export interface Adapter<T, R> {
  adaptToModel(resp: R, ...rest: any[]): T;
  adaptFromModel(data: T, ...rest: any[]): R;
}
```

![Adapter](https://refactoring.guru/images/patterns/diagrams/adapter/solution-en.png?id=5f4f1b4575236a3853f274b690bd6656.jpg)

### Command

The interface contains parameters(optional) accepted by that command implementing this interface and an execute function.It's used to create different commands like save,update or delete that accepts some parameters and execute function using these parameters

```ts
export interface ICommand {
  parameters?: any;
  execute(): Promise<any>;
}

export class SaveCommand implements ICommand {
  public parameters: SaveStateParameters;
  execute(): Promise<any> {
    //This is intentional.
  }
}
```

### Component

Components serves like a vehicle to group extension contributions as context Bindings and various artifacts to allow easier extensibility in Application.
Sourceloop core provides three components i.e.bearer-verifier,logger-extension and swagger-authentication

### Bearer Verifier

## Usage

- In order to use this component in any service.Import the following:

```ts
import {
  BearerVerifierBindings,
  BearerVerifierComponent,
  BearerVerifierConfig,
  BearerVerifierType,
} from '@sourceloop/core';
```

- Bind it in inbuilt setUpSequence() as follows along with providing the BearerVerifierComponent :

```ts
setupSequence() {
    this.application.sequence(ServiceSequence);

    // Mount authentication component for default sequence
    this.application.component(AuthenticationComponent);
    // Mount bearer verifier component
    this.application.bind(BearerVerifierBindings.Config).to({
      authServiceUrl: '',
      type: BearerVerifierType.service,
    } as BearerVerifierConfig);
    this.application.component(BearerVerifierComponent);
}
```

## Logger-Extension

### Usage

- Create a new Loopback4 Application (If you don't have one already)
  `lb4 testapp`.
- Configure `@sourceloop/core` component to include `LoggerExtensionComponent` -
  ```typescript
  this.bind(LOGGER.BINDINGS.LOG_ACTION.toProvider(
  LoggerProvider,
  );
  ```
- Start the application
  `npm start`

## Swagger Authentication Component

A Loopback Component that adds an authenticating middleware for Rest Explorer

### Installation

```bash

npm i @sourceloop/authentication-service

```

### Usage

- Create a new Loopback4 Application (If you don't have one already)
  `lb4 testapp`
- Install the authentication service
  `npm i @sourceloop/core`
- Configure `@sourceloop/core` component to include `SwaggerAuthenticateComponent` -
  ```typescript
  this.bind(SFCoreBindings.config).to({
    authenticateSwaggerUI: true,
    swaggerUsername: '<username>',
    swaggerPassword: '<password>',
  });
  ```
- Bind the `HttpAuthenticationVerifier` to override the basic authentication logic provided by [default](/providers/http-authentication.verifier.ts).
- Start the application
  `npm start`

### Decorators

## Overview

Decorators provide annotations for class methods and arguments. Decorators use
the form `@decorator` where `decorator` is the name of the function that will be
called at runtime.

## Basic Usage

### txIdFromHeader

This simple decorator allows you to annotate a `Controller` method argument. The
decorator will annotate the method argument with the value of the header
`X-Transaction-Id` from the request.

**Example**

```ts
class MyController {
  @get('/')
  getHandler(@txIdFromHeader() txId: string) {
    return `Your transaction id is: ${txId}`;
  }
}
```

### Enums

Enums helps in defining a set of named constants. Using enums can make it easier to document intent, or create a set of distinct cases for both numeric and string-based enums.

For all the enums provided in here, see `packages/core/src/enums`.

### Mixins

You can find documentation for mixins. [here](/src/mixins)

### Models

A model describes business domain objects(shape of data) to be persisted in the database, for example, Customer, Address, and Order. It usually defines a list of properties with name, type, and other constraints.We use decorators @model and @property to annotate or modify the Class members and Class respectively which helps in manipulating the metadata or even integrate with JSON Schema generation.

```ts
export abstract class UserModifiableEntity extends BaseEntity {
  @property({
    type: 'string',
    name: 'created_by',
  })
  createdBy?: string;

  @property({
    type: 'string',
    name: 'modified_by',
  })
  modifiedBy?: string;
}
```

In order to use models provided, in your application:

- Extend your model class with name of model's class provided in sourceloop core i.e. UserModifiableEntity(for example) replacing entity that will add two attributes to the model Class i.e. createdBy and modifiedBy of this model.

For all models provided in here, see [here]`packages/core/src/models`.

### Providers

You can find documentation for the providers available .[here](/src/providers)

### Repositories

A Repository represents a specialized Service Interface that provides strong-typed data access (for example, CRUD) operations of a domain model against the underlying database or service
Repositories are adding behavior to Models. Models describe the shape of data, Repositories provide behavior like CRUD operations.

![Repository](https://loopback.io/pages/en/lb4/imgs/repository.png)

DefaultUserModifyCrudRepository -A repository Class which will provide CRUD operations for default user modifications.

Extend repositories with DefaultUserModifyCrudRepository Class replacing DefaultCrudRepository. For example,

```ts
export class UserRepository extends DefaultUserModifyCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
> {
  public readonly tenant: BelongsToAccessor<Tenant, typeof User.prototype.id>;

  public readonly credentials: HasOneRepositoryFactory<
    UserCredentials,
    typeof User.prototype.id
  >;

  public readonly userTenants: HasManyRepositoryFactory<
    UserTenant,
    typeof User.prototype.id
  >;

  constructor(
    @inject(`datasources.${UserTenantDataSourceName}`)
    dataSource: juggler.DataSource,
    @inject.getter(AuthenticationBindings.CURRENT_USER)
    protected readonly getCurrentUser: Getter<
      IAuthUserWithPermissions | undefined
    >,
    @repository.getter('TenantRepository')
    protected tenantRepositoryGetter: Getter<TenantRepository>,
    @repository.getter('UserCredentialsRepository')
    protected userCredentialsRepositoryGetter: Getter<UserCredentialsRepository>,
    @repository.getter('UserTenantRepository')
    protected userTenantRepositoryGetter: Getter<UserTenantRepository>,
    @inject('models.User')
    private readonly user: typeof Entity & {prototype: User},
  )
```

![Connector](https://loopback.io/images/9830486.png)

### Sequence Handlers

Sourceloop Core has sequences that can be used in application providing casbin-secure sequence,secure-sequence and service sequence.

## Usage

-import the sequence you want to use.for example,import ServiceSequence in your application component file.

```ts
import {ServiceSequence} from '@sourceloop/core';
```

-There is an inbuilt setUpSequence() that will enable user to provide these sequences as per requirement.

```ts
if (!this.config?.useCustomSequence) {
  this.setupSequence();
}
```

as follows:

```ts
setupSequence() {
    if (
      !this.config.controller?.authenticate ||
      !this.config.controller.authorizations
    ) {
      throw new HttpErrors.InternalServerError(Errors.AUTHENTICATION_SETUP);
    }
    //providing ServiceSequence here.
    this.application.sequence(ServiceSequence);

    // Mount authentication component for default sequence
    this.application.component(AuthenticationComponent);
    // Mount bearer verifier component
    this.application.bind(BearerVerifierBindings.Config).to({
      authServiceUrl: '',
      type: BearerVerifierType.service,
    } as BearerVerifierConfig);
    this.application.component(BearerVerifierComponent);

    // Mount authorization component for default sequence
    this.application.bind(AuthorizationBindings.CONFIG).to({
      allowAlwaysPaths: ['/explorer'],
    });
    this.application.component(AuthorizationComponent);
  }
}
```

-You can also use custom sequence instead by providing custom sequence name in the application.

![sequence](https://loopback.io/pages/en/lb4/imgs/middleware.png)

### Installation

```bash
npm install @sourceloop/core
```
