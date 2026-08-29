import base64
import json
import os
import requests

with open('pyconf.json', 'r', encoding='utf-8') as file:
    pyconf = json.load(file)

token1 = pyconf['token']

REPO_URL = "https://api.github.com/repos/bluefragmentt/nutpve/contents/www/config.json"
TOKEN = base64.b64decode(token1).decode('utf-8')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
LOCAL_FILE = 'config.json'

headers = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v4+raw"
}

response = requests.get(REPO_URL, headers=headers)

def prRed(s): print("\033[91m {}\033[00m".format(s))
def prGreen(s): print("\033[92m {}\033[00m".format(s))
def prYellow(s): print("\033[93m {}\033[00m".format(s))
def prPurple(s): print("\033[95m {}\033[00m".format(s))
def prCyan(s): print("\033[96m {}\033[00m".format(s))

if response and response.status_code == 200:
    binary_content = base64.b64decode(response.json()["content"])
    content = binary_content.decode("utf-8")
    configjson = json.loads(content)
    
    prYellow("downloaded config from repo.")

    if os.path.exists(LOCAL_FILE):
        try:
            with open(LOCAL_FILE, 'r') as file:
                local_json = json.load(file)

            prPurple(f"config changes: {configjson.get('configChanges', 'unknown')}")
            
            # Find keys changed or added
            all_keys = set(local_json.keys()).union(set(configjson.keys()))
            has_changes = False
            
            for key in all_keys:
                if key not in local_json:
                    prGreen(f"'[+]' key added from repo: '{key}': {configjson[key]}")
                    has_changes = True
                elif key not in configjson:
                    prRed(f"'[-]' key removed from repo '{key}' (was: {local_json[key]})")
                    has_changes = True
                elif local_json[key] != configjson[key]:
                    print(f"modified: '{key}'")
                    print(f"current: {local_json[key]}")
                    print(f"repo: {configjson[key]}")
                    prPurple(f"config changes: {configjson.get('configChanges', 'unknown')}")

                    has_changes = True
            
            if not has_changes:
                prGreen("no changes!")
                
        except json.JSONDecodeError:
            prRed("local config.json has error. overwriting")
    else:
        prRed(f"no existing config found... creating config.json")

    confirm = input(f"do you want to overwrite local config? [y/N] ").strip().lower()
    if confirm in ['y', 'yes']:
        with open(LOCAL_FILE, 'w') as file:
            json.dump(configjson, file, indent=4)
        prCyan(f"updated nutpve config for version: {configjson.get('version', 'unknown')}")
        prPurple(f"config changes: {configjson.get('configChanges', 'unknown')}")
    if confirm in ['n', 'no']:
        prRed("no changes made")

else:
    prRed(f"failed to fetch: {response.status_code if response else 'no response'}")
    if response:
        print(response.text)
