package app.recallvault.sync

import app.recallvault.security.PendingShare
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class ImportResult(val httpStatus: Int, val queuedLocally: Boolean, val itemId: String?)

class ShareTargetApi(private val baseUrl: String, private val token: String?) {
    fun importShare(item: PendingShare): ImportResult {
        val url = URL("${baseUrl.trimEnd('/')}/api/v1/imports/share-target")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8_000
            readTimeout = 8_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Idempotency-Key", item.uploadId)
            if (!token.isNullOrBlank()) {
                setRequestProperty("Authorization", "Bearer $token")
            }
        }
        val body = JSONObject()
            .put("sourceUrl", item.sourceUrl)
            .put("title", item.title)
            .put("userNote", item.userNote)
            .put("creatorName", item.creatorName)
            .put("favorite", item.favorite)
            .put("collection", item.collection)
            .put("uploadId", item.uploadId)
            .put("captureSource", "android_share_target")
        connection.outputStream.use { it.write(body.toString().toByteArray()) }
        val status = connection.responseCode
        val payload = runCatching {
            (if (status >= 400) connection.errorStream else connection.inputStream)
                ?.bufferedReader()
                ?.readText()
                .orEmpty()
        }.getOrDefault("")
        val json = runCatching { JSONObject(payload) }.getOrNull()
        return ImportResult(
            httpStatus = status,
            queuedLocally = json?.optBoolean("queueLocally") == true || status == 401,
            itemId = json?.optString("id")?.ifBlank { null },
        )
    }

    fun redeemPairing(code: String): Pair<String, String>? {
        val url = URL("${baseUrl.trimEnd('/')}/api/v1/auth/pairing/redeem")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8_000
            readTimeout = 8_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
        }
        connection.outputStream.use {
            it.write(JSONObject().put("pairingCode", code.uppercase()).toString().toByteArray())
        }
        if (connection.responseCode !in 200..299) return null
        val json = JSONObject(connection.inputStream.bufferedReader().readText())
        val token = json.optString("token")
        val userId = json.optString("userId")
        if (token.isBlank() || userId.isBlank()) return null
        return token to userId
    }
}
