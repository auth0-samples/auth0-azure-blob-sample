
  var messages = [];

  var logMessages = function(callback) {
    var calls = [];
    messages.forEach(function(name) {
        calls.push(function(callback) {
            conn.collection(name).drop(function(err) {
              if (err) {
                return callback(err);
              }
              console.log('dropped');
              callback(null, name);
            });
          }
        });

      async.parallel(calls, function(err, result) {

        if (err) {
          return console.log(err);
        }
        console.log(result);
      });
    };


    request({
      url: 'http://logs-01.loggly.com/inputs/' + configuration.LOGGLY_TOKEN + '/tag/http/',
      body: JSON.stringify(err)
    }, function(err, body) {
      console.log(err);
    });
