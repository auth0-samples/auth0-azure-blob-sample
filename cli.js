var program = require('commander');
var blobService = require('./lib/blobservice');
var auth0Service = require('./lib/auth0service');

program
  .version('0.0.1');

program
  .command('setup')
  .description('run setup command on the blob account')
  .action(function(env, options) {
    blobService.setup(function(err) {
      if (err) {
        console.error(err);
      } else {
        console.log('Successfully setup blob service.');
      }
    });
  });

program
  .command('new <name>')
  .description('creates a new blob container')
  .action(function(name) {
    blobService.createContainer(name, function(err) {
      if (err) {
        if (err.code === 'ContainerAlreadyExists') {
          console.error('The container you are trying to create already exists.')
        } else {
          console.error(err);
        }
      } else {
        console.log('Successfully created container.');
      }
    });
  });

program
  .command('delete <name>')
  .description('deletes a blob container')
  .action(function(name) {
    blobService.deleteContainer(name, function(err) {
      if (err) {
        console.error(err);
      } else {
        console.log('Successfully deleted container.');
      }
    });
  });

program
  .command('containerurl <container>')
  .description('deletes a blob container')
  .action(function(container) {
    var tokenutil = require('./lib/tokenutil')
    var request = require('request');

    var getExpirationDate = function() {
      var expiresOn = new Date();
      expiresOn.setDate(expiresOn.getDate() + 2);
      return expiresOn;
    };

    var accessPolicy = {
      AccessPolicy: {
        Expiry: getExpirationDate(),
        ResourceType: 'c',
        Permissions: 'rwdl'
      }
    }

    var url = tokenutil.generateSignedUrl(container, undefined, accessPolicy);
    url += '&comp=list&restype=container';
    console.log(url);
    request(url, function(error, response, body) {
      console.log(body)
    });
  });

program
  .command('bloburl <container> <blob>')
  .description('deletes a blob container')
  .action(function(container, blob) {
    var tokenutil = require('./lib/tokenutil')
    var request = require('request');

    var getExpirationDate = function() {
      var expiresOn = new Date();
      expiresOn.setDate(expiresOn.getDate() + 2);
      return expiresOn;
    };

    var accessPolicy = {
      AccessPolicy: {
        Expiry: getExpirationDate(),
        ResourceType: 'b',
        Permissions: 'rwd'
      }
    }

    var url = tokenutil.generateSignedUrl(container, blob, accessPolicy);
    console.log(url);
    request(url, function(error, response, body) {
      console.log(body)
    });
  });

program
  .command('remove-access <email> <container>')
  .description('removes all user permissions from a container')
  .action(function(email, container) {
    auth0Service.removeContainerAccess(email, container);
  });

program
  .command('set-access <email> <container> <permissions>')
  .description('removes all user permissions from a container')
  .action(function(email, container, permissions) {
    auth0Service.setContainerAccess(email, container, permissions);
  });


program.parse(process.argv);
