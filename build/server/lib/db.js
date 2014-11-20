// Generated by CoffeeScript 1.8.0
var Client, S, fs, initTokens, logger, request;

fs = require('fs');

logger = require('printit')({
  date: false,
  prefix: 'lib:db'
});

S = require('string');

Client = require("request-json").JsonClient;

initTokens = require('../lib/token').init;

request = require('../lib/request');

logger = require('printit')({
  date: true,
  prefix: 'lib/db'
});

module.exports = function(callback) {
  var addCozyAdmin, addCozyUser, couchClient, couchUrl, db, db_create, db_ensure, feed, feed_start, initLoginCouch, logCreated, logError, logFound, request_create;
  feed = require('../lib/feed');
  db = require('../helpers/db_connect_helper').db_connect();
  couchUrl = "http://" + db.connection.host + ":" + db.connection.port + "/";
  couchClient = new Client(couchUrl);

  /* Helpers */
  initLoginCouch = function() {
    var data, lines;
    data = fs.readFileSync('/etc/cozy/couchdb.login');
    lines = S(data.toString('utf8')).lines();
    return lines;
  };
  addCozyAdmin = function(callback) {
    var data, loginCouch;
    loginCouch = initLoginCouch();
    data = {
      "admins": {
        "names": [loginCouch[0]],
        "roles": []
      },
      "readers": {
        "names": [loginCouch[0], 'proxy'],
        "roles": []
      }
    };
    couchClient.setBasicAuth(loginCouch[0], loginCouch[1]);
    return couchClient.put("" + db.name + "/_security", data, function(err, res, body) {
      return callback(err);
    });
  };
  addCozyUser = function(callback) {
    var data, loginCouch;
    loginCouch = initLoginCouch();
    data = {
      "_id": "org.couchdb.user:proxy",
      "name": "proxy",
      "type": "user",
      "roles": [],
      "password": process.env.TOKEN
    };
    couchClient.setBasicAuth(loginCouch[0], loginCouch[1]);
    return couchClient.get('_users/org.couchdb.user:proxy', (function(_this) {
      return function(err, res, body) {
        if (body != null) {
          return couchClient.del("_users/org.couchdb.user:proxy?rev=" + body._rev, function(err, res, body) {
            return couchClient.post('_users', data, function(err, res, body) {
              return callback(err);
            });
          });
        } else {
          return couchClient.post('_users', data, function(err, res, body) {
            return callback(err);
          });
        }
      };
    })(this));
  };

  /* Logger */
  logFound = function() {
    logger.info(("Database " + db.name + " on " + db.connection.host) + (":" + db.connection.port + " found."));
    feed_start();
    return request_create();
  };
  logError = function(err) {
    logger.info("Error on database creation : ");
    return logger.info(err);
  };
  logCreated = function() {
    logger.info(("Database " + db.name + " on") + (" " + db.connection.host + ":" + db.connection.port + " created."));
    feed_start();
    return request_create();
  };

  /* Check existence of cozy database or create it */
  db_ensure = function(callback) {
    return db.exists(function(err, exists) {
      var loginCouch;
      if (err) {
        couchUrl = "" + db.connection.host + ":" + db.connection.port;
        logger.error("Error: " + err + " (" + couchUrl + ")");
        return process.exit(1);
      } else if (exists) {
        if (process.env.NODE_ENV === 'production') {
          loginCouch = initLoginCouch();
          return addCozyUser(function(err) {
            if (err) {
              logger.error("Error on database" + (" Add user : " + err));
              return callback();
            } else {
              return addCozyAdmin((function(_this) {
                return function(err) {
                  if (err) {
                    logger.error("Error on database" + (" Add admin : " + err));
                    return callback();
                  } else {
                    logFound();
                    return callback();
                  }
                };
              })(this));
            }
          });
        } else {
          logFound();
          return callback();
        }
      } else {
        return db_create(callback);
      }
    });
  };
  db_create = function(callback) {
    logger.info(("Database " + db.name + " on") + (" " + db.connection.host + ":" + db.connection.port + " doesn't exist."));
    return db.create(function(err) {
      if (err) {
        logError(err);
        if (err.error === 'unauthorized') {
          return process.exit(1);
        } else {
          return db_create(callback);
        }
      } else if (process.env.NODE_ENV === 'production') {
        return addCozyUser(function(err) {
          if (err) {
            logger.error("Error on database" + (" Add user : " + err));
            return callback();
          } else {
            return addCozyAdmin((function(_this) {
              return function(err) {
                if (err) {
                  logError(err);
                  return callback();
                } else {
                  logCreated();
                  return callback();
                }
              };
            })(this));
          }
        });
      } else {
        logCreated();
        return callback();
      }
    });
  };
  request_create = function() {
    db.get('_design/doctypes', (function(_this) {
      return function(err, doc) {
        if (err && err.error === "not_found") {
          return db.save('_design/doctypes', {
            all: {
              map: "function(doc) {\n    if(doc.docType) {\n        return emit(doc.docType, null);\n    }\n}",
              reduce: "function(key, values) {\n    return true;\n}"
            }
          });
        }
      };
    })(this));
    db.get('_design/device', (function(_this) {
      return function(err, doc) {
        if (err && err.error === "not_found") {
          return db.save('_design/device', {
            all: {
              map: "function(doc) {\n    if(doc.docType && doc.docType.toLowerCase() === \"device\") {\n        return emit(doc._id, doc);\n    }\n}"
            },
            byLogin: {
              map: "function (doc) {\n    if(doc.docType && doc.docType.toLowerCase() === \"device\") {\n        return emit(doc.login, doc)\n    }\n}"
            }
          });
        }
      };
    })(this));
    db.get('_design/binary', (function(_this) {
      return function(err, doc) {
        if (err && err.error === "not_found") {
          return db.save('_design/binary', {
            byDoc: {
              map: "function(doc) {\n    if(doc.binary) {\n        for (bin in doc.binary) {\n            emit(doc.binary[bin].id, doc._id);\n        }\n    }\n}"
            }
          });
        }
      };
    })(this));
    return db.get('_design/tags', (function(_this) {
      return function(err, doc) {
        if (err && err.error === "not_found") {
          return db.save('_design/tags', {
            all: {
              map: "function (doc) {\nvar _ref;\nreturn (_ref = doc.tags) != null ? typeof _ref.forEach === \"function\" ? _ref.forEach(function(tag) {\n   return emit(tag, null);\n    }) : void 0 : void 0;\n}",
              reduce: "function(key, values) {\n    return true;\n}"
            }
          });
        }
      };
    })(this));
  };
  feed_start = function() {
    return feed.startListening(db);
  };
  return db_ensure(function() {
    return initTokens((function(_this) {
      return function(tokens, permissions) {
        return request.init(function(err) {
          if (callback != null) {
            return callback();
          }
        });
      };
    })(this));
  });
};
