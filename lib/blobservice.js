var azure = require('azure-storage');
var blobService = azure.createBlobService();


var exports = module.exports;

exports.setup = function(callback) {
  var serviceProperties = {
    Cors: {
      CorsRule: [{
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
          AllowedHeaders: ['*'],
          ExposedHeaders: [],
          MaxAgeInSeconds: 60
      }]
    }
  };

  blobService.setServiceProperties(serviceProperties, callback);
}

exports.createContainer = function(name, callback) {
  blobService.createContainer(name, function(err, result, response){
    if(err){
      callback(err);
    } else {
      callback();
    }
  });
}

exports.deleteContainer = function(name, callback) {
  blobService.deleteContainer(name, function(err, response){
    if(err){
      callback(err);
    } else {
      callback();
    }
  });
}

exports.getSasUri = function(container, blob, accessPolicy, headers) {
  var sasToken = blobService.generateSharedAccessSignature(container, blob, accessPolicy, headers);
  var sasUri = blobService.getUrl(container, blob, sasToken);
  return sasUri;
}