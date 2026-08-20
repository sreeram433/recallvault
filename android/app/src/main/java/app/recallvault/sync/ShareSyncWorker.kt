package app.recallvault.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import app.recallvault.security.PendingQueue
import app.recallvault.security.SecureStore

class ShareSyncWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        val store = SecureStore(applicationContext)
        val token = store.sessionToken() ?: return Result.success()
        val api = ShareTargetApi(store.apiBase().ifBlank { DEFAULT_BASE }, token)
        val queue = PendingQueue(applicationContext)
        queue.all().forEach { item ->
            val result = runCatching { api.importShare(item) }.getOrNull() ?: return Result.retry()
            if (result.httpStatus in 200..299) {
                queue.remove(item.uploadId)
            } else if (result.queuedLocally) {
                return Result.success()
            } else if (result.httpStatus in 500..599) {
                return Result.retry()
            }
        }
        return Result.success()
    }

    companion object {
        const val UNIQUE = "recallvault-share-sync"
        const val DEFAULT_BASE = "http://192.168.1.1:3000"

        fun enqueue(context: Context) {
            WorkManager.getInstance(context).enqueueUniqueWork(
                UNIQUE,
                ExistingWorkPolicy.KEEP,
                OneTimeWorkRequestBuilder<ShareSyncWorker>().build(),
            )
        }
    }
}
