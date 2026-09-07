#!/usr/bin/env python3
"""
Add 2025 year prefix to period/award_type fields in 2025 data files,
and add region+year+period prefix to project_name in individual award files.

This resolves data confusion between 2025 and 2026 records.
"""

import json
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

YEAR = '2025'

# Project award files: period + award_type get "2025 " prefix
# Format: list of (filename, period_value, award_type_value)
PROJECT_AWARD_FILES = [
    # Global
    ('global_h1-project-awards_p1.json', 'H1', 'H1 Project Awards'),
    ('global_h1-project-awards_p2.json', 'H1', 'H1 Project Awards'),
    ('global_h1-project-awards_p3.json', 'H1', 'H1 Project Awards'),
    ('global_h1-project-awards_p4.json', 'H1', 'H1 Project Awards'),
    ('global_h2-project-awards_p1.json', 'H2', 'H2 Project Awards'),
    ('global_h2-project-awards_p2.json', 'H2', 'H2 Project Awards'),
    ('global_h2-project-awards_p3.json', 'H2', 'H2 Project Awards'),
    ('global_h2-project-awards_p4.json', 'H2', 'H2 Project Awards'),
    # US
    ('us_h1-project-awards.json', 'H1', 'H1 Project Awards'),
    ('us_h2-project-awards_p1.json', 'H2', 'H2 Project Awards'),
    ('us_h2-project-awards_p2.json', 'H2', 'H2 Project Awards'),
    # EU
    ('eu_h1-project-awards_p1.json', 'H1', 'H1 Project Awards'),
    ('eu_h1-project-awards_p2.json', 'H1', 'H1 Project Awards'),
    ('eu_h1-project-awards_p3.json', 'H1', 'H1 Project Awards'),
    ('eu_h1-project-awards_p4.json', 'H1', 'H1 Project Awards'),
    ('eu_h2-project-awards_p1.json', 'H2', 'H2 Project Awards'),
    ('eu_h2-project-awards_p2.json', 'H2', 'H2 Project Awards'),
    # SEA
    ('sea_h1-project-awards_p1.json', 'H1', 'H1 Project Awards'),
    ('sea_h1-project-awards_p2.json', 'H1', 'H1 Project Awards'),
    ('sea_h2-project-awards.json', 'H2', 'H2 Project Awards'),
    # FS
    ('fs_q1-project-awards.json', 'Q1', 'Q1 Project Awards'),
    ('fs_q2-project-awards_p1.json', 'Q2', 'Q2 Project Awards'),
    ('fs_q2-project-awards_p2.json', 'Q2', 'Q2 Project Awards'),
    ('fs_q3-project-awards.json', 'Q3', 'Q3 Project Awards'),
    ('fs_q4-project-awards_p1.json', 'Q4', 'Q4 Project Awards'),
    ('fs_q4-project-awards_p2.json', 'Q4', 'Q4 Project Awards'),
]

# Individual award files: period + award_type + project_name all get prefix
# Format: (filename, region_label, period_value, award_type_value, old_project_name, new_project_name_prefix)
INDIVIDUAL_AWARD_FILES = [
    # US
    ('us_h2-individual-awards.json', 'US', 'H2', 'H2 Individual Awards',
     'BFCM Stellar Contributors', 'US 2025 H2 BFCM Stellar Contributors'),
    # EU
    ('eu_h2-individual-awards.json', 'EU', 'H2', 'H2 Individual Awards',
     'BFCM/Tokutoku Thanks Sale Stellar Contributors', 'EU 2025 H2 BFCM/Tokutoku Thanks Sale Stellar Contributors'),
    # SEA
    ('sea_h2-individual-awards.json', 'SEA', 'H2', 'H2 Individual Awards',
     '11.11 & 12.12 Stellar Contributors', 'SEA 2025 H2 11.11 & 12.12 Stellar Contributors'),
    # FS
    ('fs_h2-individual-awards.json', 'FS', 'H2', 'H2 Individual Awards',
     'FS Black Friday Star', 'FS 2025 H2 Black Friday Star'),
]

# Skip (empty or already has year prefix)
SKIP_FILES = [
    'global_h2-individual-awards.json',  # empty
    'latam.json',                        # already year-structured
]


def modify_project_awards(filepath, old_period, old_award_type):
    """Add YEAR prefix to period and award_type fields in project award files."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not isinstance(data, list):
        print(f"  WARNING: {filepath} is not a list, skipping")
        return 0, 0

    period_changes = 0
    award_type_changes = 0

    for record in data:
        # period
        if record.get('period') == old_period:
            record['period'] = f"{YEAR} {old_period}"
            period_changes += 1
        elif record.get('period') and record['period'].startswith(YEAR):
            # already has year prefix, skip silently
            pass
        elif record.get('period'):
            print(f"  WARNING: unexpected period '{record.get('period')}' in {filepath}")

        # award_type
        if record.get('award_type') == old_award_type:
            record['award_type'] = f"{YEAR} {old_award_type}"
            award_type_changes += 1
        elif record.get('award_type') and record['award_type'].startswith(YEAR):
            pass
        elif record.get('award_type'):
            print(f"  WARNING: unexpected award_type '{record.get('award_type')}' in {filepath}")

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

    return period_changes, award_type_changes


def modify_individual_awards(filepath, region_label, old_period, old_award_type,
                             old_project_name, new_project_name):
    """Add YEAR prefix to period, award_type, and region+year+period to project_name."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not isinstance(data, list):
        print(f"  WARNING: {filepath} is not a list, skipping")
        return 0, 0, 0

    period_changes = 0
    award_type_changes = 0
    project_name_changes = 0

    for record in data:
        # period
        if record.get('period') == old_period:
            record['period'] = f"{YEAR} {old_period}"
            period_changes += 1
        elif record.get('period') and record['period'].startswith(YEAR):
            pass
        elif record.get('period'):
            print(f"  WARNING: unexpected period '{record.get('period')}' in {filepath}")

        # award_type
        if record.get('award_type') == old_award_type:
            record['award_type'] = f"{YEAR} {old_award_type}"
            award_type_changes += 1
        elif record.get('award_type') and record['award_type'].startswith(YEAR):
            pass
        elif record.get('award_type'):
            print(f"  WARNING: unexpected award_type '{record.get('award_type')}' in {filepath}")

        # project_name
        if record.get('project_name') == old_project_name:
            record['project_name'] = new_project_name
            project_name_changes += 1
        elif record.get('project_name') and YEAR in record['project_name']:
            pass
        elif record.get('project_name'):
            print(f"  WARNING: unexpected project_name '{record.get('project_name')}' in {filepath}")

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

    return period_changes, award_type_changes, project_name_changes


def verify_modifications():
    """Verify all modifications by checking period and award_type distribution."""
    print("\n" + "=" * 70)
    print("VERIFICATION: Period and award_type distribution")
    print("=" * 70)

    all_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    skip_set = {
        'manifest.json', 'media.json', 'name-map.json', 'pop.json',
        'rankings.json', 'latam.json',
    }
    # Skip departmental (already year-prefixed periods)
    skip_set.update(f for f in all_files if f.startswith('departmental_'))
    skip_set.update(SKIP_FILES)

    total_period_values = {}
    total_award_type_values = {}

    for filename in sorted(all_files):
        if filename in skip_set:
            continue
        filepath = os.path.join(DATA_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"  ERROR reading {filename}: {e}")
            continue

        if not isinstance(data, list) or len(data) == 0:
            print(f"  {filename}: empty or non-list, skipping")
            continue

        periods = {}
        award_types = {}
        for r in data:
            p = r.get('period', 'MISSING')
            at = r.get('award_type', 'MISSING')
            periods[p] = periods.get(p, 0) + 1
            award_types[at] = award_types.get(at, 0) + 1
            total_period_values[p] = total_period_values.get(p, 0) + 1
            total_award_type_values[at] = total_award_type_values.get(at, 0) + 1

        print(f"\n  {filename} ({len(data)} records):")
        for p, c in sorted(periods.items()):
            print(f"    period: {p!r} -> {c} records")
        for at, c in sorted(award_types.items()):
            print(f"    award_type: {at!r} -> {c} records")

    print("\n" + "-" * 70)
    print("TOTAL period distribution:")
    for p, c in sorted(total_period_values.items()):
        print(f"  {p!r}: {c}")
    print("TOTAL award_type distribution:")
    for at, c in sorted(total_award_type_values.items()):
        print(f"  {at!r}: {c}")

    # Check for any non-year-prefixed period/award_type values (should be none for 2025 files)
    print("\n" + "-" * 70)
    print("CHECK: Are there any records without year prefix in 2025 files?")
    found_issues = False
    for filename in sorted(all_files):
        if filename in skip_set:
            continue
        filepath = os.path.join(DATA_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception:
            continue
        if not isinstance(data, list):
            continue
        for i, r in enumerate(data):
            p = r.get('period', '')
            at = r.get('award_type', '')
            if p and not p.startswith(YEAR) and p not in ('MISSING', ''):
                print(f"  ISSUE: {filename} record {i}: period={p!r} (no year prefix)")
                found_issues = True
            if at and not at.startswith(YEAR) and at not in ('MISSING', ''):
                print(f"  ISSUE: {filename} record {i}: award_type={at!r} (no year prefix)")
                found_issues = True

    if not found_issues:
        print("  All 2025 data files have year prefix in period and award_type fields ✓")

    return not found_issues


def main():
    print(f"Adding {YEAR} year prefix to 2025 data files...")
    print(f"Data directory: {DATA_DIR}")
    print()

    total_period = 0
    total_award_type = 0
    total_project_name = 0
    files_modified = 0

    # --- Project awards ---
    print("=" * 70)
    print("PROJECT AWARD FILES")
    print("=" * 70)
    for filename, old_period, old_award_type in PROJECT_AWARD_FILES:
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(filepath):
            print(f"  {filename}: FILE NOT FOUND, skipping")
            continue
        print(f"  Processing {filename}...")
        pc, atc = modify_project_awards(filepath, old_period, old_award_type)
        print(f"    period changes: {pc}, award_type changes: {atc}")
        total_period += pc
        total_award_type += atc
        files_modified += 1

    # --- Individual awards ---
    print()
    print("=" * 70)
    print("INDIVIDUAL AWARD FILES")
    print("=" * 70)
    for (filename, region, old_period, old_award_type,
         old_pn, new_pn) in INDIVIDUAL_AWARD_FILES:
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(filepath):
            print(f"  {filename}: FILE NOT FOUND, skipping")
            continue
        print(f"  Processing {filename}...")
        pc, atc, pnc = modify_individual_awards(
            filepath, region, old_period, old_award_type, old_pn, new_pn
        )
        print(f"    period changes: {pc}, award_type changes: {atc}, project_name changes: {pnc}")
        total_period += pc
        total_award_type += atc
        total_project_name += pnc
        files_modified += 1

    # --- Summary ---
    print()
    print("=" * 70)
    print("MODIFICATION SUMMARY")
    print("=" * 70)
    print(f"  Files modified:           {files_modified}")
    print(f"  period field changes:     {total_period}")
    print(f"  award_type field changes: {total_award_type}")
    print(f"  project_name changes:     {total_project_name}")

    # --- Verify ---
    all_good = verify_modifications()

    # --- Return exit code ---
    if all_good:
        print("\n✓ All modifications verified successfully!")
        return 0
    else:
        print("\n✗ Some issues were found during verification!")
        return 1


if __name__ == '__main__':
    sys.exit(main())
