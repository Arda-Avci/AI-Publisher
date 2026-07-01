"""Fix db.ts: use CREDIT_DEFAULTS.ADMIN_SEED_CREDITS in SQL strings."""
import os

fpath = os.path.join(os.path.dirname(__file__), '..', 'src', 'db.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# SQL strings need runtime template interpolation
# Strategy: define a local const, then use template literals
# Replace inside the SQL strings

# INSERT line: VALUES (?, ?, 10000) -> use template literal
old_insert = "await db.run('INSERT INTO users (username, password, credits) VALUES (?, ?, 10000)',"
new_insert = "await db.run(`INSERT INTO users (username, password, credits) VALUES (?, ?, ${CREDIT_DEFAULTS.ADMIN_SEED_CREDITS})`,"
content = content.replace(old_insert, new_insert)

# UPDATE line: SET credits = CREDIT_DEFAULTS.ADMIN_SEED_CREDITS WHERE ... AND credits < 10000
# The CREDIT_DEFAULTS is already used in the SQL string via string concat. 
# But tsc doesn't count that as 'reading' the import.
# Let me convert to template literal to make it a proper JS usage.

old_update = "credits = CREDIT_DEFAULTS.ADMIN_SEED_CREDITS WHERE username = ? AND credits < 10000"
new_update = "credits = ${CREDIT_DEFAULTS.ADMIN_SEED_CREDITS} WHERE username = ? AND credits < ${CREDIT_DEFAULTS.ADMIN_SEED_CREDITS}"
content = content.replace(old_update, new_update)

# Convert the surrounding string to template literal if not already
# The line starts with: await db.run('UPDATE users SET
content = content.replace(
    "'UPDATE users SET credits = ${CREDIT_DEFAULTS.ADMIN_SEED_CREDITS} WHERE username = ? AND credits < ${CREDIT_DEFAULTS.ADMIN_SEED_CREDITS}'",
    "`UPDATE users SET credits = ${CREDIT_DEFAULTS.ADMIN_SEED_CREDITS} WHERE username = ? AND credits < ${CREDIT_DEFAULTS.ADMIN_SEED_CREDITS}`"
)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed db.ts')

# Verify
with open(fpath, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f.readlines(), 1):
        if 'CREDIT' in line and 'ADMIN' in line:
            print(f'  Line {i}: {line.strip()[:120]}')
