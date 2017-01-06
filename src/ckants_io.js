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
var assert = require('assert');

module.exports = function(RED) {
  "use strict";

  var DATASTORE_API = "/api/3/action/datastore_ts"
  var DATASTORE_UPSERT = DATASTORE_API + "_upsert"
  var DATASTORE_SEARCH = DATASTORE_API + "_search"

  function validateNode(node){
    if (!node.resourceId){
      throw "No resourceId specified";
    }

    if (!node.auth) {
      throw "No credentials specified";
    }
  }

  function CkantsSearchNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;

    node.resourceId = n.resourceId;
    node.fromtime = n.fromtime;
    node.totime = n.totime;
    node.auth = RED.nodes.getNode(n.auth);

    validateNode(node);

    node.token = node.auth.token;
    node.ckan = node.auth.ckan;

    node.on("input",function(msg) {
      if (!msg){
        msg = {payload: {}}
      }

      if (!msg.payload){
        msg.payload = {}
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
      if (node.timezone){
        payload.timezone = node.timezone;
      }
      // overriding from msg.payload if any
      // this needs to be strict as CKAN won't ignore foreign parameters
      if (msg.payload.q) {
        payload.q = msg.payload.q;
      } 
      if (msg.payload.filters) {
        payload.filters = msg.payload.filters;
      } 
      if (msg.payload.distinct) {
        payload.distinct = msg.payload.distinct;
      } 
      if (msg.payload.plain) {
        payload.plain = msg.payload.plain;
      } 
      if (msg.payload.language) {
        payload.language = msg.payload.language;
      } 
      if (msg.payload.limit) {
        payload.limit = msg.payload.limit;
      } 
      if (msg.payload.offset) {
        payload.offset = msg.payload.offset;
      } 
      if (msg.payload.sort) {
        payload.sort = msg.payload.sort;
      } 
      if (msg.payload.fields) {
        payload.fields = msg.payload.fields;
      } 
      if (msg.payload.fromtime) {
        payload.fromtime = msg.payload.fromtime;
      } 
      if (msg.payload.totime) {
        payload.totime = msg.payload.totime;
      } 
      if (msg.payload.timezone) {
        payload.timezone = msg.payload.timezone;
      } 

      var endpoint = node.ckan + DATASTORE_SEARCH;

      node.status({fill:"green",shape:"dot",text:"working..."});

      httpclient.post(endpoint, node.token, payload, function(res){
        try {
          var res = JSON.parse(res);
          assert(res.success);
          node.status({})
          node.send({payload: res});
        } catch (err) {
          node.error(res)
        }
      });
    });
  }

  RED.nodes.registerType("ckants search",CkantsSearchNode);

  function CkantsInsertNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;

    node.resourceId = n.resourceId;
    node.auth = RED.nodes.getNode(n.auth);

    validateNode(node);

    node.token = node.auth.token;
    node.ckan = node.auth.ckan;
    
    node.on("input",function(msg) {
      if (!msg || msg.payload == null) {
        node.error('no input');
        return;
      }

      if (!Array.isArray(msg.payload)){
        node.warn('this node receives an array of records, converting msg.payload into an array');
        msg.payload = [msg.payload]
      }

      var payload = {
        resource_id: node.resourceId,
        method: "insert",
        records: msg.payload
      };

      var endpoint = node.ckan + DATASTORE_UPSERT;
      
      httpclient.post(endpoint, node.token, payload, function(res){
        try {
          var res = JSON.parse(res);
          assert(res.success);
          node.status({fill:"green",shape:"dot",text:"success"});
        } catch (err) {
          node.error(res)
        }
        setTimeout(function(){node.status({})},2000)
      });
    });
  }
  RED.nodes.registerType("ckants insert",CkantsInsertNode);

  RED.httpAdmin.post("/ckants_search/:id", RED.auth.needsPermission("ckants.search"), function(req,res) {
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
