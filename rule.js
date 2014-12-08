function(user, context, callback) {

  if (context.clientName !== "Azure Blob Share" || context.protocol !== "delegation") {
      callback(null, user, context);
      return;
  }

  var blobContainer = context.request.body.blobContainer;
  var blobName = context.request.body.blobName;
  if (!blobContainer) {
    callback(null, user, context);
    return;
  }

  var EXPIRATION_TIME = 30; // minutes

  var tokenUtil = (function() {

    var Constants = {
      SIGNED_VERSION: 'sv',
      SIGNED_RESOURCE: 'sr',
      SIGNED_START: 'st',
      SIGNED_EXPIRY: 'se',
      SIGNED_PERMISSIONS: 'sp',
      SIGNED_IDENTIFIER: 'si',
      SIGNATURE: 'sig',
    };

    var signedVersion = '2014-02-14';
    var canonicalizedResource;
    var signedResource = 'b'; // use b for blob, c for container
    var signedPermissions = 'rw'; //blob perms must be in this order rwd
    var signedStart = '';
    var signedExpiry = '';
    var signature = '';
    var signedIdentifier = '';

    function getBlobSharedAccessSignature(accountName, accountKey, container, fileName, options) {
      setOptions(options);

      canonicalizedResource = '/' + accountName + '/' + container + '/' + fileName;
      signature = getSignature(accountKey);
      var queryString = getQueryString();
      return 'https:\/\/' + accountName + '.blob.core.windows.net/' + container + '/' + fileName + queryString;
    }

    function setOptions(options) {
      if (options && options.startsOn) {
        signedExpiry = options.startsOn;
      } else {
        signedStart = new Date();
      }

      if (options && options.expiresOn) {
        signedExpiry = options.expiresOn;
      } else {
        signedExpiry = new Date();
        signedExpiry.setMinutes(signedExpiry.getMinutes() + 30);
      }

      signedResource = options.resourceType;
      signedPermissions = options.permissions;
    }


    function getSignature(accountKey) {
      var decodedKey = new Buffer(accountKey, 'base64');
      var stringToSign = signedPermissions + "\n" + signedStart + "\n" + getISO8601NoMilliSeconds(signedExpiry) + "\n" + canonicalizedResource + "\n" + signedIdentifier + "\n" + signedVersion;
      stringToSign = stringToSign.toString('UTF8');

      return crypto.createHmac('sha256', decodedKey).update(stringToSign).digest('base64');
    }


    function getQueryString() {
      var queryString = "?";
      queryString += addEscapedIfNotNull(queryString, Constants.SIGNED_VERSION, '2012-02-12');
      queryString += addEscapedIfNotNull(queryString, Constants.SIGNED_RESOURCE, signedResource);
      queryString += addEscapedIfNotNull(queryString, Constants.SIGNED_START, getISO8601NoMilliSeconds(signedStart));
      queryString += addEscapedIfNotNull(queryString, Constants.SIGNED_EXPIRY, getISO8601NoMilliSeconds(signedExpiry));
      queryString += addEscapedIfNotNull(queryString, Constants.SIGNED_PERMISSIONS, signedPermissions);
      queryString += addEscapedIfNotNull(queryString, Constants.SIGNATURE, signature);
      queryString += addEscapedIfNotNull(queryString, Constants.SIGNED_IDENTIFIER, signedIdentifier);

      return queryString;
    }


    function addEscapedIfNotNull(queryString, name, val) {
      var result = '';
      if (val) {
        var delimiter = (queryString.length > 1) ? '&' : '';
        result = delimiter + name + '=' + encodeURIComponent(val);
      }

      return result;
    }


    function getISO8601NoMilliSeconds(date) {
      if (date) {
        var raw = date.toJSON();
        //blob service does not like milliseconds on the end of the time so strip
        return raw.substr(0, raw.lastIndexOf('.')) + 'Z';
      }
    }

    return {
      "getBlobSharedAccessSignature": getBlobSharedAccessSignature
    };
  })();


  var getPermissions = function() {
    if (user.user_metadata && user.user_metadata.containers) {
      var permissions = user.user_metadata.containers[blobContainer];
      return permissions;
    }
  };

  var getResourceType = function() {
    // If blob is specified, we are using a blob (b) resource type
    // if not, the resource type is the container (c)
    return context.request.query.blobName ? 'b' : 'c';
  };

  var getExpirationDate = function() {
    var expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + EXPIRATION_TIME);
  };

  var options = {
    expiresOn: getExpirationDate(),
    resourceType: getResourceType(),
    permissions: getPermissions()
  };
  
  if (options.permissions) {
    var sasUri = tokenUtil.getBlobSharedAccessSignature(
                                configuration.AZURE_STORAGE_ACCOUNT_NAME,
                                configuration.AZURE_STORAGE_ACCOUNT_KEY,
                                blobContainer,
                                blobName,
                                options);
    user.blob_sas_uri = sasUri;
  }

  callback(null, user, context);
}