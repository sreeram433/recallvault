package app.recallvault.share

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.recallvault.security.PendingQueue
import app.recallvault.security.PendingShare
import app.recallvault.security.SecureStore
import app.recallvault.security.ValidatedShareUrl
import app.recallvault.sync.ShareSyncWorker
import app.recallvault.sync.ShareTargetApi
import app.recallvault.ui.theme.RecallVaultTheme
import java.io.File
import java.util.concurrent.Executors

class ShareCaptureActivity : ComponentActivity() {
    private val io = Executors.newSingleThreadExecutor()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        render(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        render(intent)
    }

    private fun render(intent: Intent?) {
        val parsed = ShareIntentParser.parse(intent)
        setContent {
            RecallVaultTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    ShareCaptureScreen(
                        parsed = parsed,
                        onSave = { details, screenshot, done ->
                            save(parsed.validated, details, screenshot, done)
                        },
                        onDone = { finish() },
                    )
                }
            }
        }
    }

    private fun save(
        validated: ValidatedShareUrl?,
        details: CaptureDetails,
        screenshot: Uri?,
        done: (Boolean, String) -> Unit,
    ) {
        if (validated == null) {
            done(false, "missing")
            return
        }
        val uploadId = PendingQueue.newUploadId()
        val screenshotPath = screenshot?.let { copyScreenshot(it, uploadId) }
        val pending = PendingShare(
            uploadId = uploadId,
            sourceUrl = validated.originalUrl,
            canonicalUrl = validated.canonicalUrl,
            identityKey = validated.identityKey,
            contentType = validated.contentType.name.lowercase(),
            title = details.title,
            userNote = details.note,
            creatorName = details.creator,
            tags = details.tags.split(',').map { it.trim() }.filter { it.isNotEmpty() },
            collection = details.collection,
            favorite = details.favorite,
            screenshotPath = screenshotPath,
            createdAt = System.currentTimeMillis(),
        )
        io.execute {
            PendingQueue(this).enqueue(pending)
            val store = SecureStore(this)
            val token = store.sessionToken()
            val savedRemote = if (token != null) {
                val api = ShareTargetApi(store.apiBase().ifBlank { ShareSyncWorker.DEFAULT_BASE }, token)
                val result = runCatching { api.importShare(pending) }.getOrNull()
                if (result != null && result.httpStatus in 200..299) {
                    PendingQueue(this).remove(uploadId)
                    true
                } else {
                    false
                }
            } else {
                false
            }
            if (!savedRemote) ShareSyncWorker.enqueue(this)
            runOnUiThread { done(true, if (savedRemote) "cloud" else "queue") }
        }
    }

    private fun copyScreenshot(uri: Uri, uploadId: String): String? {
        val dir = File(filesDir, "screenshots").apply { mkdirs() }
        val dest = File(dir, "$uploadId.jpg")
        return runCatching {
            contentResolver.openInputStream(uri)?.use { input ->
                dest.outputStream().use { input.copyTo(it) }
            }
            dest.absolutePath
        }.getOrNull()
    }
}

data class CaptureDetails(
    val title: String,
    val note: String,
    val creator: String,
    val tags: String,
    val collection: String,
    val favorite: Boolean,
)

@Composable
fun ShareCaptureScreen(
    parsed: ParsedShare,
    onSave: (CaptureDetails, Uri?, (Boolean, String) -> Unit) -> Unit,
    onDone: () -> Unit,
) {
    var title by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var creator by remember { mutableStateOf("") }
    var tags by remember { mutableStateOf("") }
    var collection by remember { mutableStateOf("Inbox") }
    var favorite by remember { mutableStateOf(false) }
    var detailsOpen by remember { mutableStateOf(false) }
    var saved by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf("") }
    var screenshot by remember { mutableStateOf<Uri?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { screenshot = it }

    Column(
        modifier = Modifier
            .padding(20.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Save to RecallVault", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Only the link you shared is used. Instagram is not opened, scraped, or logged into.",
            style = MaterialTheme.typography.bodyMedium,
        )
        if (parsed.bulkNotSupported || parsed.validated == null) {
            Text(parsed.error ?: "Could not read that share.", color = MaterialTheme.colorScheme.error)
            TextButton(onClick = onDone) { Text("Close") }
        } else {
            val item = parsed.validated
            Text(item.canonicalUrl, style = MaterialTheme.typography.bodySmall)
            Text("Type: ${item.contentType.name.lowercase()} · ${item.sourcePlatform}")
            if (!saved) {
                Button(
                    onClick = {
                        onSave(
                            CaptureDetails(title, note, creator, tags, collection, favorite),
                            screenshot,
                        ) { ok, where ->
                            if (ok) {
                                saved = true
                                status = if (where == "cloud") {
                                    "Saved to RecallVault"
                                } else {
                                    "Saved to RecallVault (offline queue)"
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Save to Inbox") }
                TextButton(onClick = { detailsOpen = !detailsOpen }) {
                    Text(if (detailsOpen) "Hide details" else "Add details")
                }
            } else {
                Text(status.ifBlank { "Saved to RecallVault" }, color = MaterialTheme.colorScheme.primary)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { detailsOpen = true; saved = false }) { Text("Add details") }
                    Button(onClick = onDone) { Text("Done") }
                }
            }
            if (detailsOpen) {
                OutlinedTextField(title, { title = it }, label = { Text("Title") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(creator, { creator = it }, label = { Text("Creator (optional)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(note, { note = it }, label = { Text("Note") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(tags, { tags = it }, label = { Text("Tags, comma separated") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(collection, { collection = it }, label = { Text("Collection") }, modifier = Modifier.fillMaxWidth())
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(favorite, { favorite = it })
                    Text("Favorite")
                }
                TextButton(onClick = { picker.launch("image/*") }) {
                    Text(if (screenshot == null) "Attach your screenshot" else "Screenshot attached")
                }
            }
        }
    }
}
