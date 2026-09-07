with open('departmental.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''        // Spot Bonus and Special Recognition are always CNY; Departmental Award uses award.currency (USD for intl depts)
        const isIndividualAward = award.award_type !== 'Departmental Award';
        const displayCurrency = award.currency || (isIndividualAward ? 'CNY' : 'USD');
        const bonus = formatCurrency(award.bonus, displayCurrency);'''

new = '''        // Spot Bonus is always CNY; others use award.currency field
        const defaultCurrency = (award.award_type === 'Spot Bonus') ? 'CNY' : 'USD';
        const displayCurrency = award.currency || defaultCurrency;
        const bonus = formatCurrency(award.bonus, displayCurrency);'''

content = content.replace(old, new)

with open('departmental.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
