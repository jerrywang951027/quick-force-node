var express = require('express');;
var nforce = require('nforce');
var hbs = require('hbs');

var app = express();

app.set('view engine', 'hbs');
app.enable('trust proxy');

function isSetup() {
  return (process.env.CONSUMER_KEY != null) && (process.env.CONSUMER_SECRET != null);
}

function oauthCallbackUrl(req) {
  return req.protocol + '://' + req.get('host');
}

hbs.registerHelper('get', function(field) {
  return this.get(field);
});

app.get('/', function(req, res) {
  if (isSetup()) {
    var org = nforce.createConnection({
      clientId: process.env.CONSUMER_KEY,
      clientSecret: process.env.CONSUMER_SECRET,
      redirectUri: oauthCallbackUrl(req),
      mode: 'single'
    });

    if (req.query.code !== undefined) {
      // authenticated
      org.authenticate(req.query, function(err) {
        if (!err) {
          org.query({ query: 'SELECT vlocity_cmt__OrchestrationPlanId__r.vlocity_cmt__OrderId__r.vlocity_cmt__FulfilmentStatus__c,Id,Name,vlocity_cmt__State__c,vlocity_cmt__OrchestrationItemDefinitionId__r.RecordType.Name,vlocity_cmt__OrchestrationItemDefinitionId__r.Name,vlocity_cmt__OrchestrationPlanDefinitionId__r.Name FROM vlocity_cmt__OrchestrationItem__c where  vlocity_cmt__State__c in ('Fatally Failed','Running')' }, function(err, results) {
            if (!err) {
              res.render('index', {records: results.records});
            }
            else {
              res.send(err.message);
            }
          });
        }
        else {
          if (err.message.indexOf('invalid_grant') >= 0) {
            res.redirect('/');
          }
          else {
            res.send(err.message);
          }
        }
      });
    }
    else {
      res.redirect(org.getAuthUri());
    }
  }
  else {
    res.redirect('/setup');
  }
});

app.get('/setup', function(req, res) {
  if (isSetup()) {
    res.redirect('/');
  }
  else {
    var isLocal = (req.hostname.indexOf('localhost') == 0);
    var herokuApp = null;
    if (req.hostname.indexOf('.herokuapp.com') > 0) {
      herokuApp = req.hostname.replace(".herokuapp.com", "");
    }
    res.render('setup', { isLocal: isLocal, oauthCallbackUrl: oauthCallbackUrl(req), herokuApp: herokuApp});
  }
});

app.listen(process.env.PORT || 5000);
