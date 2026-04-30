#!/usr/bin/env python3
"""
Publish an English MDX blog post to Telegraph (telegra.ph).
The full article is published (not an announcement), with a link
to the original Russian version appended at the end.

Usage:
    python publish-telegraph.py <en_mdx_file> <ru_slug>

Environment variables:
    TELEGRAPH_ACCESS_TOKEN  – Telegraph account access token (required)
    SITE_BASE_URL           – Base URL of the site (default: https://iconicompany.com)
"""

import json
import os
import re
import sys
from html.parser import HTMLParser

import markdown
import requests

# Telegraph only supports a limited set of tags.
ALLOWED_TAGS = {
    "a", "aside", "b", "blockquote", "br", "caption", "code", "del",
    "details", "div", "em", "figcaption", "figure", "footer", "h3", "h4",
    "hr", "i", "iframe", "img", "kbd", "li", "mark", "ol", "p", "pre",
    "s", "section", "strike", "strong", "sub", "sup", "table", "td", "th",
    "thead", "tbody", "tfoot", "time", "tr", "ul", "var", "video",
}

# Map unsupported heading tags to the nearest allowed equivalent.
TAG_MAP = {
    "h1": "h3",
    "h2": "h3",
    "h5": "h4",
    "h6": "h4",
}


class HtmlToNodes(HTMLParser):
    """Parse an HTML string into a Telegraph Node array."""

    def __init__(self):
        super().__init__()
        self._root = []
        self._stack = [self._root]

    def handle_starttag(self, tag, attrs):
        tag = TAG_MAP.get(tag, tag)
        if tag not in ALLOWED_TAGS:
            return
        node = {"tag": tag}
        attrs_dict = dict(attrs)
        if tag == "a" and "href" in attrs_dict:
            node["attrs"] = {"href": attrs_dict["href"]}
        elif tag == "img" and "src" in attrs_dict:
            node["attrs"] = {"src": attrs_dict["src"]}
            if "alt" in attrs_dict:
                node["attrs"]["alt"] = attrs_dict["alt"]
        node["children"] = []
        self._stack[-1].append(node)
        self._stack.append(node["children"])

    def handle_endtag(self, tag):
        tag = TAG_MAP.get(tag, tag)
        if tag in ALLOWED_TAGS and len(self._stack) > 1:
            self._stack.pop()

    def handle_data(self, data):
        if data:
            self._stack[-1].append(data)

    @property
    def nodes(self):
        return self._root


def html_to_nodes(html_text):
    parser = HtmlToNodes()
    parser.feed(html_text)
    return parser.nodes


def parse_mdx(filepath):
    """Return (frontmatter_str, body_str) from an MDX/MD file."""
    with open(filepath, encoding="utf-8") as fh:
        content = fh.read()
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
    if match:
        return match.group(1), match.group(2).strip()
    return "", content.strip()


def extract_title(frontmatter):
    for pattern in (
        r'^title:\s*"(.*?)"',
        r"^title:\s*'(.*?)'",
        r"^title:\s*(.+)",
    ):
        m = re.search(pattern, frontmatter, re.MULTILINE)
        if m:
            return m.group(1).strip().strip("'\"")
    return "Article"


def publish(access_token, title, nodes, author_name="Iconicompany", author_url="https://iconicompany.com"):
    response = requests.post(
        "https://api.telegra.ph/createPage",
        data={
            "access_token": access_token,
            "title": title,
            "author_name": author_name,
            "author_url": author_url,
            "content": json.dumps(nodes, ensure_ascii=False),
            "return_content": "false",
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <en_mdx_file> <ru_slug>", file=sys.stderr)
        sys.exit(1)

    en_file = sys.argv[1]
    ru_slug = sys.argv[2]

    access_token = os.environ.get("TELEGRAPH_ACCESS_TOKEN", "")
    if not access_token:
        print("TELEGRAPH_ACCESS_TOKEN is not set, skipping.", file=sys.stderr)
        sys.exit(0)

    site_base = os.environ.get("SITE_BASE_URL", "https://iconicompany.com").rstrip("/")
    original_url = f"{site_base}/ru/blog/{ru_slug}"
    en_url = f"{site_base}/en/blog/{ru_slug}"

    frontmatter, body = parse_mdx(en_file)
    title = extract_title(frontmatter)

    html_body = markdown.markdown(
        body,
        extensions=["tables", "fenced_code"],
    )

    # Append links to the English and original Russian articles.
    original_link_html = (
        f'<p><a href="{en_url}">Read in English</a> | '
        f'<a href="{original_url}">Read original in Russian</a></p>'
    )
    full_html = html_body + "\n" + original_link_html

    nodes = html_to_nodes(full_html)

    result = publish(access_token, title, nodes)

    if result.get("ok"):
        url = result["result"]["url"]
        print(url)
    else:
        print(f"Telegraph API error: {result}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
