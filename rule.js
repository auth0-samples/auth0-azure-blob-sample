function(user, context, callback) {

  if (context.clientName !== "Azure Blob Share") {
    callback(null, user, context);
    return;
  }

  var containerName = context.request.body.containerName;
  var containerFriendlyName = context.request.body.containerFriendlyName;
  var blobName = context.request.body.blobName;

  var blobService = azure_storage.createBlobService(
    configuration.AZURE_STORAGE_ACCOUNT_NAME,
    configuration.AZURE_STORAGE_ACCOUNT_KEY);

  // HACK: This is how we set app_metadata, soon you will be able to 
  // persist directly from a rule.
  request.get({
      url: 'https://login.auth0.com/api/v2/users/' + user.user_id,
      headers: {
        Authorization: 'Bearer ' + configuration.AUTH0_API_TOKEN
      }
    },
    function(error, response, body) {
      if (error) {
        console.log(error);
        callback(new UnauthorizedError(error));
        return;
      }

      var data = JSON.parse(body);
      var app_metadata = data.app_metadata || {};
      app_metadata.containers = app_metadata.containers || [];
      if (app_metadata.containers.length == 0) {
        var containerName = crypto.createHash('md5').update(user.user_id).digest('hex');
        var friendlyName = "Default";
        createContainer(containerName, friendlyName, app_metadata, function(err, app_metadata) {
          if (err) {
            console.log(err);
            throw err;
          } 
          executeRule(app_metadata);
        })
      } else {
        executeRule(app_metadata);
      }
    });

  var createContainer = function(containerName, containerFriendlyName, app_metadata, callback) {
    var options = {
      metadata: {
        'friendlyName': containerFriendlyName
      }
    };

    blobService.createContainerIfNotExists(containerName, options, function(error, result, response) {
      if (error) {
        console.log(error);
        callback(error);
        return;
      }
      // if result = true, container was created.
      // if result = false, container already existed.
      if (!result) {
        var err = {
          message: 'Blob already exists.'
        };
        console.log(err.message);
        callback(err);
        return;
      }

      app_metadata.containers.push({
        name: containerName,
        friendlyName: containerFriendlyName,
        permissions: 'rwdl'
      });

      // HACK: This is how we set app_metadata, soon you will be able to 
      // persist directly from a rule.
      request.patch({
          url: 'https://login.auth0.com/api/v2/users/' + user.user_id,
          headers: {
            Authorization: 'Bearer ' + configuration.AUTH0_API_TOKEN
          },
          json: {
            app_metadata: app_metadata
          }
        },
        function(error, response, body) {
          callback(error, app_metadata);
        });
    });
  };

  var getSasUri = function(containerName, blobName, app_metadata) {
    var EXPIRATION_TIME = 2; // days

    var getPermissions = function() {
      if (app_metadata && app_metadata.containers) {
        var container;
        for (var i = app_metadata.containers.length - 1; i >= 0; i--) {
          var temp = app_metadata.containers[i];
          if (temp.name === containerName) {
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
      return blobName ? 'b' : 'c';
    };

    var getExpirationDate = function() {
      var expiresOn = new Date();
      expiresOn.setDate(expiresOn.getDate() + EXPIRATION_TIME);
      return expiresOn;
    };

    var sharedAccessPolicy = {
      AccessPolicy: {
        Expiry: getExpirationDate(),
        ResourceType: getResourceType(),
        Permissions: getPermissions()
      }
    };

    if (sharedAccessPolicy.AccessPolicy.Permissions) {
      var token = blobService.generateSharedAccessSignature(containerName, blobName, sharedAccessPolicy);
      var url = blobService.getUrl(containerName, blobName, token);
      return url;
    }
  };

  var executeRule = function(app_metadata) {
    console.log(app_metadata);
    if (!containerName) {
      callback(null, user, context);
      return;
    }

    if (containerFriendlyName) {
      // If we are here, the user is requesting a new container
      createContainer(containerName, containerFriendlyName, app_metadata, function(err) {
        if (err) {
          callback(new UnauthorizedError('Error creating blob.'));
        } else {
          callback(null, user, context);
        }
      });
    } else {
      var url = getSasUri(containerName, blobName, app_metadata);
      if (url) {
        user.blob_sas_uri = url;
        callback(null, user, context);
      } else {
        callback(new UnauthorizedError('Not authorized for container or blob.'));
      }
    }
  };

}
