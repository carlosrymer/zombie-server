/**
 * Express Module
 * @type {object}
 */
var express = require('express'),

/**
 * URL Module
 * @type {object}
 */
urlParser = require('url'),

/**
 * Express App
 * @type {object}
 */
app     = express(),

/**
 * Browser Service
 * @type {object}
 */
browser = require('zombie'),

/**
 * URL Validator module
 * @type {object}
 */
validator = require('valid-url'),

/**
 * Regex for stripping out script tags from html content
 * @type {RegExp}
 */
scriptTagRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,

/**
 * Options for browser service
 * @type {Object}
 */
options = {
  debug: process.env.SERVER_DEBUG || false,
  maxWait: 20000,
  waitFor: process.env.DELAY_EXECUTION || 3000,
  loadCSS: process.env.ALLOW_CSS || false,
  runScripts: true
},

/**
 * Port to listen on
 * @type {Number}
 */
port = process.env.SERVER_PORT || 80,

/**
 * Allowed Hostnames
 * @type {string}
 */
allowedDomains = process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',') : [];

/**
 * Strips script tags out of a string
 * @param  {string} html The HTML string
 * @return {string} The transformed HTML string
 */
function stripScriptTags(html) {
  return html.replace(scriptTagRegex, '');
}

/**
 * Validates if the domain is allowed
 * @param {string} url The string to validate against allowed domains
 * @return {Boolean} Whether the domain is allowed or not
 */
function isDomainAllowed(url) {
  if (!allowedDomains.length) {
    return false;
  } 

  /**
   * Parsed url object
   * @type {object}
   */
  var parsedUrl = urlParser.parse(url);

  return allowedDomains.indexOf(parsedUrl.hostname) !== -1;
}

/**
 * Middleware that validates a url
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {Function} next The next function to go to the next step
 */
function validateUrl(req, res, next) {
  if (req.query.url && validator.isUri(req.query.url) && isDomainAllowed(req.query.url)) {
    next();
  } else {
    res.status(403).send({
      status: 0,
      message: 'Please supply a valid url.'
    })
  }
}

/**
 * Leverages the browser service to render the page and send HTML as response
 * @param  {object} req The request object
 * @param  {object} res The response object
 */
function renderPage(req, res) {
  /**
   * Creates a new browser instance to open a page
   * @type {object}
   */
  var page = new browser(options);

  // Fail Google Analytics Request
  page.resources.mock('http://www.google-analytics.com/analytics.js', {
    statusCode: 200,
    headers: { 
      'ContentType': 'application/javascript' 
    },
    body: ''
  });
  
  // Open the page and evaluate
  page.visit(req.query.url.split('?')[0].split('%3F')[0]).then(function() {

    res.send(stripScriptTags(page.html()));

  });
}

// Disable Powered By in Header
app.disable('x-powered-by');

// Listen to requests
app.get('/render', validateUrl, renderPage);

// Listen to an assigned port
app.listen(port);

console.log('Server running on port ' + port);

