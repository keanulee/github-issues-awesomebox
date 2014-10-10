$(function() {

  // Credit: http://jqueryui.com/autocomplete/#categories
  $.widget( 'custom.catcomplete', $.ui.autocomplete, {
    _create: function() {
      this._super();
      this.widget().menu( "option", "items", "> :not(.ui-autocomplete-category)" );
    },
    _renderMenu: function( ul, items ) {
      var that = this,
        currentCategory = "";
      $.each( items, function( index, item ) {
        var li;
        if ( item.category != currentCategory ) {
          ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>" );
          currentCategory = item.category;
        }
        li = that._renderItemData( ul, item );
        if ( item.category ) {
          li.attr( "aria-label", item.category + " : " + item.label );
        }

        // Add a icon to the label.
        if (item.color) {
          li.prepend('<div class="list-icon" style="background-color: #' + item.color + ';"></div>');
        }
        if (item.image) {
          li.prepend('<div class="list-icon" style="background-image: url(' + item.image + ');"></div>');
        }
      });
    }
  });

  /**
   * Tokenize the user-inputted query. Tokens are space-delimited, except for double-quoted
   * strings which are considered as one token. Note that since the user is actively
   * typing, the last double-quote may be missing.
   */
  function tokenize(str) {
    var tokens = [];
    var startIndex = 0;
    var inQuote = false;

    for (var i = 0; i < str.length; i++) {
      if (str[i] === '"') {
        inQuote = !inQuote;
      } else if (!inQuote && str[i] === ' ') {
        tokens.push(str.substring(startIndex, i));
        startIndex = i + 1;
      }
    }
    tokens.push(str.substring(startIndex));
    return tokens;
  }

  /**
   * Generates a sort comparator function used to sort arrays of objects by the given field.
   */
  function objectComparator(field) {
    return function(a, b) {
      if (a[field] > b[field]) return 1;
      if (a[field] < b[field]) return -1;
      return 0;
    }
  }

  /**
   * Creates a list of possible autocomplete values (objects) given the response from /issues.
   */
  function createDataFromResponse(issues) {
    var labels = [];
    var labelsMap = {};
    var owners = [];
    var ownersMap = {};
    var repos = [];
    var reposMap = {};

    issues.forEach(function(issue) {
      if (!reposMap[issue.repository.full_name]) {
        reposMap[issue.repository.full_name] = true;
        repos.push(issue.repository);
      }

      if (!ownersMap[issue.repository.owner.login]) {
        ownersMap[issue.repository.owner.login] = true;
        owners.push(issue.repository.owner);
      }

      issue.labels.forEach(function(label) {
        if (!labelsMap[label.name]) {
          labelsMap[label.name] = true;
          labels.push(label);
        }
      });
    });

    var labelsData = labels.sort(objectComparator('name')).map(function(label) {
      return {
        label: label.name,
        value: 'label:"' + label.name + '"',
        category: 'Labels',
        color: label.color
      };
    });

    var ownersData = owners.sort(objectComparator('login')).map(function(owner) {
      return {
        label: owner.login,
        value: 'user:' + owner.login,
        category: 'Owners',
        image: owner.avatar_url + '&s=60'
      };
    });

    var reposData = repos.sort(objectComparator('full_name')).map(function(repo) {
      return {
        label: repo.full_name,
        value: 'repo:' + repo.full_name,
        category: 'Repositories',
        image: repo.owner.avatar_url + '&s=60'
      };
    });

    return labelsData.concat(ownersData, reposData);
  }

  function handleResponse(response) {
    var data = createDataFromResponse(response);

    // Credit: http://jqueryui.com/autocomplete/#multiple
    $('#js-issues-search').bind('keydown', function(event) {
      // Don't navigate away from the field on tab when selecting an item
      if (event.keyCode === $.ui.keyCode.TAB && $(this).autocomplete('instance').menu.active) {
        event.preventDefault();
      }
    }).catcomplete({
      minLength: 0,
      source: function(request, response) {
        // Delegate back to autocomplete, but extract the last term. Remove
        // any quotes that are used to group tokens.
        var lastTerm = tokenize(request.term).pop().replace('"', '');
        response($.ui.autocomplete.filter(data, lastTerm));
      },
      focus: function(event, ui) {
        // Replace what the user typed so far with the focused value.
        var terms = tokenize(this.value);
        terms.pop();
        terms.push(ui.item.value);
        this.value = terms.join(' ');

        // Prevent the default autocomplete behavior.
        event.preventDefault();
      },
      select: function(event, ui) {
        // Replace what the user typed so far with the selected value.
        var terms = tokenize(this.value);
        terms.pop();
        terms.push(ui.item.value);
        // Add a space a the end for the next term.
        this.value = terms.join(' ') + ' ';

        // Prevent the default autocomplete behavior.
        event.preventDefault();
      }
    });
  }

  chrome.storage.sync.get('accessToken', function(items) {
    if (items.accessToken) {
      $.get('https://api.github.com/issues', {
        'page': 1,
        'access_token': items.accessToken,
        'filter': 'all',
        'per_page': 100
      }, handleResponse, 'json');
    }
  });
});
