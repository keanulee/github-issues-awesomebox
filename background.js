var clientId = 'eb86f255783c483a27c5';
var clientSecret = '4b642ffdc93f1f71dbd10aa2cd17c494192abe08';
var state = '' + Math.random();

function encodeFormObject(obj) {
  var values = [];
  for (var key in obj) {
    values.push(key + '=' + encodeURIComponent(obj[key]));
  }
  return values.join('&');
}

function getFormValue(str, key) {
  var regex = new RegExp(key + '=([^&]*)');
  var match = regex.exec(str);
  if (match) {
    return match[1];
  }
  return null;
}

function authorizeGitHubUser() {
  var authUrl = 'https://github.com/login/oauth/authorize?' + encodeFormObject({
    'client_id': clientId,
    'scope': 'repo',
    'state': state
  });

  chrome.identity.launchWebAuthFlow({
    'url': authUrl,
    'interactive': true
  }, function(redirectUrl) {
    var responseState = getFormValue(redirectUrl, 'state');
    if (responseState === state) {
      var code = getFormValue(redirectUrl, 'code');
      if (code) {
        exchangeCodeForToken(code);
      }
    }
  });
}

function exchangeCodeForToken(code) {
  var xhr = new XMLHttpRequest();
  xhr.onload = handleTokenResponse;
  xhr.open('POST', 'https://github.com/login/oauth/access_token');
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhr.send(encodeFormObject({
    'client_id': clientId,
    'client_secret': clientSecret,
    'code': code
  }));
}

function handleTokenResponse() {
  var accessToken = getFormValue(this.responseText, 'access_token');
  if (accessToken) {
    chrome.storage.sync.set({
      accessToken: accessToken
    });
  }
}

chrome.storage.sync.get('accessToken', function(items) {
  if (!items.accessToken) {
    authorizeGitHubUser();
  }
});
