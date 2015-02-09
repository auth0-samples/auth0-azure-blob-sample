var azure = require('azure-storage');
var blobService = azure.createBlobService();

var setupCorsOnBlob = function() {
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

  blobService.setServiceProperties(serviceProperties, function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log('CORS Policy set on storage account');
    }
  });
}

setupCorsOnBlob();
