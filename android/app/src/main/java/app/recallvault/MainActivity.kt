package app.recallvault

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.recallvault.security.SecureStore
import app.recallvault.sync.ShareSyncWorker
import app.recallvault.sync.ShareTargetApi
import app.recallvault.ui.theme.RecallVaultTheme
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {
    private val io = Executors.newSingleThreadExecutor()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val store = SecureStore(this)
        setContent {
            RecallVaultTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    var code by remember { mutableStateOf("") }
                    var base by remember { mutableStateOf(store.apiBase().ifBlank { ShareSyncWorker.DEFAULT_BASE }) }
                    var status by remember { mutableStateOf(if (store.sessionToken() == null) "Not paired" else "Paired") }
                    Column(
                        modifier = Modifier.padding(24.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text("RecallVault", style = MaterialTheme.typography.headlineLarge)
                        Text("Share an Instagram Reel or post and choose “Save to RecallVault”.")
                        Text("We never ask for Instagram passwords and never scrape the Saved tab.")
                        OutlinedTextField(
                            value = base,
                            onValueChange = { base = it },
                            label = { Text("API base URL") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        OutlinedTextField(
                            value = code,
                            onValueChange = { code = it.uppercase() },
                            label = { Text("Pairing code") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Button(
                            onClick = {
                                store.saveApiBase(base)
                                io.execute {
                                    val api = ShareTargetApi(base, null)
                                    val pair = api.redeemPairing(code)
                                    runOnUiThread {
                                        if (pair == null) {
                                            status = "Pairing failed"
                                        } else {
                                            store.saveSession(pair.first, pair.second)
                                            ShareSyncWorker.enqueue(this@MainActivity)
                                            status = "Paired"
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text("Pair this phone") }
                        Text(status)
                    }
                }
            }
        }
    }
}
