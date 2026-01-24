//! Pure Rust replacement for sha1-asm
//!
//! The original sha1-asm crate has buggy ARM64 assembly that fails to compile
//! on Apple Silicon due to mixing ELF (:lo12:) and Mach-O (@PAGEOFF) syntax.
//!
//! This stub provides a pure Rust implementation of the SHA-1 compress function
//! that the sha1 crate will use as a fallback.

/// SHA-1 compression function implemented in pure Rust.
///
/// This is a direct port of the compression function from the sha1 crate,
/// which will be used when the asm feature is enabled but assembly fails.
#[inline]
pub fn compress(state: &mut [u32; 5], blocks: &[[u8; 64]]) {
    // Constants for SHA-1
    const K: [u32; 4] = [0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xCA62C1D6];

    for block in blocks {
        let mut w = [0u32; 80];

        // Prepare the message schedule
        for (i, chunk) in block.chunks_exact(4).enumerate() {
            w[i] = u32::from_be_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
        }

        for i in 16..80 {
            w[i] = (w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]).rotate_left(1);
        }

        // Initialize working variables
        let mut a = state[0];
        let mut b = state[1];
        let mut c = state[2];
        let mut d = state[3];
        let mut e = state[4];

        // Main loop
        for i in 0..80 {
            let (f, k) = match i {
                0..=19 => ((b & c) | ((!b) & d), K[0]),
                20..=39 => (b ^ c ^ d, K[1]),
                40..=59 => ((b & c) | (b & d) | (c & d), K[2]),
                60..=79 => (b ^ c ^ d, K[3]),
                _ => unreachable!(),
            };

            let temp = a
                .rotate_left(5)
                .wrapping_add(f)
                .wrapping_add(e)
                .wrapping_add(k)
                .wrapping_add(w[i]);

            e = d;
            d = c;
            c = b.rotate_left(30);
            b = a;
            a = temp;
        }

        // Add the compressed chunk to the current state
        state[0] = state[0].wrapping_add(a);
        state[1] = state[1].wrapping_add(b);
        state[2] = state[2].wrapping_add(c);
        state[3] = state[3].wrapping_add(d);
        state[4] = state[4].wrapping_add(e);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_empty_block() {
        let mut state = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
        let original_state = state;

        // Compress with an empty-ish block (all zeros)
        let block = [[0u8; 64]];
        compress(&mut state, &block);

        // State should have changed
        assert_ne!(state, original_state);
    }

    #[test]
    fn test_compress_known_vector() {
        // Test with known SHA-1 test vector
        // SHA-1("abc") = a9993e364706816aba3e25717850c26c9cd0d89d
        let mut state = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];

        // "abc" padded to 64 bytes
        let mut block = [0u8; 64];
        block[0] = b'a';
        block[1] = b'b';
        block[2] = b'c';
        block[3] = 0x80; // padding bit
        // Length in bits (24) at the end
        block[62] = 0;
        block[63] = 24;

        compress(&mut state, &[block]);

        // Expected state after processing "abc"
        assert_eq!(state[0], 0xa9993e36);
        assert_eq!(state[1], 0x4706816a);
        assert_eq!(state[2], 0xba3e2571);
        assert_eq!(state[3], 0x7850c26c);
        assert_eq!(state[4], 0x9cd0d89d);
    }
}
