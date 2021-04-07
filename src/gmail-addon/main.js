function getReviewIcon(state) {
  if (state === "APPROVED") {
    return "https://storage.googleapis.com/gmail-github-reviewer/approved.png"
  } else if (state === "CHANGES_REQUESTED") {
    return "https://storage.googleapis.com/gmail-github-reviewer/reject.png"
  } else if (state === "COMMENTED") {
    return "https://storage.googleapis.com/gmail-github-reviewer/comment.png"
  } else {
    log("Unknown review state " + state)
    return ""
  }
}

function buildAddOn(e) {
  if (hasClientCredentials()) {
    return buildGithubSummary(e)
  } else {
    return buildLogin(e)
  }
}

function clientIdCallback(e) {
  setClientCredentials(e.formInput.client_id, e.formInput.client_secret)
  return buildGithubSummary(e)
}

function buildLogin(e) {
  var card = CardService.newCardBuilder()
      
  var authenticationCard = CardService.newCardSection().setHeader("Authentication")
    .addWidget(CardService.newTextInput()
      .setFieldName("client_id")
      .setTitle("Client ID"))
    .addWidget(CardService.newTextInput()
      .setFieldName("client_secret")
      .setTitle("Client Secret"))
    .addWidget(CardService.newTextButton()
      .setText("Save")
      .setOnClickAction(CardService.newAction().setFunctionName('clientIdCallback')))

  return [card.addSection(authenticationCard).build()];
}

function buildGithubSummary(e) {
  var accessToken = e.messageMetadata.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var messageId = e.messageMetadata.messageId;
  var thread = GmailApp.getMessageById(messageId).getThread();
  var message = thread.getMessages()[0];
  
  var sender = message.getFrom().replace(/^.+<([^>]+)>$/, "$1");

  if (sender === "notifications@github.com") {
    var url = getGithubLink(message)
    log(url)

    var repo = parseGithubUrl(url)
    log(repo)
    
    if (repo.type === "PR") {
      var pr = fetchPRInfo(repo, ["pr", "reviews", "files"]);
      var pull = pr[0];
      log(pull)
      var reviews = pr[1];
      log(reviews)
      var files = pr[2];
      log(files)

      var card = CardService.newCardBuilder()
      
      var overviewCard = CardService.newCardSection().setHeader("Overview")
      .addWidget(CardService.newKeyValue()
                 .setTopLabel("Title")
                 .setContent(pull.title)
                 .setOpenLink(CardService.newOpenLink().setUrl(getPRLink(repo))))
      .addWidget(CardService.newKeyValue()
                 .setTopLabel("Repository")
                 .setContent(repo.owner + "/" + repo.repo))
      .addWidget(CardService.newKeyValue()
                 .setTopLabel("Target")
                 .setContent(pull.target))
      .addWidget(CardService.newKeyValue()
                 .setTopLabel("State")
                 .setContent(pull.state))
      .addWidget(CardService.newKeyValue()
                 .setTopLabel("Author")
                 .setContent(pull.author))
      
      var reviewerCard = CardService.newCardSection().setHeader("Reviewers")
      if (reviews.length > 0) {
        reviews.forEach(function (r) {
          reviewerCard.addWidget(CardService.newKeyValue().setContent(r.user).setIconUrl(getReviewIcon(r.state)))
        })
      } else {
        reviewerCard.addWidget(CardService.newKeyValue().setContent(""))
      }
      
      var labelCard = CardService.newCardSection().setHeader("Labels");
      if (pull.labels.length) {
        pull.labels.forEach(function (label) {
          labelCard.addWidget(CardService.newKeyValue().setContent(label.name))
        })
      } else {
        labelCard.addWidget(CardService.newKeyValue().setContent(""))
      }
      
      var filesCard = CardService.newCardSection().setHeader("Files")
      if (files.length > 0) {
        files.forEach(function (f) {
          filesCard.addWidget(CardService.newKeyValue().setContent(f))
        })
      } else {
        filesCard.addWidget(CardService.newKeyValue().setContent(""))
      }

      return [card.addSection(overviewCard).addSection(reviewerCard).addSection(labelCard).addSection(filesCard).build()];
    } else {
      var card = CardService.newCardBuilder()
      .addSection(CardService.newCardSection()
                  .addWidget(CardService.newKeyValue().setContent("Not a PR")))
      .build();
      return [card];
    }
  } else {
    var card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
                  .addWidget(CardService.newKeyValue().setContent("unknown content")))
    .build();
    return [card];
  }
}

function throwNotAuthenticated(service) {
  CardService.newAuthorizationException()
    .setAuthorizationUrl(service.getAuthorizationUrl())
    .setResourceDisplayName("GitHub Account")
    .throwException();
}
