function(user, context, callback) {
  
  var CLIENT_ID = "7TNKInU588NKxmt6CTccM6iuh3V2Zi70"; // Your App's ClientID
  
  // Only run this rule for the correct app and for azure_blob delegations
  if (!(context.clientID === CLIENT_ID && 
        context.isDelegation &&
        context.request.body.api_type === 'azure_blob')) {
    return callback(null, user, context);
  }
  
  var blobName = context.request.body.blobName;
  var containerName = context.request.body.containerName;

  // Get user id hash
  var shasum = crypto.createHash('sha1');
  shasum.update(user.user_id);
  var hash = shasum.digest('hex');

  // Check to make sure the container belongs to the user
  if (containerName !== hash) {
    return callback(new UnauthorizedError('Not authorized to access that container.'));
  }

  // For blob requests, we are done
  if (blobName) {
    return callback(null, user, context);
  }

  var blobService = azure_storage.createBlobService(
    configuration.AZURE_STORAGE_ACCOUNT_NAME,
    configuration.AZURE_STORAGE_ACCOUNT_KEY);

  // For container list operations, ensure the container exists
  blobService.createContainerIfNotExists(containerName, function(error, result, response) {
    if (error) {
      return callback(error);
    }
    return callback(null, user, context);
  });  
}