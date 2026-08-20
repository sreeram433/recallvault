from app.url_validation import ShareValidationError, is_private_hostname, validate_share_target_url


def test_reel_classification():
    result = validate_share_target_url("https://www.instagram.com/reel/ABCDE12345/?igsh=zzz")
    assert result.content_type == "reel"
    assert result.source_platform == "instagram"
    assert result.provenance == "user_pasted"
    assert result.canonical_url == "https://instagram.com/reel/ABCDE12345"


def test_rejects_private_and_schemes():
    for raw in (
        "javascript:alert(1)",
        "file:///etc/passwd",
        "http://127.0.0.1/secret",
        "http://localhost/x",
        "http://192.168.1.9/x",
        "http://10.0.0.8/x",
        "https://user:pass@instagram.com/reel/ABCDE12345",
    ):
        try:
            validate_share_target_url(raw)
            raise AssertionError(raw)
        except ShareValidationError:
            pass


def test_private_hostname_helper():
    assert is_private_hostname("localhost")
    assert is_private_hostname("printer.local")
    assert not is_private_hostname("instagram.com")
