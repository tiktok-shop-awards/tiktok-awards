import base64, requests

token = 'YOUR_TOKEN_HERE'
repo = 'tiktok-shop-awards/tiktok-awards'
branch = 'gh-pages'
headers = {'Authorization': f'token {token}', 'Accept': 'application/vnd.github.v3+json'}

for file_path in ['js/main.js', 'departmental.html']:
    with open(file_path, 'rb') as f:
        encoded = base64.b64encode(f.read()).decode()

    url = f'https://api.github.com/repos/{repo}/contents/{file_path}?ref={branch}'
    resp = requests.get(url, headers=headers, timeout=30)
    sha = resp.json()['sha'] if resp.status_code == 200 else None

    update_url = f'https://api.github.com/repos/{repo}/contents/{file_path}'
    data = {
        'message': f'fix: {file_path} - individual award poster shows Winner',
        'content': encoded,
        'branch': branch,
        'sha': sha
    }
    resp2 = requests.put(update_url, headers=headers, json=data, timeout=30)
    print(f'{file_path}: {resp2.status_code} - {"OK" if resp2.status_code in [200,201] else "FAIL"}')
