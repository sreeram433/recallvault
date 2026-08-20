package app.recallvault.security

import android.content.Context
import androidx.security.crypto.EncryptedFile
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

data class PendingShare(
    val uploadId: String,
    val sourceUrl: String,
    val canonicalUrl: String,
    val identityKey: String,
    val contentType: String,
    val title: String,
    val userNote: String,
    val creatorName: String,
    val tags: List<String>,
    val collection: String,
    val favorite: Boolean,
    val screenshotPath: String?,
    val createdAt: Long,
)

class PendingQueue(private val context: Context) {
    private val file = File(context.filesDir, "pending-shares.bin")
    private val masterKey = MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()

    @Synchronized
    fun enqueue(item: PendingShare) {
        val next = load().toMutableList()
        if (next.any { it.identityKey == item.identityKey || it.uploadId == item.uploadId }) return
        next += item
        persist(next)
    }

    @Synchronized
    fun all(): List<PendingShare> = load()

    @Synchronized
    fun remove(uploadId: String) {
        persist(load().filterNot { it.uploadId == uploadId })
    }

    private fun encrypted(): EncryptedFile {
        return EncryptedFile.Builder(
            context,
            file,
            masterKey,
            EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB,
        ).build()
    }

    private fun load(): List<PendingShare> {
        if (!file.exists()) return emptyList()
        val text = encrypted().openFileInput().use { it.readBytes().toString(Charsets.UTF_8) }
        val array = JSONArray(text)
        return buildList {
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                add(
                    PendingShare(
                        uploadId = obj.getString("uploadId"),
                        sourceUrl = obj.getString("sourceUrl"),
                        canonicalUrl = obj.getString("canonicalUrl"),
                        identityKey = obj.getString("identityKey"),
                        contentType = obj.getString("contentType"),
                        title = obj.optString("title"),
                        userNote = obj.optString("userNote"),
                        creatorName = obj.optString("creatorName"),
                        tags = obj.optString("tags").split(',').map { it.trim() }.filter { it.isNotEmpty() },
                        collection = obj.optString("collection"),
                        favorite = obj.optBoolean("favorite"),
                        screenshotPath = obj.optString("screenshotPath").ifBlank { null },
                        createdAt = obj.optLong("createdAt"),
                    ),
                )
            }
        }
    }

    private fun persist(items: List<PendingShare>) {
        val array = JSONArray()
        items.forEach { item ->
            array.put(
                JSONObject()
                    .put("uploadId", item.uploadId)
                    .put("sourceUrl", item.sourceUrl)
                    .put("canonicalUrl", item.canonicalUrl)
                    .put("identityKey", item.identityKey)
                    .put("contentType", item.contentType)
                    .put("title", item.title)
                    .put("userNote", item.userNote)
                    .put("creatorName", item.creatorName)
                    .put("tags", item.tags.joinToString(","))
                    .put("collection", item.collection)
                    .put("favorite", item.favorite)
                    .put("screenshotPath", item.screenshotPath ?: "")
                    .put("createdAt", item.createdAt),
            )
        }
        if (file.exists()) file.delete()
        encrypted().openFileOutput().use { it.write(array.toString().toByteArray()) }
    }

    companion object {
        fun newUploadId(): String = UUID.randomUUID().toString()
    }
}
