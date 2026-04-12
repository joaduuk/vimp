# seed_data.py - Place this in the root vimp-app folder
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Now import works
from backend.app.database import SessionLocal
from backend.app.models import Country, Constituency

def seed_database():
    print("🌱 Starting database seeding...")
    db = SessionLocal()
    
    try:
        # Add countries
        print("\n📌 Adding countries...")
        countries = [
            Country(name="United Kingdom", code="GB"),
            Country(name="United States", code="US"),
            Country(name="Ghana", code="GH"),
        ]
        
        for country in countries:
            existing = db.query(Country).filter(Country.code == country.code).first()
            if not existing:
                db.add(country)
                print(f"  ✅ Added: {country.name}")
            else:
                print(f"  ⏭️  Already exists: {country.name}")
        
        db.commit()
        print("  ✅ Countries committed!")
        
        # Add constituencies
        print("\n📌 Adding constituencies...")
        
        # Get country IDs
        uk = db.query(Country).filter(Country.code == "GB").first()
        us = db.query(Country).filter(Country.code == "US").first()
        gh = db.query(Country).filter(Country.code == "GH").first()
        
        # UK Constituencies
        if uk:
            uk_constituencies = [
                Constituency(name="Croydon North", country_id=uk.id),
                Constituency(name="Croydon South", country_id=uk.id),
                Constituency(name="London Central", country_id=uk.id),
                Constituency(name="Manchester East", country_id=uk.id),
                Constituency(name="Birmingham West", country_id=uk.id),
            ]
            for constituency in uk_constituencies:
                existing = db.query(Constituency).filter(
                    Constituency.name == constituency.name,
                    Constituency.country_id == uk.id
                ).first()
                if not existing:
                    db.add(constituency)
                    print(f"  ✅ Added (UK): {constituency.name}")
                else:
                    print(f"  ⏭️  Already exists (UK): {constituency.name}")
        
        # US Constituencies
        if us:
            us_constituencies = [
                Constituency(name="California District 12", country_id=us.id),
                Constituency(name="Texas District 8", country_id=us.id),
                Constituency(name="New York District 10", country_id=us.id),
            ]
            for constituency in us_constituencies:
                existing = db.query(Constituency).filter(
                    Constituency.name == constituency.name,
                    Constituency.country_id == us.id
                ).first()
                if not existing:
                    db.add(constituency)
                    print(f"  ✅ Added (US): {constituency.name}")
                else:
                    print(f"  ⏭️  Already exists (US): {constituency.name}")
        
        # Ghana Constituencies
        if gh:
            gh_constituencies = [
                Constituency(name="Accra Central", country_id=gh.id),
                Constituency(name="Kumasi South", country_id=gh.id),
                Constituency(name="Takoradi West", country_id=gh.id),
            ]
            for constituency in gh_constituencies:
                existing = db.query(Constituency).filter(
                    Constituency.name == constituency.name,
                    Constituency.country_id == gh.id
                ).first()
                if not existing:
                    db.add(constituency)
                    print(f"  ✅ Added (GH): {constituency.name}")
                else:
                    print(f"  ⏭️  Already exists (GH): {constituency.name}")
        
        db.commit()
        print("  ✅ Constituencies committed!")
        
        # Show summary
        print("\n" + "="*50)
        print("📊 DATABASE SUMMARY")
        print("="*50)
        print(f"  Countries:      {db.query(Country).count()}")
        print(f"  Constituencies: {db.query(Constituency).count()}")
        print("="*50)
        print("\n✅ Database seeded successfully!")
        
        # List all constituencies
        print("\n📋 All constituencies:")
        all_constituencies = db.query(Constituency).all()
        for c in all_constituencies:
            country_name = c.country.name if c.country else "Unknown"
            print(f"  - {c.name} ({country_name})")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()
        print("\n🔒 Database connection closed.")

if __name__ == "__main__":
    seed_database()