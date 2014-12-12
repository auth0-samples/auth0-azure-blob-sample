"use strict";

var controller = (function() {

  var load = function() {
    if (!authService.user.get()) return location.href = store.get('path');

    var source = $("#login-info-template").html();
    var template = Handlebars.compile(source);
    $('.login-info').html(template({
      avatar: authService.user.get().profile.picture,
      name: authService.user.get().profile.name
    }));

    $('.logout').on('click', function() {
      var index = store.get('path')
      store.clear();
      location.href = index;
    });

    loadContainerMenu();
  };

  var loadContainerMenu = function() {
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
    });
  };

  var selectContainer = function(e) {
    var elements = document.getElementsByClassName('container-selector');
    for (var i = elements.length - 1; i >= 0; i--) {
      elements[i].parentNode.classList.remove('active');
    };
    e.target.parentNode.classList.add('active');
    var containerName = e.target.getAttribute('data-key')
    authService.getAzureBlobUri({
      containerName: containerName
    }, function(uri) {
      console.log(uri)
      blobService.listBlobsInContainer(uri, loadBlobList)
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
  };


  return {
    "load": load
  }
})();


var blobService = (function() {

  var listBlobsInContainer = function(uri, callback) {
    var getElementValue = function(element, tagName) {
      if (element) {
        var elements = element.getElementsByTagName(tagName);
        if (elements.length === 1) {
          return elements[0].textContent;
        }
      }
      return '';
    }
    var convertResponseToModel = function(data) {
      var model = [];
      var blobs = data.getElementsByTagName('Blob');
      for (var i = blobs.length - 1; i >= 0; i--) {
        var blob = blobs[i];
        model.push({
          name: getElementValue(blob, 'Name'),
          contentType: getElementValue(blob, 'Content-Type'),
          date: new Date(getElementValue(blob, 'Last-Modified')).toLocaleDateString(),
        });
      };
      return model;
    }
    var listBlobsUri = uri + '&restype=container&comp=list';
    $.ajax({
      url: listBlobsUri,
      type: "GET",
      // beforeSend: function(xhr) {
      //   xhr.setRequestHeader('x-ms-blob-content-type', selectedFile.type);
      //   xhr.setRequestHeader('Content-Length', requestBody.length);
      // },
      success: function(data, status) {
        var model = convertResponseToModel(data);
        callback(model);
      },
      error: function(xhr, desc, err) {
        console.log(desc);
        console.log(err);
      }
    });

  }

  return {
    "listBlobsInContainer": listBlobsInContainer
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
      blobContainer: options.containerName,
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
      if (data.user_metadata && data.user_metadata.containers) {
        callback(data.user_metadata.containers);
      } else {
        callback([]);
      }
    });
  }

  return {
    "user": user,
    "getUserContainers": getUserContainers,
    "getAzureBlobUri": getAzureBlobUri
  }

})(window.config);




// /**
//  * List files from a bucket
//  *
//  * @param {Bucket} bucket
//  * @param {function} callback
//  */
// function list_files(containerName, callback) {
//   getAzureBlobUri('foo', undefined, window.config, function(data) {
//     console.log(data)
//   });
//   bucket.listObjects({
//     Prefix: folder_prefix + user.get().profile.user_id
//   }, function(err, data) {
//     if (err) return callback(err);
//     var files = [];

//     for (var i in data.Contents) {
//       bucket.getSignedUrl('getObject', {
//         Expires: 24 * 60,
//         Key: data.Contents[i].Key
//       }, function(err, url_bucket) {
//         files.push({
//           url: url_bucket,
//           name: data.Contents[i].Key.replace(folder_prefix + user.get().profile.user_id + '/', ''),
//           date: moment(new Date(data.Contents[i].LastModified)).fromNow(),
//           key: data.Contents[i].Key
//         });
//       });
//     }

//     var source = $("#files-template").html();
//     var template = Handlebars.compile(source);

//     $('.files').html(template({
//       files: files
//     }));


//     callback();
//   });
// }

// function bind_actions(containerName) {
//   $('.share-link').unbind('click');
//   $('.remove').unbind('click');


//   $(".share-link").click(function() {
//     $("#global-zeroclipboard-flash-bridge").click();
//   });


//   ZeroClipboard.config({
//     moviePath: "http://cdnjs.cloudflare.com/ajax/libs/zeroclipboard/1.3.2/ZeroClipboard.swf"
//   });
//   var client = new ZeroClipboard($('.share-link'));
//   client.on('complete', function(client, args) {
//     console.log('Link copied to your clipboard!')
//   });

//   client.on('dataRequested', share_file(bucket, client, {
//     clipboard: true
//   }));
//   $('.share-link').on('click', share_file(bucket, client, {
//     clipboard: false
//   }));
//   $('.remove').on('click', remove_file(bucket));

//   $('#global-zeroclipboard-html-bridge').attr('title', "Copy Link").tooltip();

//   $('#global-zeroclipboard-html-bridge').click(function() {

//     $(this).attr('title', 'Copied!').tooltip('fixTitle').tooltip('show');

//     $(this).attr('data-original-title', "Copy Link").tooltip('fixTitle');

//   });

// }

// function bind_upload(containerName) {
//   $('.upload-button').on('click', function() {
//     $('.upload-file').click();
//   });

//   $('.upload-file').on('change', function() {
//     $('.glyphicon').hide();
//     $('.upload-button span').hide();
//     $(".upload-button").append('<strong class="loading"><img src="img/loading.gif" /></strong>').attr("disabled", "disabled");

//     var file = this.files[0];
//     if (file) upload_file(bucket, file, function(err) {
//       if (err) console.log('error uploading file');
//       refresh_list(bucket);
//       $('.upload-button .glyphicon').show();
//       $('.upload-button span').show();
//       $('.upload-button .loading').remove();
//       $('.upload-button').removeAttr("disabled");
//     });
//   });


//   var container = document.getElementById('drop-here');
//   var drop = DropAnywhere(function(e) {
//     $('body').append('<img src="img/loading_black.gif" class="loading-global" />');
//     e.items.forEach(function(item) {

//       if (item) upload_file(bucket, item, function(err) {
//         if (err) console.log('error uploading file');

//         $('.loading-global').remove();
//         refresh_list(bucket);
//       });
//     });

//   });
// }

// // ---- uploader ---- //
// //----------------------------------------------------------------------------//
// var maxBlockSize = 256 * 1024; //Each file will be split in 256 KB.
// var numberOfBlocks = 1;
// var selectedFile = null;
// var currentFilePointer = 0;
// var totalBytesRemaining = 0;
// var blockIds = new Array();
// var blockIdPrefix = "block-";
// var submitUri = null;
// var bytesUploaded = 0;

// $(document).ready(function() {
//   $("#output").hide();
//   $("#file").bind('change', handleFileSelect);
//   if (window.File && window.FileReader && window.FileList && window.Blob) {
//     // Great success! All the File APIs are supported.
//   } else {
//     alert('The File APIs are not fully supported in this browser.');
//   }
// });

// //Read the file and find out how many blocks we would need to split it.
// function handleFileSelect(e) {
//   maxBlockSize = 256 * 1024;
//   currentFilePointer = 0;
//   totalBytesRemaining = 0;
//   var files = e.target.files;
//   selectedFile = files[0];
//   $("#output").show();
//   $("#fileName").text(selectedFile.name);
//   $("#fileSize").text(selectedFile.size);
//   $("#fileType").text(selectedFile.type);
//   var fileSize = selectedFile.size;
//   if (fileSize < maxBlockSize) {
//     maxBlockSize = fileSize;
//     console.log("max block size = " + maxBlockSize);
//   }
//   totalBytesRemaining = fileSize;
//   if (fileSize % maxBlockSize == 0) {
//     numberOfBlocks = fileSize / maxBlockSize;
//   } else {
//     numberOfBlocks = parseInt(fileSize / maxBlockSize, 10) + 1;
//   }
//   console.log("total blocks = " + numberOfBlocks);
//   var baseUrl = $("#sasUrl").val();
//   var indexOfQueryStart = baseUrl.indexOf("?");
//   submitUri = baseUrl.substring(0, indexOfQueryStart) + '/' + selectedFile.name + baseUrl.substring(indexOfQueryStart);
//   console.log(submitUri);
// }

// var reader = new FileReader();

// reader.onloadend = function(evt) {
//   if (evt.target.readyState == FileReader.DONE) { // DONE == 2
//     var uri = submitUri + '&comp=block&blockid=' + blockIds[blockIds.length - 1];
//     var requestData = new Uint8Array(evt.target.result);
//     $.ajax({
//       url: uri,
//       type: "PUT",
//       data: requestData,
//       processData: false,
//       beforeSend: function(xhr) {
//         xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
//         xhr.setRequestHeader('Content-Length', requestData.length);
//       },
//       success: function(data, status) {
//         console.log(data);
//         console.log(status);
//         bytesUploaded += requestData.length;
//         var percentComplete = ((parseFloat(bytesUploaded) / parseFloat(selectedFile.size)) * 100).toFixed(2);
//         $("#fileUploadProgress").text(percentComplete + " %");
//         uploadFileInBlocks();
//       },
//       error: function(xhr, desc, err) {
//         console.log(desc);
//         console.log(err);
//       }
//     });
//   }
// };

// function uploadFileInBlocks() {
//   if (totalBytesRemaining > 0) {
//     console.log("current file pointer = " + currentFilePointer + " bytes read = " + maxBlockSize);
//     var fileContent = selectedFile.slice(currentFilePointer, currentFilePointer + maxBlockSize);
//     var blockId = blockIdPrefix + pad(blockIds.length, 6);
//     console.log("block id = " + blockId);
//     blockIds.push(btoa(blockId));
//     reader.readAsArrayBuffer(fileContent);
//     currentFilePointer += maxBlockSize;
//     totalBytesRemaining -= maxBlockSize;
//     if (totalBytesRemaining < maxBlockSize) {
//       maxBlockSize = totalBytesRemaining;
//     }
//   } else {
//     commitBlockList();
//   }
// }

// function commitBlockList() {
//   var uri = submitUri + '&comp=blocklist';
//   console.log(uri);
//   var requestBody = '<?xml version="1.0" encoding="utf-8"?><BlockList>';
//   for (var i = 0; i < blockIds.length; i++) {
//     requestBody += '<Latest>' + blockIds[i] + '</Latest>';
//   }
//   requestBody += '</BlockList>';
//   console.log(requestBody);
//   $.ajax({
//     url: uri,
//     type: "PUT",
//     data: requestBody,
//     beforeSend: function(xhr) {
//       xhr.setRequestHeader('x-ms-blob-content-type', selectedFile.type);
//       xhr.setRequestHeader('Content-Length', requestBody.length);
//     },
//     success: function(data, status) {
//       console.log(data);
//       console.log(status);
//     },
//     error: function(xhr, desc, err) {
//       console.log(desc);
//       console.log(err);
//     }
//   });

// }

// function pad(number, length) {
//   var str = '' + number;
//   while (str.length < length) {
//     str = '0' + str;
//   }
//   return str;
// }
