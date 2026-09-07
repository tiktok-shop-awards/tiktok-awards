with open('departmental.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = '        const bonus = formatCurrency(award.bonus, award.currency);'
new = '''        // Spot Bonus and Special Recognition are always CNY; Departmental Award uses award.currency (USD for intl depts)
        const isIndividualAward = award.award_type !== 'Departmental Award';
        const displayCurrency = award.currency || (isIndividualAward ? 'CNY' : 'USD');
        const bonus = formatCurrency(award.bonus, displayCurrency);'''

content = content.replace(old, new)

with open('departmental.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
