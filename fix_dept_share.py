import re

with open('departmental.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到departmental里的share按钮，在data-project前加data-award-type
old = '<button class="share-btn" data-project="${safeName}"'
new = '<button class="share-btn" data-award-type="${award.award_type === \'Departmental Award\' ? \'project\' : \'individual\'}" data-project="${safeName}"'

count = content.count(old)
print(f'Found {count} occurrences')

content = content.replace(old, new)

with open('departmental.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
