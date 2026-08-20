from __future__ import annotations

import ipaddress
import re
from dataclasses import dataclass
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse, unquote

MAX_URL_LENGTH = 2048
MAX_SHARE_TEXT_LENGTH = 8192
FORBIDDEN_SCHEMES = {
    "file",
    "javascript",
    "data",
    "blob",
    "about",
    "intent",
    "content",
    "app",
    "ftp",
    "ws",
    "wss",
}
TRACKING = {
    "igsh",
    "igshid",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
    "ig_rid",
    "img_index",
}
RESERVED_IG = {"reel", "reels", "p", "stories", "explore", "direct", "accounts", "tv", "about", "legal"}


class ShareValidationError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass
class ValidatedShareUrl:
    original_url: str
    canonical_url: str
    identity_key: str
    content_type: str
    source_platform: str
    source_type: str
    provenance: str = "user_pasted"


def _host(hostname: str) -> str:
    return hostname.lower().removeprefix("www.").removeprefix("m.").strip("[]")


def is_private_hostname(hostname: str) -> bool:
    host = _host(hostname)
    if host in {"localhost", "localhost.", "0.0.0.0", "::1", "0", "metadata.google.internal"}:
        return True
    if host.endswith((".localhost", ".local", ".internal", ".lan")):
        return True
    try:
        ip = ipaddress.ip_address(host)
        return bool(ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast)
    except ValueError:
        return False


def extract_first_http_url(text: str) -> str | None:
    if not text.strip() or len(text) > MAX_SHARE_TEXT_LENGTH:
        return None
    match = re.search(r"https?://[^\s]+", text, flags=re.I)
    if match:
        return re.sub(r"[).,]+$", "", match.group(0))
    trimmed = text.strip()
    if re.match(r"^(instagram\.com/|www\.instagram\.com/)", trimmed, flags=re.I):
        return f"https://{trimmed}"
    return None


def _unwrap(url: str) -> str:
    parsed = urlparse(url)
    if _host(parsed.hostname or "") == "l.instagram.com":
        qs = dict(parse_qsl(parsed.query, keep_blank_values=True))
        nested = qs.get("u")
        if nested:
            return unquote(nested)
    return url


def canonicalize(url: str) -> str:
    parsed = urlparse(_unwrap(url))
    host = (parsed.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if host in {"m.instagram.com", "l.instagram.com"}:
        host = "instagram.com"
    path = (parsed.path or "/").rstrip("/") or "/"
    path = re.sub(r"^/reels/", "/reel/", path)
    query = [
        (k, v)
        for k, v in parse_qsl(parsed.query, keep_blank_values=True)
        if k.lower() not in TRACKING
    ]
    return urlunparse((parsed.scheme, host, path, "", urlencode(query), ""))


def detect_source_type(url: str) -> str:
    parsed = urlparse(url)
    host = _host(parsed.hostname or "")
    if host != "instagram.com":
        return "web_link"
    path = (parsed.path or "").rstrip("/")
    if re.match(r"^/reel(s)?/", path, flags=re.I):
        return "instagram_reel"
    if re.match(r"^/stories/|^/s/", path, flags=re.I):
        return "instagram_story"
    if re.match(r"^/p/", path, flags=re.I):
        return "instagram_carousel" if "img_index" in parsed.query else "instagram_post"
    parts = [p for p in path.split("/") if p]
    if len(parts) == 1 and parts[0].lower() not in RESERVED_IG:
        return "instagram_profile"
    return "instagram_other"


def classify(source_type: str) -> str:
    return {
        "instagram_reel": "reel",
        "instagram_post": "post",
        "instagram_carousel": "post",
        "instagram_story": "story",
        "instagram_profile": "profile",
    }.get(source_type, "unknown")


def identity_key(canonical: str) -> str:
    parsed = urlparse(canonical)
    parts = [p for p in (parsed.path or "").split("/") if p]
    markers = {"reel", "reels", "p", "tv"}
    for i, part in enumerate(parts):
        if part.lower() in markers and i + 1 < len(parts):
            code = re.sub(r"[^\w-]", "", parts[i + 1])
            if 5 <= len(code) <= 24:
                return f"ig:shortcode:{code}"
    if _host(parsed.hostname or "") == "instagram.com":
        if parts and parts[0] == "stories" and len(parts) > 1:
            return f"ig:story:{parts[1].lower()}"
        if len(parts) == 1 and parts[0].lower() not in RESERVED_IG:
            return f"ig:profile:{parts[0].lower()}"
        return f"ig:url:{canonical}"
    return f"web:{canonical}"


def validate_share_target_url(raw: str, provenance: str = "user_pasted") -> ValidatedShareUrl:
    trimmed = raw.strip()
    if not trimmed:
        raise ShareValidationError("empty", "Nothing was shared.")
    if len(trimmed) > MAX_URL_LENGTH:
        raise ShareValidationError("too_long", "That link is too long to save.")
    scheme = trimmed.split(":", 1)[0].lower()
    if scheme in FORBIDDEN_SCHEMES:
        raise ShareValidationError("forbidden_scheme", "That kind of link cannot be saved.")
    candidate = trimmed if "://" in trimmed else f"https://{trimmed}"
    try:
        parsed = urlparse(_unwrap(candidate))
    except Exception as exc:
        raise ShareValidationError("malformed", "That does not look like a valid link.") from exc
    if parsed.scheme not in {"http", "https"}:
        raise ShareValidationError("not_http", "Only http and https links can be saved.")
    if parsed.username or parsed.password:
        raise ShareValidationError("credentials", "Links with usernames or passwords are rejected.")
    host = parsed.hostname or ""
    if not host or is_private_hostname(host):
        raise ShareValidationError("private_host", "Private or local addresses cannot be saved.")
    canonical = canonicalize(urlunparse(parsed))
    canonical_parsed = urlparse(canonical)
    if not canonical_parsed.hostname or is_private_hostname(canonical_parsed.hostname):
        raise ShareValidationError("private_host", "Private or local addresses cannot be saved.")
    source_type = detect_source_type(canonical)
    return ValidatedShareUrl(
        original_url=urlunparse((parsed.scheme, host, parsed.path, "", parsed.query, "")),
        canonical_url=canonical,
        identity_key=identity_key(canonical),
        content_type=classify(source_type),
        source_platform="instagram" if source_type.startswith("instagram_") else "web",
        source_type=source_type,
        provenance=provenance,
    )


def parse_shared_text(text: str, provenance: str = "user_shared") -> ValidatedShareUrl:
    if not text.strip():
        raise ShareValidationError("empty", "Nothing was shared.")
    if len(text) > MAX_SHARE_TEXT_LENGTH:
        raise ShareValidationError("too_long", "Shared text is too long.")
    extracted = extract_first_http_url(text)
    if not extracted:
        raise ShareValidationError("no_url", "No http(s) URL was found in the shared text.")
    return validate_share_target_url(extracted, provenance=provenance)
