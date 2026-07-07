import base64
import hmac
import hashlib
import time
import struct
import random

def base32_decode(secret):
    secret = secret.strip().upper()
    padding = len(secret) % 8
    if padding:
        secret += '=' * (8 - padding)
    return base64.b32decode(secret)

def hotp(secret_bytes, counter):
    counter_bin = struct.pack('>Q', counter)
    hmac_res = hmac.new(secret_bytes, counter_bin, hashlib.sha1).digest()
    offset = hmac_res[-1] & 0x0f
    code = (
        ((hmac_res[offset] & 0x7f) << 24) |
        ((hmac_res[offset + 1] & 0xff) << 16) |
        ((hmac_res[offset + 2] & 0xff) << 8) |
        (hmac_res[offset + 3] & 0xff)
    )
    return str(code % 1000000).zfill(6)

def verify_totp(secret_base32, token, window=1):
    try:
        secret_bytes = base32_decode(secret_base32)
        current_time = int(time.time())
        time_step = current_time // 30
        
        for i in range(-window, window + 1):
            if hotp(secret_bytes, time_step + i) == token.strip():
                return True
        return False
    except Exception as e:
        print("TOTP verification error:", e)
        return False

def generate_secret(length=32):
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    return ''.join(random.choice(alphabet) for _ in range(length))
