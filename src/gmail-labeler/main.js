var LAST_RUN = "LAST_RUN";

var checks = [
  {
    repo: "SFE-Lite",
    patterns: [
      /^README.md$/,
      /^yarn.lock$/,
      /^package.json$/,
      /^docs\//,
      /^jenkins_files\//,
      
      /\/package.json$/,
      /\/tsconfig.json$/,
      /\/tsconfig-jest.json$/,
      /\/tsconfig.settings.json$/,
      /\/jest.config.js$/,
      /\/tslint.json$/,
      /\/symphony-tslint-rules.json$/,
      
      /^client\/interfaces\//,
      /^client\/extensionLib\//,
      /^core\//
    ],
    author: [],
    comment: [],
    label: "PR Reviews/SFE-Lite/important"
  },
  {
    repo: "SFE-Lite",
    patterns: [
      /^core\//,
      /^client\/sdk-core\//
    ],
    author: [],
    comment: [],
    label: "PR Reviews/SFE-Lite/core"
  },
  {
    repo: "SFE-Lite",
    patterns: [],
    author: [
      "AndersDahlenborg",
      "liuting1014",
      "adam-symphony",

      "gbrannstrom",
      "axeleriksson147",
      "sasha-symphony",
      "swasunb",
      "moritzPlossSymphony",
      "debugmaster"
    ],
    comment: [],
    label: "PR Reviews/SFE-Lite/team"
  },
  {
    repo: "SFE-Lite",
    patterns: [],
    author: [],
    comment: [
      "johanblumenberg-symphony"
    ],
    label: "PR Reviews/SFE-Lite/commented"
  }
];

function matches(repo, info, files, reviews, check) {
  if (check.patterns && files.some(function (file) {
    return check.patterns.some(function (r) {
      return file.match(r);
    });
  })) {
    return true;
  }
  
  if (check.author && (check.author.indexOf(info.author) >= 0)) {
    return true;
  }
  
  if (check.comment && reviews.some(function (review) {
    return check.comment.indexOf(review.user) >= 0;
  })) {
    return true;
  }
  
  return false;
}

function reset(e) {
  var properties = PropertiesService.getUserProperties();
  properties.deleteProperty(LAST_RUN);
}

function checkNewEmails(e) {
  log("Run")
  
  var properties = PropertiesService.getUserProperties();
  var prev = properties.getProperty(LAST_RUN);
  var now = Math.floor(Date.now() / 1000).toString();
  
  if (!prev) {
    prev = Math.floor(Date.now() / 1000 - 7*24*60*60).toString();
  }
  
  log("prev: " + new Date(1000 * prev).toISOString() + " now: " + new Date(1000 * now).toISOString());
  var search = "after:" + prev;

  for (var pos = 0; pos < 5000; pos += 100) {
    log("search: " + search);
    var threads = GmailApp.search(search, pos, 100);
    log("found " + threads.length + " threads");
    
    threads.forEach(function (thread) {
      log("Thread: " + thread.getFirstMessageSubject());
      
      var message = thread.getMessages()[0];
      var sender = message.getFrom().replace(/^.+<([^>]+)>$/, "$1");
      
      if (sender === "notifications@github.com") {
        var url = getGithubLink(message)
        url = followRedirects(url)
        log(url)
        
        if (url) {
          var repo = parseGithubUrl(url)
          log(repo)
          
          if (repo.type === "PR") {
            checks.forEach(function (check) {
              if (check.repo === repo.repo) {
                log("Matching repo found " + repo.repo);
                
                var importantLabel = GmailApp.getUserLabelByName(check.label);
                if (!importantLabel) {
                  importantLabel = GmailApp.createLabel(check.label);
                }
                
                var pr = fetchPRInfo(repo, ["pr", "files", "reviews"]);
                var info = pr[0];
                var files = pr[1];
                var reviews = pr[2];
                trace(info);
                trace(files);
                trace(reviews);
                
                if (matches(repo, info, files, reviews, check)) {
                  log("Matching file found");
                  thread.addLabel(importantLabel);
                } else {
                  log("No matching file found");
                }
              }
            });
          }
        }
      }
    });
    
    if (threads.length < 100) {
      break;
    }
  }

  log("Storing new timestamp");
  properties.setProperty(LAST_RUN, now);
}

function throwNotAuthenticated(service) {
  log("Authenticate at " + service.getAuthorizationUrl());
  throw new Error("Not authenticated");
}
