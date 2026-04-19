import csv
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from backend.app.database import SessionLocal
from backend.app.models import Country, Constituency

def import_constituencies_from_csv(csv_file):
    db = SessionLocal()
    
    try:
        # Get country IDs
        countries = {c.code: c.id for c in db.query(Country).all()}
        print(f"Found countries: {list(countries.keys())}\n")
        
        added = 0
        total_lines = 0
        
        # Read the CSV file
        with open(csv_file, 'r', encoding='utf-8') as f:
            # Read all lines
            lines = f.readlines()
            total_lines = len(lines)
            print(f"Found {total_lines} lines in CSV\n")
            
            # Process each line
            for line_num, line in enumerate(lines, 1):
                # Remove quotes and newline, then split by comma
                line = line.strip().strip('"')
                
                # Split by comma (first part is country, rest is constituency name)
                parts = line.split(',', 1)  # Split only on first comma
                
                if len(parts) != 2:
                    print(f"Line {line_num}: Skipping - invalid format: {line}")
                    continue
                
                country_code = parts[0].strip().upper()
                constituency_name = parts[1].strip()
                
                # Map country codes
                if country_code in ['GB', 'UK']:
                    country_code = 'GB'
                elif country_code in ['US', 'USA']:
                    country_code = 'US'
                elif country_code == 'GH':
                    country_code = 'GH'
                else:
                    print(f"Line {line_num}: Unknown country '{country_code}' - skipping")
                    continue
                
                if country_code not in countries:
                    print(f"Line {line_num}: Country '{country_code}' not in database")
                    continue
                
                # Add the constituency
                constituency = Constituency(
                    name=constituency_name,
                    country_id=countries[country_code]
                )
                db.add(constituency)
                added += 1
                
                # Commit every 100 records
                if added % 100 == 0:
                    db.commit()
                    print(f"  Imported {added} constituencies...")
        
        # Final commit
        db.commit()
        
        print(f"\n✅ Import complete!")
        print(f"  Total lines processed: {total_lines}")
        print(f"  Constituencies added: {added}")
        
        # Show final counts
        print("\n📊 Final constituency counts by country:")
        for code, country_id in countries.items():
            count = db.query(Constituency).filter(Constituency.country_id == country_id).count()
            country_name = db.query(Country).filter(Country.id == country_id).first().name
            print(f"  {country_name} ({code}): {count} constituencies")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import_constituencies_from_csv("constituencies.csv")