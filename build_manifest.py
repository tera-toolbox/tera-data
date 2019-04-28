import os
import json
import hashlib

MAP_DIR = './map_base'
PROTOCOL_DIR = './protocol'

def list_files(dir):
    return [f for f in os.listdir(dir) if os.path.isfile(os.path.join(dir, f))]

def convert_to_unix_line_endings_and_hash(dir, files):
    hashes = {}
    for file in files:
        path = os.path.join(dir, file)
        with open(path, 'rb') as fh:
            data = fh.read().replace(b'\r\n', b'\n')
        hashes[file] = hashlib.sha256(data).hexdigest()
        with open(path, 'wb') as fh:
            fh.write(data)
            
    return hashes

manifest = {
    'maps': convert_to_unix_line_endings_and_hash(MAP_DIR, list_files(MAP_DIR)),
    'protocol': convert_to_unix_line_endings_and_hash(PROTOCOL_DIR, list_files(PROTOCOL_DIR)),
}

with open('manifest.json', 'w') as fh:
    fh.write(json.dumps(manifest).replace(' ', ''))
