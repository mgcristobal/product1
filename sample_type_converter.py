"""
Sample Type Converter
Converts between different sample data types used in audio, signal processing,
and data pipelines (int8, int16, int32, float32, float64, uint8, etc.).
"""

import struct


# Supported sample types and their properties
SAMPLE_TYPES = {
    "int8":    {"min": -128,        "max": 127,          "bytes": 1, "fmt": "b"},
    "uint8":   {"min": 0,           "max": 255,          "bytes": 1, "fmt": "B"},
    "int16":   {"min": -32768,      "max": 32767,        "bytes": 2, "fmt": "h"},
    "uint16":  {"min": 0,           "max": 65535,        "bytes": 2, "fmt": "H"},
    "int32":   {"min": -2147483648, "max": 2147483647,   "bytes": 4, "fmt": "i"},
    "uint32":  {"min": 0,           "max": 4294967295,   "bytes": 4, "fmt": "I"},
    "float32": {"min": -1.0,        "max": 1.0,          "bytes": 4, "fmt": "f"},
    "float64": {"min": -1.0,        "max": 1.0,          "bytes": 8, "fmt": "d"},
}


def _normalize(value, src_type):
    """Normalize a sample value to the [-1.0, 1.0] range."""
    info = SAMPLE_TYPES[src_type]
    if src_type.startswith("float"):
        return max(-1.0, min(1.0, float(value)))
    lo, hi = info["min"], info["max"]
    if src_type.startswith("u"):
        # Unsigned: map [0, max] → [-1.0, 1.0]
        return (value / hi) * 2.0 - 1.0
    # Signed: map [min, max] → [-1.0, 1.0]
    return value / max(abs(lo), abs(hi))


def _denormalize(normalized, dst_type):
    """Convert a normalized [-1.0, 1.0] value to the target sample type."""
    info = SAMPLE_TYPES[dst_type]
    if dst_type.startswith("float"):
        return max(-1.0, min(1.0, normalized))
    lo, hi = info["min"], info["max"]
    if dst_type.startswith("u"):
        raw = round((normalized + 1.0) / 2.0 * hi)
    else:
        scale = max(abs(lo), abs(hi))
        raw = round(normalized * scale)
    return max(lo, min(hi, raw))


def convert_sample(value, src_type, dst_type):
    """
    Convert a single sample value from src_type to dst_type.

    Parameters
    ----------
    value    : numeric sample value
    src_type : source type string, e.g. "int16"
    dst_type : destination type string, e.g. "float32"

    Returns
    -------
    Converted sample value in the destination type.

    Raises
    ------
    ValueError if src_type or dst_type is not supported.
    """
    if src_type not in SAMPLE_TYPES:
        raise ValueError(f"Unsupported source type: '{src_type}'. "
                         f"Choose from: {list(SAMPLE_TYPES)}")
    if dst_type not in SAMPLE_TYPES:
        raise ValueError(f"Unsupported destination type: '{dst_type}'. "
                         f"Choose from: {list(SAMPLE_TYPES)}")
    if src_type == dst_type:
        return value
    normalized = _normalize(value, src_type)
    return _denormalize(normalized, dst_type)


def convert_samples(samples, src_type, dst_type):
    """
    Convert a list of samples from src_type to dst_type.

    Parameters
    ----------
    samples  : iterable of numeric values
    src_type : source type string
    dst_type : destination type string

    Returns
    -------
    List of converted sample values.
    """
    return [convert_sample(s, src_type, dst_type) for s in samples]


def pack_samples(samples, sample_type):
    """
    Pack sample values into a bytes object using little-endian encoding.

    Parameters
    ----------
    samples     : iterable of numeric values
    sample_type : type string, e.g. "int16"

    Returns
    -------
    bytes
    """
    if sample_type not in SAMPLE_TYPES:
        raise ValueError(f"Unsupported type: '{sample_type}'")
    fmt = SAMPLE_TYPES[sample_type]["fmt"]
    return struct.pack(f"<{len(samples)}{fmt}", *samples)


def unpack_samples(data, sample_type):
    """
    Unpack bytes into a list of sample values using little-endian encoding.

    Parameters
    ----------
    data        : bytes-like object
    sample_type : type string, e.g. "int16"

    Returns
    -------
    List of numeric values.
    """
    if sample_type not in SAMPLE_TYPES:
        raise ValueError(f"Unsupported type: '{sample_type}'")
    info = SAMPLE_TYPES[sample_type]
    n = len(data) // info["bytes"]
    fmt = SAMPLE_TYPES[sample_type]["fmt"]
    return list(struct.unpack(f"<{n}{fmt}", data))


def convert_raw(data, src_type, dst_type):
    """
    Convert raw bytes from src_type encoding to dst_type encoding.

    Parameters
    ----------
    data     : bytes-like object
    src_type : source type string
    dst_type : destination type string

    Returns
    -------
    bytes with samples re-encoded in dst_type.
    """
    samples = unpack_samples(data, src_type)
    converted = convert_samples(samples, src_type, dst_type)
    return pack_samples(converted, dst_type)


def supported_types():
    """Return the list of supported sample type strings."""
    return list(SAMPLE_TYPES.keys())
