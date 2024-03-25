## 11.x

### 11.2.0

* update dev deps
* bump tedious to drop punycode warning

### 11.1.0

* feat: add ability to disable pool.

### 11.0.1

* Bump tedious to 16.6.1.

### 11.0.0

* Drop Node 16
* update generic-pool to latest
* Update tedious to latest + better TVP support
* Update dev deps
* Updated file loader to support file:// caller paths from ESM

## 10.x

### 10.2.0

* Added missing definition for begin/end transaction

### 10.1.0

* Let's not publish the spec folder...
* Added typescript definitions file

### 10.0.0

* Added option for multi subnet failover.

## 9.x

### 9.0.0

* Update tedious
* Updating dev deps + npm audit fix
* Adding close handler

## 8.x

### 8.0.1

* Fix issue with table params using reserved words

### 8.0.0

* 8.0.0-new-tedious.0
* audit fix
* Fix issue when unable to connect to server within async call stack
* Update to latest generic-pool
* Update dev depdendencies
* Update to latest tedious

## 7.x

### 7.0.0

* Upgraded to latest tedious + latest node LTS

## 6.x

### 6.0.1

* Fix security issues and update a few dependencies

### 6.0.0

* Updated non-dev dependencies.
* Updated dev dependencies + node 12
* Added support for tvp params

## 5.x

### 5.6.0

* Exposing types at the module entry point so we can avoid having to have a client instance to reference types.

### 5.5.0

* Added transaction hooks.

### 5.4.0

* Added support for sprocs

### 5.3.1

* Added missing tinyint type.

### 5.3.0

* Instead of scanning types from tedious, list them explicitly. We needed to get better type declarations for json schema when doing table based parameters.

### 5.2.0

* Updated tedious config mapping to use new non-deprecated format
* Bump lodash from 4.17.11 to 4.17.15

### 5.1.0

* Updated dev deps
* Update tedious to 5.0.3

### 5.0.1

* Added tests to support fixes for unhandled rejections
* Resolved potential unhandled rejection errors on both connection and request timeouts

### 5.0.0

* Fixed/Added tests for new behavior
* Changed client to emit tedious errors

## 4.x

### 4.0.0

* Updated README to match current API.
* BREAKING: Removed ambient transactions.

## 3.x

### 3.1.0

* Capture call stack for stream errors to give better context when stuff breaks.
* Capture call stack when querying to give better context on errors.

### 3.0.0

* Add abortTransactionOnError option with default to true

## 2.x

### 2.2.0

* Added ability to pass bulk load options to tedious

### 2.1.0

* Bumped packages and adjusted test to use username from config.
* Fixed stream behavior to honor backpressure

### 2.0.0

* Updated all outdated packages.
* Added metadata to stream output.
* Updated to latest tedious

## 1.x

### 1.1.0

* Added configurable request timeout.
