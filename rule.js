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

  var EXPIRATION_TIME = 2; // days

  var getPermissions = function() {
    if (user.user_metadata && user.user_metadata.containers) {
      var container;
      for (var i = user.user_metadata.containers.length - 1; i >= 0; i--) {
        var temp = user.user_metadata.containers[i];
        if (temp.name === blobContainer) {
          container = temp;
          break;
        }
      }
      if (container) {
        return container.permissions;
      }
    }
  };

  var getResourceType = function() {
    // If blob is specified, we are using a blob (b) resource type
    // if not, the resource type is the container (c)
    return context.request.query.blobName ? 'b' : 'c';
  };

  var getExpirationDate = function() {
    var expiresOn = new Date();
    expiresOn.setDate(expiresOn.getDate() + EXPIRATION_TIME);
    return expiresOn;
  };

  var blobService = azure_storage.createBlobService(
    configuration.AZURE_STORAGE_ACCOUNT_NAME,
    configuration.AZURE_STORAGE_ACCOUNT_KEY);

  var sharedAccessPolicy = {
    AccessPolicy: {
      Expiry: getExpirationDate(),
      ResourceType: getResourceType(),
      Permissions: getPermissions()
    }
  };

  if (sharedAccessPolicy.AccessPolicy.Permissions) {
    var token = blobService.generateSharedAccessSignature(blobContainer, blobName, sharedAccessPolicy);
    var url = blobService.getUrl(blobContainer, blobName, token);
    if (sharedAccessPolicy.AccessPolicy.ResourceType === 'c') {
      url += '&comp=list&restype=container';
    }
    user.blob_sas_uri = url;
  }

  callback(null, user, context);
}
