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
  var DATASTORE_CREATE = DATASTORE_API + "_create"

  function validateNode(node){
    if (!node.packageId){
      node.error("No packageId specified");
      return false;
    }

    if (!node.fields) {
      node.error("No fields specified");
      return false;
    }

    if (!node.auth) {
      node.error("No credentials specified");
      return false;
    }

    return true;
  }

  function CkantsCreateNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;

    node.packageId = n.package;
    node.name = n.name;
    node.fields = n.fields;
    node.auth = RED.nodes.getNode(n.auth);

    if (!validateNode(node)){
      throw "Bad node config";
    }

    node.token = node.auth.token;
    node.ckan = node.auth.ckan;
    
    node.on("input",function(msg) {
      var payload = {
        resource: {
          package_id: node.packageId
        },
        fields: node.fields
      };

      if (node.name){
        payload.resource.name = node.name;
      }
      if (node.description){
        payload.resource.description = node.description;
      }

      var endpoint = node.ckan + DATASTORE_CREATE;

      httpclient.post(endpoint, node.token, payload, (res)=>{
        var res = JSON.parse(res);
        if (!res.success){
          node.error(res)
          return;
        }

        var resourceId = res.result.resource_id;
        node.warn('resource created, id: ' + resourceId);
      });
    });
  }

  RED.nodes.registerType("ckants create",CkantsCreateNode);

  RED.httpAdmin.post("/ckants_create/:id", RED.auth.needsPermission("ckants.query"), function(req,res) {
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
