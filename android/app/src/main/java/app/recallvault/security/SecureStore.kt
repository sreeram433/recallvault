package app.recallvault.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureStore(context: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "recallvault_secure",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun sessionToken(): String? = prefs.getString(KEY_TOKEN, null)
    fun userId(): String? = prefs.getString(KEY_USER, null)
    fun apiBase(): String = prefs.getString(KEY_BASE, null).orEmpty()

    fun saveSession(token: String, userId: String) {
        prefs.edit().putString(KEY_TOKEN, token).putString(KEY_USER, userId).apply()
    }

    fun saveApiBase(url: String) {
        prefs.edit().putString(KEY_BASE, url.trimEnd('/')).apply()
    }

    fun clearSession() {
        prefs.edit().remove(KEY_TOKEN).remove(KEY_USER).apply()
    }

    companion object {
        private const val KEY_TOKEN = "session_token"
        private const val KEY_USER = "user_id"
        private const val KEY_BASE = "api_base"
    }
}
