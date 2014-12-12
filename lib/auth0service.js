var rest = require('restler');
var util = require('util');
var _ = require('underscore');

var API_URL = 'https://login.auth0.com/api/v2';

var token = process.env.AUTH0_API_AUTH_TOKEN;

var exports = module.exports;

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

var getUser = function(userId, callback) {
  var uri = util.format('%s/users/%s', API_URL, userId);
  rest.get(uri, {
    headers: {
      Authorization: 'Bearer ' + token
    }
  }).on('complete', function(data, response) {
    callback(data);
  });
}

exports.setContainerAccess = function(userId, containerName, permissions) {
  getUser(userId, function(user) {

    var containers = [];
    if (user.user_metadata && user.user_metadata.containers) {
      containers = user.user_metadata.containers;
    }

    var container = _.find(containers, function(c) {
      return c.name === containerName;
    });

    if (!container) {
      container = {
        name: containerName
      };
      containers.push(container);
    }

    container.permissions = permissions;

    var metadata = {};
    if (user.user_metadata) {
      metadata = user.user_metadata;
    }
    metadata.containers = containers;

    console.log(metadata);

    updateMetadata(userId, metadata, function(data) {
      console.log('Container access set, below are all permissions for the user.')
      if (data.user_metadata && data.user_metadata.containers) {
        console.log(data.user_metadata.containers);
      }
    });
  })

}

exports.removeContainerAccess = function(userId, containerName) {
  exports.setContainerAccess(userId, containerName, '');
}
