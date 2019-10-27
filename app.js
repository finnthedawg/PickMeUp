var express = require('express'),
  session = require('express-session'),
  bodyParser = require('body-parser'),
  hbs = require('express-handlebars'),
  graph = require('fbgraph'),
  //Google Cloud client library
  language = require('@google-cloud/language');


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
var options = {
  timeout:  3000
, pool:     { maxSockets:  Infinity }
, headers:  { connection:  "keep-alive" }
};

app.get('/auth', function (req, res) {

  // we don't have a code yet
  // so we'll redirect to the oauth dialog
  if (!req.query.code) {
    console.log("Performing oauth for some user right now.");

    var authUrl = graph.getOauthUrl({
      "client_id": conf.client_id
      , "redirect_uri": conf.redirect_uri
      , "scope": conf.scope
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
      "client_id": conf.client_id
      , "redirect_uri": conf.redirect_uri
      , "client_secret": conf.client_secret
      , "code": req.query.code
    }, function (err, facebookRes) {
      res.redirect('/LoggedIn');
    });
  }
});

async function getSentiment(text) {

  // Instantiates a client
  const client = new language.LanguageServiceClient();

  const document = {
    content: text,
    language: 'en',
    type: 'PLAIN_TEXT',
  };

  // Detects the sentiment of the text
  const [result] = await client.analyzeSentiment({ document: document });
  const sentiment = result.documentSentiment;

  return ({
    "text": text,
    "score": sentiment.score,
    "magnitude": sentiment.magnitude,
  });
}


async function getFeed(queryPath) {
  let newMessages;
  let next;
  let feedPromise = new Promise((resolve, reject) => {
    graph.setOptions(options)
      .get(queryPath, function (err, res) {
        if (err) {
          console.log("Invalid query" , err);
        } else {
          newMessages = res.data.filter(ele => ele.message !== undefined);
          try {
            next = res.paging.next;
          } catch (err){
            next = undefined;
          }
          resolve();
        }
      });
  });
  await feedPromise;
  return({
    "Messages" : newMessages,
    "Next" : next,
  });
}

async function getPosts(){
  let messages = [];
  let nextPage = "/me/feed";
  let reachedEnd = false;
  while (reachedEnd === false) {
    let val = await getFeed(nextPage);
    console.log("The next", val.Next);
    if(val.Next === undefined){
      reachedEnd = true;
    } else {
      nextPage = val.Next
    }
    messages = messages.concat(val.Messages);
  }

  //Extract only the messages.
  messages = messages.map((ele) => {
    if (ele.message !== undefined){
      return(ele.message);
    }
  })

  return(messages);
}

async function getPostsAndSentiment(){
  let posts = await getPosts();
  posts = posts.map((post) => {
    return({
      "Post" : post,
      "Sentiment" : getSentiment(post)
    });
  })

  for(var i = 0; i < posts.length; i++){
    try {
      posts[i].Sentiment = await posts[i].Sentiment;
    } catch(error) {
      console.log(error);
      posts[i].Sentiment = {
        score : 0,
        magnitude : 0
      };
    }
  }
  return(posts);
}

app.get('/LoggedIn', async function (req, res) {
  console.log(await getPostsAndSentiment());
});


server.listen(process.env.PORT || 3000, function () {
  console.log('Listening on port ' + server.address().port);
});