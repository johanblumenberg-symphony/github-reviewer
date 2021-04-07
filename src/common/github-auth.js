var CLIENT_ID = "github-client-id"
var CLIENT_SECRET = "github-client-secret"

function get3PAuthorizationUrls() {
}

function hasClientCredentials() {
  var properties = PropertiesService.getUserProperties();
  return properties.getProperty(CLIENT_ID) != null
}

function setClientCredentials(clientId, clientSecret) {
  var properties = PropertiesService.getUserProperties();
  properties.setProperty(CLIENT_ID, clientId);
  properties.setProperty(CLIENT_SECRET, clientSecret);
}

function resetClientCredentials() {
  var properties = PropertiesService.getUserProperties();
  properties.deleteProperty(CLIENT_ID);
  properties.deleteProperty(CLIENT_SECRET);
}

function getOAuthService() {
  var properties = PropertiesService.getUserProperties();

  return OAuth2.createService("GitHub")
      .setAuthorizationBaseUrl("https://github.com/login/oauth/authorize")
      .setTokenUrl("https://github.com/login/oauth/access_token")
      .setClientId(properties.getProperty(CLIENT_ID))
      .setClientSecret(properties.getProperty(CLIENT_SECRET))
      .setScope("repo")
      .setCallbackFunction("authCallback")
      .setCache(CacheService.getUserCache())
      .setPropertyStore(PropertiesService.getUserProperties());
}

function authCallback(callbackRequest) {
  var authorized = getOAuthService().handleCallback(callbackRequest);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success!');
  } else {
    return HtmlService.createHtmlOutput('Denied');
  }
}

function fetch(url) {
  return fetchAll([url]);
}

function fetchAll(urls) {
  var service = getOAuthService();
  var maybeAuthorized = service.hasAccess();
  
  if (maybeAuthorized) {
    var accessToken = service.getAccessToken();

    var headers = {
      "Authorization": Utilities.formatString("token %s", accessToken)
    }
    
    var resps = UrlFetchApp.fetchAll(urls.map(function (url) {
      return {
        url: url,
        headers: headers,
        muteHttpExceptions: true
      };
    }));

    return resps.map(function (resp) {
      var code = resp.getResponseCode();
      if (code >= 200 && code < 300) {
        return resp.getContentText("utf-8");
      } else if (code == 401 || code == 403) {
        console.log("Backend server error (%s): %s", code.toString(), resp.getContentText("utf-8"));
        throwNotAuthenticated(service)
      } else {
        console.error("Backend server error (%s): %s", code.toString(), resp.getContentText("utf-8"));
        throw ("Backend server error: " + code);
      }
    });
  } else {
    throwNotAuthenticated(service)
  }
}
