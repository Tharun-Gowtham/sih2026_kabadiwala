"""
Geohash encoding helper for milk-run lot clustering.

Uses the 'python-geohash' library (import name: geohash).
Precision 6 encodes a ~1.2km × 0.6km cell — appropriate for
urban kabadiwala density. Tune via GEOHASH_PRECISION env var.
"""
try:
    import geohash as _geohash_lib
    _GEOHASH_AVAILABLE = True
except ImportError:
    try:
        import pygeohash as _geohash_lib
        _GEOHASH_AVAILABLE = True
    except ImportError:
        _GEOHASH_AVAILABLE = False


def encode_geohash(lat: float, lon: float, precision: int = 6) -> str:
    """
    Encode a (lat, lon) pair into a geohash string.

    Falls back to a simple grid-based cell string if neither
    geohash nor pygeohash is installed, so the rest of the
    batch-formation logic continues to work during development.
    """
    if _GEOHASH_AVAILABLE:
        return _geohash_lib.encode(lat, lon, precision=precision)
    # Fallback: tile the world into ~0.01-degree cells (roughly 1km)
    # Not a real geohash, but deterministic and collision-free for testing.
    lat_tile = int(lat * (10 ** (precision - 2)))
    lon_tile = int(lon * (10 ** (precision - 2)))
    return f"tile_{lat_tile}_{lon_tile}"
