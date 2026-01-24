/// Configuration constants for packet chunking and transmission
pub const CHUNK_SIZE: usize = 1024 * 16 - 512; // 16KB - 512 bytes reserved for packet headers

/// Packet data structure containing chunk and metadata
#[derive(Debug, Clone)]
pub struct PacketData {
    pub chunk: Vec<u8>,
    pub tx_ord: u64,
    pub index: u64,
    pub length: u64,
    pub total_size: u64,
    pub chunk_size: u64,
}

/// Decoded packet structure for reassembly
#[derive(Debug, Clone)]
pub struct DecodedPacket {
    pub tx_ord: u64,
    pub index: u64,
    pub length: u64,
    pub total_size: u64,
    pub chunk_size: u64,
    pub chunk: Vec<u8>,
}

/// Encodes a data chunk with metadata into a packet for transmission
///
/// Packet structure (40 bytes header + chunk data):
/// - bytes 0-7:   tx_ord (transmission order)
/// - bytes 8-15:  index (chunk index within message)
/// - bytes 16-23: length (total number of chunks in message)
/// - bytes 24-31: total_size (original message size in bytes)
/// - bytes 32-39: chunk_size (size of this specific chunk)
/// - bytes 40+:   chunk (the actual data)
pub fn encode_packet(packet_data: &PacketData) -> Vec<u8> {
    let mut encoded = Vec::with_capacity(40 + packet_data.chunk.len());

    // Write header fields as big-endian u64
    encoded.extend_from_slice(&packet_data.tx_ord.to_be_bytes());
    encoded.extend_from_slice(&packet_data.index.to_be_bytes());
    encoded.extend_from_slice(&packet_data.length.to_be_bytes());
    encoded.extend_from_slice(&packet_data.total_size.to_be_bytes());
    encoded.extend_from_slice(&packet_data.chunk_size.to_be_bytes());

    // Write the chunk data
    encoded.extend_from_slice(&packet_data.chunk);

    encoded
}

/// Decodes a received packet to extract metadata and chunk data
pub fn decode_packet(data: &[u8]) -> Result<DecodedPacket, &'static str> {
    if data.len() < 40 {
        return Err("Packet too short");
    }

    // Read header fields as big-endian u64
    // These are safe because we've verified length >= 40
    let tx_ord = u64::from_be_bytes(data[0..8].try_into().map_err(|_| "Invalid tx_ord bytes")?);
    let index = u64::from_be_bytes(data[8..16].try_into().map_err(|_| "Invalid index bytes")?);
    let length = u64::from_be_bytes(
        data[16..24]
            .try_into()
            .map_err(|_| "Invalid length bytes")?,
    );
    let total_size = u64::from_be_bytes(
        data[24..32]
            .try_into()
            .map_err(|_| "Invalid total_size bytes")?,
    );
    let chunk_size = u64::from_be_bytes(
        data[32..40]
            .try_into()
            .map_err(|_| "Invalid chunk_size bytes")?,
    );

    // Read the remaining data as the chunk
    let chunk = data[40..].to_vec();

    Ok(DecodedPacket {
        tx_ord,
        index,
        length,
        total_size,
        chunk_size,
        chunk,
    })
}

/// Splits a large message into smaller chunks and creates packet data for each
pub fn packet_array(data: &[u8], tx_ord: u64, chunk_size: usize) -> Vec<PacketData> {
    let total_size = data.len() as u64;
    let mut chunks = Vec::new();
    let mut index = 0usize;

    // Split the data into chunks of the specified size
    while index < data.len() {
        let end = std::cmp::min(index + chunk_size, data.len());
        let chunk = data[index..end].to_vec();

        chunks.push(chunk);
        index = end;
    }

    let length = chunks.len() as u64;

    // Create packet data for each chunk
    chunks
        .into_iter()
        .enumerate()
        .map(|(i, chunk)| PacketData {
            chunk_size: chunk.len() as u64,
            chunk,
            tx_ord,
            index: i as u64,
            length,
            total_size,
        })
        .collect()
}

/// Manages packet reassembly for multi-chunk messages
#[derive(Debug, Default)]
pub struct PacketReassembler {
    rx_packets: Vec<DecodedPacket>,
}

impl PacketReassembler {
    pub fn new() -> Self {
        Self {
            rx_packets: Vec::new(),
        }
    }

    /// Processes an incoming packet and returns the complete message if all chunks are received
    pub fn process_packet(&mut self, packet: DecodedPacket) -> Option<Vec<u8>> {
        // If this is a single-chunk message, return it immediately
        if packet.chunk_size == packet.total_size {
            return Some(packet.chunk);
        }

        // Find existing packets with the same transmission order
        let mut existing_packets: Vec<_> = self
            .rx_packets
            .iter()
            .filter(|p| p.tx_ord == packet.tx_ord)
            .cloned()
            .collect();

        existing_packets.push(packet.clone());

        // Check if we have received all chunks for this message
        let mut received_indices: Vec<_> = existing_packets.iter().map(|p| p.index).collect();
        received_indices.sort_unstable();
        received_indices.dedup();

        if received_indices.len() as u64 == packet.length {
            // Sort chunks by index to ensure correct order
            existing_packets.sort_by_key(|p| p.index);

            // Reassemble the original message
            let total_length: usize = existing_packets.iter().map(|p| p.chunk.len()).sum();
            let mut reassembled_data = Vec::with_capacity(total_length);

            for p in &existing_packets {
                reassembled_data.extend_from_slice(&p.chunk);
            }

            // Clean up received packets for this transmission order
            self.rx_packets.retain(|p| p.tx_ord != packet.tx_ord);

            Some(reassembled_data)
        } else {
            // Store the packet for later reassembly
            self.rx_packets.push(packet);
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_decode_packet() {
        let packet_data = PacketData {
            chunk: vec![1, 2, 3, 4, 5],
            tx_ord: 12345,
            index: 0,
            length: 5,
            total_size: 25,
            chunk_size: 5,
        };

        let encoded = encode_packet(&packet_data);
        let decoded = decode_packet(&encoded).unwrap();

        assert_eq!(decoded.tx_ord, packet_data.tx_ord);
        assert_eq!(decoded.index, packet_data.index);
        assert_eq!(decoded.length, packet_data.length);
        assert_eq!(decoded.total_size, packet_data.total_size);
        assert_eq!(decoded.chunk_size, packet_data.chunk_size);
        assert_eq!(decoded.chunk, packet_data.chunk);
    }

    #[test]
    fn test_packet_array() {
        let data = vec![1u8; 100];
        let packets = packet_array(&data, 123, 30);

        assert_eq!(packets.len(), 4); // 100 bytes in chunks of 30 = 4 chunks
        assert_eq!(packets[0].length, 4);
        assert_eq!(packets[0].total_size, 100);
        assert_eq!(packets[0].tx_ord, 123);

        // Verify chunk sizes
        assert_eq!(packets[0].chunk_size, 30);
        assert_eq!(packets[1].chunk_size, 30);
        assert_eq!(packets[2].chunk_size, 30);
        assert_eq!(packets[3].chunk_size, 10); // Last chunk
    }

    #[test]
    fn test_packet_reassembler() {
        let mut reassembler = PacketReassembler::new();
        let original_data = vec![1u8; 100];
        let packets = packet_array(&original_data, 456, 30);

        // Process all packets except the last one
        for packet in &packets[0..3] {
            let encoded = encode_packet(packet);
            let decoded = decode_packet(&encoded).unwrap();
            let result = reassembler.process_packet(decoded);
            assert!(result.is_none()); // Should not return data yet
        }

        // Process the last packet
        let encoded = encode_packet(&packets[3]);
        let decoded = decode_packet(&encoded).unwrap();
        let result = reassembler.process_packet(decoded);

        assert!(result.is_some());
        assert_eq!(result.unwrap(), original_data);
    }

    #[test]
    fn test_single_chunk_message() {
        let mut reassembler = PacketReassembler::new();
        let data = vec![42u8; 10];
        let packet = PacketData {
            chunk: data.clone(),
            tx_ord: 789,
            index: 0,
            length: 1,
            total_size: 10,
            chunk_size: 10,
        };

        let encoded = encode_packet(&packet);
        let decoded = decode_packet(&encoded).unwrap();
        let result = reassembler.process_packet(decoded);

        assert!(result.is_some());
        assert_eq!(result.unwrap(), data);
    }
}
