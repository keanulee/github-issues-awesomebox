document.getElementById('save').addEventListener('click', function() {
  chrome.storage.sync.set({
    accessToken: document.getElementById('tokenTextbox').value
  });
});

document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get('accessToken', function(items) {
    document.getElementById('tokenTextbox').value = items.accessToken || '';
  });
});
