// var imported = document.createElement('script');
// imported.src = '/Javascript/mongodb_config.js';
// document.head.appendChild(imp

// modules ====================================================
var express = require("express");
//var jwt = require("express-jwt");
//var cors = require("cors");
//var dbModel = new db();
//dbModel.setupDisastersDB();

// configuration ============================================
// config files
//require('./Javascript/mongodb_config.js');
//require('./Javascript/rethinkdb_config.js');

//parse application/json and look for raw text
/*app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: 'application/json'}));
*/

var app = express();
//app.use(express.static(__dirname + "/public"));
var port = 3200;        // or var port = process.env.PORT || 3200;

/*app.get("/", function(req, res){
    res.send("BACK-END SERVER RUNNING ON PORT 3200");
});*/

// routes =====================================================
require('./routes/disaster/disaster')(app);  // pass our application into our disaster route

//require('./routes/users')(app);

require('./scrapper-server');

// start app =================================================
app.listen(port);
console.log("Server listening on port " + port);
exports = module.exports = app;