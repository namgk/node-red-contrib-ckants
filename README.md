
# node-red-contrib-ckants

[![CKANTS Node](https://snag.gy/4gzVSO.jpg)](#features)

CKANTS nodes help interfacing with CKAN Timeseries extension <https://github.com/namgk/ckan-timeseries>. If you don't have a CKAN instance or don't want to install the Timeseries extension, you can create an account at <http://hub.urbanopus.net> and publish your data there for free (data quota applied).

Currently the collection has four nodes: 
* a Create node for creating a new CKAN Timeseries resource
* an Insert node for pushing data to the created resource
* a Search node for querying data from the resource
* an SQL search node to perform more powerful queries on a resource

All these nodes require CKANTS Credentials to be configured. The Credentials includes 
* a CKAN host url, the CKAN host needs to have the CKAN Timeseries extension installed (refer to its repo)
* a CKAN user token, which is the CKAN API Key and can be found at the bottom left corner of CKAN user profile page: http://\<ckan host\>/user/\<username\>

![CKANTS Credentials](https://snag.gy/3YVtGS.jpg)

## Create Node

This node creates a new CKAN Timeseries resource in the datastore database.

It requires a Package ID, which is a name of a CKAN dataset. Recall in CKAN, actual data records are stored in CKAN Resources and CKAN Resources are grouped into packages called CKAN dataset. A dataset can be created on CKAN web interface by an authorized user.

The resource name is optional, if left blank, CKAN will named it "Undefined"

With this node, you can define the schema of the data to be stored in the CKAN datastore.

![CKANTS Create](https://snag.gy/SZiuas.jpg)

In this example, we create a resource name "Buses" that holds the real-time data of all public buses in Vancouver, BC. The resource is held in a dataset called "Vancouver-BC".

It currently has two fields, an Address and a Latitude fields. The dropdown menu to the left of the field name helps choosing the field types. Supported types according to CKAN are: text, int, float, bool, json, date, time, timez, timestamp, timestampz.

After properly configure the node, you deploy the node by clicking Deploy on Node-RED. The actual create request will be sent by clicking the trigger button of the create node.

If the operation is success, you will find the newly created resource with its ID shown in the Debug tab:

![CKANTS Created](https://snag.gy/8NmeLl.jpg)

IMPORTANT! Keep this resource ID safe somewhere since we are going to use it in subsequent insert and search operations.

## Insert Node

This node pushes the message payload it receives to a corresponding resource. Its configuration only has a Resource ID which specifies the destined CKAN Resource of the data

![CKANTS Insert](https://snag.gy/lGBOzo.jpg)

In order to actually push the data, in this example we create a new function node and a inject node for triggering. The function node crafts a message payload that has the exact data according to the data schema created by Create Node.

The function node looks like this:

![Crafting data](https://snag.gy/zNAuKd.jpg)

IMPORTANT! The Insert node receives an array of records, not an object.

The insert flow looks like this:

![Insert flow](https://snag.gy/tFIOkZ.jpg)

After clicking the trigger, you will find a success status as follow:

![Insert success](https://snag.gy/X0y4vY.jpg)

## Search Node

This node helps send a query to CKAN Timeseries. Similar to the Insert node, it requires a resource ID where the data is stored.

![Search](https://snag.gy/QfHMpa.jpg)

The other two optional query parameters are fromtime and totime. These parameters are used to query for data based on time frame when the data is recorded in the database. Format of fromtime and totime follows ISO 8601 standard and a custom format. The custom format is a quick and easy way to specify which time frame of data to be returned relatively to the current moment. 

Custom formats look like:

* last 2m --> will be translated to a timestamp from 2 minutes ago relatively to the current time
* last 2d,2m --> last 2 days and 2 minutes
* last 2h,2s,2m --> last 2 hours, 2 minutes and 2 seconds
* ...

The whole flow looks like this:

![Search flow](https://snag.gy/9hzvRJ.jpg)

When triggered, the query will be sent to CKAN Timeseries Datastore and results be forward to the Debugger node.

![Search result](https://snag.gy/dG1os5.jpg)

## SQL Search Node
This node sends a user defined SQL query to CKAN.

![SQL Search Config](https://snag.gy/qo1yRn.jpg)

Queries can be performed by loading the message payload with an SQL query in string format and then piping this in to the SQL Search node. Such an operation can be performed using a function node. This configuration allows for easier automation and programatic query generation.

![Constructing a Query](https://snag.gy/NECJzv.jpg)
__NOTE: It is important that the resource ID is wrapped in broken out quotes (as seen above).__

The whole flow looks like this:

![Search SQL Flow](https://snag.gy/MNnDmA.jpg)

When triggered, output should look something like this:

![SQL Search Result](https://snag.gy/HyaNWp.jpg)

From this point users can drill down into the records to get the query results.
