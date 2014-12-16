var program = require('commander');
//var blobService = require('./lib/blobservice');
//var auth0Service = require('./lib/auth0service');

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
  .command('appdata')
  .description('deletes a blob container')
  .action(function(name) {
    var request = require('request');
    request.get({
        url: 'https://login.auth0.com/api/v2/users/' + 'google-oauth2|102896943058250370550',
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiI3a3Jyd0UySERIRnY1aEFJU2gwdDd3eEI4em8yMUFUdSIsInNjb3BlcyI6eyJ1c2VycyI6eyJhY3Rpb25zIjpbInJlYWQiLCJ1cGRhdGUiXX0sInVzZXJzX2FwcF9tZXRhZGF0YSI6eyJhY3Rpb25zIjpbInJlYWQiLCJ1cGRhdGUiXX19LCJpYXQiOjE0MTg2ODMzMDQsImp0aSI6IjllNTBkZWY3ZDg1ZTg4ZGExMzVmZTRiZGNkNmEzZmMwIn0.2kGg4CM8QNi1Ngc7NvBp2Mh02DhE_h1bhi5hvDiNP7M'
        }
      },
      function(error, response, body) {
        // console.log(error);
        // console.log(response);
        console.log(body);
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
