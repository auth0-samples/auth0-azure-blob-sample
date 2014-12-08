var rest = require('restler');
var util = require('util');
var _ = require('underscore');

var API_URL = 'https://login.auth0.com/api/v2';

var token = process.env.AUTH0_API_AUTH_TOKEN;


var exports = module.exports;

// User Metadata for container permissions:
// user_metadata: {
//   containers: {
//     containerA: 'rw',
//     containerB: 'r',
//   }
// }


var updateMetadata = function(userId, metadata, callback) {
  var uri = util.format('%s/users/%s', API_URL, userId);
  rest.patch(uri, {
    data: {
      user_metadata: metadata
    },
    headers: {
      Authorization: 'Bearer ' + token
    }
  }).on('complete', function(data, response) {
    callback(data);
  });
}

exports.setContainerAccess = function(userId, conatinerName, permissions) {
  var metadata = {};
  metadata.containers = {};
  metadata.containers[conatinerName] = permissions;
  updateMetadata(userId, metadata, function(data) {
    console.log('Container access set, below are all permissions for the user.')
    console.log(data.user_metadata.containers);
  });
}

exports.removeContainerAccess = function(userId, conatinerName) {
  exports.setContainerAccess(userId, conatinerName, '');
}