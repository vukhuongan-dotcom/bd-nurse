#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Building BD-NURSE Static Site for GitHub Pages ==="

cd "$PROJECT_ROOT"

# 1. Update data_seed.js
python3 -c "
import sys, json
sys.path.insert(0, '$PROJECT_ROOT/app/backend')
from main import get_departments, get_criteria
depts = get_departments()
crits = get_criteria()
with open('$PROJECT_ROOT/app/frontend/js/data_seed.js', 'w', encoding='utf-8') as f:
    f.write('// Seed data for BD-NURSE Standalone & GitHub Pages runtime\n')
    f.write('window.WINDOW_DEPARTMENTS_DATA = ' + json.dumps(depts, ensure_ascii=False, indent=2) + ';\n\n')
    f.write('window.WINDOW_CRITERIA_DATA = ' + json.dumps(crits, ensure_ascii=False, indent=2) + ';\n')
print('Exported seed data: %d departments, %d criteria' % (len(depts), len(crits)))
"

# 2. Build _site directory
rm -rf _site
mkdir -p _site/static/css _site/static/js _site/static/brand _site/static/vendor
cp app/frontend/index.html _site/
cp -R app/frontend/css _site/
cp -R app/frontend/js _site/
cp -R app/frontend/vendor _site/
cp -R app/frontend/css/* _site/static/css/
cp -R app/frontend/js/* _site/static/js/
cp -R app/frontend/vendor/* _site/static/vendor/
mkdir -p _site/brand
cp -R app/static/brand/* _site/brand/
cp -R app/static/brand/* _site/static/brand/
touch _site/.nojekyll

echo "=== Build Complete in _site/ ==="
