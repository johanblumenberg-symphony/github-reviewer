function followRedirects(original) {
  var url = original
  
  while (/^https:\/\/protect-us.mimecast.com\/.*/.test(url)) {
    // https://protect-us.mimecast.com/s/q9rCCgJQq7IJ0LUN0ihD?domain=github.com
    trace("follow redirect in " + url)
    
    var res = UrlFetchApp.fetch(url, {
      followRedirects: false
    })
    if (res.getResponseCode() >= 300 && res.getResponseCode() < 400) {
      url = res.getHeaders()["Location"]
    } else {
      throw new Error("Expected a redirect, got " + res.getResponseCode())
    }
    trace("redirect to " + url)
    
    if (/^https:\/\/security-us.mimecast.com\//.test(url)) {
      // https://security-us.mimecast.com/ttpwp#/ua?key=am9oYW4uYmx1bWVuYmVyZ0BzeW1waG9ueS5jb218ODE5YjkyYTctMWJmNS0zN2IzLTgxMmUtYzQyYWE5OWE1NTYx
      trace("Got redirect to questionaire, restarting")
      url = original
    }
  }

  return url
}

function parseGithubUrl(url) {
  var m = url.match(/^https:\/\/github.com\/([^\/]*)\/([^\/]*)\/(pull|issues|commit)\/([0-9a-f]*)([?\/#].*)?$/)  
  if (m) {
    // https://github.com/SymphonyOSF/SFE-Lite/pull/1320?email_source=notifications&email_token=AHSDUPOH66OUARJ6ST3KLT3QRRML3A5CNFSM4JH5HRCKYY3PNVWWK3TUL52HS4DFWZEXG43VMVCXMZLOORHG65DJMZUWGYLUNFXW5KTDN5WW2ZLOORPWSZGOUS6DVMI#event-2763799217
    // https://github.com/SymphonyOSF/SFE-RTC/pull/2082
    var types = {
      pull: "PR",
      issues: "ISSUE",
      commit: "COMMIT"
    }
    
    return {
      type: types[m[3]],
      owner: m[1],
      repo: m[2],
      pull_number: m[4]
    }
  }
  throw new Error("Unknown URL: " + url)
}

function getPRLink(state) {
  // https://github.com/SymphonyOSF/SFE-Lite/pull/1320
  return "https://github.com/" + state.owner + "/" + state.repo + "/pull/" + state.pull_number
}

function fetchPullRequest(repo) {
  return fetchPRInfo(repo, ["pr"])[0];
}

function _fetchPullRequestRequest(repo) {
  return Utilities.formatString("https://api.github.com/repos/%s/%s/pulls/%s", repo.owner, repo.repo, repo.pull_number);
}

function _fetchPullRequestResponse(res) {
  var data = JSON.parse(res);

  return {
    title: data.title,
    state: data.merged_at != null ? "merged" : data.state,
    labels: data.labels.map(function (l) { return { name: l.name, color: l.color } }),
    target: data.base.ref,
    author: data.user.login
  }
}

function fetchReviews(repo) {
  return fetchPRInfo(repo, ["reviews"])[0];
}

function _fetchReviewsRequest(repo) {
  return Utilities.formatString("https://api.github.com/repos/%s/%s/pulls/%s/reviews", repo.owner, repo.repo, repo.pull_number);
}

function _fetchReviewsResponse(res, repo) {
  var data = JSON.parse(res)

  var reviews = data.map(function (u) {
    return { user: u.user.login, state: u.state }
  })

  reviews.forEach(function (r) {
    log(r.user + " " + r.state)
  })
  
  var status = {}
  lastIndex = {}
  reviews.forEach(function (u, i) {
    if (u.user !== repo.author) {
      if (u.state === "DISMISSED") {
        status[u.user] = "COMMENTED"
        lastIndex[u.user] = i
      } else if (!status[u.user]) {
        status[u.user] = u.state
        lastIndex[u.user] = i
      } else if (u.state !== "COMMENTED") {
        status[u.user] = u.state
        lastIndex[u.user] = i
      }
    }
  })
  
  return reviews.filter(function (u, i) {
    return lastIndex[u.user] === i
  }).map(function (u) {
    return {
      user: u.user,
      state: status[u.user]
    }
  })
}

function fetchFiles(repo) {
  return fetchPRInfo(repo, ["files"])[0];
}

function _fetchFilesRequest(repo) {
  return Utilities.formatString("https://api.github.com/repos/%s/%s/pulls/%s/files", repo.owner, repo.repo, repo.pull_number);
}

function _fetchFilesResponse(res) {
  var data = JSON.parse(res)
  return data.map(function (file) { return file.filename; });
}

function fetchPRInfo(repo, what) {
  var res = fetchAll(what.map(function (what) {
    if (what === "pr") {
      return _fetchPullRequestRequest(repo);
    } else if (what === "reviews") {
      return _fetchReviewsRequest(repo);
    } else if (what === "files") {
      return _fetchFilesRequest(repo);
    } else {
      throw new Error("Unknown fetch type:" + what);
    }
  }));
  
  return what.map(function (what, index) {
    if (what === "pr") {
      return _fetchPullRequestResponse(res[index]);
    } else if (what === "reviews") {
      return _fetchReviewsResponse(res[index], repo);
    } else if (what === "files") {
      return _fetchFilesResponse(res[index]);
    } else {
      throw new Error("Unknown fetch type:" + what);
    }
  });
}
