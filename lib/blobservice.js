var azure = require('azure-storage');
var blobService = azure.createBlobService();


var exports = module.exports;

exports.setup = function(callback) {
  var serviceProperties = {
    Cors: {
      CorsRule: [{
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'POST'],
          AllowedHeaders: [],
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

// blobSvc.createContainerIfNotExists('mycontainer', function(error, result, response){
//   if(!error){
//     // Container exists and allows 
//     // anonymous read access to blob 
//     // content and metadata within this container
//   }
// });

// var fs=require('fs');
// blobSvc.getBlobToStream('mycontainer', 'myblob', fs.createWriteStream('output.txt'), function(error, result, response){
//   if(!error){
//     // blob retrieved
//   }
// });

// blobSvc.deleteBlob(containerName, 'myblob', function(error, response){
//   if(!error){
//     // Blob has been deleted
//   }
// });



// var startDate = new Date();
// var expiryDate = new Date(startDate);
// expiryDate.setMinutes(startDate.getMinutes() + 100);
// startDate.setMinutes(startDate.getMinutes() - 100);

// var sharedAccessPolicy = {
//   AccessPolicy: {
//     Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
//     Start: startDate,
//     Expiry: expiryDate
//   },
// };

// var blobSAS = blobSvc.generateSharedAccessSignature('mycontainer', 'myblob', sharedAccessPolicy);
// var host = blobSvc.host;

// var sharedBlobSvc = azure.createBlobServiceWithSas(host, blobSAS);
// sharedBlobSvc.getBlobProperties('mycontainer', 'myblob', function (error, result, response) {
//   if(!error) {
//     // retrieved info
//   }
// });