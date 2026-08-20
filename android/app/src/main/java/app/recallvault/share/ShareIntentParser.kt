package app.recallvault.share

import android.content.Intent
import app.recallvault.security.ShareUrlValidator
import app.recallvault.security.ShareValidationException
import app.recallvault.security.ValidatedShareUrl

data class ParsedShare(
    val validated: ValidatedShareUrl?,
    val bulkNotSupported: Boolean,
    val error: String?,
)

object ShareIntentParser {
    fun parse(intent: Intent?): ParsedShare {
        if (intent == null) return ParsedShare(null, false, "Nothing was shared.")
        if (intent.action == Intent.ACTION_SEND_MULTIPLE) {
            return ParsedShare(
                validated = null,
                bulkNotSupported = true,
                error = "Bulk import is not available yet. Share one link at a time.",
            )
        }
        if (intent.action == Intent.ACTION_VIEW && intent.data != null) {
            val url = intent.data?.getQueryParameter("url") ?: intent.dataString
            return runCatching { ParsedShare(ShareUrlValidator.parseSharedText(url.orEmpty()), false, null) }
                .getOrElse { fail(it) }
        }
        if (intent.action != Intent.ACTION_SEND) {
            return ParsedShare(null, false, "This screen only accepts a shared link.")
        }
        val type = intent.type.orEmpty()
        if (!type.startsWith("text/")) {
            return ParsedShare(null, false, "Only shared text or links can be saved.")
        }
        val extra = intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
        return runCatching { ParsedShare(ShareUrlValidator.parseSharedText(extra), false, null) }
            .getOrElse { fail(it) }
    }

    private fun fail(error: Throwable): ParsedShare {
        val message = if (error is ShareValidationException) error.message else "That link cannot be saved."
        return ParsedShare(null, false, message)
    }
}
