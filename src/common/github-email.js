function parseHtml(html) {
  var doc = Xml.parse(html.replace(/<g-emoji [^>]*>[^<]*<\/g-emoji>/g, ''), true);
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
