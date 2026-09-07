with open('js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 改 formatCurrency
old1 = "  const symbol = currency === 'CNY' ? '¥' : '$';\n  return symbol + Number(amount).toLocaleString();\n}\n\nfunction formatBonus"
new1 = "  const symbol = (currency === 'CNY' || currency === 'RMB') ? '¥' : '$';\n  return symbol + Number(amount).toLocaleString();\n}\n\nfunction formatBonus"
content = content.replace(old1, new1)

# 改 formatBonus
old2 = "  const symbol = currency === 'CNY' ? '¥' : '$';\n  if (amount >="
new2 = "  const symbol = (currency === 'CNY' || currency === 'RMB') ? '¥' : '$';\n  if (amount >="
content = content.replace(old2, new2)

with open('js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
# 验证
import re
matches = re.findall(r"currency === 'CNY'", content)
print(f"Remaining 'CNY' only checks: {len(matches)}")
matches2 = re.findall(r"currency === 'CNY' \|\| currency === 'RMB'", content)
print(f"Fixed checks: {len(matches2)}")
