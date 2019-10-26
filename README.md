# PickMeUp
Get a positive affirmation to start off your day right

# Build 

Ensure that you include /config/config.json containing your application key from developers.facebook.com

Sample configuration.

```
{
  "client_id":      "YOUR APP ID",
  "client_secret":  "YOUR APP SECRET",
  "scope":          "email, user_posts, user_photos",
  "redirect_uri":   "http://localhost:3000/auth"
}
```

**Note remember to whitelist your domain in the app console**

Then create a google GCP service account. Set your local shell variable to your JSON credential files with the following command.

``` export GOOGLE_APPLICATION_CREDENTIALS="/home/user/Downloads/service-account-file.json" ```

Then start up the service!

`npm install`

`nodemon app.js`


