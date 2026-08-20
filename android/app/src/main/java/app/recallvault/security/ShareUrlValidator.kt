package app.recallvault.security

import java.net.IDN
import java.net.URI
import java.util.Locale

enum class ShareContentType { POST, REEL, STORY, PROFILE, UNKNOWN }

enum class ShareValidationCode {
    EMPTY,
    TOO_LONG,
    NO_URL,
    MALFORMED,
    FORBIDDEN_SCHEME,
    CREDENTIALS,
    PRIVATE_HOST,
    NOT_HTTP,
}

class ShareValidationException(val code: ShareValidationCode, message: String) : Exception(message)

data class ValidatedShareUrl(
    val originalUrl: String,
    val canonicalUrl: String,
    val identityKey: String,
    val contentType: ShareContentType,
    val sourcePlatform: String,
)

object ShareUrlValidator {
    const val MAX_SHARE_TEXT = 8_192
    const val MAX_URL = 2_048

    private val forbiddenSchemes = setOf(
        "file", "javascript", "data", "blob", "about", "intent", "content", "app", "ftp", "ws", "wss",
    )
    private val tracking = setOf(
        "igsh", "igshid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
        "fbclid", "ig_rid", "img_index",
    )

    fun parseSharedText(text: String): ValidatedShareUrl {
        if (text.isBlank()) throw ShareValidationException(ShareValidationCode.EMPTY, "Nothing was shared.")
        if (text.length > MAX_SHARE_TEXT) {
            throw ShareValidationException(ShareValidationCode.TOO_LONG, "Shared text is too long.")
        }
        val extracted = extractFirstHttpUrl(text)
            ?: throw ShareValidationException(ShareValidationCode.NO_URL, "No http(s) URL was found in the shared text.")
        return validate(extracted)
    }

    fun extractFirstHttpUrl(text: String): String? {
        val match = Regex("https?://[^\\s]+", RegexOption.IGNORE_CASE).find(text)
        if (match != null) return match.value.trimEnd('.', ',', ')', ']')
        val trimmed = text.trim()
        if (trimmed.startsWith("instagram.com/", ignoreCase = true) ||
            trimmed.startsWith("www.instagram.com/", ignoreCase = true)
        ) {
            return "https://$trimmed"
        }
        return null
    }

    fun validate(raw: String): ValidatedShareUrl {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) throw ShareValidationException(ShareValidationCode.EMPTY, "Nothing was shared.")
        if (trimmed.length > MAX_URL) {
            throw ShareValidationException(ShareValidationCode.TOO_LONG, "That link is too long to save.")
        }
        val scheme = trimmed.substringBefore(":", missingDelimiterValue = "").lowercase(Locale.US)
        if (scheme in forbiddenSchemes) {
            throw ShareValidationException(ShareValidationCode.FORBIDDEN_SCHEME, "That kind of link cannot be saved.")
        }
        val uri = try {
            unwrapInstagramRedirect(URI(if ("://" in trimmed) trimmed else "https://$trimmed"))
        } catch (_: Exception) {
            throw ShareValidationException(ShareValidationCode.MALFORMED, "That does not look like a valid link.")
        }
        if (uri.scheme != "http" && uri.scheme != "https") {
            throw ShareValidationException(ShareValidationCode.NOT_HTTP, "Only http and https links can be saved.")
        }
        if (!uri.userInfo.isNullOrEmpty()) {
            throw ShareValidationException(ShareValidationCode.CREDENTIALS, "Links with usernames or passwords are rejected.")
        }
        val host = (uri.host ?: "").lowercase(Locale.US)
        if (host.isBlank() || isPrivateHostname(host)) {
            throw ShareValidationException(ShareValidationCode.PRIVATE_HOST, "Private or local addresses cannot be saved.")
        }
        val canonical = canonicalize(uri)
        val type = classify(canonical)
        return ValidatedShareUrl(
            originalUrl = "${uri.scheme}://$host${uri.rawPath.orEmpty()}${uri.rawQuery?.let { "?$it" } ?: ""}",
            canonicalUrl = canonical,
            identityKey = identityKey(canonical, type),
            contentType = type,
            sourcePlatform = if (isInstagramHost(hostOf(canonical))) "instagram" else "web",
        )
    }

    fun isPrivateHostname(hostname: String): Boolean {
        val host = hostname.trim().lowercase(Locale.US).removePrefix("[").removeSuffix("]")
        if (host == "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
            host.endsWith(".internal") || host.endsWith(".lan") || host == "0.0.0.0" ||
            host == "::1" || host == "metadata.google.internal"
        ) return true
        return isPrivateIp(host)
    }

    internal fun isPrivateIp(address: String): Boolean {
        if (address.startsWith("127.") || address.startsWith("10.") || address.startsWith("192.168.")) return true
        if (address.startsWith("169.254.") || address.startsWith("0.")) return true
        val parts = address.split(".")
        if (parts.size == 4) {
            val a = parts[0].toIntOrNull() ?: return ipv6Private(address)
            val b = parts[1].toIntOrNull() ?: return ipv6Private(address)
            if (a == 172 && b in 16..31) return true
        }
        return ipv6Private(address)
    }

    private fun ipv6Private(address: String): Boolean {
        val lower = address.lowercase(Locale.US)
        return lower == "::1" || lower == "::" || lower.startsWith("fc") || lower.startsWith("fd") ||
            lower.startsWith("fe80") || lower.startsWith("::ffff:127.") || lower.startsWith("::ffff:10.")
    }

    private fun unwrapInstagramRedirect(uri: URI): URI {
        val host = (uri.host ?: "").lowercase(Locale.US).removePrefix("www.")
        if (host == "l.instagram.com") {
            val nested = uri.query?.split("&")?.firstOrNull { it.startsWith("u=") }?.substringAfter("u=")
            if (!nested.isNullOrBlank()) {
                return URI(java.net.URLDecoder.decode(nested, Charsets.UTF_8))
            }
        }
        return uri
    }

    private fun canonicalize(uri: URI): String {
        var host = (uri.host ?: "").lowercase(Locale.US)
        if (host.startsWith("www.")) host = host.removePrefix("www.")
        if (host == "m.instagram.com" || host == "l.instagram.com") host = "instagram.com"
        var path = (uri.path ?: "/").trimEnd('/')
        if (path.startsWith("/reels/")) path = path.replaceFirst("/reels/", "/reel/")
        val params = (uri.rawQuery ?: "")
            .split("&")
            .filter { it.isNotBlank() }
            .map { it.split("=", limit = 2) }
            .filter { it[0].lowercase(Locale.US) !in tracking }
        val query = if (params.isEmpty()) "" else params.joinToString("&") { part ->
            if (part.size == 1) part[0] else "${part[0]}=${part[1]}"
        }
        val built = URI(uri.scheme, host, if (path.isEmpty()) "/" else path, query.ifBlank { null }, null)
        return built.toString()
    }

    private fun classify(canonical: String): ShareContentType {
        val uri = URI(canonical)
        if (!isInstagramHost(uri.host ?: "")) return ShareContentType.UNKNOWN
        val path = (uri.path ?: "").trimEnd('/')
        return when {
            path.startsWith("/reel/") || path.startsWith("/reels/") -> ShareContentType.REEL
            path.startsWith("/stories/") || path.startsWith("/s/") -> ShareContentType.STORY
            path.startsWith("/p/") -> ShareContentType.POST
            path.split("/").filter { it.isNotBlank() }.size == 1 -> ShareContentType.PROFILE
            else -> ShareContentType.UNKNOWN
        }
    }

    private fun identityKey(canonical: String, type: ShareContentType): String {
        val uri = URI(canonical)
        val parts = (uri.path ?: "").split("/").filter { it.isNotBlank() }
        val markers = setOf("reel", "reels", "p", "tv")
        parts.forEachIndexed { index, part ->
            if (part.lowercase(Locale.US) in markers && index + 1 < parts.size) {
                val code = parts[index + 1].replace(Regex("[^A-Za-z0-9_-]"), "")
                if (code.length in 5..24) return "ig:shortcode:$code"
            }
        }
        if (type == ShareContentType.PROFILE && parts.size == 1) return "ig:profile:${parts[0].lowercase(Locale.US)}"
        return if (isInstagramHost(uri.host ?: "")) "ig:url:$canonical" else "web:$canonical"
    }

    private fun isInstagramHost(host: String): Boolean {
        val h = host.lowercase(Locale.US).removePrefix("www.").removePrefix("m.")
        return h == "instagram.com" || h == "l.instagram.com"
    }

    private fun hostOf(url: String): String = try {
        URI(url).host ?: ""
    } catch (_: Exception) {
        ""
    }

    @Suppress("unused")
    private fun asciiHost(host: String): String = IDN.toASCII(host)
}
