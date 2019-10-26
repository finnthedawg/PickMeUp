var express = require('express'),
  session = require('express-session'),
  bodyParser = require('body-parser'),
  hbs = require('express-handlebars'),
  graph = require('fbgraph')


  // Global app object
var app = express();

var server = require('http').createServer(app)



//Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.engine('.hbs', hbs({ extname: '.hbs' }));
app.set('view engine', '.hbs');

//Serve static files
app.use(express.static('public'));
app.use(session({ secret: 'PickMeUp', cookie: { maxAge: 60000 }, resave: false, saveUninitialized: false }));

app.get('/', function (req, res) {
  res.render('index', {});
});

var conf = require('./config/config.json')

app.get('/auth', function(req, res) {
 
    // we don't have a code yet
    // so we'll redirect to the oauth dialog
    if (!req.query.code) {
      console.log("Performing oauth for some user right now.");
    
      var authUrl = graph.getOauthUrl({
          "client_id":     conf.client_id
        , "redirect_uri":  conf.redirect_uri
        , "scope":         conf.scope
      });
   
      if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
        res.redirect(authUrl);
      } else {  //req.query.error == 'access_denied'
        res.send('access denied');
      }
    }
    // If this branch executes user is already being redirected back with 
    // code (whatever that is)
    else {
      console.log("Oauth successful, the code (whatever it is) is: ", req.query.code);
      // code is set
      // we'll send that and get the access token
      graph.authorize({
          "client_id":      conf.client_id
        , "redirect_uri":   conf.redirect_uri
        , "client_secret":  conf.client_secret
        , "code":           req.query.code
      }, function (err, facebookRes) {
          console.log(facebookRes);
        res.redirect('/LoggedIn');
      });
    }
  });

  app.get('/LoggedIn', function (req, res){
        graph.get("/me/feed", function(err, res){
            console.log(res);
        })
    res.render('LoggedIn', {});
  });


server.listen(process.env.PORT || 3000, function () {
    console.log('Listening on port ' + server.address().port);
  });