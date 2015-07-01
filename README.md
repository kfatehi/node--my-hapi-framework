# my-hapi-framework
a super simple hapi "microframework". supports sequelize

All options into the constructor are in fact optional.

## Configuration

Configuration is passed in as a single object.

It is completely optional. Pass in nothing to use of sensible defaults.

## Methods

### createServer

Takes no arguments.

Returns returns a bluebird promise that resolves with the hapi server.

## Example

In the example below, we have a folder tree that looks as such:

```
src
├── auth
│   └── bearer.js
├── models
│   ├── index.js
│   └── users.js
├── plugins
│   ├── auth-bearer-simple.js
│   ├── good.js
│   └── lout.js
└── routes
│   ├── authorize.js
│   ├── facebook-connect.js
│   ├── session.js
│   └── users.js
└── server.js
```

This is a good `server.js` for loading such a convention.

Alternative conventions can be established by passing in more options.

For more information, look at `index.js` and search for everywhere you see `config`

```js
module.exports = require('my-hapi-framework')({
  start: require.main === module, // so that you can unit test the server easily
  path: require('path').join(__dirname, 'src'), // to store your files outside the project root
  db: { // in this case we will use a database
    sequelize: require('./src/models').sequelize, // provide the sequelize instance
    sync: { // existence of this key means we should sync the database
      force: process.env.FORCE_SYNC // force sync will be controlled by env var
    }
  }
})
```
