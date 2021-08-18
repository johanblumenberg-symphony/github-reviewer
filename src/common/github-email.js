function parseHtml(html) {
  // Remove all emojis, that cannot be parsed by the XmlService
  html = html.replace(/<g-emoji [^>]*>[^<]*<\/g-emoji>/g, '');

  // Remove unicode characters, that cannot be parsed by XmlService
  //  - https://mothereff.in/regexpu
  //  Compiled from /[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27EF}]/ug
  html = html.replace(/(?:[\uD83C\uD83D][\uDC00-\uDFFF]|\uD83E[\uDC00-\uDEFF])|[\u2600-\u27EF]/g, '');

  var doc = Xml.parse(html, true);
  return XmlService.parse(doc.html.body.toXmlString())
}

function getElementsByTagName(element, tagName) {
  return element.getDescendants().map(function (e) { return e.asElement() }).filter(function (e) { return e != null && e.getName() == tagName})
}

function getAnchorTags(doc) {
  return getElementsByTagName(doc.getRootElement(), "a")
}

function getGithubLink(message) {
  trace("message:" + message.getBody());
  var body = parseHtml(message.getBody())
  var anchors = getAnchorTags(body)
  for (i in anchors) {
    if (anchors[i].getText() === "view it on GitHub" || anchors[i].getText() === "View it on GitHub") {
      return anchors[i].getAttribute("href").getValue()
    }
  }
  return null
}
