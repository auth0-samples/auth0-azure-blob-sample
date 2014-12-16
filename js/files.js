"use strict";

var controller = (function() {

  var load = function() {
    if (!authService.user.get()) return location.href = store.get('path');

    var source = $("#login-info-template").html();
    var template = Handlebars.compile(source);
    $('#navbar-menu').append(template({
      avatar: authService.user.get().profile.picture,
      name: authService.user.get().profile.name
    }));

    $('.logout').on('click', function() {
      var index = store.get('path')
      store.clear();
      location.href = index;
    });

    if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
      alert('The File APIs are not fully supported in this browser.');
    }

    if (!(window.crypto && window.crypto.getRandomValues && (window.crypto.subtle || window.crypto.webkitSubtle))) {
      alert('This browser does not fully suppor the crypto APIs.');
    }

    bindToolbar();
    loadZeroClipboard();
    loadContainerMenu();
  };

  var loadContainerMenu = function(callback) {
    authService.getUserContainers(function(containers) {
      containers.sort();

      var source = $("#container-list-template").html();
      var template = Handlebars.compile(source);
      var viewModel = {
        containers: containers
      };
      $('#container-list').html(template(viewModel));
      var elements = document.getElementsByClassName("container-selector");
      for (var i = elements.length - 1; i >= 0; i--) {
        elements[i].addEventListener('click', selectContainer);
      };

      // If we have elements, preselect the first container
      if (elements.length > 0) {
        elements[0].click()
      }
      if (callback) {
        callback();
      }
    });
  };

  var selectContainer = function(e) {
    var elements = document.getElementsByClassName('container-selector');
    for (var i = elements.length - 1; i >= 0; i--) {
      elements[i].parentNode.classList.remove('active');
    };
    e.target.parentNode.classList.add('active');
    var containerName = e.target.getAttribute('data-container')
    console.log(containerName);
    authService.getAzureBlobUri({
      containerName: containerName
    }, function(uri) {
      console.log(uri);
      console.log('Listing blobs for ' + containerName);
      blobService.listBlobsInContainer(uri, containerName, loadBlobList)
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
  }

  var bindBlobActions = function() {

    var getUrlHandler = function(e, callback) {
      var containerName = e.target.getAttribute('data-container')
      var blobName = e.target.getAttribute('data-blob');
      authService.getAzureBlobUri({
        containerName: containerName,
        blobName: blobName
      }, callback);
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
          refreshBlobList(getCurrentContainerName());
        });

      });
    })
  }

  var getCurrentContainerName = function() {
    var elements = document.getElementsByClassName('container-selector');
    var containerName;
    for (var i = elements.length - 1; i >= 0; i--) {
      if (elements[i].parentNode.classList.contains('active')) {
        containerName = elements[i].getAttribute('data-container');
        break;
      }
    };
    return containerName;
  }

  var uploadFile = function(file, callback) {

    var containerName = getCurrentContainerName();
    console.log('Uploading file to container: ' + containerName);


    if (!containerName) {
      var err = {
        message: 'Cannot determine active container'
      };
      console.log(err.message);
      callback(err);
    } else {
      authService.getAzureBlobUri({
        containerName: containerName,
        blobName: uuid()
      }, function(url) {
        console.log('Created url for new blob: ' + url);
        blobService.uploadFile(url, file, function(err) {
          if (!err) {
            refreshBlobList(containerName);
          }
          callback(err);
        });
      });
    }
  }

  var refreshBlobList = function(containerName) {
    authService.getAzureBlobUri({
      containerName: containerName
    }, function(uri) {
      console.log('Listing blobs for ' + containerName);
      blobService.listBlobsInContainer(uri, containerName, loadBlobList)
    });
  }

  var bindToolbar = function() {
    bindUpload();

    $('.create-button').on('click', function() {
      document.getElementById('folder-input').value = '';
      $('#folder-dialog').modal().show();
    });

    $('#folder-save-button').on('click', function() {
      var friendlyName = document.getElementById('folder-input').value;
      var containerName = uuid();
      if (friendlyName && friendlyName.trim().length > 1) {
        console.log('Creating blob: ' + friendlyName);
        authService.createUserContainer(containerName, friendlyName, function(err) {
          if (err) {
            console.log(err);
          }
          loadContainerMenu(function() {
            $('#folder-dialog').modal().hide();
          });
        });
      }
    });
  }

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

var blobService = (function() {

  var listBlobsInContainer = function(uri, conatinerName, callback) {
    if (!uri) {
      throw 'uri must have a value';
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
          container: conatinerName,
          name: getElementValue(blob, 'Name'),
          fileName: getFileName(blob),
          contentType: getElementValue(blob, 'Content-Type'),
          date: new Date(getElementValue(blob, 'Last-Modified')).toLocaleDateString(),
        });
      };
      return model;
    }
    var listBlobsUri = uri + '&restype=container&comp=list';
    console.log('Listing blobs:');
    console.log(listBlobsUri);
    $.ajax({
      url: listBlobsUri,
      type: "GET",
      success: function(data, status) {
        var model = convertResponseToModel(data);
        callback(model);
      },
      error: function(xhr, desc, err) {
        console.log(desc);
        console.log(err);
        callback(err);
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
  var submitUri;
  var bytesUploaded;
  var uploadCompleteCallback;
  var reader;

  function uploadFile(uri, file, callback) {
    maxBlockSize = 256 * 1024;
    numberOfBlocks = 1;
    selectedFile = null;
    currentFilePointer = 0;
    totalBytesRemaining = 0;
    blockIds = new Array();
    blockIdPrefix = "block-";
    submitUri = null;
    bytesUploaded = 0;
    uploadCompleteCallback = null;

    reader = new FileReader()
    reader.onloadend = function(evt) {
      if (evt.target.readyState == FileReader.DONE) { // DONE == 2
        var uri = submitUri + '&comp=block&blockid=' + blockIds[blockIds.length - 1];
        var requestData = new Uint8Array(evt.target.result);
        $.ajax({
          url: uri,
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
    submitUri = uri;
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
    var uri = submitUri + '&comp=blocklist';
    console.log(uri);
    var requestBody = '<?xml version="1.0" encoding="utf-8"?><BlockList>';
    for (var i = 0; i < blockIds.length; i++) {
      requestBody += '<Latest>' + blockIds[i] + '</Latest>';
    }
    requestBody += '</BlockList>';
    $.ajax({
      url: uri,
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
    "deleteBlob": deleteBlob
  }
})();

var authService = (function(config) {

  var auth0 = new Auth0({
    domain: config.domain,
    clientID: config.clientId,
    callbackURL: 'dummy'
  });

  var user = {
    get: function() {
      if (!store.get('profile')) return;
      return {
        profile: JSON.parse(store.get('profile')),
        id_token: store.get('id_token')
      };
    }
  };

  var getAzureBlobUri = function(options, callback) {
    auth0.getDelegationToken({
      id_token: authService.user.get().id_token,
      scope: "openid profile",
      api_type: "app",
      containerName: options.containerName,
      blobName: options.blobName
    }, function(err, delegationResult) {
      var data = auth0.decodeJwt(delegationResult.id_token);
      callback(data.blob_sas_uri);
    });
  };

  var getUserContainers = function(callback) {
    auth0.getDelegationToken({
      id_token: user.get().id_token,
      scope: "openid profile",
      api_type: "app"
    }, function(err, delegationResult) {
      var data = auth0.decodeJwt(delegationResult.id_token);
      if (data.containers) {
        callback(data.containers);
      } else {
        callback([]);
      }
    });
  };

  var createUserContainer = function(containerName, containerFriendlyName, callback) {
    auth0.getDelegationToken({
      id_token: authService.user.get().id_token,
      scope: "openid profile",
      api_type: "app",
      containerName: containerName,
      containerFriendlyName: containerFriendlyName
    }, function(err, delegationResult) {
      var data = auth0.decodeJwt(delegationResult.id_token);
      callback(data.blob_sas_uri);
    });
  }

  return {
    "user": user,
    "getUserContainers": getUserContainers,
    "getAzureBlobUri": getAzureBlobUri,
    "createUserContainer": createUserContainer
  }

})(window.config);

/*
var cryptoService = (function() {

  var pubKey;
  var privKey;
  var data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); // The data to be signed.
  var encryptedData;
  var decryptedData;
  var crypto = window.crypto || window.msCrypto;

  if (!crypto.subtle) {
    console.log("Unable to create window.crypto object");
  }

  var genOp = crypto.subtle.generateKey({
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01])
    },
    false, ["encrypt", "decrypt"]);

  genOp.onerror = function(e) {
    console.log("genOp.onerror event handler fired.");
  }
  genOp.oncomplete = function(e) {
    pubKey = e.target.result.publicKey;
    privKey = e.target.result.privateKey;

    if (pubKey && privKey) {
      console.log("generateKey RSASSA-PKCS1-v1_5: PASS");
    } else {
      console.log("generateKey RSASSA-PKCS1-v1_5: FAIL");
    } // if-else

    var signkey = crypto.subtle.sign({
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    }, privKey, data);

    signkey.onerror = function(evt) {
      console.log("signkey.onerror event handler fired.");
    }

    signkey.oncomplete = function(evt) {
      signature = evt.target.result;

      if (signature) {
        console.log("Sign with RSASSA-PKCS1-v1_5 - SHA-256: PASS");
      } else {
        console.log("Sign with RSASSA-PKCS1-v1_5 - SHA-256: FAIL");
      }

      var verifysig = crypto.subtle.verify({
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      }, pubKey, signature, data);

      verifysig.onerror = function(evt) {
        console.log("Verify verifysig.onerror event handler fired.");
      }

      verifysig.oncomplete = function(evt) {
        var verified = evt.target.result;

        if (verified) {
          console.log("Verify Operation for RSASSA-PKCS1-v1_5 - SHA-256: PASS");
        } else {
          console.log("Verify Operation for RSASSA-PKCS1-v1_5 - SHA-256: FAIL");
        } // if-else
      }; // verifysig.oncomplete
    }; // signkey.oncomplete
  }; // genOp.oncomplete

  function encrypeFile(publicKey, file) {

  }

  function decryptFile(privateKey, file) {

  }

})();
*/

var uuid = function() {
  // http://jsperf.com/uuid-generation-2
  var buf = new Uint16Array(8);
  window.crypto.getRandomValues(buf);
  var S4 = function(num) {
    var ret = num.toString(16);
    while (ret.length < 4) {
      ret = "0" + ret;
    }
    return ret;
  };
  return (S4(buf[0]) + S4(buf[1]) + "-" + S4(buf[2]) + "-" + S4(buf[3]) + "-" + S4(buf[4]) + "-" + S4(buf[5]) + S4(buf[6]) + S4(buf[7]));
}
