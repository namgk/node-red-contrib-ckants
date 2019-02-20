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

  var TIMESERIES_API = "/api/3/action/timeseries";
  var DATASTORE_API = "/api/3/action/datastore";

  var DATASTORE_UPSERT = DATASTORE_API + "_upsert";
  var DATASTORE_SEARCH = DATASTORE_API + "_search";
  // Constants for SQL Search
  var DATASTORE_SEARCH_SQL = DATASTORE_API + "_search_sql";

  var TIMESERIES_UPSERT = TIMESERIES_API + "_upsert";
  var TIMESERIES_SEARCH = TIMESERIES_API + "_search";
  // Constants for SQL Search
  var TIMESERIES_SEARCH_SQL = TIMESERIES_API + "_search_sql";

  function validateNode(node, sqlSearch){
    if (!node.resourceId && !sqlSearch){ // SQL search only needs the resource ID to be in the query.
      throw "No resourceId specified";
    }

    if (!node.auth) {
      throw "No credentials specified";
    }
  }

  function CkantsSearchNode(n) {
    validateNode(n, false);

    RED.nodes.createNode(this,n);
    var node = this;

    node.resourceId = n.resourceId;
    node.timeseries = n.timeseries;
    node.fromtime = n.fromtime;
    node.totime = n.totime;
    node.auth = RED.nodes.getNode(n.auth);


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

      if (!node.timeseries){
        delete payload.fromtime
        delete payload.totime
      }

      var endpoint = node.ckan + (node.timeseries ? TIMESERIES_SEARCH : DATASTORE_SEARCH);

      node.status({fill:"green",shape:"dot",text:"working..."});

      httpclient.post(endpoint, node.token, payload, function(res){
        try {
          var res = JSON.parse(res);
          assert(res.success);
          node.send({payload: res});
          node.status({})
        } catch (err) {
          node.status({fill:"red",shape:"dot",text:"error"})
          node.error(res)
          setTimeout(function(){
            node.status({})
          }, 2000)
        }

      });
    });
  }

  RED.nodes.registerType("ckants search", CkantsSearchNode);

  /* Exposes SQL Query portion of the CKAN API for use. */
  function CkantsSQLSearchNode(n) {
    validateNode(n, true);

    RED.nodes.createNode(this, n);
    var node = this;

    node.auth = RED.nodes.getNode(n.auth);
    node.timeseries = n.timeseries;

    node.token = node.auth.token;
    node.ckan = node.auth.ckan;    

    node.on("input",function(msg) {
      if (!msg || msg.payload == null) {
        node.error('no input');
        return;
      }

      // Note: Query here is constructed differently to other functions as per the CKAN API.
      var endpoint = node.ckan + (node.timeseries ? TIMESERIES_SEARCH_SQL : DATASTORE_SEARCH_SQL);
      endpoint += "?sql=" + msg.payload; 

      httpclient.post(endpoint, node.token, {}, function(res){
        try  {
          var res = JSON.parse(res);
          assert(res.success);
          node.send({payload: res});
          node.status({})
        } catch (err) {
          node.status({fill:"red",shape:"dot",text:"error"});
          node.error(res);
          setTimeout(function(){
            node.status({});
          }, 2000)
        }
      });
    });  
  }

  RED.nodes.registerType("ckants sql search",CkantsSQLSearchNode);

  function CkantsInsertNode(n) {
    validateNode(n, false);

    RED.nodes.createNode(this,n);
    var node = this;

    node.resourceId = n.resourceId;
    node.auth = RED.nodes.getNode(n.auth);
    node.timeseries = n.timeseries;


    node.token = node.auth.token;
    node.ckan = node.auth.ckan;
    
    node.on("input",function(msg) {
      if (!msg || msg.payload == null) {
        node.error('no input');
        return;
      }

      if (!Array.isArray(msg.payload)){
        // this node receives an array of records, converting msg.payload into an array
        msg.payload = [msg.payload]
      }

      var payload = {
        resource_id: node.resourceId,
        method: "insert",
        records: msg.payload
      };

      var endpoint = node.ckan + (node.timeseries ? TIMESERIES_UPSERT : DATASTORE_UPSERT);
      
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

  function CkantsInsertOutputNode(n) {
    validateNode(n, false);

    RED.nodes.createNode(this,n);
    var node = this;

    node.resourceId = n.resourceId;
    node.auth = RED.nodes.getNode(n.auth);
    node.timeseries = n.timeseries;


    node.token = node.auth.token;
    node.ckan = node.auth.ckan;

    node.on("input",function(msg) {
      if (!msg || msg.payload == null) {
        node.error('no input');
        return;
      }

      if (!Array.isArray(msg.payload)){
        // this node receives an array of records, converting msg.payload into an array
        msg.payload = [msg.payload]
      }

      var payload = {
        resource_id: node.resourceId,
        method: "insert",
        records: msg.payload
      };
      msg.payload = {};

      var endpoint = node.ckan + (node.timeseries ? TIMESERIES_UPSERT : DATASTORE_UPSERT);

      httpclient.post(endpoint, node.token, payload, function(res) {
        try {
          // Parse the response.
          let response = JSON.parse(res);
          assert(response.success);

          // Forward the response.
          node.status({fill:"green",shape:"dot",text:"success"});
          msg.payload.success = true;
          node.send(msg);
        }
        catch (err) {
          // Handle the error case.
          node.status({fill:"red",shape:"dot",text:"error"});
          msg.payload.success = false;
          node.error(err);
          node.send(msg);
        }
        setTimeout(function(){node.status({})},2000)
      });
    });
  }
  RED.nodes.registerType("ckants insert output",CkantsInsertOutputNode);

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
