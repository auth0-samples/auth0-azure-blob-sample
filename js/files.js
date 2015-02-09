"use strict";

var controller = (function() {

  var containerName;

  var load = function() {

    var logoutPath = window.location.pathname.replace('files.html', 'index.html');
    if (!authService.user.get()) {
      return location.href = logoutPath;
    }

    if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
      alert('The File APIs are not fully supported in this browser.');
    }

    if (!(window.crypto && window.crypto.getRandomValues)) {
      alert('This browser does not fully support the crypto APIs.');
    }

    var source = $("#login-info-template").html();
    var template = Handlebars.compile(source);
    $('#navbar-menu').append(template({
      avatar: authService.user.get().profile.picture,
      name: authService.user.get().profile.name
    }));

    $('.logout').on('click', function() {
      store.clear();
      location.href = logoutPath;
    });

    var user_id = authService.user.get().profile.user_id;
    var hash = CryptoJS.SHA1(user_id).toString();
    containerName = hash;

    bindUpload();
    loadZeroClipboard();
    refreshBlobList();
  };

  var refreshBlobList = function() {
    authService.getAzureSasToken({
      containerName: containerName
    }, function(sasToken) {
      var url = blobService.getContainerUrl(containerName, sasToken);
      console.log('Listing blobs for ' + containerName);
      blobService.listBlobsInContainer(url, function(err, blobs) {
        if (err) {
          throw err;
        }
        loadBlobList(blobs || []);
      });
    });
  };

  var loadBlobList = function(blobs) {
    blobs.sort(function(a, b) {
      if (a.name > b.name) {
        return 1;
      }
      if (a.name < b.name) {
        return -1;
      }
      return 0;
    })

    var source = $("#files-template").html();
    var template = Handlebars.compile(source);

    $('.files').html(template({
      files: blobs
    }));

    bindBlobActions();
  };

  var clipboard;
  var loadZeroClipboard = function() {
    ZeroClipboard.config({
      moviePath: "//cdnjs.cloudflare.com/ajax/libs/zeroclipboard/2.1.6/ZeroClipboard.swf"
    });
    clipboard = new ZeroClipboard(document.getElementById('share-copy-button'));
    clipboard.on('ready', function(event) {

      clipboard.on('aftercopy', function(event) {
        console.log('Copied text to clipboard: ' + event.data['text/plain']);
      });
    });

    clipboard.on('error', function(event) {
      console.log('ZeroClipboard error of type "' + event.name + '": ' + event.message);
      ZeroClipboard.destroy();
    });
  };

  var bindBlobActions = function() {

    var getUrlHandler = function(e, callback) {
      var blobName = e.target.getAttribute('data-blob');
      authService.getAzureSasToken({
        containerName: containerName,
        blobName: blobName
      }, function(sasToken) {
        var url = blobService.getBlobUrl(containerName, blobName, sasToken);
        callback(url);
      });
    }

    $('.share-link').on('click', function(e) {
      getUrlHandler(e, function(url) {
        document.getElementById('share-input').value = url;
        document.getElementById('share-copy-button').setAttribute('data-clipboard-text', url);
        $('#share-dialog').modal().show();
      });
    });

    $('.download-link').on('click', function(e) {
      getUrlHandler(e, function(url) {
        console.log('Downloading file');
        document.location = url;
      });
    });

    $('.remove-link').on('click', function(e) {
      getUrlHandler(e, function(url) {
        console.log('Deleting blob');
        blobService.deleteBlob(url, function(err) {
          if (err) {
            console.log(err);
          }
          refreshBlobList();
        });

      });
    })
  };

  var uploadFile = function(file, callback) {

    console.log('Uploading file to container: ' + containerName);

    var blobName = Date.now().toString(); // Should be random, but this will do for a demo
    authService.getAzureSasToken({
      containerName: containerName,
      blobName: blobName
    }, function(sasToken) {
      var url = blobService.getBlobUrl(containerName, blobName, sasToken);
      console.log('Created url for new blob: ' + url);
      blobService.uploadFile(url, file, function(err) {
        if (!err) {
          refreshBlobList();
        }
        callback(err);
      });
    });
  };

  var bindUpload = function() {
    $('.upload-button').on('click', function() {
      $('.upload-file').click();
    });

    $('.upload-file').on('change', function() {
      $('.glyphicon').hide();
      $('.upload-button span').hide();
      $(".upload-button").append('<strong class="loading"><img src="img/loading.gif" /></strong>').attr("disabled", "disabled");

      var removeUploadingMessage = function(err) {
        if (err) console.log('error uploading file');
        $('.upload-button .glyphicon').show();
        $('.upload-button span').show();
        $('.upload-button .loading').remove();
        $('.upload-button').removeAttr("disabled");
      }

      var file = this.files[0];
      if (file) {
        uploadFile(file, removeUploadingMessage);
      } else {
        // Upload canceled
        removeUploadingMessage();
      }
    });


    var container = document.getElementById('drop-here');
    var drop = DropAnywhere(function(e) {
      $('body').append('<img src="img/loading_black.gif" class="loading-global" />');
      e.items.forEach(function(item) {

        if (item) uploadFile(item, function(err) {
          if (err) console.log('error uploading file');
          $('.loading-global').remove();
        });
      });

    });
  };

  return {
    "load": load
  }
})();

var blobService = (function(config) {

  var STORAGE_URL_BASE = 'https://' + config.azureStorageAccount + '.blob.core.windows.net/';

  var getContainerUrl = function(containerName, sasToken) {
    return STORAGE_URL_BASE + containerName + '?' + sasToken;
  }

  var getBlobUrl = function(containerName, blobName, sasToken) {
     return STORAGE_URL_BASE + containerName + '/' + blobName + '?' + sasToken;
  }

  var listBlobsInContainer = function(url, callback) {
    if (!url) {
      throw 'url must have a value';
    }
    var getElementValue = function(element, tagName) {
      if (element) {
        var elements = element.getElementsByTagName(tagName);
        if (elements.length === 1) {
          return elements[0].textContent;
        }
      }
      return '';
    }

    var getFileName = function(element) {
      var cd = getElementValue(element, 'Content-Disposition');
      var name;
      if (cd && cd.length > 0) {
        name = cd.substring(22, cd.length - 1);
      }
      if (!name) {
        name = getElementValue(element, 'Name');
      }
      return name;
    }
    var convertResponseToModel = function(data) {
      var model = [];
      var blobs = data.getElementsByTagName('Blob');
      for (var i = blobs.length - 1; i >= 0; i--) {
        var blob = blobs[i];
        model.push({
          name: getElementValue(blob, 'Name'),
          fileName: getFileName(blob),
          contentType: getElementValue(blob, 'Content-Type'),
          date: new Date(getElementValue(blob, 'Last-Modified')).toDateString(),
        });
      };
      return model;
    }
    var listBlobsUrl = url + '&restype=container&comp=list';
    console.log('Listing blobs:');
    console.log(listBlobsUrl);
    $.ajax({
      url: listBlobsUrl,
      type: "GET",
      success: function(data, status) {
        var model = convertResponseToModel(data);
        callback(null, model);
      },
      error: function(xhr, desc, err) {
        console.log(desc);
        console.log(err);
        callback({ statusCode: xhr.status, message: err });
      }
    });
  }

  var deleteBlob = function(url, callback) {
    $.ajax({
      url: url,
      type: "DELETE",
      success: function(data, status) {
        callback();
      },
      error: function(xhr, desc, err) {
        console.log(desc);
        console.log(err);
        callback(err);
      }
    });
  }

  // From: http://gauravmantri.com/2013/02/16/uploading-large-files-in-windows-azure-blob-storage-using-shared-access-signature-html-and-javascript/
  var maxBlockSize;
  var numberOfBlocks;
  var selectedFile;
  var currentFilePointer;
  var totalBytesRemaining;
  var blockIds;
  var blockIdPrefix;
  var submitUrl;
  var bytesUploaded;
  var uploadCompleteCallback;
  var reader;

  function uploadFile(url, file, callback) {
    maxBlockSize = 256 * 1024;
    numberOfBlocks = 1;
    selectedFile = null;
    currentFilePointer = 0;
    totalBytesRemaining = 0;
    blockIds = new Array();
    blockIdPrefix = "block-";
    submitUrl = null;
    bytesUploaded = 0;
    uploadCompleteCallback = null;

    reader = new FileReader()
    reader.onloadend = function(evt) {
      if (evt.target.readyState == FileReader.DONE) { // DONE == 2
        var url = submitUrl + '&comp=block&blockid=' + blockIds[blockIds.length - 1];
        var requestData = new Uint8Array(evt.target.result);
        $.ajax({
          url: url,
          type: "PUT",
          data: requestData,
          processData: false,
          beforeSend: function(xhr) {
            xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
          },
          success: function(data, status) {
            console.log(data);
            console.log(status);
            bytesUploaded += requestData.length;
            var percentComplete = ((parseFloat(bytesUploaded) / parseFloat(selectedFile.size)) * 100).toFixed(2);
            console.log(percentComplete + '%');
            uploadFileInBlocks();
          },
          error: function(xhr, desc, err) {
            console.log(desc);
            console.log(err);
          }
        });
      }
    };

    var fileSize = file.size;
    if (fileSize < maxBlockSize) {
      maxBlockSize = fileSize;
      console.log("max block size = " + maxBlockSize);
    }
    totalBytesRemaining = fileSize;
    if (fileSize % maxBlockSize == 0) {
      numberOfBlocks = fileSize / maxBlockSize;
    } else {
      numberOfBlocks = parseInt(fileSize / maxBlockSize, 10) + 1;
    }
    console.log("total blocks = " + numberOfBlocks);
    submitUrl = url;
    selectedFile = file;
    uploadCompleteCallback = callback;
    uploadFileInBlocks();
  }

  function uploadFileInBlocks() {
    if (totalBytesRemaining > 0) {
      console.log("current file pointer = " + currentFilePointer + " bytes read = " + maxBlockSize);
      var fileContent = selectedFile.slice(currentFilePointer, currentFilePointer + maxBlockSize);
      var blockId = blockIdPrefix + pad(blockIds.length, 6);
      console.log("block id = " + blockId);
      blockIds.push(btoa(blockId));
      reader.readAsArrayBuffer(fileContent);
      currentFilePointer += maxBlockSize;
      totalBytesRemaining -= maxBlockSize;
      if (totalBytesRemaining < maxBlockSize) {
        maxBlockSize = totalBytesRemaining;
      }
    } else {
      commitBlockList();
    }
  }

  function commitBlockList() {
    var url = submitUrl + '&comp=blocklist';
    console.log(url);
    var requestBody = '<?xml version="1.0" encoding="utf-8"?><BlockList>';
    for (var i = 0; i < blockIds.length; i++) {
      requestBody += '<Latest>' + blockIds[i] + '</Latest>';
    }
    requestBody += '</BlockList>';
    $.ajax({
      url: url,
      type: "PUT",
      data: requestBody,
      beforeSend: function(xhr) {
        xhr.setRequestHeader('x-ms-blob-content-type', selectedFile.type);
        xhr.setRequestHeader('x-ms-blob-content-disposition', 'attachment; filename=\"' + selectedFile.name + '\"');
      },
      success: function(data, status) {
        console.log(data);
        console.log(status);
        if (uploadCompleteCallback) {
          uploadCompleteCallback();
        }
      },
      error: function(xhr, desc, err) {
        console.log(desc);
        console.log(err);
        if (uploadCompleteCallback) {
          uploadCompleteCallback(err);
        }
      }
    });
  }

  function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
      str = '0' + str;
    }
    return str;
  }

  return {
    "listBlobsInContainer": listBlobsInContainer,
    "uploadFile": uploadFile,
    "deleteBlob": deleteBlob,
    "getContainerUrl": getContainerUrl,
    "getBlobUrl": getBlobUrl
  }
})(window.config);

var authService = (function(config) {

  var auth0 = new Auth0({
    domain: config.domain,
    clientID: config.clientId,
    callbackURL: 'dummy'
  });

  var user = {
    get: function() {
      if (!store.get('azure_sample_profile')) return;
      return {
        profile: JSON.parse(store.get('azure_sample_profile')),
        id_token: store.get('azure_sample_id_token')
      };
    }
  };

  var getAzureSasToken = function(options, callback) {
    auth0.getDelegationToken({
      id_token: authService.user.get().id_token,
      scope: "openid",
      api_type: "azure_blob",
      containerName: options.containerName,
      blobName: options.blobName
    }, function(err, delegationResult) {
      callback(delegationResult.azure_blob_sas);
    });
  };

  return {
    "user": user,
    "getAzureSasToken": getAzureSasToken
  }

})(window.config);
