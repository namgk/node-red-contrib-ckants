
var http = require("http");
var https = require("https");
var urllib = require("url");
var assert = require('assert');

function post(ckantsEndpoint, token, payload, cb){
  assert(ckantsEndpoint && token && payload);

  var payload = JSON.stringify(payload);
  var opts = urllib.parse(ckantsEndpoint);
  opts.headers = {
    'content-type':'application/json', 
    'content-length': payload.length,
    'Authorization': token
  };
  opts.method = 'POST';

  var req = ((/^https/.test(ckantsEndpoint))?https:http).request(opts,function(res) {
    console.log(res.statusCode);
    var result = '';
    res.on('data',function(chunk) {
        result += chunk;
    });
    res.on('end',function() {
      console.log(result);
      cb(result);  
    });
  });

  req.on('error',function(err) {
    console.log(err);
    cb(err);
  });

  if (payload){
    req.write(payload);
  }

  req.end();
}

module.exports = {
  post: post
}