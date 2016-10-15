/**
 * Copyright 2014 Sense Tecnic Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var util = require("util");
var httpclient = require('./httpclient');

module.exports = function(RED) {
  "use strict";

  var DATASTORE_API = "/api/3/action/datastore_ts"
  var DATASTORE_UPSERT = DATASTORE_API + "_upsert"
  var DATASTORE_SEARCH = DATASTORE_API + "_search"

  function validateNode(node){
    if (!node.resourceId){
      node.error("No resourceId specified");
      return false;
    }

    if (!node.auth) {
      node.error("No credentials specified");
      return false;
    }

    return true;
  }

  function CkantsInNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;

    node.resourceId = n.resourceId;
    node.fromtime = n.fromtime;
    node.totime = n.totime;
    node.auth = RED.nodes.getNode(n.auth);

    if (!validateNode(node)){
      throw "Bad node config";
    }

    node.token = node.auth.token;
    node.ckan = node.auth.ckan;

    node.on("input",function(msg) {
      console.log('firing!');
      if (msg == null) {
        return;
      }

      var payload = {
        resource_id: node.resourceId,
        limit: 500//default limit
      };

      if (node.fromtime){
        payload.fromtime = node.fromtime;
      }
      if (node.totime){
        payload.totime = node.totime;
      }

      var endpoint = node.ckan + DATASTORE_SEARCH;

      httpclient.post(endpoint, node.token, payload, (res)=>{
        var msg = {payload: res ? res : {"error": "something wrong"}};
        node.send(msg);
      });
    });
  }

  RED.nodes.registerType("ckants in",CkantsInNode);

  function CkantsOutNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;

    node.resourceId = n.resourceId;
    node.auth = RED.nodes.getNode(n.auth);

    if (!validateNode(node)){
      throw "Bad node config";
    }

    node.token = node.auth.token;
    node.ckan = node.auth.ckan;
    
    node.on("input",function(msg) {
      console.log('firing!');
      if (!msg || msg.payload == null) {
        return;
      }

      var payload = {
        resource_id: node.resourceId,
        method: "insert",
        records: msg.payload
      };

      var endpoint = node.ckan + DATASTORE_UPSERT;
   
      httpclient.post(endpoint, node.token, payload, (res)=>{
        if (!res){
          node.error('data post failed')
        }
      });
    });
  }
  RED.nodes.registerType("ckants out",CkantsOutNode);

  RED.httpAdmin.post("/ckants_search/:id", RED.auth.needsPermission("ckants.query"), function(req,res) {
    var node = RED.nodes.getNode(req.params.id);
    if (node != null) {
      try {
          node.receive();
          res.sendStatus(200);
      } catch(err) {
          res.sendStatus(500);
          node.error(RED._("ckants.failed",{error:err.toString()}));
      }
    } else {
        res.sendStatus(404);
    }
  });

}
