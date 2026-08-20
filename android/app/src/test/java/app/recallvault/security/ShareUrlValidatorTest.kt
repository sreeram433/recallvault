package app.recallvault.security

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class ShareUrlValidatorTest {
    @Test
    fun reelIsClassifiedWithoutFetching() {
        val result = ShareUrlValidator.validate(
            "https://www.instagram.com/reel/ABCDE12345/?igsh=zzz&utm_source=ig",
        )
        assertEquals(ShareContentType.REEL, result.contentType)
        assertEquals("instagram", result.sourcePlatform)
        assertEquals("https://instagram.com/reel/ABCDE12345", result.canonicalUrl)
    }

    @Test
    fun postStoryAndProfile() {
        assertEquals(ShareContentType.POST, ShareUrlValidator.validate("https://instagram.com/p/ABCDE12345").contentType)
        assertEquals(ShareContentType.STORY, ShareUrlValidator.validate("https://instagram.com/stories/naina/9").contentType)
        assertEquals(ShareContentType.PROFILE, ShareUrlValidator.validate("https://instagram.com/hydfoodwalks").contentType)
        assertEquals(ShareContentType.UNKNOWN, ShareUrlValidator.validate("https://example.com/x").contentType)
    }

    @Test
    fun rejectsDangerousSchemesAndPrivateHosts() {
        assertThrows(ShareValidationException::class.java) { ShareUrlValidator.validate("javascript:alert(1)") }
        assertThrows(ShareValidationException::class.java) { ShareUrlValidator.validate("file:///etc/passwd") }
        assertThrows(ShareValidationException::class.java) { ShareUrlValidator.validate("http://127.0.0.1/secret") }
        assertThrows(ShareValidationException::class.java) { ShareUrlValidator.validate("http://localhost/x") }
        assertThrows(ShareValidationException::class.java) { ShareUrlValidator.validate("http://192.168.0.5/x") }
        assertThrows(ShareValidationException::class.java) { ShareUrlValidator.validate("http://10.0.0.8/x") }
        assertThrows(ShareValidationException::class.java) { ShareUrlValidator.validate("https://user:pass@instagram.com/reel/ABCDE12345") }
    }

    @Test
    fun extractsUrlFromShareText() {
        val result = ShareUrlValidator.parseSharedText(
            "Check out this Reel https://www.instagram.com/reel/ABCDE12345/?igsh=1",
        )
        assertEquals(ShareContentType.REEL, result.contentType)
    }

    @Test
    fun reelAndPostShareIdentity() {
        val reel = ShareUrlValidator.validate("https://instagram.com/reel/ABCDE12345")
        val post = ShareUrlValidator.validate("https://www.instagram.com/p/ABCDE12345/?igsh=1")
        assertEquals(reel.identityKey, post.identityKey)
    }

    @Test
    fun privateHostnameHelper() {
        assertTrue(ShareUrlValidator.isPrivateHostname("localhost"))
        assertTrue(ShareUrlValidator.isPrivateHostname("printer.local"))
        assertFalse(ShareUrlValidator.isPrivateHostname("instagram.com"))
    }
}
