import settings from './settings';

var messages = [];

var untranslated = {
  apiUnsupported: 'Your version of lichess app is too old! Please upgrade for free to the latest version.',
  apiDeprecated: 'Upgrade for free to the latest lichess app! Support for this version will be dropped on %s.',
  resourceNotFoundError: 'Resource not found',
  lichessIsUnavailableError: 'lichess.org is temporarily down for maintenance',
  mustSignIn: 'You must sign in to see this.',
  mustSignInToJoin: 'You must sign in to join it.',
  boardThemeBrown: 'Brown',
  boardThemeBlue: 'Blue',
  boardThemeGreen: 'Green',
  boardThemeGrey: 'Grey',
  boardThemePurple: 'Purple',
  boardThemeWood: 'Wood',
  boardThemeWood2: 'Wood 2',
  boardThemeWood3: 'Wood 3',
  boardThemeBlue2: 'Blue 2',
  boardThemeCanvas: 'Canvas',
  boardThemeMetal: 'Metal',
  playerisInvitingYou: '%s is inviting you',
  toATypeGame: 'To a %s game',
  unsupportedVariant: 'Variant %s is not supported in this version',
  language: 'Language'
};

var defaultCode = 'en';

function loadFile(code) {
  return m.request({
    url: 'i18n/' + code + '.json',
    method: 'GET',
    deserialize: function(text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw { error: 'Lang not available' };
      }
    }
  }).then(function(data) {
    messages = data;
    return code;
  }, function(error) {
    // workaround for iOS: because xhr for local file has a 0 status it will
    // reject the promise and still have the response object
    if (error && error.playWithAFriend) {
      messages = error;
      return code;
    } else {
      if (code === defaultCode) throw new Error(error);
      return loadFile(defaultCode);
    }
  });
}

function loadMomentLocale(code) {
  if (code === 'en') return;
  var script = document.createElement('script');
  script.src = 'moment/locale/' + code + '.js';
  document.head.appendChild(script);
  window.moment.locale(code);
  return code;
}

function loadPreferredLanguage() {
  if (settings.general.lang())
    return loadFromSettings();

  var deferred = m.deferred();
  window.navigator.globalization.getPreferredLanguage(
    language => deferred.resolve(language.value.split('-')[0]),
    () => deferred.resolve(defaultCode)
  );
  return deferred.promise
    .then(code => {
      settings.general.lang(code);
      return code;
    })
    .then(loadFile)
    .then(loadMomentLocale);
}

function getAvailableLanguages() {
  return m.request({
    url: 'i18n/refs.json',
    method: 'GET'
  }).then(data => { return data; }, error => {
    // same workaround for iOS as above
    if (error && error[0][0] === 'af')
      return error;
    else
      throw { error: 'Cannot load languages' };
  });
}

function loadFromSettings() {
  return loadFile(settings.general.lang()).then(loadMomentLocale);
}

module.exports = function(key) {
  var str = messages[key] || untranslated[key] || key;
  Array.prototype.slice.call(arguments, 1).forEach(function(arg) {
    str = str.replace('%s', arg);
  });
  return str;
};
module.exports.loadPreferredLanguage = loadPreferredLanguage;
module.exports.getAvailableLanguages = getAvailableLanguages;
module.exports.loadFromSettings = loadFromSettings;
