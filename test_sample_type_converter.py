"""Tests for sample_type_converter."""

import struct
import pytest
from sample_type_converter import (
    convert_sample,
    convert_samples,
    pack_samples,
    unpack_samples,
    convert_raw,
    supported_types,
    SAMPLE_TYPES,
)


# ---------------------------------------------------------------------------
# supported_types
# ---------------------------------------------------------------------------

def test_supported_types_returns_list():
    types = supported_types()
    assert isinstance(types, list)
    assert len(types) > 0


def test_supported_types_contains_common_types():
    types = supported_types()
    for t in ("int8", "uint8", "int16", "uint16", "int32", "float32", "float64"):
        assert t in types


# ---------------------------------------------------------------------------
# convert_sample – same type passthrough
# ---------------------------------------------------------------------------

def test_convert_same_type_int16():
    assert convert_sample(1000, "int16", "int16") == 1000


def test_convert_same_type_float32():
    assert convert_sample(0.5, "float32", "float32") == 0.5


# ---------------------------------------------------------------------------
# convert_sample – integer ↔ float
# ---------------------------------------------------------------------------

def test_int16_zero_to_float32():
    result = convert_sample(0, "int16", "float32")
    assert abs(result) < 1e-6


def test_int16_max_to_float32():
    result = convert_sample(32767, "int16", "float32")
    assert abs(result - 1.0) < 1e-4


def test_int16_min_to_float32():
    result = convert_sample(-32768, "int16", "float32")
    assert abs(result - (-1.0)) < 1e-4


def test_float32_one_to_int16():
    result = convert_sample(1.0, "float32", "int16")
    assert result == 32767


def test_float32_minus_one_to_int16():
    result = convert_sample(-1.0, "float32", "int16")
    assert result == -32768


def test_float32_zero_to_int16():
    result = convert_sample(0.0, "float32", "int16")
    assert result == 0


# ---------------------------------------------------------------------------
# convert_sample – unsigned integer types
# ---------------------------------------------------------------------------

def test_uint8_mid_to_float32():
    # 128 ≈ midpoint of [0,255], should be close to 0
    result = convert_sample(128, "uint8", "float32")
    assert abs(result) < 0.01


def test_uint8_zero_to_float32():
    result = convert_sample(0, "uint8", "float32")
    assert abs(result - (-1.0)) < 1e-4


def test_uint8_max_to_float32():
    result = convert_sample(255, "uint8", "float32")
    assert abs(result - 1.0) < 1e-4


def test_float32_one_to_uint8():
    result = convert_sample(1.0, "float32", "uint8")
    assert result == 255


def test_float32_minus_one_to_uint8():
    result = convert_sample(-1.0, "float32", "uint8")
    assert result == 0


# ---------------------------------------------------------------------------
# convert_sample – integer ↔ integer
# ---------------------------------------------------------------------------

def test_int16_to_int32():
    result = convert_sample(16384, "int16", "int32")
    # 16384 / 32767 ≈ 0.5 → 0.5 * 2147483647 ≈ 1073741824
    assert isinstance(result, int)
    assert result > 0


def test_int8_to_int16():
    result = convert_sample(64, "int8", "int16")
    assert isinstance(result, int)
    assert result > 0


def test_int32_to_int16_max():
    result = convert_sample(2147483647, "int32", "int16")
    assert result == 32767


# ---------------------------------------------------------------------------
# convert_sample – clipping / boundary
# ---------------------------------------------------------------------------

def test_float32_clipped_above_one():
    result = convert_sample(2.0, "float32", "int16")
    assert result == 32767


def test_float32_clipped_below_minus_one():
    result = convert_sample(-2.0, "float32", "int16")
    assert result == -32768


# ---------------------------------------------------------------------------
# convert_sample – invalid types raise ValueError
# ---------------------------------------------------------------------------

def test_invalid_src_type_raises():
    with pytest.raises(ValueError, match="Unsupported source type"):
        convert_sample(0, "bogus", "int16")


def test_invalid_dst_type_raises():
    with pytest.raises(ValueError, match="Unsupported destination type"):
        convert_sample(0, "int16", "bogus")


# ---------------------------------------------------------------------------
# convert_samples – list conversion
# ---------------------------------------------------------------------------

def test_convert_samples_empty():
    assert convert_samples([], "int16", "float32") == []


def test_convert_samples_multiple():
    values = [-32768, 0, 32767]
    result = convert_samples(values, "int16", "float32")
    assert len(result) == 3
    assert abs(result[0] - (-1.0)) < 1e-4
    assert abs(result[1]) < 1e-6
    assert abs(result[2] - 1.0) < 1e-4


# ---------------------------------------------------------------------------
# pack_samples / unpack_samples
# ---------------------------------------------------------------------------

def test_pack_unpack_int16_roundtrip():
    samples = [-32768, -1000, 0, 1000, 32767]
    packed = pack_samples(samples, "int16")
    assert isinstance(packed, bytes)
    assert len(packed) == len(samples) * 2
    unpacked = unpack_samples(packed, "int16")
    assert unpacked == samples


def test_pack_unpack_float32_roundtrip():
    samples = [-1.0, -0.5, 0.0, 0.5, 1.0]
    packed = pack_samples(samples, "float32")
    unpacked = unpack_samples(packed, "float32")
    for a, b in zip(samples, unpacked):
        assert abs(a - b) < 1e-6


def test_pack_invalid_type_raises():
    with pytest.raises(ValueError):
        pack_samples([0], "int999")


def test_unpack_invalid_type_raises():
    with pytest.raises(ValueError):
        unpack_samples(b"\x00\x00", "int999")


def test_pack_little_endian_int16():
    packed = pack_samples([256], "int16")
    # 256 in little-endian int16 = 0x00 0x01
    assert packed == struct.pack("<h", 256)


# ---------------------------------------------------------------------------
# convert_raw
# ---------------------------------------------------------------------------

def test_convert_raw_int16_to_float32():
    samples = [-32768, 0, 32767]
    raw_in = pack_samples(samples, "int16")
    raw_out = convert_raw(raw_in, "int16", "float32")
    result = unpack_samples(raw_out, "float32")
    assert abs(result[0] - (-1.0)) < 1e-4
    assert abs(result[1]) < 1e-6
    assert abs(result[2] - 1.0) < 1e-4


def test_convert_raw_roundtrip():
    samples = [100, 200, -300, 0]
    raw_in = pack_samples(samples, "int16")
    raw_mid = convert_raw(raw_in, "int16", "float32")
    raw_out = convert_raw(raw_mid, "float32", "int16")
    result = unpack_samples(raw_out, "int16")
    for a, b in zip(samples, result):
        assert abs(a - b) <= 2  # allow ±2 LSB rounding error


# ---------------------------------------------------------------------------
# float64
# ---------------------------------------------------------------------------

def test_int16_to_float64():
    result = convert_sample(32767, "int16", "float64")
    # int16 max (32767) normalises to 32767/32768 ≈ 0.99997 (symmetric signed range)
    assert abs(result - 1.0) < 1e-4


def test_float64_to_int16():
    result = convert_sample(1.0, "float64", "int16")
    assert result == 32767
