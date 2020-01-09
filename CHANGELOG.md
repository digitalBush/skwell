## 5.x

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
