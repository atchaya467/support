<?php

class TOTP {
    /**
     * Decodes a base32 string to binary data.
     */
    private static function base32Decode($base32) {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $base32 = strtoupper(str_replace('=', '', $base32));
        $len = strlen($base32);
        $n = 0;
        $j = 0;
        $binary = '';

        for ($i = 0; $i < $len; $i++) {
            $val = strpos($alphabet, $base32[$i]);
            if ($val === false) {
                throw new Exception('Invalid base32 character');
            }
            $n = ($n << 5) | $val;
            $j += 5;
            if ($j >= 8) {
                $j -= 8;
                $binary .= chr(($n >> $j) & 255);
            }
        }
        return $binary;
    }

    /**
     * Calculates the HOTP code for a secret and counter.
     */
    private static function hotp($secretBinary, $counter) {
        // Pack counter into 8 bytes big-endian (64-bit unsigned)
        $counterBin = pack('N*', 0, $counter);

        // Compute HMAC-SHA1
        $hash = hash_hmac('sha1', $counterBin, $secretBinary, true);

        // Dynamic truncation
        $offset = ord($hash[19]) & 0xf;
        $code = (
            ((ord($hash[$offset]) & 0x7f) << 24) |
            ((ord($hash[$offset + 1]) & 0xff) << 16) |
            ((ord($hash[$offset + 2]) & 0xff) << 8) |
            (ord($hash[$offset + 3]) & 0xff)
        );

        return str_pad($code % 1000000, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Verifies a TOTP token against a base32 secret.
     */
    public static function verify($secretBase32, $token, $window = 1) {
        try {
            $secretBinary = self::base32Decode($secretBase32);
            $timeStep = floor(time() / 30);
            
            for ($i = -$window; $i <= $window; $i++) {
                if (self::hotp($secretBinary, $timeStep + $i) === trim($token)) {
                    return true;
                }
            }
            return false;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Generates a random base32 secret key.
     */
    public static function generateSecret($length = 32) {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        for ($i = 0; $i < $length; $i++) {
            $secret .= $alphabet[random_int(0, 31)];
        }
        return $secret;
    }
}
