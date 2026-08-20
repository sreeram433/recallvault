package app.recallvault.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Paper = Color(0xFFF3EEE4)
private val Ink = Color(0xFF1B1814)
private val Accent = Color(0xFF1F5C4D)

@Composable
fun RecallVaultTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Accent,
            onPrimary = Paper,
            background = Paper,
            onBackground = Ink,
            surface = Color(0xFFFFFAF1),
            onSurface = Ink,
        ),
        content = content,
    )
}
