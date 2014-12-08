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