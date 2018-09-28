import os
import json
import hashlib

ROOT_DIR = './protocol'

def list_files(dir):
    from os import listdir
    from os.path import isfile, join

    return [f for f in listdir(dir) if isfile(join(dir, f))]

def convert_to_unix_line_endings_and_hash(dir, files):
    hashes = {}
    for file in files:
        path = os.path.join(dir, file)
        with open(path, 'rb') as fh:
            data = fh.read()
        
        data = data.replace(b'\r\n', b'\n')
        hashes[file] = hashlib.sha256(data).hexdigest()
        with open(path, 'wb') as fh:
            fh.write(data.replace(b'\r\n', b'\n'))
            
    return hashes
    
files = list_files(ROOT_DIR)
file_hashes = convert_to_unix_line_endings_and_hash(ROOT_DIR, files)

with open('defs.json', 'w') as fh:
    fh.write(json.dumps(file_hashes).replace(' ', ''))
