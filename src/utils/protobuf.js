// Protobuf decoder based on https://github.com/pawitp/protobuf-decoder
// Adapted for browser environment without dependencies

const TYPES = {
  VARINT: 0,
  FIXED64: 1,
  LENDELIM: 2,
  FIXED32: 5
};

class BufferReader {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
    this.savedOffset = 0;
  }

  readVarInt() {
    const result = decodeVarint(this.buffer, this.offset);
    this.offset += result.length;
    return result.value;
  }

  readBuffer(length) {
    this.checkByte(length);
    const result = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return result;
  }

  trySkipGrpcHeader() {
    const backupOffset = this.offset;
    if (this.buffer[this.offset] === 0 && this.leftBytes() >= 5) {
      this.offset++;
      const length = (this.buffer[this.offset] << 24) |
                     (this.buffer[this.offset + 1] << 16) |
                     (this.buffer[this.offset + 2] << 8) |
                     this.buffer[this.offset + 3];
      this.offset += 4;
      if (length > this.leftBytes()) {
        this.offset = backupOffset;
      }
    }
  }

  leftBytes() {
    return this.buffer.length - this.offset;
  }

  checkByte(length) {
    const bytesAvailable = this.leftBytes();
    if (length > bytesAvailable) {
      throw new Error(`Not enough bytes. Requested: ${length}, left: ${bytesAvailable}`);
    }
  }

  checkpoint() {
    this.savedOffset = this.offset;
  }

  resetToCheckpoint() {
    this.offset = this.savedOffset;
  }
}

function decodeVarint(buffer, offset) {
  let res = BigInt(0);
  let shift = BigInt(0);
  let byte = 0;

  do {
    if (offset >= buffer.length) {
      throw new RangeError("Index out of bound decoding varint");
    }
    byte = buffer[offset++];
    const thisByteValue = BigInt(byte & 0x7f) << shift;
    shift += BigInt(7);
    res = res + thisByteValue;
  } while (byte >= 0x80);

  return {
    value: res,
    length: Number(shift / BigInt(7))
  };
}

function interpretAsSignedType(n) {
  // ZigZag decoding
  const isEven = (n & BigInt(1)) === BigInt(0);
  if (isEven) {
    return n / BigInt(2);
  } else {
    return BigInt(-1) * ((n + BigInt(1)) / BigInt(2));
  }
}

function interpretAsTwosComplement(n, bits) {
  const isTwosComplement = (n >> BigInt(bits - 1)) === BigInt(1);
  if (isTwosComplement) {
    return n - (BigInt(1) << BigInt(bits));
  }
  return n;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

function bytesToLeBeHex(bytes) {
  return Array.from(bytes).reverse().map(b => b.toString(16).padStart(2, '0')).join('');
}

function tryDecodeString(bytes) {
  if (!bytes.length) return '';
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const str = decoder.decode(bytes);
    // Check if it's printable
    if (/^[\x20-\x7E\u0400-\u04FF\u00A0-\u00FF\r\n\t ]*$/.test(str)) {
      return str;
    }
    return null;
  } catch {
    return null;
  }
}

function readFloat32(bytes) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  for (let i = 0; i < 4; i++) {
    view.setUint8(i, bytes[i]);
  }
  return view.getFloat32(0, true);
}

function readFloat64(bytes) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, bytes[i]);
  }
  return view.getFloat64(0, true);
}

function readInt32LE(bytes) {
  return (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) | 0;
}

function readUInt32LE(bytes) {
  return (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
}

function decodeFixed32(bytes) {
  const floatValue = readFloat32(bytes);
  const intValue = readInt32LE(bytes);
  const uintValue = readUInt32LE(bytes);

  const result = [];
  result.push({ type: 'int', value: intValue });
  if (intValue !== uintValue) {
    result.push({ type: 'uint', value: uintValue });
  }
  result.push({ type: 'float', value: floatValue });
  return result;
}

function decodeFixed64(bytes) {
  const floatValue = readFloat64(bytes);
  const hexStr = bytesToLeBeHex(bytes);
  const uintValue = BigInt('0x' + hexStr);
  const intValue = interpretAsTwosComplement(uintValue, 64);

  const result = [];
  result.push({ type: 'int', value: intValue.toString() });
  if (intValue !== uintValue) {
    result.push({ type: 'uint', value: uintValue.toString() });
  }
  result.push({ type: 'double', value: floatValue });
  return result;
}

function decodeVarintParts(value) {
  const result = [];
  const uintVal = BigInt(value);
  result.push({ type: 'uint', value: uintVal.toString() });

  for (const bits of [8, 16, 32, 64]) {
    const intVal = interpretAsTwosComplement(uintVal, bits);
    if (intVal !== uintVal) {
      result.push({ type: `int${bits}`, value: intVal.toString() });
    }
  }

  const signedIntVal = interpretAsSignedType(uintVal);
  if (signedIntVal !== uintVal) {
    result.push({ type: 'sint', value: signedIntVal.toString() });
  }

  return result;
}

function decodeStringOrBytes(bytes) {
  if (!bytes.length) {
    return { type: 'string|bytes', value: '' };
  }
  const strValue = tryDecodeString(bytes);
  if (strValue !== null) {
    return { type: 'string', value: strValue };
  }
  return { type: 'bytes', value: bytesToHex(bytes) };
}

function decodeProtoInternal(buffer) {
  const reader = new BufferReader(buffer);
  const parts = [];

  reader.trySkipGrpcHeader();

  try {
    while (reader.leftBytes() > 0) {
      reader.checkpoint();

      const byteRange = [reader.offset];
      const indexType = Number(reader.readVarInt());
      const type = indexType & 0b111;
      const index = indexType >> 3;

      if (index === 0 || index > 536870911) {
        throw new Error('Invalid field number');
      }

      let value;
      let interpretations = [];

      if (type === TYPES.VARINT) {
        value = reader.readVarInt();
        interpretations = decodeVarintParts(value);
        value = value.toString();
      } else if (type === TYPES.LENDELIM) {
        const length = Number(reader.readVarInt());
        if (length > reader.leftBytes() || length > 10000000) {
          throw new Error('Invalid length');
        }
        const bytes = reader.readBuffer(length);

        // Try to decode as nested message
        let nestedMessage = null;
        if (length > 0) {
          try {
            const nested = decodeProtoInternal(new Uint8Array(bytes));
            if (nested.parts.length > 0 && nested.leftOver.length === 0) {
              nestedMessage = nested.parts;
            }
          } catch {
            // Not a valid nested message
          }
        }

        const stringOrBytes = decodeStringOrBytes(bytes);

        interpretations.push(stringOrBytes);
        if (nestedMessage) {
          interpretations.push({ type: 'message', value: nestedMessage });
        }

        value = bytes;
      } else if (type === TYPES.FIXED32) {
        const bytes = reader.readBuffer(4);
        interpretations = decodeFixed32(bytes);
        value = bytes;
      } else if (type === TYPES.FIXED64) {
        const bytes = reader.readBuffer(8);
        interpretations = decodeFixed64(bytes);
        value = bytes;
      } else {
        throw new Error('Unknown type: ' + type);
      }

      byteRange.push(reader.offset);

      parts.push({
        byteRange,
        index,
        type,
        typeName: typeToString(type),
        value,
        interpretations
      });
    }
  } catch (err) {
    reader.resetToCheckpoint();
  }

  return {
    parts,
    leftOver: reader.readBuffer(reader.leftBytes())
  };
}

function typeToString(type) {
  switch (type) {
    case TYPES.VARINT: return 'varint';
    case TYPES.LENDELIM: return 'len_delim';
    case TYPES.FIXED32: return 'fixed32';
    case TYPES.FIXED64: return 'fixed64';
    default: return 'unknown';
  }
}

// Public API

export function decodeProtobuf(base64) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const result = decodeProtoInternal(bytes);

    if (result.parts.length === 0) {
      return null;
    }

    return result.parts;
  } catch (e) {
    return null;
  }
}

export function looksLikeProtobuf(base64) {
  if (!base64 || base64.length < 2) return false;

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const result = decodeProtoInternal(bytes);

    if (!result.parts || result.parts.length === 0) return false;

    // Check that most data was parsed
    const parsedRatio = 1 - (result.leftOver.length / bytes.length);
    if (parsedRatio < 0.5) return false;

    // Check that fields look valid
    for (const part of result.parts) {
      if (part.index < 1 || part.index > 536870911) return false;
      if (![0, 1, 2, 5].includes(part.type)) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Format decoded protobuf for display
export function formatProtobufField(part, indent = 0) {
  const prefix = '  '.repeat(indent);
  let result = `${prefix}Field ${part.index} (${part.typeName}):\n`;

  for (const interp of part.interpretations) {
    if (interp.type === 'message' && Array.isArray(interp.value)) {
      result += `${prefix}  [embedded message]\n`;
      for (const nested of interp.value) {
        result += formatProtobufField(nested, indent + 2);
      }
    } else if (interp.type === 'string') {
      result += `${prefix}  ${interp.type}: "${interp.value}"\n`;
    } else if (interp.type === 'bytes') {
      result += `${prefix}  ${interp.type}: ${interp.value}\n`;
    } else {
      result += `${prefix}  ${interp.type}: ${interp.value}\n`;
    }
  }

  return result;
}
