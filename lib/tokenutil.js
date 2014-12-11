var crypto = require('crypto');
var qs = require('querystring');
var url = require('url');

module.exports = (function() {

  //-------------------------------------------------------------------
  // /common.util/util.js

  var azureutil = {};

  azureutil.isDate = function(value) {
    return Object.prototype.toString.call(value) === '[object Date]';
  };

  azureutil.objectIsNull = function(value) {
    return value === null || value === void 0;
  };

  azureutil.truncatedISO8061Date = function(date) {
    var dateString = date.toISOString();
    return dateString.substring(0, dateString.length - 5) + 'Z';
  };

  /**
   * Checks if a value is an empty string, null or undefined.
   *
   * @param {object} value The value to check for an empty string, null or undefined.
   * @return {bool} True if the value is an empty string, null or undefined, false otherwise.
   */
  azureutil.stringIsEmpty = function(value) {
    return this.objectIsNull(value) || value === '';
  };

  //-------------------------------------------------------------------
  // /common/util/constants.js

  // 
  // Copyright (c) Microsoft and contributors.  All rights reserved.
  // 
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //   http://www.apache.org/licenses/LICENSE-2.0
  // 
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // 
  // See the License for the specific language governing permissions and
  // limitations under the License.
  // 

  var storageDnsSuffix = 'core.windows.net';

  /**
   * Defines constants.
   */
  var Constants = {

    /**
     * Defines constants for use with blob operations.
     */
    BlobConstants: {

      /**
       * Resource types.
       *
       * @const
       * @enum {string}
       */
      ResourceTypes: {
        CONTAINER: 'c',
        BLOB: 'b'
      }
    },

    /**
     * Defines constants for use with HTTP headers.
     */
    HeaderConstants: {

      /**
       * The master Windows Azure Storage header prefix.
       *
       * @const
       * @type {string}
       */
      PREFIX_FOR_STORAGE_HEADER: 'x-ms-',

      /**
       * The current storage version header value.
       *
       * @const
       * @type {string}
       */
      TARGET_STORAGE_VERSION: '2014-02-14',
    },

    QueryStringConstants: {

      /**
       * The signed start time query string argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      SIGNED_START: 'st',

      /**
       * The signed expiry time query string argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      SIGNED_EXPIRY: 'se',

      /**
       * The signed resource query string argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      SIGNED_RESOURCE: 'sr',

      /**
       * The signed permissions query string argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      SIGNED_PERMISSIONS: 'sp',

      /**
       * The signed identifier query string argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      SIGNED_IDENTIFIER: 'si',

      /**
       * The signature query string argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      SIGNATURE: 'sig',

      /**
       * The signed version argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      SIGNED_VERSION: 'sv',

      /**
       * The cache control argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      CACHE_CONTROL: 'rscc',

      /**
       * The content type argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      CONTENT_TYPE: 'rsct',

      /**
       * The content encoding argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      CONTENT_ENCODING: 'rsce',

      /**
       * The content language argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      CONTENT_LANGUAGE: 'rscl',

      /**
       * The content disposition argument for shared access signature.
       *
       * @const
       * @type {string}
       */
      CONTENT_DISPOSITION: 'rscd',
    },

    VersionConstants: {
      /**
       * Constant for the 2013-08-15 version.
       *
       * @const
       * @type {string}
       */
      AUGUST_2013: '2013-08-15',

      /**
       * Constant for the 2012-02-12 version.
       *
       * @const
       * @type {string}
       */
      FEBRUARY_2012: '2012-02-12'
    }
  };

  var BlobConstants = Constants.BlobConstants;
  var HeaderConstants = Constants.HeaderConstants;
  var QueryStringConstants = Constants.QueryStringConstants;
  var RequestLocationMode = Constants.RequestLocationMode;
  var VersionConstants = Constants.VersionConstants;

  //-------------------------------------------------------------------
  // /common/signing/hmacsha256sign.js

  // 
  // Copyright (c) Microsoft and contributors.  All rights reserved.
  // 
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //   http://www.apache.org/licenses/LICENSE-2.0
  // 
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // 
  // See the License for the specific language governing permissions and
  // limitations under the License.

  /**
   * Creates a new HmacSHA256Sign object.
   *
   * @constructor
   */
  function HmacSha256Sign(accessKey) {
    this._accessKey = accessKey;
    this._decodedAccessKey = new Buffer(this._accessKey, 'base64');
  }

  /**
   * Computes a signature for the specified string using the HMAC-SHA256 algorithm.
   *
   * @param {string} stringToSign The UTF-8-encoded string to sign.
   * @return A String that contains the HMAC-SHA256-encoded signature.
   */
  HmacSha256Sign.prototype.sign = function(stringToSign) {
    // Encoding the Signature
    // Signature=Base64(HMAC-SHA256(UTF8(StringToSign)))

    return crypto.createHmac('sha256', this._decodedAccessKey).update(stringToSign, 'utf-8').digest('base64');
  };


  //-------------------------------------------------------------------
  // /common/signing/sharedkey.js

  // 
  // Copyright (c) Microsoft and contributors.  All rights reserved.
  // 
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //   http://www.apache.org/licenses/LICENSE-2.0
  // 
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // 
  // See the License for the specific language governing permissions and
  // limitations under the License.

  /**
   * Creates a new SharedKey object.
   *
   * @constructor
   * @param {string} storageAccount    The storage account.
   * @param {string} storageAccessKey  The storage account's access key.
   * @param {bool}   usePathStyleUri   Boolean value indicating if the path, or the hostname, should include the storage account.
   */
  function SharedKey(storageAccount, storageAccessKey, usePathStyleUri) {
    this.storageAccount = storageAccount;
    this.storageAccessKey = storageAccessKey;
    this.usePathStyleUri = usePathStyleUri;
    this.signer = new HmacSha256Sign(storageAccessKey);
  }


  /*
   * Retrieves the webresource's canonicalized resource string.
   * @param {WebResource} webResource The webresource to get the canonicalized resource string from.
   * @return {string} The canonicalized resource string.
   */
  SharedKey.prototype._getCanonicalizedResource = function(webResource) {
    var path = '/';
    if (webResource.path) {
      path = webResource.path;
    }

    var canonicalizedResource = '/' + this.storageAccount + path;

    // Get the raw query string values for signing
    var queryStringValues = webResource.queryString;

    // Build the canonicalized resource by sorting the values by name.
    if (queryStringValues) {
      var paramNames = [];
      Object.keys(queryStringValues).forEach(function(n) {
        paramNames.push(n);
      });

      paramNames = paramNames.sort();
      Object.keys(paramNames).forEach(function(name) {
        canonicalizedResource += '\n' + paramNames[name] + ':' + queryStringValues[paramNames[name]];
      });
    }

    return canonicalizedResource;
  };

  /*
   * Constructs the Canonicalized Headers string.
   *
   * To construct the CanonicalizedHeaders portion of the signature string,
   * follow these steps: 1. Retrieve all headers for the resource that begin
   * with x-ms-, including the x-ms-date header. 2. Convert each HTTP header
   * name to lowercase. 3. Sort the headers lexicographically by header name,
   * in ascending order. Each header may appear only once in the
   * string. 4. Unfold the string by replacing any breaking white space with a
   * single space. 5. Trim any white space around the colon in the header. 6.
   * Finally, append a new line character to each canonicalized header in the
   * resulting list. Construct the CanonicalizedHeaders string by
   * concatenating all headers in this list into a single string.
   *
   * @param {object} The webresource object.
   * @return {string} The canonicalized headers.
   */
  SharedKey.prototype._getCanonicalizedHeaders = function(webResource) {
    // Build canonicalized headers
    var canonicalizedHeaders = '';
    if (webResource.headers) {
      var canonicalizedHeadersArray = [];
      for (var header in webResource.headers) {
        if (header.indexOf(HeaderConstants.PREFIX_FOR_STORAGE_HEADER) === 0) {
          canonicalizedHeadersArray.push(header);
        }
      }

      canonicalizedHeadersArray.sort();

      for (var i = canonicalizedHeadersArray.length - 1; i >= 0; i--) {
        var currentHeader = canonicalizedHeadersArray[i];
        var value = webResource.headers[currentHeader];
        if (!azureutil.IsNullOrEmptyOrUndefinedOrWhiteSpace(value)) {
          canonicalizedHeaders += currentHeader.toLowerCase() + ':' + value + '\n';
        }
      }
    }

    return canonicalizedHeaders;
  };

  /**
   * Generates the query string for a shared access signature signing.
   *
   * @this {SharedAccessSignature}
   * @param {string}                     path                                          The path to the resource.
   * @param {object}                     sharedAccessPolicy                            The shared access policy.
   * @param {string}                     [sharedAccessPolicy.Id]                       The signed identifier.
   * @param {SharedAccessPermissions}    sharedAccessPolicy.AccessPolicy.Permissions   The permission type.
   * @param {date}                       [sharedAccessPolicy.AccessPolicy.Start]       The time at which the Shared Access Signature becomes valid.
   * @param {date}                       sharedAccessPolicy.AccessPolicy.Expiry        The time at which the Shared Access Signature becomes expired.
   * @param {string}                     sasVersion                                    A string indicating the desired SAS Version to use, in storage service version format. Value must be 2012-02-12 or later.
   * @parma {ResourceTypes}              [args.resourceType]                           The resource type, if the resource is a blob or container.  Null if the resource is a queue or table.
   * @parma {ResourceTypes}              [args.tableName]                              The table name, if the resource is a table.  Null if the resource is a blob orqueue.
   * @parma {ResourceTypes}              [args.queryString]                            The query string, if additional parameters are desired.
   * @param {object}                     [args.headers]                                The optional header values to set for a blob returned wth this SAS.
   * @param {string}                     [args.headers.CacheControl]                   The value of the Cache-Control response header to be returned when this SAS is used.
   * @param {string}                     [args.headers.ContentType]                    The value of the Content-Type response header to be returned when this SAS is used.
   * @param {string}                     [args.headers.ContentEncoding]                The value of the Content-Encoding response header to be returned when this SAS is used.
   * @param {string}                     [args.headers.ContentLanguage]                The value of the Content-Language response header to be returned when this SAS is used.
   * @param {string}                     [args.headers.ContentDisposition]             The value of the Content-Disposition response header to be returned when this SAS is used.
   * @return {object} The shared access signature query string.
   */
  SharedKey.prototype.generateSignedQueryString = function(path, sharedAccessPolicy, sasVersion, args) {
    var addIfNotNull = function(queryString, name, value) {
      if (!azureutil.objectIsNull(name) && !azureutil.objectIsNull(value)) {
        queryString[name] = value;
      }
    };

    var validateVersion = function(sasVersion) {
      // validate and add version
      if (azureutil.objectIsNull(sasVersion)) {
        return HeaderConstants.TARGET_STORAGE_VERSION;
      } else if (sasVersion === VersionConstants.AUGUST_2013) {
        return VersionConstants.AUGUST_2013;
      } else if (sasVersion === VersionConstants.FEBRUARY_2012) {
        return VersionConstants.FEBRUARY_2012;
      } else {
        throw new Error('SAS Version invalid. Valid versions include 2012-02-12 and 2013-08-15.');
      }
    };

    var formatAccessPolicyDates = function(accessPolicy) {
      if (!azureutil.objectIsNull(accessPolicy.Start)) {
        if (!azureutil.isDate(accessPolicy.Start)) {
          accessPolicy.Start = new Date(accessPolicy.Start);
        }

        accessPolicy.Start = azureutil.truncatedISO8061Date(accessPolicy.Start);
      }

      if (!azureutil.objectIsNull(accessPolicy.Expiry)) {
        if (!azureutil.isDate(accessPolicy.Expiry)) {
          accessPolicy.Expiry = new Date(accessPolicy.Expiry);
        }

        accessPolicy.Expiry = azureutil.truncatedISO8061Date(accessPolicy.Expiry);
      }
    };

    // set up optional args
    var queryString;
    var resourceType;
    var headers;
    var tableName;

    if (args) {
      queryString = args.queryString;
      resourceType = args.resourceType;
      tableName = args.tableName;
      headers = args.headers;
    }

    if (!queryString) {
      queryString = {};
    }

    // add shared access policy params
    if (sharedAccessPolicy.AccessPolicy) {
      formatAccessPolicyDates(sharedAccessPolicy.AccessPolicy);

      addIfNotNull(queryString, QueryStringConstants.SIGNED_START, sharedAccessPolicy.AccessPolicy.Start);
      addIfNotNull(queryString, QueryStringConstants.SIGNED_EXPIRY, sharedAccessPolicy.AccessPolicy.Expiry);
      addIfNotNull(queryString, QueryStringConstants.SIGNED_PERMISSIONS, sharedAccessPolicy.AccessPolicy.Permissions);
    }

    // validate and add version
    var validatedSASVersionString = validateVersion(sasVersion);
    addIfNotNull(queryString, QueryStringConstants.SIGNED_VERSION, validatedSASVersionString);

    // add signed identifier
    addIfNotNull(queryString, QueryStringConstants.SIGNED_IDENTIFIER, sharedAccessPolicy.Id);

    // blobs only
    addIfNotNull(queryString, QueryStringConstants.SIGNED_RESOURCE, resourceType);
    if (headers) {
      addIfNotNull(queryString, QueryStringConstants.CACHE_CONTROL, headers.cacheControl);
      addIfNotNull(queryString, QueryStringConstants.CONTENT_TYPE, headers.contentType);
      addIfNotNull(queryString, QueryStringConstants.CONTENT_ENCODING, headers.contentEncoding);
      addIfNotNull(queryString, QueryStringConstants.CONTENT_LANGUAGE, headers.contentLanguage);
      addIfNotNull(queryString, QueryStringConstants.CONTENT_DISPOSITION, headers.contentDisposition);
    }

    // add signature
    addIfNotNull(queryString, QueryStringConstants.SIGNATURE, this._generateSignature(path, sharedAccessPolicy, validatedSASVersionString, {
      resourceType: resourceType,
      headers: headers,
      tableName: tableName
    }));

    return qs.stringify(queryString);
  };

  /**
   * Generates the shared access signature for a resource.
   *
   * @this {SharedAccessSignature}
   * @param {string}                     path                                          The path to the resource.
   * @param {object}                     sharedAccessPolicy                            The shared access policy.
   * @param {string}                     [sharedAccessPolicy.Id]                       The signed identifier.
   * @param {SharedAccessPermissions}    sharedAccessPolicy.AccessPolicy.Permissions   The permission type.
   * @param {date}                       [sharedAccessPolicy.AccessPolicy.Start]       The time at which the Shared Access Signature becomes valid.
   * @param {date}                       sharedAccessPolicy.AccessPolicy.Expiry        The time at which the Shared Access Signature becomes expired.
   * @param {string}                     sasVersion                                    A string indicating the desired SAS Version to use, in storage service version format. Value must be 2012-02-12 or later.
   * @parma {ResourceTypes}              [args.resourceType]                           The resource type, if the resource is a blob or container.  Null if the resource is a queue or table.
   * @parma {ResourceTypes}              [args.tableName]                              The table name, if the resource is a table.  Null if the resource is a blob or queue.
   * @param {object}                     [args.headers]                                The optional header values to set for a blob returned wth this SAS.
   * @param {string}                     [args.headers.CacheControl]                   The value of the Cache-Control response header to be returned when this SAS is used.
   * @param {string}                     [args.headers.ContentType]                    The value of the Content-Type response header to be returned when this SAS is used.
   * @param {string}                     [args.headers.ContentEncoding]                The value of the Content-Encoding response header to be returned when this SAS is used.
   * @param {string}                     [args.headers.ContentLanguage]                The value of the Content-Language response header to be returned when this SAS is used.
   * @param {string}                     [args.headers.ContentDisposition]             The value of the Content-Disposition response header to be returned when this SAS is used.
   * @return {string} The shared access signature.
   */
  SharedKey.prototype._generateSignature = function(path, sharedAccessPolicy, sasVersion, args) {
    var getvalueToAppend = function(value, noNewLine) {
      var returnValue = '';
      if (!azureutil.objectIsNull(value)) {
        returnValue = value;
      }

      if (noNewLine !== true) {
        returnValue += '\n';
      }

      return returnValue;
    };

    // set up optional args
    var resourceType;
    var tableName;
    var headers;
    if (args) {
      resourceType = args.resourceType;
      tableName = args.tableName;
      headers = args.headers;
    }

    // Add leading slash to path
    if (path.substr(0, 1) !== '/') {
      path = '/' + path;
    }

    var canonicalizedResource = '/' + this.storageAccount + path;
    var stringToSign = getvalueToAppend(sharedAccessPolicy.AccessPolicy ? sharedAccessPolicy.AccessPolicy.Permissions : '') +
      getvalueToAppend(sharedAccessPolicy.AccessPolicy ? sharedAccessPolicy.AccessPolicy.Start : '') +
      getvalueToAppend(sharedAccessPolicy.AccessPolicy ? sharedAccessPolicy.AccessPolicy.Expiry : '') +
      getvalueToAppend(canonicalizedResource) +
      getvalueToAppend(sharedAccessPolicy.Id) +
      sasVersion;

    if (sasVersion === VersionConstants.FEBRUARY_2012) {
      if (headers) {
        throw new Error('Headers are not supported in the 2012-02-12 version.');
      }
    } else if (resourceType) {
      stringToSign += '\n' +
        getvalueToAppend(headers ? headers.cacheControl : '') +
        getvalueToAppend(headers ? headers.contentDisposition : '') +
        getvalueToAppend(headers ? headers.contentEncoding : '') +
        getvalueToAppend(headers ? headers.contentLanguage : '') +
        getvalueToAppend(headers ? headers.contentType : '', true);
    }

    if (tableName) {
      stringToSign += '\n' +
        getvalueToAppend(sharedAccessPolicy.AccessPolicy ? sharedAccessPolicy.AccessPolicy.StartPk : '') +
        getvalueToAppend(sharedAccessPolicy.AccessPolicy ? sharedAccessPolicy.AccessPolicy.StartRk : '') +
        getvalueToAppend(sharedAccessPolicy.AccessPolicy ? sharedAccessPolicy.AccessPolicy.EndPk : '') +
        getvalueToAppend(sharedAccessPolicy.AccessPolicy ? sharedAccessPolicy.AccessPolicy.EndRk : '', true);
    }

    return this.signer.sign(stringToSign);
  };


  //-------------------------------------------------------------------
  // /services/blob/blobservice.js

  // 
  // Copyright (c) Microsoft and contributors.  All rights reserved.
  // 
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //   http://www.apache.org/licenses/LICENSE-2.0
  // 
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // 
  // See the License for the specific language governing permissions and
  // limitations under the License.

  /**
   * Creates a new BlobService object.
   * If no connection string or storageaccount and storageaccesskey are provided,
   * the AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_ACCESS_KEY environment variables will be used.
   * @class
   * The BlobService class is used to perform operations on the Microsoft Azure Blob Service.
   * The Blob Service provides storage for binary large objects, and provides
   * functions for working with data stored in blobs as either streams or pages of data.
   *
   * For more information on the Blob Service, as well as task focused information on using it in a Node.js application, see
   * [How to Use the Blob Service from Node.js](http://azure.microsoft.com/en-us/documentation/articles/storage-nodejs-how-to-use-blob-storage/).
   * The following defaults can be set on the blob service.
   * singleBlobPutThresholdInBytes                       The default maximum size, in bytes, of a blob before it must be separated into blocks.
   * defaultTimeoutIntervalInMs                          The default timeout interval, in milliseconds, to use for request made via the Blob service.
   * defaultMaximumExecutionTimeInMs                     The default maximum execution time across all potential retries, for requests made via the Blob service.
   * defaultLocationMode                                 The default location mode for requests made via the Blob service.
   * parallelOperationThreadCount                        The number of parallel operations that may be performed when uploading a blob that is greater than
   *                                                     the value specified by the singleBlobPutThresholdInBytes property in size.
   * useNagleAlgorithm                                   Determines whether the Nagle algorithm is used for requests made via the Blob service; true to use the
   *                                                     Nagle algorithm; otherwise, false. The default value is false.
   * @constructor
   * @extends {StorageServiceClient}
   *
   * @param {string} [storageAccountOrConnectionString]  The storage account or the connection string.
   * @param {string} [storageAccessKey]                  The storage access key.                                                   Otherwise 'host.primaryHost' defines the primary host and 'host.secondaryHost' defines the secondary host.
   * @param {bool}   usePathStyleUri                     Boolean value indicating wether to use path style uris.
   */
  function BlobService(storageAccount, storageAccessKey, usePathStyleUri) {
    this.storageAccount = storageAccount;
    this.storageAccessKey = storageAccessKey;
    this.storageCredentials = new SharedKey(this.storageAccount, this.storageAccessKey);
    this.apiVersion = HeaderConstants.TARGET_STORAGE_VERSION;

    this.host = {
      primaryHost: 'https://' + this.storageAccount + '.blob.' + storageDnsSuffix
    };

    this.apiVersion = HeaderConstants.TARGET_STORAGE_VERSION;
    this.usePathStyleUri = usePathStyleUri;
  }

  /**
   * Retrieves a shared access signature token.
   *
   * @this {BlobService}
   * @param {string}                   container                                     The container name.
   * @param {string}                   [blob]                                        The blob name.
   * @param {object}                   sharedAccessPolicy                            The shared access policy.
   * @param {string}                   [sharedAccessPolicy.Id]                       The signed identifier.
   * @param {object}                   [sharedAccessPolicy.AccessPolicy.Permissions] The permission type.
   * @param {date|string}              [sharedAccessPolicy.AccessPolicy.Start]       The time at which the Shared Access Signature becomes valid (The UTC value will be used).
   * @param {date|string}              sharedAccessPolicy.AccessPolicy.Expiry        The time at which the Shared Access Signature becomes expired (The UTC value will be used).
   * @param {object}                   [headers]                                     The optional header values to set for a blob returned wth this SAS.
   * @param {string}                   [headers.cacheControl]                        The optional value of the Cache-Control response header to be returned when this SAS is used.
   * @param {string}                   [headers.contentType]                         The optional value of the Content-Type response header to be returned when this SAS is used.
   * @param {string}                   [headers.contentEncoding]                     The optional value of the Content-Encoding response header to be returned when this SAS is used.
   * @param {string}                   [headers.contentLanguage]                     The optional value of the Content-Language response header to be returned when this SAS is used.
   * @param {string}                   [headers.contentDisposition]                  The optional value of the Content-Disposition response header to be returned when this SAS is used.
   * @return {string}                                                                The shared access signature. Note this does not contain the leading "?".
   */
  BlobService.prototype.generateSharedAccessSignature = function(container, blob, sharedAccessPolicy, headers) {
    return this.generateSharedAccessSignatureWithVersion(container, blob, sharedAccessPolicy, null, headers);
  };

  /**
   * Retrieves a shared access signature token.
   *
   * @this {BlobService}
   * @param {string}                   container                                     The container name.
   * @param {string}                   [blob]                                        The blob name.
   * @param {object}                   sharedAccessPolicy                            The shared access policy.
   * @param {string}                   [sharedAccessPolicy.Id]                       The signed identifier.
   * @param {object}                   [sharedAccessPolicy.AccessPolicy.Permissions] The permission type.
   * @param {date|string}              [sharedAccessPolicy.AccessPolicy.Start]       The time at which the Shared Access Signature becomes valid (The UTC value will be used).
   * @param {date|string}              sharedAccessPolicy.AccessPolicy.Expiry        The time at which the Shared Access Signature becomes expired (The UTC value will be used).
   * @param {string}                   [sasVersion]                                  An optional string indicating the desired SAS version to use. Value must be 2012-02-12 or later.
   * @param {object}                   [headers]                                     The optional header values to set for a blob returned wth this SAS.
   * @param {string}                   [headers.cacheControl]                        The optional value of the Cache-Control response header to be returned when this SAS is used.
   * @param {string}                   [headers.contentType]                         The optional value of the Content-Type response header to be returned when this SAS is used.
   * @param {string}                   [headers.contentEncoding]                     The optional value of the Content-Encoding response header to be returned when this SAS is used.
   * @param {string}                   [headers.contentLanguage]                     The optional value of the Content-Language response header to be returned when this SAS is used.
   * @param {string}                   [headers.contentDisposition]                  The optional value of the Content-Disposition response header to be returned when this SAS is used.
   * @return {string}                                                                The shared access signature query string. Note this string does not contain the leading "?".
   */
  BlobService.prototype.generateSharedAccessSignatureWithVersion = function(container, blob, sharedAccessPolicy, sasVersion, headers) {
    var resourceType = BlobConstants.ResourceTypes.CONTAINER;
    if (blob) {
      resourceType = BlobConstants.ResourceTypes.BLOB;
    }

    if (sharedAccessPolicy.AccessPolicy) {
      if (!azureutil.objectIsNull(sharedAccessPolicy.AccessPolicy.Start)) {
        if (!azureutil.isDate(sharedAccessPolicy.AccessPolicy.Start)) {
          sharedAccessPolicy.AccessPolicy.Start = new Date(sharedAccessPolicy.AccessPolicy.Start);
        }

        sharedAccessPolicy.AccessPolicy.Start = azureutil.truncatedISO8061Date(sharedAccessPolicy.AccessPolicy.Start);
      }

      if (!azureutil.objectIsNull(sharedAccessPolicy.AccessPolicy.Expiry)) {
        if (!azureutil.isDate(sharedAccessPolicy.AccessPolicy.Expiry)) {
          sharedAccessPolicy.AccessPolicy.Expiry = new Date(sharedAccessPolicy.AccessPolicy.Expiry);
        }

        sharedAccessPolicy.AccessPolicy.Expiry = azureutil.truncatedISO8061Date(sharedAccessPolicy.AccessPolicy.Expiry);
      }
    }

    var resourceName = createResourceName(container, blob, true);
    return this.storageCredentials.generateSignedQueryString(resourceName, sharedAccessPolicy, sasVersion, {
      headers: headers,
      resourceType: resourceType
    });
  };
  /**
   * Retrieves a blob or container URL.
   *
   * @param {string}                   container                The container name.
   * @param {string}                   [blob]                   The blob name.
   * @param {string}                   [sasToken]               The Shared Access Signature token.
   * @param {boolean}                  [primary]                A boolean representing whether to use the primary or the secondary endpoint.
   * @return {string}                                           The formatted URL string.
   * @example
   * var azure = require('azure-storage');
   * var blobService = azure.createBlobService();
   * //create a SAS that expires in an hour
   * var sasToken = blobService.generateSharedAccessSignature(containerName, blobName, { AccessPolicy: { Expiry: azure.date.minutesFromNow(60); } });
   * var sasUrl = blobService.getUrl(containerName, blobName, sasToken, true);
   */
  BlobService.prototype.getUrl = function(container, blob, sasToken, primary) {

    var host;
    if (!azureutil.objectIsNull(primary) && primary === false) {
      host = this.host.secondaryHost;
    } else {
      host = this.host.primaryHost;
    }

    return url.resolve(host, url.format({
      pathname: this._getPath('/' + createResourceName(container, blob)),
      query: qs.parse(sasToken)
    }));
  };

  /**
   * Retrieves the normalized path to be used in a request.
   * This takes into consideration the usePathStyleUri object field
   * which specifies if the request is against the emulator or against
   * the production service. It also adds a leading "/" to the path in case
   * it's not there before.
   * @ignore
   * @param {string} path The path to be normalized.
   * @return {string} The normalized path.
   */
  BlobService.prototype._getPath = function(path) {
    if (path === null || path === undefined) {
      path = '/';
    } else if (path.indexOf('/') !== 0) {
      path = '/' + path;
    }

    if (this.usePathStyleUri) {
      path = '/' + this.storageAccount + path;
    }

    return path;
  };

  /**
   * Create resource name
   * @ignore
   *
   * @param {string} containerName Container name
   * @param {string} blobName      Blob name
   * @return {string} The encoded resource name.
   */
  function createResourceName(containerName, blobName, forSAS) {
    // Resource name
    if (blobName && !forSAS) {
      blobName = encodeURIComponent(blobName);
      blobName = blobName.replace(/%2F/g, '/');
      blobName = blobName.replace(/%5C/g, '/');
      blobName = blobName.replace(/\+/g, '%20');
    }

    // return URI encoded resource name
    if (blobName) {
      return containerName + '/' + blobName;
    } else {
      return containerName;
    }
  }

  var generateSignedUrl = function(container, blob, accessPolicy, headers) {
    var blobService = new BlobService(process.env.AZURE_STORAGE_ACCOUNT_NAME, process.env.AZURE_STORAGE_ACCOUNT_KEY);
    var sasToken = blobService.generateSharedAccessSignature(container, blob, accessPolicy, headers);
    var sasUri = blobService.getUrl(container, blob, sasToken);
    return sasUri;
  }

  return {
    "generateSignedUrl": generateSignedUrl
  };
})();
