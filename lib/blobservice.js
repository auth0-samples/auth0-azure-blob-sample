var azure = require('azure-storage');
var blobSvc = azure.createBlobService();

blobSvc.createContainerIfNotExists('mycontainer', function(error, result, response){
  if(!error){
    // Container exists and allows 
    // anonymous read access to blob 
    // content and metadata within this container
  }
});

var fs=require('fs');
blobSvc.getBlobToStream('mycontainer', 'myblob', fs.createWriteStream('output.txt'), function(error, result, response){
  if(!error){
    // blob retrieved
  }
});

blobSvc.deleteBlob(containerName, 'myblob', function(error, response){
  if(!error){
    // Blob has been deleted
  }
});



var startDate = new Date();
var expiryDate = new Date(startDate);
expiryDate.setMinutes(startDate.getMinutes() + 100);
startDate.setMinutes(startDate.getMinutes() - 100);

var sharedAccessPolicy = {
  AccessPolicy: {
    Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
    Start: startDate,
    Expiry: expiryDate
  },
};

var blobSAS = blobSvc.generateSharedAccessSignature('mycontainer', 'myblob', sharedAccessPolicy);
var host = blobSvc.host;

var sharedBlobSvc = azure.createBlobServiceWithSas(host, blobSAS);
sharedBlobSvc.getBlobProperties('mycontainer', 'myblob', function (error, result, response) {
  if(!error) {
    // retrieved info
  }
});